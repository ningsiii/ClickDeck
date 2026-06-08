import { IntentRegion } from "./intent-region";
import { VisualUnit, findVisualUnitsInBox, RectLike } from "./visual-units";

export type RegionCandidate = {
  unit: VisualUnit;
  rank: number;
  reason: string;
  overlapRatio: number;
  centerInBox: boolean;
};

export type NearbyReference = {
  direction: "above" | "below" | "left" | "right";
  unit: VisualUnit;
  distance: number;
  summary: string;
};

export type AlignmentHint = {
  summary: string;
  deltaPx: number;
  confidence: "high" | "medium" | "low";
};

export type RegionContext = {
  region: IntentRegion;
  candidates: RegionCandidate[];
  nearby: NearbyReference[];
  alignmentHints?: AlignmentHint[];
  empty: boolean;
  confidence: "high" | "medium" | "low";
};

export function summarizeVisualUnit(unit: VisualUnit): string {
  if (unit.kind === "image") return "[Image]";
  if (unit.kind === "video") return "[Video]";
  if (unit.kind === "background") return "[Background Container]";
  if (unit.textSnippet) return unit.textSnippet.length > 50 ? unit.textSnippet.slice(0, 47) + "..." : unit.textSnippet;
  if (unit.roleHint) return `[${unit.roleHint}]`;
  return `[${unit.kind}]`;
}

export function rankRegionCandidates(
  region: IntentRegion,
  units: VisualUnit[]
): RegionCandidate[] {
  const matches = findVisualUnitsInBox(units, region.viewportBox);
  
  const candidates = matches.map(match => {
    let priorityScore = match.score;
    let reason = "Overlap";

    if (match.unit.kind === "textLine" || match.unit.kind === "image" || match.unit.kind === "video" || match.unit.kind === "interactive") {
      priorityScore += 10000;
      reason = `Primary content (${match.unit.kind})`;
    } else if (match.unit.kind === "textBlock") {
      priorityScore += 5000;
      reason = "Text container";
    } else {
      reason = "Container block";
    }

    return {
      unit: match.unit,
      reason,
      overlapRatio: match.overlapRatio,
      centerInBox: match.centerInBox,
      _rawScore: priorityScore
    };
  });

  candidates.sort((a, b) => b._rawScore - a._rawScore);
  
  return candidates.slice(0, 3).map((c, index) => {
    const { _rawScore, ...rest } = c;
    return { ...rest, rank: index + 1 };
  });
}

function getPriorityBonus(unit: VisualUnit): number {
  if (unit.kind === "textLine" || unit.kind === "image" || unit.kind === "video" || unit.kind === "interactive") return 20;
  if (unit.kind === "textBlock") return 10;
  return 0;
}

