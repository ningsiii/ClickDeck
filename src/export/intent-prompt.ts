import { compareRegionAnchors, IntentOperation } from "../content/intent-region";
import { collectCssFacts, CssFacts } from "../content/css-facts";
import { ActiveAlignmentGuide, AlignmentEdge, NearbyReference, RegionCandidate, RegionContext, summarizeVisualUnit } from "../content/region-context";

export type IntentPromptOptions = {
  language: "en" | "zh";
  page: {
    url: string;
    title: string;
  };
};

export type IntentPromptInput = {
  operation: IntentOperation;
  sourceContext: RegionContext;
  targetContext?: RegionContext;
};

export type PromptBuildResult =
  | { ok: true; prompt: string; hasMediaReplacement: boolean }
  | { ok: false; reason: "empty"; message: string };

type PromptLanguage = IntentPromptOptions["language"];
type ConstraintConfidence = "high" | "medium" | "low";
type RelationType = "align" | "gap" | "adjacent" | "inside" | "centered";
type ResolvedAxisConstraint = {
  axis: "x" | "y";
  text: string;
  confidence: ConstraintConfidence;
  relationType: RelationType;
  source: "active-guide" | "nearby" | "anchor-center" | "placement-offset";
};

function isZh(language: PromptLanguage): boolean {
  return language === "zh";
}

function t(language: PromptLanguage, en: string, zh: string): string {
  return isZh(language) ? zh : en;
}

function formatRect(rect: { left: number; top: number; width: number; height: number; right: number; bottom: number }): string {
  return `[x:${Math.round(rect.left)}, y:${Math.round(rect.top)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}]`;
}

function formatAnchor(context: RegionContext): string {
  const { anchor } = context.region;
  const descriptor = anchor.locator?.descriptor ? ` (${anchor.locator.descriptor})` : "";
  return `${anchor.kind}${descriptor}; confidence: ${anchor.confidence}`;
}

function formatBox(context: RegionContext): string {
  const { region } = context;
  if (region.relativeBox) {
    return `${formatRect(region.relativeBox)} relative to anchor, placement hint only`;
  }
  return `${formatRect(region.viewportBox)} viewport px, placement hint only`;
}

function formatCandidate(candidate: RegionCandidate): string {
  const summary = summarizeVisualUnit(candidate.unit);
  const details = [
    `rank ${candidate.rank}`,
    candidate.reason,
    `overlap ${Math.round(candidate.overlapRatio * 100)}%`,
    candidate.centerInBox ? "center in box" : "partial overlap"
  ];
  return `${summary} (${details.join("; ")})`;
}

function formatDirection(direction: NearbyReference["direction"], language: PromptLanguage): string {
  if (!isZh(language)) return direction;
  if (direction === "above") return "上方";
  if (direction === "below") return "下方";
  if (direction === "left") return "左侧";
  return "右侧";
}

function translateSemantic(text: string, language: PromptLanguage): string {
  if (!isZh(language)) return text;
  return text
    .replace("place Target B below this reference / preserve vertical spacing", "将 Target B 放在该参考项下方 / 保持垂直间距")
    .replace("place Target B above this reference / preserve vertical spacing", "将 Target B 放在该参考项上方 / 保持垂直间距")
    .replace("use it as horizontal context / preserve offset", "将其作为横向参考 / 保持相对偏移")
    .replace("avoid overlap / preserve offset", "避免重叠 / 保持相对偏移");
}

export function appendContextBlock(lines: string[], label: string, context: RegionContext, indent = "", language: PromptLanguage = "en"): void {
  lines.push(`${indent}${label}:`);
  lines.push(`${indent}- ${t(language, "Page mode", "页面模式")}: ${context.region.pageMode}`);
  lines.push(`${indent}- ${t(language, "Anchor", "锚点")}: ${formatAnchor(context)}`);
  lines.push(`${indent}- ${t(language, "Visual box", "视觉框")}: ${formatBox(context)}`);
  lines.push(`${indent}- ${t(language, "Region confidence", "区域置信度")}: ${context.confidence}`);
}

export function appendRegionContents(lines: string[], context: RegionContext, indent = "", isTargetB = false, language: PromptLanguage = "en"): void {
  lines.push(`${indent}${t(language, "Region contents", "区域内容")}:`);
  if (context.empty) {
    lines.push(`${indent}- ${t(language, "Empty visual area; use it as intended placement area, not as an existing element.", "当前是空白视觉区域；应将其视为预期放置区域，而不是已存在元素。")}`);
    return;
  }

  if (isTargetB && context.candidates.length > 0) {
    const allLowOverlapBlocks = context.candidates.every(c => c.unit.kind === "block" && c.overlapRatio < 0.1);
    if (allLowOverlapBlocks) {
      lines.push(`${indent}- ${t(language, "Mostly empty/structural area; use nearby references and alignment hints as placement context.", "这里主要是空白或结构性区域；请使用近邻参考和对齐提示作为放置依据。")}`);
      return;
    }
  }

  context.candidates.slice(0, 3).forEach((candidate) => {
    lines.push(`${indent}- ${formatCandidate(candidate)}`);
  });
}

export function appendNearbyReferences(lines: string[], context: RegionContext, indent = "", label = "Nearby references", language: PromptLanguage = "en"): void {
  lines.push(`${indent}${label}:`);
  if (context.nearby.length === 0) {
    lines.push(`${indent}- ${t(language, "None found.", "未找到。")}`);
    return;
  }

  context.nearby.slice(0, 8).forEach((nearby) => {
    let text = isZh(language)
      ? `${indent}- ${formatDirection(nearby.direction, language)}: ${nearby.summary}，距离 ${Math.round(nearby.distance)}px`
      : `${indent}- ${formatDirection(nearby.direction, language)}: ${nearby.summary}, ${Math.round(nearby.distance)}px away`;
    if (nearby.layoutSemantic) {
      text += `; ${translateSemantic(nearby.layoutSemantic, language)}.`;
    }
    lines.push(text);
  });
}

