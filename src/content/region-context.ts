import { IntentRegion } from "./intent-region";
import { VisualUnit, findVisualUnitsInBox } from "./visual-units";

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

export type RegionContext = {
  region: IntentRegion;
  candidates: RegionCandidate[];
  nearby: NearbyReference[];
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

  return {
    region,
    candidates,
    nearby,
    empty,
    confidence
  };
}