export function findNearbyReferences(
  region: IntentRegion,
  units: VisualUnit[]
): NearbyReference[] {
  const MAX_DISTANCE = typeof window !== "undefined" ? window.innerHeight * 0.8 : 500;
  
  const box = region.viewportBox;
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;

  const aboves: {dist: number, unit: VisualUnit}[] = [];
  const belows: {dist: number, unit: VisualUnit}[] = [];
  const lefts: {dist: number, unit: VisualUnit}[] = [];
  const rights: {dist: number, unit: VisualUnit}[] = [];

  for (const unit of units) {
    if (unit.element.closest('[data-clickdeck="true"]')) continue;

    const u = unit.rect;
    const uCenterX = u.left + u.width / 2;
    const uCenterY = u.top + u.height / 2;

    const distYAbove = box.top - u.bottom;
    const distYBelow = u.top - box.bottom;
    const distXLeft = box.left - u.right;
    const distXRight = u.left - box.right;

    // Use a loose alignment check
    const verticallyAligned = Math.abs(uCenterX - boxCenterX) < Math.max(box.width, u.width) / 1.5;
    const horizontallyAligned = Math.abs(uCenterY - boxCenterY) < Math.max(box.height, u.height) / 1.5;

    if (verticallyAligned) {
      if (distYAbove >= 0 && distYAbove < MAX_DISTANCE) {
        aboves.push({ dist: distYAbove - getPriorityBonus(unit), unit });
      } else if (distYBelow >= 0 && distYBelow < MAX_DISTANCE) {
        belows.push({ dist: distYBelow - getPriorityBonus(unit), unit });
      }
    }

    if (horizontallyAligned) {
      if (distXLeft >= 0 && distXLeft < MAX_DISTANCE) {
        lefts.push({ dist: distXLeft - getPriorityBonus(unit), unit });
      } else if (distXRight >= 0 && distXRight < MAX_DISTANCE) {
        rights.push({ dist: distXRight - getPriorityBonus(unit), unit });
      }
    }
  }

  const sortFn = (a: {dist: number}, b: {dist: number}) => a.dist - b.dist;
  aboves.sort(sortFn);
  belows.sort(sortFn);
  lefts.sort(sortFn);
  rights.sort(sortFn);

  const results: NearbyReference[] = [];
  if (aboves.length > 0) results.push({ direction: "above", distance: Math.max(0, aboves[0].dist), unit: aboves[0].unit, summary: summarizeVisualUnit(aboves[0].unit) });
  if (belows.length > 0) results.push({ direction: "below", distance: Math.max(0, belows[0].dist), unit: belows[0].unit, summary: summarizeVisualUnit(belows[0].unit) });
  if (lefts.length > 0) results.push({ direction: "left", distance: Math.max(0, lefts[0].dist), unit: lefts[0].unit, summary: summarizeVisualUnit(lefts[0].unit) });
  if (rights.length > 0) results.push({ direction: "right", distance: Math.max(0, rights[0].dist), unit: rights[0].unit, summary: summarizeVisualUnit(rights[0].unit) });

  return results;
}

function getConfidence(deltaPx: number): "high" | "medium" | "low" | "none" {
  if (deltaPx <= 4) return "high";
  if (deltaPx <= 8) return "medium";
  if (deltaPx <= 16) return "low";
  return "none";
}

type InternalAlignmentHint = AlignmentHint & {
  relationKind: "edge" | "spacing" | "center";
  referencePriority: number;
};