function hasMultipleSiblingCandidates(context: RegionContext): boolean {
  if (context.candidates.length < 2) return false;
  const parents = new Map<HTMLElement, number>();
  context.candidates.forEach((candidate) => {
    const parent = candidate.unit.element.parentElement;
    if (!parent) return;
    parents.set(parent, (parents.get(parent) ?? 0) + 1);
  });
  return Array.from(parents.values()).some(count => count >= 2);
}

function appendSourceImplementationHint(lines: string[], context: RegionContext, language: PromptLanguage): void {
  if (!hasMultipleSiblingCandidates(context)) return;
  lines.push(t(language, "Source implementation hint:", "Source A 实现提示:"));
  lines.push(t(language, "- Source A contains multiple sibling items; prefer moving their shared row/wrapper container when that preserves the selected visual group.", "- Source A 包含多个同级项；如果能保留当前视觉分组，应优先移动它们共享的整行或外层容器。"));
  lines.push(t(language, "- Exclude nearby labels/headings outside Source A's visual box, even when they share a parent container.", "- 即使与 Source A 共用父容器，也不要把视觉框外的邻近标签或标题一起纳入移动范围。"));
  lines.push("");
}

function formatOffsetAmount(value: number, unit: "%" | "px"): string {
  const rounded = Math.round(Math.abs(value));
  return `about ${rounded}${unit}`;
}

function appendPlacementOffset(lines: string[], sourceContext: RegionContext, targetContext: RegionContext, language: PromptLanguage): void {
  const sourceBox = sourceContext.region.relativeBox;
  const targetBox = targetContext.region.relativeBox;
  const useRelative = Boolean(sourceBox && targetBox);
  const sBox = sourceBox ?? sourceContext.region.viewportBox;
  const tBox = targetBox ?? targetContext.region.viewportBox;
  const unit = useRelative ? "%" : "px";

  const leftDelta = tBox.left - sBox.left;
  const topDelta = tBox.top - sBox.top;
  const leftThreshold = useRelative ? 1 : Math.max(4, sBox.width * 0.05);
  const topThreshold = useRelative ? 1 : Math.max(4, sBox.height * 0.05);
  const details: string[] = [];

  if (Math.abs(leftDelta) >= leftThreshold) {
    const direction = leftDelta > 0 ? "to the right of" : "to the left of";
    details.push(isZh(language)
      ? `- Target B 左边界位于 Source A 左边界${leftDelta > 0 ? "右侧" : "左侧"}，偏移约 ${Math.round(Math.abs(leftDelta))}${unit}。`
      : `- Target B left edge is ${formatOffsetAmount(leftDelta, unit)} ${direction} Source A left edge.`);
  }

  if (Math.abs(topDelta) >= topThreshold) {
    const direction = topDelta > 0 ? "below" : "above";
    details.push(isZh(language)
      ? `- Target B 上边界位于 Source A 上边界${topDelta > 0 ? "下方" : "上方"}，偏移约 ${Math.round(Math.abs(topDelta))}${unit}。`
      : `- Target B top edge is ${formatOffsetAmount(topDelta, unit)} ${direction} Source A top edge.`);
  }

  if (details.length === 0) return;
  lines.push(t(language, "Placement offset:", "放置偏移:"));
  details.forEach(line => lines.push(line));
  lines.push("");
}

function quoteReference(summary: string): string {
  return summary.startsWith("[") ? summary : `"${summary}"`;
}

function pickReference(context: RegionContext, direction: NearbyReference["direction"]): NearbyReference | undefined {
  const references = context.nearby.filter(ref => ref.direction === direction);
  return references.find(ref => !ref.summary.startsWith("[")) ?? references[0];
}

function getProximity(distance: number): "adjacent" | "close" | "nearby context" {
  if (distance <= 16) return "adjacent";
  if (distance <= 64) return "close";
  return "nearby context";
}

function formatAxisGap(distance: number, axis: "X" | "Y"): string {
  const rounded = Math.round(distance);
  return `with about ${rounded}px ${axis === "X" ? "horizontal" : "vertical"} gap`;
}

function formatXConstraint(reference: NearbyReference): string {
  const proximity = getProximity(reference.distance);
  const side = reference.direction === "left" ? "right" : "left";
  const overlapText = reference.direction === "left" ? "while preserving adjacency" : "while avoiding overlap";
  if (proximity === "adjacent") {
    return `- X axis: place Source A immediately to the ${side} of ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "X")}.`;
  }
  if (proximity === "close") {
    return `- X axis: place Source A close to the ${side} of ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "X")}.`;
  }
  return `- X axis: keep Source A to the ${side} of ${quoteReference(reference.summary)} as nearby context, ${formatAxisGap(reference.distance, "X")}, ${overlapText}.`;
}

function formatYConstraint(reference: NearbyReference): string {
  const proximity = getProximity(reference.distance);
  const side = reference.direction === "below" ? "above" : "below";
  if (proximity === "adjacent") {
    return `- Y axis: place Source A immediately ${side} ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "Y")}.`;
  }
  if (proximity === "close") {
    return `- Y axis: keep Source A close ${side} ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "Y")}.`;
  }
  return `- Y axis: keep Source A ${side} ${quoteReference(reference.summary)} as nearby context, ${formatAxisGap(reference.distance, "Y")}.`;
}

function formatGuideConstraint(axis: "X" | "Y", guide: ActiveAlignmentGuide): string {
  return `- ${axis} axis: use recorded guide, Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with ${quoteReference(guide.unitSummary)} ${formatAlignmentEdge(guide.sourceEdge)}.`;
}

