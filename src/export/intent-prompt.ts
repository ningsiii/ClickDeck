import { IntentOperation } from "../content/intent-region";
import { RegionContext, summarizeVisualUnit } from "../content/region-context";

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
  | { ok: true; prompt: string; hasImageReplacement: boolean }
  | { ok: false; reason: "empty"; message: string };

function formatRect(rect: { left: number; top: number; width: number; height: number; right: number; bottom: number }): string {
  return `[x:${Math.round(rect.left)}, y:${Math.round(rect.top)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}]`;
}

export function extractStyleFacts(context: RegionContext): string[] {
  const facts: string[] = [];
  if (context.empty || context.candidates.length === 0) return facts;

  const primaryCandidate = context.candidates[0].unit;
  if (!primaryCandidate.element) return facts;

  try {
    const style = window.getComputedStyle(primaryCandidate.element);
    const fontSize = style.getPropertyValue("font-size");
    const fontWeight = style.getPropertyValue("font-weight");
    const color = style.getPropertyValue("color");
    const bgColor = style.getPropertyValue("background-color");
    const borderRadius = style.getPropertyValue("border-radius");

    if (fontSize && fontSize !== "16px") facts.push(`font-size: ${fontSize}`);
    if (fontWeight && fontWeight !== "400" && fontWeight !== "normal") facts.push(`font-weight: ${fontWeight}`);
    
    // Only push color if it's not transparent or default black
    if (color && color !== "rgb(0, 0, 0)") facts.push(`color: ${color}`);
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") facts.push(`background-color: ${bgColor}`);
    
    if (borderRadius && borderRadius !== "0px") facts.push(`border-radius: ${borderRadius}`);
  } catch (e) {
    // ignore
  }

  return facts.slice(0, 6);
}

export function buildIntentPrompt(
  inputs: IntentPromptInput[],
  options: IntentPromptOptions
): PromptBuildResult {
  if (inputs.length === 0) {
    return { ok: false, reason: "empty", message: options.language === "zh" ? "没有提供任何操作指令。" : "No operations provided." };
  }

  const lines: string[] = [];
  let hasImageReplacement = false;

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const { operation, sourceContext } = input;
    const region = sourceContext.region;

    lines.push(`Operation ${i + 1}`);
    lines.push(`Action: ${operation.action}`);
    lines.push(`User intent: "${region.userIntent}"`);
    lines.push("");

    lines.push("Primary target:");
    lines.push(`- Page mode: ${region.pageMode}`);
    lines.push(`- Main anchor: ${region.anchor.kind}${region.anchor.locator?.descriptor ? ` (${region.anchor.locator.descriptor})` : ""}`);
    
    if (region.relativeBox) {
      lines.push(`- Region: ${formatRect(region.relativeBox)} (relative to anchor, %)`);
    } else {
      lines.push(`- Region: ${formatRect(region.viewportBox)} (viewport px)`);
    }
    lines.push("");

    lines.push("What is inside the region:");
    if (sourceContext.empty) {
      lines.push("This appears to be an empty visual area.");
    } else {
      sourceContext.candidates.slice(0, 3).forEach(c => {
        lines.push(`- ${summarizeVisualUnit(c.unit)}`);
        if (c.unit.kind === "image") hasImageReplacement = true;
      });
    }
    lines.push("");

    lines.push("Nearby references:");
    if (sourceContext.nearby.length === 0) {
      lines.push("None found.");
    } else {
      sourceContext.nearby.slice(0, 4).forEach(n => {
        lines.push(`- ${n.direction}: ${n.summary}`);
      });
    }
    lines.push("");

    lines.push("Style reference:");
    const styleFacts = extractStyleFacts(sourceContext);
    if (styleFacts.length === 0) {
      lines.push("Use surrounding context to match style.");
    } else {
      styleFacts.forEach(fact => {
        lines.push(`- ${fact}`);
      });
    }
    lines.push("");

    // Action specific instructions
    lines.push("Allowed changes:");
    if (operation.action === "add") {
      lines.push("Add new content near or inside the target region. Match the surrounding style.");
    } else if (operation.action === "delete") {
      lines.push("Delete only the contents inside the source region. You may close the gap layout if necessary.");
    } else if (operation.action === "replace") {
      lines.push("Replace the contents inside the source region exactly according to user intent.");
    } else if (operation.action === "restyle") {
      lines.push("Modify the CSS styles of the target region or its immediate contents.");
    }
    lines.push("");

    lines.push("Do not change:");
    if (operation.action === "delete") {
      lines.push("Do not redesign the whole slide/page or modify unrelated content.");
    } else {
      lines.push("Do not modify unrelated content or layout outside the target region.");
    }
    lines.push("");

    lines.push("If uncertain:");
    lines.push("Prioritize keeping the layout unbroken. Ask the user for clarification if the intent is ambiguous.");
    lines.push("");
  }

  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasImageReplacement
  };
}