export function calculateAlignmentHints(
  box: RectLike,
  anchorRect: RectLike | undefined,
  units: VisualUnit[]
): AlignmentHint[] {
  const hints: InternalAlignmentHint[] = [];
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;

  const pushHint = (summary: string, deltaPx: number, relationKind: "edge" | "spacing" | "center", referencePriority: number) => {
    let confidence: "high" | "medium" | "low" | "none" = "none";
    if (relationKind === "spacing") {
      if (deltaPx <= 4) confidence = "high";
      else if (deltaPx <= 24) confidence = "medium";
      else if (deltaPx <= 32) confidence = "low";
    } else {
      confidence = getConfidence(deltaPx);
    }

    if (confidence !== "none") {
      hints.push({ summary, deltaPx, confidence, relationKind, referencePriority });
    }
  };

  if (anchorRect && anchorRect.width > 0) {
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;

    pushHint(`Left edge aligns with anchor left edge`, Math.abs(box.left - anchorRect.left), "edge", 0);
    pushHint(`Right edge aligns with anchor right edge`, Math.abs(box.right - anchorRect.right), "edge", 0);
    pushHint(`Top edge aligns with anchor top edge`, Math.abs(box.top - anchorRect.top), "edge", 0);
    pushHint(`Bottom edge aligns with anchor bottom edge`, Math.abs(box.bottom - anchorRect.bottom), "edge", 0);
    pushHint(`Center X is close to anchor center X`, Math.abs(boxCenterX - anchorCenterX), "center", 0);
    pushHint(`Center Y is close to anchor center Y`, Math.abs(boxCenterY - anchorCenterY), "center", 0);
  }

  for (const unit of units) {
    if (unit.element.closest('[data-clickdeck="true"]')) continue;
    if (unit.kind === "background" || unit.kind === "block") continue;

    const u = unit.rect;
    if (u.width === 0 || u.height === 0) continue;

    const uCenterX = u.left + u.width / 2;
    const uCenterY = u.top + u.height / 2;
    const label = summarizeVisualUnit(unit);

    const overlapX = Math.max(0, Math.min(box.right, u.right) - Math.max(box.left, u.left));
    const overlapY = Math.max(0, Math.min(box.bottom, u.bottom) - Math.max(box.top, u.top));
    const isOverlapping = overlapX > 0 && overlapY > 0;
    
    const horizontallyAligned = Math.abs(uCenterX - boxCenterX) < Math.max(box.width, u.width) / 1.5;
    const verticallyAligned = Math.abs(uCenterY - boxCenterY) < Math.max(box.height, u.height) / 1.5;
    
    let isNearby = isOverlapping;
    if (!isNearby && horizontallyAligned) {
      const distY = Math.min(Math.abs(box.top - u.bottom), Math.abs(box.bottom - u.top));
      if (distY <= 100) isNearby = true;
    }
    if (!isNearby && verticallyAligned) {
      const distX = Math.min(Math.abs(box.left - u.right), Math.abs(box.right - u.left));
      if (distX <= 100) isNearby = true;
    }

    const priority = isNearby ? 1 : 2;

    pushHint(`Left edge aligns with ${label} left edge`, Math.abs(box.left - u.left), "edge", priority);
    pushHint(`Right edge aligns with ${label} right edge`, Math.abs(box.right - u.right), "edge", priority);
    pushHint(`Center X is close to ${label} center X`, Math.abs(boxCenterX - uCenterX), "center", priority);

    pushHint(`Top edge aligns with ${label} top edge`, Math.abs(box.top - u.top), "edge", priority);
    pushHint(`Bottom edge aligns with ${label} bottom edge`, Math.abs(box.bottom - u.bottom), "edge", priority);
    pushHint(`Center Y is close to ${label} center Y`, Math.abs(boxCenterY - uCenterY), "center", priority);

    if (horizontallyAligned) {
      if (box.top >= u.bottom) {
        pushHint(`Top edge is ${Math.round(box.top - u.bottom)}px below ${label} bottom edge`, box.top - u.bottom, "spacing", priority);
      }
      if (box.bottom <= u.top) {
        pushHint(`Bottom edge is ${Math.round(u.top - box.bottom)}px above ${label} top edge`, u.top - box.bottom, "spacing", priority);
      }
    }
  }

  const score = (h: InternalAlignmentHint) => {
    const typeScore = h.relationKind === "edge" ? 0 : h.relationKind === "spacing" ? 10 : 20;
    const refScore = h.referencePriority * 100;
    const confScore = h.confidence === "high" ? 0 : h.confidence === "medium" ? 2 : 4;
    return refScore + typeScore + confScore + (h.deltaPx * 0.1);
  };

  hints.sort((a, b) => score(a) - score(b));

  const seen = new Set<string>();
  const topHints: AlignmentHint[] = [];
  let centerCount = 0;
  
  for (const h of hints) {
    if (seen.has(h.summary)) continue;
    
    if (h.relationKind === "center") {
      if (centerCount >= 1) continue;
      centerCount++;
    }

    seen.add(h.summary);
    topHints.push({
      summary: h.summary,
      deltaPx: h.deltaPx,
      confidence: h.confidence
    });
    
    if (topHints.length >= 4) break;
  }

  return topHints;
}

export function buildRegionContext(
  region: IntentRegion,
  units: VisualUnit[]
): RegionContext {
  const candidates = rankRegionCandidates(region, units);
  const empty = candidates.length === 0;
  
  const nearby = findNearbyReferences(region, units);

  let confidence: "high" | "medium" | "low" = "low";

  if (!empty && region.anchor.confidence === "high") {
    confidence = "high";
  } else if (!empty) {
    confidence = "medium";
  } else if (empty && nearby.length > 0) {
    confidence = "medium";
  }

  const alignmentHints = region.action === "move" ? calculateAlignmentHints(region.viewportBox, region.anchor.rect, units) : undefined;

  return {
    region,
    candidates,
    nearby,
    alignmentHints,
    empty,
    confidence
  };
}