function formatXConstraintLocalized(reference: NearbyReference, language: PromptLanguage): string {
  if (!isZh(language)) return formatXConstraint(reference);
  const side = reference.direction === "left" ? "右侧" : "左侧";
  const proximity = getProximity(reference.distance);
  if (proximity === "adjacent") {
    return `- X 轴：将 Source A 紧贴放在 ${quoteReference(reference.summary)} 的${side}，约保持 ${Math.round(reference.distance)}px 横向间距。`;
  }
  if (proximity === "close") {
    return `- X 轴：将 Source A 放在 ${quoteReference(reference.summary)} 的${side}附近，约保持 ${Math.round(reference.distance)}px 横向间距。`;
  }
  return `- X 轴：以 ${quoteReference(reference.summary)} 作为横向邻近参考，将 Source A 保持在其${side}，约保持 ${Math.round(reference.distance)}px 横向间距。`;
}

function formatYConstraintLocalized(reference: NearbyReference, language: PromptLanguage): string {
  if (!isZh(language)) return formatYConstraint(reference);
  const side = reference.direction === "below" ? "上方" : "下方";
  const proximity = getProximity(reference.distance);
  if (proximity === "adjacent") {
    return `- Y 轴：将 Source A 紧贴放在 ${quoteReference(reference.summary)} 的${side}，约保持 ${Math.round(reference.distance)}px 纵向间距。`;
  }
  if (proximity === "close") {
    return `- Y 轴：将 Source A 保持在 ${quoteReference(reference.summary)} 的${side}附近，约保持 ${Math.round(reference.distance)}px 纵向间距。`;
  }
  return `- Y 轴：以 ${quoteReference(reference.summary)} 作为纵向邻近参考，将 Source A 保持在其${side}，约保持 ${Math.round(reference.distance)}px 纵向间距。`;
}

function formatGuideConstraintLocalized(axis: "X" | "Y", guide: ActiveAlignmentGuide, language: PromptLanguage): string {
  if (!isZh(language)) return formatGuideConstraint(axis, guide);
  return `- ${axis} 轴：使用已记录参考线，Target B 的${formatAlignmentEdge(guide.targetEdge)}与 ${quoteReference(guide.unitSummary)} 的${formatAlignmentEdge(guide.sourceEdge)}对齐。`;
}

function getAnchorCenterHint(targetContext: RegionContext, axis: "x" | "y"): { confidence: ConstraintConfidence } | null {
  const hints = targetContext.alignmentHints ?? [];
  const needle = axis === "x" ? "Center X is close to anchor center X" : "Center Y is close to anchor center Y";
  const hint = hints.find((candidate) => candidate.summary.includes(needle));
  if (!hint) return null;
  return { confidence: hint.confidence };
}

function getPlacementOffsetConstraint(
  sourceContext: RegionContext,
  targetContext: RegionContext,
  axis: "x" | "y",
  language: PromptLanguage
): ResolvedAxisConstraint {
  const useRelative = Boolean(sourceContext.region.relativeBox && targetContext.region.relativeBox);
  const sourceBox = sourceContext.region.relativeBox ?? sourceContext.region.viewportBox;
  const targetBox = targetContext.region.relativeBox ?? targetContext.region.viewportBox;
  const unit = useRelative ? "%" : "px";

  if (axis === "x") {
    const delta = targetBox.left - sourceBox.left;
    const direction = delta >= 0 ? (isZh(language) ? "右侧" : "to the right of") : (isZh(language) ? "左侧" : "to the left of");
    return {
      axis,
      confidence: "low",
      relationType: "gap",
      source: "placement-offset",
      text: isZh(language)
        ? `- X 轴：将 Source A 保持在 Source A 左边界${direction}，偏移约 ${Math.round(Math.abs(delta))}${unit}。`
        : `- X axis: use placement offset; Target B left edge is about ${Math.round(Math.abs(delta))}${unit} ${direction} Source A left edge.`
    };
  }

  const delta = targetBox.top - sourceBox.top;
  const direction = delta >= 0 ? (isZh(language) ? "下方" : "below") : (isZh(language) ? "上方" : "above");
  return {
    axis,
    confidence: "low",
    relationType: "gap",
    source: "placement-offset",
    text: isZh(language)
      ? `- Y 轴：将 Source A 保持在 Source A 上边界${direction}，偏移约 ${Math.round(Math.abs(delta))}${unit}。`
      : `- Y axis: use placement offset; Target B top edge is about ${Math.round(Math.abs(delta))}${unit} ${direction} Source A top edge.`
  };
}

function resolveAxisConstraint(
  sourceContext: RegionContext,
  targetContext: RegionContext,
  axis: "x" | "y",
  language: PromptLanguage
): ResolvedAxisConstraint {
  const guides = targetContext.activeAlignmentGuides ?? [];
  const guide = guides.find((candidate) => candidate.axis === axis);
  if (guide) {
    const isCenter = guide.targetEdge === "centerX" || guide.targetEdge === "centerY";
    return {
      axis,
      confidence: "high",
      relationType: isCenter ? "centered" : "align",
      source: "active-guide",
      text: formatGuideConstraintLocalized(axis === "x" ? "X" : "Y", guide, language)
    };
  }

  if (axis === "x") {
    const left = pickReference(targetContext, "left");
    const right = pickReference(targetContext, "right");
    const reference = left ?? right;
    if (reference) {
      return {
        axis,
        confidence: "medium",
        relationType: reference.distance <= 16 ? "adjacent" : "gap",
        source: "nearby",
        text: formatXConstraintLocalized(reference, language)
      };
    }
  } else {
    const below = pickReference(targetContext, "below");
    const above = pickReference(targetContext, "above");
    const reference = below ?? above;
    if (reference) {
      return {
        axis,
        confidence: "medium",
        relationType: reference.distance <= 16 ? "adjacent" : "gap",
        source: "nearby",
        text: formatYConstraintLocalized(reference, language)
      };
    }
  }

  const anchorCenter = getAnchorCenterHint(targetContext, axis);
  if (anchorCenter) {
    return {
      axis,
      confidence: anchorCenter.confidence,
      relationType: "centered",
      source: "anchor-center",
      text: axis === "x"
        ? t(language, "- X axis: center Source A within the shared anchor/container.", "- X 轴：将 Source A 在共享 anchor / 容器内水平居中。")
        : t(language, "- Y axis: center Source A within the shared anchor/container.", "- Y 轴：将 Source A 在共享 anchor / 容器内垂直居中。")
    };
  }

  return getPlacementOffsetConstraint(sourceContext, targetContext, axis, language);
}

