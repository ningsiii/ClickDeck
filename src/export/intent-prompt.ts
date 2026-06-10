import { IntentOperation } from "../content/intent-region";
import { collectCssFacts, CssFacts } from "../content/css-facts";
import { RegionCandidate, RegionContext, summarizeVisualUnit } from "../content/region-context";

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

function appendContextBlock(lines: string[], label: string, context: RegionContext, indent = ""): void {
  lines.push(`${indent}${label}:`);
  lines.push(`${indent}- Page mode: ${context.region.pageMode}`);
  lines.push(`${indent}- Anchor: ${formatAnchor(context)}`);
  lines.push(`${indent}- Visual box: ${formatBox(context)}`);
  lines.push(`${indent}- Region confidence: ${context.confidence}`);
}

function appendRegionContents(lines: string[], context: RegionContext, indent = "", isTargetB = false): void {
  lines.push(`${indent}Region contents:`);
  if (context.empty) {
    lines.push(`${indent}- Empty visual area; use it as intended placement area, not as an existing element.`);
    return;
  }

  if (isTargetB && context.candidates.length > 0) {
    const allLowOverlapBlocks = context.candidates.every(c => c.unit.kind === "block" && c.overlapRatio < 0.1);
    if (allLowOverlapBlocks) {
      lines.push(`${indent}- Mostly empty/structural area; use nearby references and alignment hints as placement context.`);
      return;
    }
  }

  context.candidates.slice(0, 3).forEach((candidate) => {
    lines.push(`${indent}- ${formatCandidate(candidate)}`);
  });
}

