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
  layoutSemantic?: string;
};

export type AlignmentHint = {
  summary: string;
  deltaPx: number;
  confidence: "high" | "medium" | "low";
};

export type AlignmentEdge = "left" | "right" | "top" | "bottom" | "centerX" | "centerY";

export type GuideCandidate = {
  axis: "x" | "y";
  position: number;
  sourceEdge: AlignmentEdge;
  unitSummary: string;
  unitKind: VisualUnit["kind"];
  sourceRect: RectLike;
};

export type ActiveAlignmentGuide = {
  axis: "x" | "y";
  position: number;
  targetEdge: AlignmentEdge;
  sourceEdge: AlignmentEdge;
  unitSummary: string;
  deltaPx: number;
};

export type RegionContext = {
  region: IntentRegion;
  candidates: RegionCandidate[];
  nearby: NearbyReference[];
  alignmentHints?: AlignmentHint[];
  activeAlignmentGuides?: ActiveAlignmentGuide[];
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
  units: VisualUnit[],
  options?: RegionContextOptions
): NearbyReference[] {
  const MAX_DISTANCE = typeof window !== "undefined" ? window.innerHeight * 0.8 : 500;
  
  const box = region.viewportBox;
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;

  type RefItem = { score: number; actualDist: number; unit: VisualUnit };
  const aboves: RefItem[] = [];
  const belows: RefItem[] = [];
  const lefts: RefItem[] = [];
  const rights: RefItem[] = [];

  for (const unit of units) {
    if (unit.element.closest('[data-clickdeck="true"]')) continue;
    if (shouldExcludeUnit(unit, options)) continue;

    // Filter out low value pure layout blocks
    if (unit.kind === "background") continue;
    if (unit.kind === "block" && !unit.roleHint) continue;

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
        aboves.push({ score: distYAbove - getPriorityBonus(unit), actualDist: distYAbove, unit });
      } else if (distYBelow >= 0 && distYBelow < MAX_DISTANCE) {
        belows.push({ score: distYBelow - getPriorityBonus(unit), actualDist: distYBelow, unit });
      }
    }

    if (horizontallyAligned) {
      if (distXLeft >= 0 && distXLeft < MAX_DISTANCE) {
        lefts.push({ score: distXLeft - getPriorityBonus(unit), actualDist: distXLeft, unit });
      } else if (distXRight >= 0 && distXRight < MAX_DISTANCE) {
        rights.push({ score: distXRight - getPriorityBonus(unit), actualDist: distXRight, unit });
      }
    }
  }

  const sortFn = (a: RefItem, b: RefItem) => a.score - b.score;
  aboves.sort(sortFn);
  belows.sort(sortFn);
  lefts.sort(sortFn);
  rights.sort(sortFn);

  const results: NearbyReference[] = [];

  const addReferences = (direction: "above" | "below" | "left" | "right", list: RefItem[]) => {
    let count = 0;
    const seen = new Set<string>();
    for (const item of list) {
      if (count >= 2) break;
      const summary = summarizeVisualUnit(item.unit);
      if (seen.has(summary)) continue;
      seen.add(summary);
      
      let layoutSemantic = "";
      if (direction === "above") layoutSemantic = "place Target B below this reference / preserve vertical spacing";
      else if (direction === "below") layoutSemantic = "place Target B above this reference / preserve vertical spacing";
      else if (direction === "left") layoutSemantic = "use it as horizontal context / preserve offset";
      else if (direction === "right") layoutSemantic = "avoid overlap / preserve offset";

      results.push({
        direction,
        distance: Math.max(0, item.actualDist),
        unit: item.unit,
        summary,
        layoutSemantic
      });
      count++;
    }
  };

  addReferences("above", aboves);
  addReferences("below", belows);
  addReferences("left", lefts);
  addReferences("right", rights);

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

export type AlignmentHintOptions = {
  excludeTextSnippets?: string[];
};

export function calculateAlignmentHints(
  box: RectLike,
  anchorRect: RectLike | undefined,
  units: VisualUnit[],
  options?: AlignmentHintOptions
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

    const textSnippet = unit.textSnippet?.trim();
    if (options?.excludeTextSnippets && textSnippet && options.excludeTextSnippets.includes(textSnippet)) {
      continue;
    }

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
    const typeScore = h.relationKind === "edge" ? 0 : h.relationKind === "spacing" ? 100 : 200;
    const refScore = h.referencePriority === 0 ? 0 : h.referencePriority === 1 ? 100 : 400;
    const confScore = h.confidence === "high" ? 0 : h.confidence === "medium" ? 150 : 1000;
    return confScore + refScore + typeScore + (h.deltaPx * 0.1);
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

export type RegionContextOptions = {
  excludeTextSnippets?: string[];
  excludeElements?: HTMLElement[];
  excludeUnitIds?: string[];
  activeAlignmentGuides?: ActiveAlignmentGuide[];
};

function shouldExcludeUnit(unit: VisualUnit, options?: RegionContextOptions): boolean {
  if (options?.excludeUnitIds?.includes(unit.id)) {
    return true;
  }
  if (options?.excludeElements?.some(element => element === unit.element)) {
    return true;
  }
  const textSnippet = unit.textSnippet?.trim();
  return Boolean(textSnippet && options?.excludeTextSnippets?.includes(textSnippet));
}

export function buildRegionContext(
  region: IntentRegion,
  units: VisualUnit[],
  options?: RegionContextOptions
): RegionContext {
  const candidates = rankRegionCandidates(region, units);
  const empty = candidates.length === 0;
  
  const nearby = findNearbyReferences(region, units, options);

  let confidence: "high" | "medium" | "low" = "low";

  if (!empty && region.anchor.confidence === "high") {
    confidence = "high";
  } else if (!empty) {
    confidence = "medium";
  } else if (empty && nearby.length > 0) {
    confidence = "medium";
  }

  const alignmentHints = region.action === "move" ? calculateAlignmentHints(region.viewportBox, region.anchor.rect, units, options) : undefined;

  return {
    region,
    candidates,
    nearby,
    alignmentHints,
    activeAlignmentGuides: options?.activeAlignmentGuides,
    empty,
    confidence
  };
}