function appendPrimaryAxisConstraints(lines: string[], sourceContext: RegionContext, targetContext: RegionContext, language: PromptLanguage): ResolvedAxisConstraint[] {
  const xConstraint = resolveAxisConstraint(sourceContext, targetContext, "x", language);
  const yConstraint = resolveAxisConstraint(sourceContext, targetContext, "y", language);

  lines.push(t(language, "Primary axis constraints:", "主轴约束:"));
  lines.push(xConstraint.text);
  lines.push(yConstraint.text);
  lines.push("");
  return [xConstraint, yConstraint];
}

function appendSecondaryReferences(lines: string[], targetContext: RegionContext, primary: ResolvedAxisConstraint[], language: PromptLanguage): void {
  const guides = targetContext.activeAlignmentGuides ?? [];
  const primaryGuideAxes = new Set(primary.filter((constraint) => constraint.source === "active-guide").map((constraint) => constraint.axis));
  const secondaryGuideLines = guides
    .filter((guide) => !primaryGuideAxes.has(guide.axis))
    .slice(0, 2)
    .map((guide) => isZh(language)
      ? `- Target B 的${formatAlignmentEdge(guide.targetEdge)}与 ${quoteReference(guide.unitSummary)} 的${formatAlignmentEdge(guide.sourceEdge)}对齐（delta: ${Math.round(guide.deltaPx)}px，confidence: ${guide.confidence}）。`
      : `- Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with ${quoteReference(guide.unitSummary)} ${formatAlignmentEdge(guide.sourceEdge)} (delta: ${Math.round(guide.deltaPx)}px, confidence: ${guide.confidence}).`);

  const nearbyLines = targetContext.nearby
    .filter((reference) => {
      if ((reference.direction === "left" || reference.direction === "right") && primary.some((constraint) => constraint.axis === "x" && constraint.source === "nearby")) {
        return false;
      }
      if ((reference.direction === "above" || reference.direction === "below") && primary.some((constraint) => constraint.axis === "y" && constraint.source === "nearby")) {
        return false;
      }
      return true;
    })
    .slice(0, 2)
    .map((reference) => isZh(language)
      ? `- ${formatDirection(reference.direction, language)}：${reference.summary}，距离 ${Math.round(reference.distance)}px（confidence: medium）。`
      : `- ${reference.direction}: ${reference.summary}, ${Math.round(reference.distance)}px away (confidence: medium).`);

  if (secondaryGuideLines.length === 0 && nearbyLines.length === 0) {
    lines.push(t(language, "Secondary references:", "次级参考:"));
    lines.push(t(language, "- None beyond the primary constraints.", "- 除主约束外没有额外次级参考。"));
    lines.push("");
    return;
  }

  lines.push(t(language, "Secondary references:", "次级参考:"));
  secondaryGuideLines.forEach((line) => lines.push(line));
  nearbyLines.forEach((line) => lines.push(line));
  lines.push("");
}

function detectRelationTypes(
  sourceContext: RegionContext,
  targetContext: RegionContext,
  constraints: ResolvedAxisConstraint[],
  language: PromptLanguage
): string {
  const types = new Set<RelationType>();
  constraints.forEach((constraint) => types.add(constraint.relationType));
  if (compareRegionAnchors(sourceContext.region, targetContext.region).shared) {
    types.add("inside");
  }
  const ordered = (["align", "gap", "adjacent", "inside", "centered"] as RelationType[]).filter((type) => types.has(type));
  return isZh(language) ? ordered.join("、") : ordered.join(", ");
}

function appendAnchorAndCoordinateModel(lines: string[], sourceContext: RegionContext, targetContext: RegionContext, language: PromptLanguage): void {
  const relation = compareRegionAnchors(sourceContext.region, targetContext.region);
  lines.push(t(language, "Anchor and coordinate model:", "Anchor 与坐标系:"));
  if (relation.shared) {
    lines.push(t(language, `- Source A and Target B share the same ${sourceContext.region.anchor.kind} anchor. Use this shared anchor coordinate system as the primary placement frame.`, `- Source A 与 Target B 共享同一个 ${sourceContext.region.anchor.kind} anchor，应优先使用这个共享坐标系判断位置。`));
  } else {
    lines.push(t(language, "- Target B appears in a different anchor/section.", "- Target B 看起来位于不同的 anchor / section 中。"));
    lines.push(t(language, `- Treat placement across anchors as lower confidence. Source anchor: ${formatAnchor(sourceContext)}. Target anchor: ${formatAnchor(targetContext)}.`, `- 跨 anchor 的放置关系应降低置信度。Source anchor：${formatAnchor(sourceContext)}；Target anchor：${formatAnchor(targetContext)}。`));
  }
  if (targetContext.region.relativeBox) {
    lines.push(t(language, `- Relative box: ${formatRect(targetContext.region.relativeBox)} relative to target anchor.`, `- 相对框：${formatRect(targetContext.region.relativeBox)}（相对于 Target anchor）。`));
  }
  lines.push(t(language, `- Viewport box fallback: ${formatRect(targetContext.region.viewportBox)}.`, `- 视口坐标回退：${formatRect(targetContext.region.viewportBox)}。`));
  if (targetContext.region.documentBox) {
    lines.push(t(language, `- Document box fallback: ${formatRect(targetContext.region.documentBox)}.`, `- 文档坐标回退：${formatRect(targetContext.region.documentBox)}。`));
  }
  lines.push("");
}