function appendNearbyReferences(lines: string[], context: RegionContext, indent = ""): void {
  lines.push(`${indent}Nearby references:`);
  if (context.nearby.length === 0) {
    lines.push(`${indent}- None found.`);
    return;
  }

  context.nearby.slice(0, 4).forEach((nearby) => {
    lines.push(`${indent}- ${nearby.direction}: ${nearby.summary} (distance: ${Math.round(nearby.distance)}px)`);
  });
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

function appendCssFacts(lines: string[], context: RegionContext, indent = ""): void {
  const facts = collectPrimaryCssFacts(context);
  lines.push(`${indent}CSS facts:`);
  if (facts.length === 0) {
    lines.push(`${indent}- Not available; use DOM structure and surrounding visual context.`);
    return;
  }

  facts.forEach((fact) => lines.push(`${indent}- ${fact}`));
}

function getMoveNote(input: IntentPromptInput): string {
  const sourceNote = input.sourceContext.region.userIntent.trim();
  const targetNote = input.targetContext?.region.userIntent.trim() ?? "";
  return sourceNote || targetNote;
}

function contextHasImage(context: RegionContext): boolean {
  return context.candidates.some((candidate) => candidate.unit.kind === "image");
}

function appendIntentOperation(lines: string[], input: IntentPromptInput, opId: string): boolean {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent || "[not provided]";

  lines.push(`${opId} | type: intent`);
  lines.push(`User note: "${userNote}"`);
  appendContextBlock(lines, "Target", sourceContext);
  appendRegionContents(lines, sourceContext);
  appendNearbyReferences(lines, sourceContext);
  appendCssFacts(lines, sourceContext);
  lines.push("Expected result:");
  lines.push("- Implement the user note only inside the selected region and directly related local layout.");
  lines.push("- Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.");
  lines.push("- If the selected region is empty, use it as the intended placement area for new content.");
  lines.push("");

  return contextHasImage(sourceContext);
}

function appendMoveOperation(lines: string[], input: IntentPromptInput, opId: string): boolean {
  const { sourceContext, targetContext } = input;
  if (!targetContext) return false;
  const moveNote = getMoveNote(input);

  lines.push(`${opId} | type: move`);
  lines.push(`Move note: ${moveNote ? `"${moveNote}"` : "[not provided]"}`);
  appendContextBlock(lines, "Source A", sourceContext);
  appendRegionContents(lines, sourceContext);
  appendCssFacts(lines, sourceContext);
  lines.push("");
  appendContextBlock(lines, "Target B", targetContext);
  lines.push("Target B placement reference:");
  if (targetContext.region.isGhostPreview) {
    lines.push("- Target B source: dragged target box.");
  }
  lines.push("- Target B is the destination guide for placement and alignment, not replacement content.");
  lines.push("- Existing content inside Target B is visual context unless it physically blocks the move.");
  appendRegionContents(lines, targetContext, "", true);
  
  lines.push("Target B alignment hints:");
  if (targetContext.alignmentHints && targetContext.alignmentHints.length > 0) {
    // Partition high and non-high confidence hints
    const highHints = targetContext.alignmentHints.filter(h => h.confidence === "high");
    const otherHints = targetContext.alignmentHints.filter(h => h.confidence !== "high");
    
    highHints.forEach((hint) => {
      lines.push(`- ${hint.summary} (delta: ${Math.round(hint.deltaPx)}px, confidence: ${hint.confidence}).`);
    });
    
    if (highHints.length === 0) {
      // If only low/medium confidence hints, max 2, prefix with Low-confidence
      otherHints.slice(0, 2).forEach((hint) => {
        lines.push(`- Low-confidence: ${hint.summary} (delta: ${Math.round(hint.deltaPx)}px, confidence: ${hint.confidence}).`);
      });
      lines.push("- Only low-confidence references found; use Target B visual box conservatively.");
    } else {
      otherHints.forEach((hint) => {
        lines.push(`- ${hint.summary} (delta: ${Math.round(hint.deltaPx)}px, confidence: ${hint.confidence}).`);
      });
    }
  } else {
    lines.push("- None detected; use Target B visual box and nearby references conservatively.");
  }
  
  appendNearbyReferences(lines, targetContext);
  appendCssFacts(lines, targetContext);
  lines.push("Expected result:");
  lines.push("- Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.");
  lines.push("- Without a move note, infer conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.");
  lines.push("- Treat Source A as one selected content unit and Target B as its desired final visual placement.");
  lines.push("- Do not recreate or preserve ClickDeck editing UI such as selection boxes, target boxes, dashed outlines, badges, or marker labels.");
  lines.push("- Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.");
  lines.push("- Preserve source content, approximate size, proportions, visual hierarchy, and style unless local fit requires minor spacing adjustments.");
  lines.push("- Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.");
  lines.push("- Do not hard-code viewport coordinates as CSS top/left unless the original layout is already explicitly absolute-positioned and that is the smallest safe change.");
  lines.push("");

  return contextHasImage(sourceContext) || contextHasImage(targetContext);
}

function appendRemoveOperation(lines: string[], input: IntentPromptInput, opId: string): boolean {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent.trim();

  lines.push(`${opId} | type: remove`);
  lines.push(`Remove note: ${userNote ? `"${userNote}"` : "[not provided]"}`);
  appendContextBlock(lines, "Target", sourceContext);
  appendRegionContents(lines, sourceContext);
  appendNearbyReferences(lines, sourceContext);
  appendCssFacts(lines, sourceContext);
  lines.push("Expected result:");
  lines.push("- Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.");
  lines.push("- Preserve surrounding layout where possible.");
  lines.push("- If removal leaves an obvious gap, adjust only local spacing/layout.");
  lines.push("- Avoid unintended layout shifts outside the selected region and directly related surrounding layout.");
  lines.push("- Do not redesign unrelated sections, slides, scripts, or behavior.");
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

  lines.push("ClickDeck AI edit prompt");
  lines.push("");
  lines.push("Page context:");
  lines.push(`- URL: ${options.page.url || "unknown"}`);
  lines.push(`- Title: ${options.page.title || "unknown"}`);
  lines.push("- Scope: Current active browser page only.");
  lines.push("");

  lines.push("How to use location hints:");
  lines.push("1. Use the original HTML structure as the source of truth, then use anchors, region contents, nearby references, and CSS facts to locate the edit.");
  lines.push("2. Visual boxes are placement hints, not absolute CSS instructions. Do not blindly convert viewport boxes into hard-coded top/left coordinates.");
  lines.push("3. Use Target B relativeBox and alignment hints as spatial intent. Prefer stable local layout edits over coordinate-only CSS.");
  lines.push("4. CSS facts are a short factual snapshot of the selected element, not a full computed-style dump and not a classification rule system.");
  lines.push("");

  lines.push("Global editing rules:");
  lines.push("1. Treat each user note as natural-language editing intent. It may mean adding, deleting, replacing, restyling, or locally rearranging content.");
  lines.push("2. Preserve the user's wording and intent. Do not treat the user note as literal page copy unless the user clearly asks to insert, write as, or replace with exact text.");
  lines.push("3. Keep changes limited to the selected region and directly related surrounding layout.");
  lines.push("4. Match the existing visual style unless the user explicitly asks for another style.");
  lines.push("5. If the intent, target, or placement is ambiguous, ask a clarifying question before editing instead of guessing broadly.");
  lines.push("6. Do not redesign the whole slide/page or modify unrelated pages, slides, sections, content, scripts, or behavior.");
  lines.push("");

  if (hasMove) {
    lines.push("Move operation rules:");
    lines.push("1. If Move note is provided, treat it as the primary semantic explanation of the move.");
    lines.push("2. If Move note is [not provided], infer the intent conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.");
    lines.push("3. Target B is a placement reference, not replacement content.");
    lines.push("4. Interpret the move as the desired final visual placement of Source A content, not as an instruction to recreate ClickDeck selection boxes, dashed outlines, labels, or target markers.");
    lines.push("5. Before changing CSS, identify the existing layout mechanism that controls Source A placement.");
    lines.push("6. Prefer stable local layout edits such as flex/grid alignment, parent alignment, margin, max-width, gap, order, or local wrapper placement.");
    lines.push("7. Preserve source size/proportion/style and only make local spacing adjustments needed to fit.");
    lines.push("8. Avoid brittle coordinate-only fixes unless the original layout is already absolute-positioned and no safer local layout edit exists.");
    lines.push("");
  }

  lines.push("Operations:");
  lines.push("");

  inputs.forEach((input, index) => {
    const opId = opIds[index];
    if (input.operation.action === "move") {
      hasMediaReplacement = appendMoveOperation(lines, input, opId) || hasMediaReplacement;
    } else if (input.operation.action === "remove") {
      hasMediaReplacement = appendRemoveOperation(lines, input, opId) || hasMediaReplacement;
    } else {
      hasMediaReplacement = appendIntentOperation(lines, input, opId) || hasMediaReplacement;
    }
  });

  lines.push("Completion checklist:");
  lines.push(`1. Complete every operation exactly once: ${opIds.join(", ")}.`);
  lines.push("2. Before finishing, verify that no operation ID was skipped, merged accidentally, or applied to the wrong region.");
  lines.push("3. If any operation is ambiguous or unsafe, list it under `Unresolved` and ask the user a clarifying question instead of silently ignoring it.");
  lines.push("4. Keep the output as source HTML/CSS changes only; do not add AI APIs, remote code, or unrelated behavior.");

  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasMediaReplacement
  };
}
