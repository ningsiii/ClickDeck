import type { EditorPatch } from "../state/editor-state";
import {
  type IntentPromptInput,
  type IntentPromptOptions,
  type PromptBuildResult,
  appendIntentOperation,
  appendMoveOperation,
  appendRemoveOperation
} from "./intent-prompt";
import {
  groupPromptChanges,
  quoteSnippet,
  normalizeAttributeValue,
  summarizeTextChange
} from "./change-summary";
import { isClickDeckUiElement } from "../content/dom-utils";

function getLocalHtmlSnippet(el: HTMLElement | undefined): string | null {
  if (!el) return null;
  
  try {
    // Create a clone to strip clickdeck UI
    const clone = el.cloneNode(true) as HTMLElement;
    const clickdeckElements = clone.querySelectorAll("[id^='clickdeck-'], [class*='clickdeck-']");
    clickdeckElements.forEach(n => n.remove());
    
    if (isClickDeckUiElement(clone)) return null;

    let outerHTML = clone.outerHTML;
    // Remove base64 data URLs if present to avoid prompt bloat
    outerHTML = outerHTML.replace(/src="data:[^"]+"/g, 'src="[data URL hidden]"');
    
    // Trim to 500 chars or 8 lines
    const lines = outerHTML.split('\n');
    let snippet = lines.slice(0, 8).join('\n');
    if (snippet.length > 500) {
      snippet = snippet.substring(0, 500) + "\n... (truncated)";
    } else if (lines.length > 8) {
      snippet += "\n... (truncated)";
    }
    
    return snippet;
  } catch {
    return null;
  }
}