function appendConfidenceNotes(lines: string[], sourceContext: RegionContext, targetContext: RegionContext, primary: ResolvedAxisConstraint[], language: PromptLanguage): void {
  const relation = compareRegionAnchors(sourceContext.region, targetContext.region);
  lines.push(t(language, "Confidence notes:", "置信度说明:"));
  primary.forEach((constraint) => {
    lines.push(isZh(language)
      ? `- ${constraint.axis.toUpperCase()} 轴主约束：${constraint.confidence}（来源：${constraint.source}）。`
      : `- ${constraint.axis.toUpperCase()} axis primary constraint: ${constraint.confidence} confidence (source: ${constraint.source}).`);
  });
  lines.push(relation.shared
    ? t(language, `- Anchor relation: ${relation.confidence} confidence shared anchor.`, `- Anchor 关系：共享 anchor，置信度 ${relation.confidence}。`)
    : t(language, `- Anchor relation: ${relation.confidence} confidence because Source A and Target B use different anchors/sections.`, `- Anchor 关系：Source A 与 Target B 使用不同 anchor / section，因此置信度为 ${relation.confidence}。`));
  lines.push("");
}

function formatAlignmentEdge(edge: AlignmentEdge): string {
  if (edge === "centerX") return "center X";
  if (edge === "centerY") return "center Y";
  return `${edge} edge`;
}

function formatActiveGuide(guide: ActiveAlignmentGuide, language: PromptLanguage): string {
  if (isZh(language)) {
    return `- Target B 的${formatAlignmentEdge(guide.targetEdge)}与 "${guide.unitSummary}" 的${formatAlignmentEdge(guide.sourceEdge)}对齐（delta: ${Math.round(guide.deltaPx)}px）。`;
  }
  return `- Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with "${guide.unitSummary}" ${formatAlignmentEdge(guide.sourceEdge)} (delta: ${Math.round(guide.deltaPx)}px).`;
}

function compactFactGroup(label: keyof CssFacts, facts: CssFacts): string | null {
  const values = facts[label];
  if (!Array.isArray(values) || values.length === 0) return null;
  return `${label}: ${values.slice(0, 5).join("; ")}`;
}

function collectPrimaryCssFacts(context: RegionContext): string[] {
  if (context.empty || context.candidates.length === 0) return [];
  const element = context.candidates[0].unit.element;
  if (!element) return [];

  try {
    const facts = collectCssFacts(element);
    const lines = [`kind: ${facts.kind}`];
    (["base", "text", "media", "layout", "positioning", "hints"] as Array<keyof CssFacts>).forEach((group) => {
      const line = compactFactGroup(group, facts);
      if (line) lines.push(line);
    });
    return lines.slice(0, 8);
  } catch {
    return [];
  }
}

export function extractStyleFacts(context: RegionContext): string[] {
  return collectPrimaryCssFacts(context).filter((line) => line !== "kind: unknown");
}

export function appendCssFacts(lines: string[], context: RegionContext, indent = "", language: PromptLanguage = "en"): void {
  const facts = collectPrimaryCssFacts(context);
  lines.push(`${indent}${t(language, "CSS facts", "CSS 事实")}:`);
  if (facts.length === 0) {
    lines.push(`${indent}- ${t(language, "Not available; use DOM structure and surrounding visual context.", "不可用；请结合 DOM 结构和周围视觉上下文判断。")}`);
    return;
  }

  facts.forEach((fact) => lines.push(`${indent}- ${fact}`));
}

export function getMoveNote(input: IntentPromptInput): string {
  const sourceNote = input.sourceContext.region.userIntent.trim();
  const targetNote = input.targetContext?.region.userIntent.trim() ?? "";
  return sourceNote || targetNote;
}

export function contextHasImage(context: RegionContext): boolean {
  return context.candidates.some((candidate) => candidate.unit.kind === "image");
}

export function appendIntentOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult = false): boolean {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent || "[not provided]";
  const language = ((input as any).__promptLanguage ?? "en") as PromptLanguage;

  lines.push(`${opId} | ${t(language, "type", "类型")}: ${t(language, "intent", "意图")}`);
  lines.push(`${t(language, "User note", "用户说明")}: "${userNote}"`);
  appendContextBlock(lines, t(language, "Target", "目标区域"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendNearbyReferences(lines, sourceContext, "", t(language, "Nearby references", "近邻参考"), language);
  appendCssFacts(lines, sourceContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "预期结果:"));
    lines.push(t(language, "- Implement the user note only inside the selected region and directly related local layout.", "- 只在所选区域及其直接相关的局部布局内落实这条用户说明。"));
    lines.push(t(language, "- Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.", "- 根据措辞判断这条说明是新增、删除、替换、重设样式，还是局部小范围重排。"));
    lines.push(t(language, "- If the selected region is empty, use it as the intended placement area for new content.", "- 如果所选区域为空白，应将其视为新内容的预期放置区域。"));
  }
  lines.push("");

  return contextHasImage(sourceContext);
}

export function appendMoveOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult = false): boolean {
  const { sourceContext, targetContext } = input;
  if (!targetContext) return false;
  const moveNote = getMoveNote(input);
  const language = ((input as any).__promptLanguage ?? "en") as PromptLanguage;

  lines.push(`${opId} | ${t(language, "type", "类型")}: ${t(language, "move", "移动")}`);
  lines.push(`${t(language, "Move note", "移动说明")}: ${moveNote ? `"${moveNote}"` : "[not provided]"}`);
  appendContextBlock(lines, t(language, "Source A", "Source A"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendCssFacts(lines, sourceContext, "", language);
  appendSourceImplementationHint(lines, sourceContext, language);
  lines.push("");

  lines.push(t(language, "Placement summary:", "放置摘要:"));
  lines.push(t(language, "- Treat Source A as the selected visual content group inside Source A's visual box, not as individual child spans or text fragments.", "- 将 Source A 视为视觉框内被选中的整体内容组，而不是若干独立子 span 或零散文本片段。"));
  lines.push(t(language, "- Do not include nearby labels, headings, or parent-container text unless they overlap Source A or are explicitly listed in Source A Region contents.", "- 不要把 Source A 视觉框外的邻近标签、标题或父容器文本纳入移动范围，除非它们与 Source A 发生重叠，或已明确列在 Source A 的区域内容中。"));

  const sBox = sourceContext.region.viewportBox;
  const tBox = targetContext.region.viewportBox;
  const sCenterX = sBox.left + sBox.width / 2;
  const sCenterY = sBox.top + sBox.height / 2;
  const tCenterX = tBox.left + tBox.width / 2;
  const tCenterY = tBox.top + tBox.height / 2;

  let horizontalWord = "";
  if (tCenterX > sCenterX + sBox.width * 0.1) horizontalWord = "shifted to the right of";
  else if (tCenterX < sCenterX - sBox.width * 0.1) horizontalWord = "shifted to the left of";

  let verticalWord = "";
  if (tCenterY < sCenterY - sBox.height * 0.1) verticalWord = "above";
  else if (tCenterY > sCenterY + sBox.height * 0.1) verticalWord = "below";

  if (horizontalWord && verticalWord) {
    lines.push(isZh(language)
      ? `- Target B 位于 Source A 的${verticalWord === "above" ? "上方" : "下方"}，并且相对${horizontalWord.includes("right") ? "右移" : "左移"}。`
      : `- Target B is ${verticalWord} and ${horizontalWord} Source A.`);
  } else if (horizontalWord) {
    lines.push(isZh(language)
      ? `- Target B 相对 Source A ${horizontalWord.includes("right") ? "向右偏移" : "向左偏移"}。`
      : `- Target B is ${horizontalWord} Source A.`);
  } else if (verticalWord) {
    lines.push(isZh(language)
      ? `- Target B 位于 Source A 的${verticalWord === "above" ? "上方" : "下方"}。`
      : `- Target B is ${verticalWord} Source A.`);
  } else {
    lines.push(t(language, `- Target B is roughly at the same position as Source A.`, `- Target B 与 Source A 的位置大致相同。`));
  }
  lines.push("");
  appendPlacementOffset(lines, sourceContext, targetContext, language);
  appendAnchorAndCoordinateModel(lines, sourceContext, targetContext, language);
  const primaryConstraints = appendPrimaryAxisConstraints(lines, sourceContext, targetContext, language);
  lines.push(`${t(language, "Relation types", "关系类型")}: ${detectRelationTypes(sourceContext, targetContext, primaryConstraints, language)}`);
  lines.push("");
  appendSecondaryReferences(lines, targetContext, primaryConstraints, language);
  appendConfidenceNotes(lines, sourceContext, targetContext, primaryConstraints, language);
  appendContextBlock(lines, t(language, "Target B", "Target B"), targetContext, "", language);
  lines.push(t(language, "Target B placement reference:", "Target B 放置参考:"));
  if (targetContext.region.isGhostPreview) {
    lines.push(t(language, "- Target B source: dragged target box.", "- Target B 来源：拖拽得到的目标框。"));
  }
  lines.push(t(language, "- Target B is the destination guide for placement and alignment, not replacement content.", "- Target B 是放置和对齐参考，不代表要替换这里原有内容。"));
  lines.push(t(language, "- Existing content inside Target B is visual context unless it physically blocks the move.", "- 除非现有内容会物理阻挡移动结果，否则应将其视为视觉上下文。"));
  appendRegionContents(lines, targetContext, "", true, language);
  
  appendNearbyReferences(lines, targetContext, "", t(language, "Placement references", "放置参考"), language);
  lines.push("");

  lines.push(t(language, "Final alignment guide:", "最终对齐参考:"));
  if (targetContext.activeAlignmentGuides && targetContext.activeAlignmentGuides.length > 0) {
    targetContext.activeAlignmentGuides.forEach((guide) => {
      lines.push(formatActiveGuide(guide, language));
    });
  } else if (targetContext.alignmentHints && targetContext.alignmentHints.length > 0) {
    const highHints = targetContext.alignmentHints.filter(h => h.confidence === "high");
    
    if (highHints.length === 0) {
      lines.push(t(language, "- None active at drop; use Placement references and Target B visual box.", "- 松手时没有激活参考线；请改用放置参考和 Target B 视觉框判断。"));
    } else {
      highHints.forEach((hint) => {
        lines.push(isZh(language)
          ? `- 松手时没有记录到激活参考线；改用高置信度回退参考：${hint.summary}（delta: ${Math.round(hint.deltaPx)}px，confidence: ${hint.confidence}）。`
          : `- No recorded active guide at drop; calculated high-confidence fallback: ${hint.summary} (delta: ${Math.round(hint.deltaPx)}px, confidence: ${hint.confidence}).`);
      });
    }
  } else {
    lines.push(t(language, "- None active at drop; use Placement references and Target B visual box.", "- 松手时没有激活参考线；请改用放置参考和 Target B 视觉框判断。"));
  }
  
  appendCssFacts(lines, targetContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "预期结果:"));
    lines.push(t(language, "- Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.", "- 结合 DOM 结构、局部容器、当前布局、近邻参考和 CSS 事实，将 Source A 移动到 Target B。"));
    lines.push(t(language, "- Without a move note, infer conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.", "- 如果没有移动说明，应基于 Source A、Target B、视觉框、区域内容、近邻参考和 CSS 事实做保守推断。"));
    lines.push(t(language, "- Treat Source A as the selected visual content group inside Source A's visual box and Target B as its desired final visual placement.", "- 将 Source A 视为 Source A 视觉框内的整体内容组，并将 Target B 视为其预期的最终视觉落点。"));
    lines.push(t(language, "- Do not recreate or preserve ClickDeck editing UI such as selection boxes, target boxes, dashed outlines, badges, or marker labels.", "- 不要重建或保留 ClickDeck 的编辑 UI，例如选择框、目标框、虚线轮廓、徽标或标记标签。"));
    lines.push(t(language, "- Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.", "- 优先通过页面现有布局流实现移动，例如父级对齐、flex/grid 排布、margin、max-width、gap、order 或局部 wrapper。"));
    lines.push(t(language, "- Preserve source content, approximate size, proportions, visual hierarchy, and style unless local fit requires minor spacing adjustments.", "- 除非局部适配确实需要小幅间距调整，否则应保留源内容、大致尺寸、比例、视觉层级和样式。"));
    lines.push(t(language, "- Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.", "- 保留明显的对齐关系，例如边缘对齐、居中、相对偏移和间距节奏。"));
    lines.push(t(language, "- Do not hard-code viewport coordinates as CSS top/left unless the original layout is already explicitly absolute-positioned and that is the smallest safe change.", "- 除非原布局本来就是明确的 absolute 定位，且这是最小安全改动，否则不要把视口坐标硬编码成 CSS top/left。"));
  }
  lines.push("");

  return contextHasImage(sourceContext) || contextHasImage(targetContext);
}