export function buildUnifiedPrompt(
  patches: EditorPatch[],
  intents: IntentPromptInput[],
  options: IntentPromptOptions
): PromptBuildResult {
  const isZh = options.language === "zh";

  const changeGroups = groupPromptChanges(patches);
  
  if (changeGroups.length === 0 && intents.length === 0) {
    return { 
      ok: false, 
      reason: "empty", 
      message: isZh ? "当前没有可总结的修改，请先在页面上做一些调整。" : "No edits to summarize yet. Make some changes first." 
    };
  }

  const lines: string[] = [];
  let hasMediaReplacement = false;
  
  lines.push("ClickDeck AI edit prompt");
  lines.push("");
  lines.push("Page context:");
  lines.push(`- URL: ${options.page.url || "unknown"}`);
  lines.push(`- Title: ${options.page.title || "unknown"}`);
  lines.push("- Scope: Current active browser page only.");
  lines.push("");

  // 1. TodoList Generation
  lines.push("Execution TodoList:");
  let globalTaskId = 1;
  const taskMap: { id: string; type: string; ref: string }[] = [];

  // Generate TodoList for Intents
  const intentRefs: string[] = [];
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    const taskId = `TASK-${globalTaskId++}`;
    const opId = `OP-${i + 1}`;
    let shortTarget = "";
    if (intent.operation.action === "move") {
      shortTarget = `Source A -> Target B`;
    } else {
      const u = intent.sourceContext.region.userIntent;
      shortTarget = u ? `"${u.substring(0, 20)}${u.length > 20 ? '...' : ''}"` : "selected region";
    }
    
    const taskType = intent.operation.action.toUpperCase();
    lines.push(`- [ ] ${taskId} | ${taskType} | Target: ${shortTarget} | Details: ${opId}`);
    taskMap.push({ id: taskId, type: taskType, ref: opId });
    intentRefs.push(opId);
  }

  // Generate TodoList for Patches
  const changeRefs: string[] = [];
  for (let i = 0; i < changeGroups.length; i++) {
    const group = changeGroups[i];
    const taskId = `TASK-${globalTaskId++}`;
    const changeId = `Change-${i + 1}`;
    
    // Summarize the change type
    const changeTypes = [];
    if (group.styleChanges.size > 0) changeTypes.push("STYLE");
    if (group.textChange) changeTypes.push("CONTENT");
    if (group.attributeChanges.size > 0) changeTypes.push("ATTRIBUTE");
    
    const taskType = changeTypes.join("/");
    lines.push(`- [ ] ${taskId} | ${taskType} | Target: ${group.target} | Details: ${changeId}`);
    taskMap.push({ id: taskId, type: taskType, ref: changeId });
    changeRefs.push(changeId);
  }
  
  lines.push("");

  // 2. Global Rules
  lines.push("How to use location hints:");
  lines.push("1. Use the original HTML structure as the source of truth, then use anchors, region contents, nearby references, and CSS facts to locate the edit.");
  lines.push("2. Visual boxes are placement hints, not absolute CSS instructions. Do not blindly convert viewport boxes into hard-coded top/left coordinates.");
  lines.push("3. Use Target B relativeBox and alignment hints as spatial intent. Prefer stable local layout edits over coordinate-only CSS.");
  lines.push("4. CSS facts are a short factual snapshot of the selected element, not a full computed-style dump and not a classification rule system.");
  lines.push("");

  lines.push("Global editing rules:");
  lines.push("1. Keep all unrelated content, layout, and behavior unchanged.");
  lines.push("2. Apply the smallest possible code changes.");
  lines.push("3. Preserve the user's wording and intent. Do not treat the user note as literal page copy unless explicitly asked.");
  lines.push("4. Keep changes limited to the selected region and directly related surrounding layout.");
  lines.push("5. Match the existing visual style unless the user explicitly asks for another style.");
  lines.push("6. If the intent, target, or placement is ambiguous, ask a clarifying question before editing instead of guessing broadly.");
  lines.push("7. Do not redesign the whole slide/page or modify unrelated pages, slides, sections, content, scripts, or behavior.");
  lines.push("");

  const hasMove = intents.some((input) => input.operation.action === "move");
  if (hasMove) {
    lines.push("Move operation rules:");
    lines.push("1. Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.");
    lines.push("2. If Move note is [not provided], infer the intent conservatively from visual boxes, region contents, nearby references, and CSS facts.");
    lines.push("3. Target B is a placement reference, not replacement content.");
    lines.push("4. Interpret the move as the desired final visual placement of Source A content, not as an instruction to recreate ClickDeck selection boxes or markers.");
    lines.push("5. Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.");
    lines.push("6. Preserve source size/proportion/style and only make local spacing adjustments needed to fit.");
    lines.push("7. Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.");
    lines.push("8. Avoid brittle coordinate-only fixes unless the original layout is already absolute-positioned and no safer local layout edit exists.");
    lines.push("");
  }

  const hasRemove = intents.some((input) => input.operation.action === "remove");
  if (hasRemove) {
    lines.push("Remove operation rules:");
    lines.push("1. Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.");
    lines.push("2. Preserve surrounding layout where possible. If removal leaves an obvious gap, adjust only local spacing/layout.");
    lines.push("3. Avoid unintended layout shifts outside the selected region.");
    lines.push("");
  }
  
  const hasGeneralIntent = intents.some((input) => input.operation.action === "intent");
  if (hasGeneralIntent) {
    lines.push("Intent operation rules:");
    lines.push("1. Implement the user note only inside the selected region and directly related local layout.");
    lines.push("2. Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.");
    lines.push("3. If the selected region is empty, use it as the intended placement area for new content.");
    lines.push("");
  }

  // 3. Task Details
  lines.push("Task Details:");
  lines.push("");

  // 3a. Intent Details
  for (let i = 0; i < intents.length; i++) {
    const input = intents[i];
    const opId = intentRefs[i];
    
    if (input.operation.action === "move") {
      hasMediaReplacement = appendMoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else if (input.operation.action === "remove") {
      hasMediaReplacement = appendRemoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else {
      hasMediaReplacement = appendIntentOperation(lines, input, opId, true) || hasMediaReplacement;
    }
  }

  // 3b. Patch Details
  for (let i = 0; i < changeGroups.length; i++) {
    const group = changeGroups[i];
    const changeId = changeRefs[i];
    
    lines.push(`${changeId} | type: patch`);
    lines.push(`   Target: ${group.target}`);
    lines.push(`   Locator: ${group.locator}`);
    if (group.slideContext) {
      lines.push(`   Slide/Page Context: ${group.slideContext}`);
    }

    const snippet = getLocalHtmlSnippet(group.targetElement);
    if (snippet) {
      lines.push(`   Context code snippet:`);
      lines.push(`   \`\`\`html\n   ${snippet.split('\n').join('\n   ')}\n   \`\`\``);
    }

    if (group.textChange) {
      lines.push(...summarizeTextChange(group.textChange.before, group.textChange.after, isZh));
    }

    for (const [prop, change] of Array.from(group.styleChanges.entries())) {
      lines.push(isZh
        ? `   样式修改：${prop} 从 ${quoteSnippet(change.before)} 改为 ${quoteSnippet(change.after)}。`
        : `   Style: ${prop} changed from ${quoteSnippet(change.before)} to ${quoteSnippet(change.after)}.`
      );
    }

    for (const [attr, change] of Array.from(group.attributeChanges.entries())) {
      const after = normalizeAttributeValue(attr, change.after);
      lines.push(isZh
        ? `   属性修改：${attr} 需要替换为 ${quoteSnippet(after)}。`
        : `   Attribute: ${attr} should be replaced with ${quoteSnippet(after)}.`
      );
      
      if (attr === "src") {
        hasMediaReplacement = true;
        lines.push(isZh
          ? `   如果这份 prompt 没有同时提供媒体文件或资源路径，请先向用户索要替换文件，再修改这个 src。`
          : `   If this prompt does not include an image/video file or asset path, please ask the user for the replacement media before changing this src.`
        );
      }
    }
    lines.push("");
  }

  // 4. Final Alignment Checklist
  lines.push("Final alignment checklist:");
  lines.push("1. Complete every task in the Execution TodoList exactly once.");
  lines.push("2. For each task, match the task id to its detail block before editing.");
  lines.push("3. If a task cannot be completed safely or is ambiguous, list it under `Unresolved` with the task id instead of ignoring it.");
  lines.push("4. Do not merge two tasks silently, skip a task, or apply one task to the wrong element.");
  lines.push("5. Keep source changes minimal and limited to HTML/CSS unless the task explicitly requires otherwise.");

  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasMediaReplacement
  };
}