export function appendRemoveOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult = false): boolean {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent.trim();
  const language = ((input as any).__promptLanguage ?? "en") as PromptLanguage;

  lines.push(`${opId} | ${t(language, "type", "类型")}: ${t(language, "remove", "删除")}`);
  lines.push(`${t(language, "Remove note", "删除说明")}: ${userNote ? `"${userNote}"` : "[not provided]"}`);
  appendContextBlock(lines, t(language, "Target", "目标区域"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendNearbyReferences(lines, sourceContext, "", t(language, "Nearby references", "近邻参考"), language);
  appendCssFacts(lines, sourceContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "预期结果:"));
    lines.push(t(language, "- Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.", "- 从源 HTML/CSS 中移除所选区域；只有当这更符合原实现风格时，才使用隐藏而非删除。"));
    lines.push(t(language, "- Preserve surrounding layout where possible.", "- 在可能的情况下保留周围布局。"));
    lines.push(t(language, "- If removal leaves an obvious gap, adjust only local spacing/layout.", "- 如果删除后留下明显空隙，只调整局部间距或布局。"));
    lines.push(t(language, "- Avoid unintended layout shifts outside the selected region and directly related surrounding layout.", "- 避免在所选区域及其直接相关周边之外引入非预期布局偏移。"));
    lines.push(t(language, "- Do not redesign unrelated sections, slides, scripts, or behavior.", "- 不要重做无关的 section、slide、脚本或行为。"));
  }
  lines.push("");

  return false;
}

export function buildIntentPrompt(
  inputs: IntentPromptInput[],
  options: IntentPromptOptions
): PromptBuildResult {
  if (inputs.length === 0) {
    return { ok: false, reason: "empty", message: options.language === "zh" ? "没有提供任何操作指令。" : "No operations provided." };
  }

  for (const input of inputs) {
    if (input.operation.action === "move" && !input.targetContext) {
      return { ok: false, reason: "empty", message: options.language === "zh" ? "移动操作缺少目标区域。" : "Move operation is missing target region." };
    }
  }

  const lines: string[] = [];
  let hasMediaReplacement = false;
  const hasMove = inputs.some((input) => input.operation.action === "move");
  const opIds = inputs.map((_, index) => `OP-${index + 1}`);
  const language = options.language;

  lines.push("ClickDeck AI edit prompt");
  lines.push("");
  lines.push(t(language, "Page context:", "页面上下文:"));
  lines.push(`- URL: ${options.page.url || "unknown"}`);
  lines.push(`- Title: ${options.page.title || "unknown"}`);
  lines.push(t(language, "- Scope: Current active browser page only.", "- 范围：仅限当前活动浏览器页面。"));
  lines.push("");

  lines.push(t(language, "How to use location hints:", "定位信息使用说明:"));
  lines.push(t(language, "1. Use the original HTML structure as the source of truth, then use anchors, region contents, nearby references, and CSS facts to locate the edit.", "1. 以原始 HTML 结构为准，再结合锚点、区域内容、近邻参考和 CSS 事实定位需要修改的对象。"));
  lines.push(t(language, "2. Visual boxes are placement hints, not absolute CSS instructions. Do not blindly convert viewport boxes into hard-coded top/left coordinates.", "2. 视觉框只是放置提示，不是绝对 CSS 指令。不要把视口框盲目转换成硬编码的 top/left 坐标。"));
  lines.push(t(language, "3. Use Target B relativeBox and alignment hints as spatial intent. Prefer stable local layout edits over coordinate-only CSS.", "3. 将 Target B 的 relativeBox 和对齐提示视为空间意图。应优先使用稳定的局部布局修改，而不是仅靠坐标写 CSS。"));
  lines.push(t(language, "4. CSS facts are a short factual snapshot of the selected element, not a full computed-style dump and not a classification rule system.", "4. CSS 事实只是所选元素的简短事实快照，不是完整的 computed-style 导出，也不是一套分类规则系统。"));
  lines.push("");

  lines.push(t(language, "Global editing rules:", "全局编辑规则:"));
  lines.push(t(language, "1. Treat each user note as natural-language editing intent. It may mean adding, deleting, replacing, restyling, or locally rearranging content.", "1. 将每条用户说明视为自然语言编辑意图。它可能表示新增、删除、替换、重设样式，或局部重排内容。"));
  lines.push(t(language, "2. Preserve the user's wording and intent. Do not treat the user note as literal page copy unless the user clearly asks to insert, write as, or replace with exact text.", "2. 保留用户原始措辞和意图。除非用户明确要求插入、写成、或替换为某段精确文本，否则不要把用户说明当成页面字面文案。"));
  lines.push(t(language, "3. Keep changes limited to the selected region and directly related surrounding layout.", "3. 将改动限制在所选区域及其直接相关的周边布局内。"));
  lines.push(t(language, "4. Match the existing visual style unless the user explicitly asks for another style.", "4. 除非用户明确要求另一种风格，否则应匹配现有视觉样式。"));
  lines.push(t(language, "5. If the intent, target, or placement is ambiguous, ask a clarifying question before editing instead of guessing broadly.", "5. 如果意图、目标或放置关系存在歧义，应先提澄清问题，而不是宽泛猜测。"));
  lines.push(t(language, "6. Do not redesign the whole slide/page or modify unrelated pages, slides, sections, content, scripts, or behavior.", "6. 不要重做整个 slide/page，也不要修改无关页面、slide、section、内容、脚本或行为。"));
  lines.push("");

  if (hasMove) {
    lines.push(t(language, "Move operation rules:", "移动操作规则:"));
    lines.push(t(language, "1. If Move note is provided, treat it as the primary semantic explanation of the move.", "1. 如果提供了 Move note，应将其视为这次移动的首要语义说明。"));
    lines.push(t(language, "2. If Move note is [not provided], infer the intent conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.", "2. 如果 Move note 为 [not provided]，应基于 Source A、Target B、视觉框、区域内容、近邻参考和 CSS 事实做保守推断。"));
    lines.push(t(language, "3. Target B is a placement reference, not replacement content.", "3. Target B 是放置参考，不代表要替换那里的现有内容。"));
    lines.push(t(language, "4. Interpret the move as the desired final visual placement of Source A content, not as an instruction to recreate ClickDeck selection boxes, dashed outlines, labels, or target markers.", "4. 将这次移动理解为 Source A 内容的最终视觉落点，而不是要求重建 ClickDeck 的选择框、虚线轮廓、标签或目标标记。"));
    lines.push(t(language, "5. Before changing CSS, identify the existing layout mechanism that controls Source A placement.", "5. 在修改 CSS 前，先识别当前控制 Source A 放置位置的原有布局机制。"));
    lines.push(t(language, "6. Prefer stable local layout edits such as flex/grid alignment, parent alignment, margin, max-width, gap, order, or local wrapper placement.", "6. 优先使用稳定的局部布局修改，例如 flex/grid 对齐、父级对齐、margin、max-width、gap、order 或局部 wrapper 放置。"));
    lines.push(t(language, "7. Preserve source size/proportion/style and only make local spacing adjustments needed to fit.", "7. 保留源内容的尺寸、比例和样式，只做满足落位所需的局部间距调整。"));
    lines.push(t(language, "8. Avoid brittle coordinate-only fixes unless the original layout is already absolute-positioned and no safer local layout edit exists.", "8. 除非原布局本来就是 absolute 定位且没有更安全的局部布局改法，否则不要采用脆弱的纯坐标修补。"));
    lines.push("");
  }

  lines.push(t(language, "Operations:", "操作列表:"));
  lines.push("");

  inputs.forEach((input, index) => {
    const opId = opIds[index];
    if (input.operation.action === "move") {
      (input as any).__promptLanguage = language;
      hasMediaReplacement = appendMoveOperation(lines, input, opId) || hasMediaReplacement;
    } else if (input.operation.action === "remove") {
      (input as any).__promptLanguage = language;
      hasMediaReplacement = appendRemoveOperation(lines, input, opId) || hasMediaReplacement;
    } else {
      (input as any).__promptLanguage = language;
      hasMediaReplacement = appendIntentOperation(lines, input, opId) || hasMediaReplacement;
    }
  });

  lines.push(t(language, "Completion checklist:", "完成核对清单:"));
  lines.push(t(language, `1. Complete every operation exactly once: ${opIds.join(", ")}.`, `1. 逐项完成每个操作且只完成一次：${opIds.join(", ")}。`));
  lines.push(t(language, "2. Before finishing, verify that no operation ID was skipped, merged accidentally, or applied to the wrong region.", "2. 完成前请核对：没有遗漏任何操作 ID，没有意外合并，也没有把操作应用到错误区域。"));
  lines.push(t(language, "3. If any operation is ambiguous or unsafe, list it under `Unresolved` and ask the user a clarifying question instead of silently ignoring it.", "3. 如果某个操作存在歧义或不安全，请将其列入 `Unresolved`，并向用户提澄清问题，而不是直接忽略。"));
  lines.push(t(language, "4. Keep the output as source HTML/CSS changes only; do not add AI APIs, remote code, or unrelated behavior.", "4. 输出应仅包含源 HTML/CSS 变更；不要加入 AI API、远程代码或无关行为。"));

  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasMediaReplacement
  };
}
