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
import { getComplexElementPromptNotes } from "../content/complex-elements";

const PROMPT_COPY = {
  en: {
    pageContext: "Page context:",
    titleLine: (title: string) => `- Title: ${title}`,
    scope: "- Scope: Current active browser page only.",
    todoList: "Execution TodoList:",
    targetLabel: "Target",
    detailsLabel: "Details",
    howToUse: "How to use location hints:",
    howToUseRules: [
      "1. Use the original HTML structure as the source of truth, then use anchors, region contents, nearby references, and CSS facts to locate the edit.",
      "2. Visual boxes are placement hints, not absolute CSS instructions. Do not blindly convert viewport boxes into hard-coded top/left coordinates.",
      "3. Use Target B relativeBox and alignment hints as spatial intent. Prefer stable local layout edits over coordinate-only CSS.",
      "4. CSS facts are a short factual snapshot of the selected element, not a full computed-style dump and not a classification rule system."
    ],
    globalRules: "Global editing rules:",
    globalRuleLines: [
      "1. Keep all unrelated content, layout, and behavior unchanged.",
      "2. Apply the smallest possible code changes.",
      "3. Preserve the user's wording and intent. Do not treat the user note as literal page copy unless explicitly asked.",
      "4. Keep changes limited to the selected region and directly related surrounding layout.",
      "5. Match the existing visual style unless the user explicitly asks for another style.",
      "6. If the intent, target, or placement is ambiguous, ask a clarifying question before editing instead of guessing broadly.",
      "7. Do not redesign the whole slide/page or modify unrelated pages, slides, sections, content, scripts, or behavior."
    ],
    moveRules: "Move operation rules:",
    moveRuleLines: [
      "1. Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.",
      "2. If Move note is [not provided], infer the intent conservatively from visual boxes, region contents, nearby references, and CSS facts.",
      "3. Target B is a placement reference, not replacement content.",
      "4. Interpret the move as the desired final visual placement of Source A content, not as an instruction to recreate ClickDeck selection boxes or markers.",
      "5. Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.",
      "6. Preserve source size/proportion/style and only make local spacing adjustments needed to fit.",
      "7. Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.",
      "8. Avoid brittle coordinate-only fixes unless the original layout is already absolute-positioned and no safer local layout edit exists."
    ],
    removeRules: "Remove operation rules:",
    removeRuleLines: [
      "1. Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.",
      "2. Preserve surrounding layout where possible. If removal leaves an obvious gap, adjust only local spacing/layout.",
      "3. Avoid unintended layout shifts outside the selected region."
    ],
    intentRules: "Intent operation rules:",
    intentRuleLines: [
      "1. Implement the user note only inside the selected region and directly related local layout.",
      "2. Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.",
      "3. If the selected region is empty, use it as the intended placement area for new content."
    ],
    taskDetails: "Task Details:",
    typeLabel: "type",
    patchType: "patch",
    targetField: "Target",
    locatorField: "Locator",
    slideContextField: "Slide/Page Context",
    codeSnippetField: "Context code snippet",
    finalChecklist: "Final alignment checklist:",
    finalChecklistLines: [
      "1. Complete every task in the Execution TodoList exactly once.",
      "2. For each task, match the task id to its detail block before editing.",
      "3. If a task cannot be completed safely or is ambiguous, list it under `Unresolved` with the task id instead of ignoring it.",
      "4. Do not merge two tasks silently, skip a task, or apply one task to the wrong element.",
      "5. Keep source changes minimal and limited to HTML/CSS unless the task explicitly requires otherwise."
    ],
    taskTypeMap: {
      STYLE: "STYLE",
      CONTENT: "CONTENT",
      ATTRIBUTE: "ATTRIBUTE",
      MOVE: "MOVE",
      REMOVE: "REMOVE",
      INTENT: "INTENT"
    }
  },
  zh: {
    pageContext: "页面上下文:",
    titleLine: (title: string) => `- 标题: ${title}`,
    scope: "- 范围：仅限当前活动浏览器页面。",
    todoList: "执行待办清单:",
    targetLabel: "目标",
    detailsLabel: "详情",
    howToUse: "定位信息使用说明:",
    howToUseRules: [
      "1. 以原始 HTML 结构为准，再结合锚点、区域内容、近邻参考和 CSS 事实定位需要修改的对象。",
      "2. 视觉框只是放置提示，不是绝对 CSS 指令。不要把视口框盲目转换成硬编码的 top/left 坐标。",
      "3. 将 Target B 的 relativeBox 和对齐提示视为空间意图。应优先使用稳定的局部布局修改，而不是仅靠坐标写 CSS。",
      "4. CSS 事实只是所选元素的简短事实快照，不是完整的 computed-style 导出，也不是一套分类规则系统。"
    ],
    globalRules: "全局编辑规则:",
    globalRuleLines: [
      "1. 保持所有无关内容、布局和行为不变。",
      "2. 采用尽可能小的代码改动。",
      "3. 保留用户原始措辞和意图。除非用户明确要求，否则不要把用户说明当成页面字面文案。",
      "4. 将改动限制在所选区域及其直接相关的周边布局内。",
      "5. 除非用户明确要求另一种风格，否则应匹配现有视觉样式。",
      "6. 如果意图、目标或放置关系存在歧义，应先提澄清问题，而不是宽泛猜测。",
      "7. 不要重做整个 slide/page，也不要修改无关页面、slide、section、内容、脚本或行为。"
    ],
    moveRules: "移动操作规则:",
    moveRuleLines: [
      "1. 结合 DOM 结构、局部容器、当前布局、近邻参考和 CSS 事实，将 Source A 移动到 Target B。",
      "2. 如果 Move note 为 [not provided]，应基于视觉框、区域内容、近邻参考和 CSS 事实做保守推断。",
      "3. Target B 是放置参考，不代表要替换那里的现有内容。",
      "4. 将这次移动理解为 Source A 内容的最终视觉落点，而不是要求重建 ClickDeck 的选择框或标记。",
      "5. 优先通过页面现有布局流实现移动，例如父级对齐、flex/grid 排布、margin、max-width、gap、order 或局部 wrapper。",
      "6. 保留源内容的尺寸、比例和样式，只做满足落位所需的局部间距调整。",
      "7. 保留明显的对齐关系，例如边缘对齐、居中、相对偏移和间距节奏。",
      "8. 除非原布局本来就是 absolute 定位且没有更安全的局部布局改法，否则不要采用脆弱的纯坐标修补。"
    ],
    removeRules: "删除操作规则:",
    removeRuleLines: [
      "1. 从源 HTML/CSS 中移除所选区域；只有当这更符合原实现风格时，才使用隐藏而非删除。",
      "2. 在可能的情况下保留周围布局；如果删除后留下明显空隙，只调整局部间距或布局。",
      "3. 避免在所选区域之外引入非预期布局偏移。"
    ],
    intentRules: "意图操作规则:",
    intentRuleLines: [
      "1. 只在所选区域及其直接相关的局部布局内落实这条用户说明。",
      "2. 根据措辞判断这条说明是新增、删除、替换、重设样式，还是局部小范围重排。",
      "3. 如果所选区域为空白，应将其视为新内容的预期放置区域。"
    ],
    taskDetails: "任务详情:",
    typeLabel: "类型",
    patchType: "patch",
    targetField: "目标",
    locatorField: "定位路径",
    slideContextField: "所属页面/Slide",
    codeSnippetField: "上下文代码片段",
    finalChecklist: "最终核对清单:",
    finalChecklistLines: [
      "1. 严格逐项完成执行待办清单中的每个任务，且只完成一次。",
      "2. 对每个任务，都要先将任务 id 与对应详情块核对一致后再修改。",
      "3. 如果某个任务无法安全完成或存在歧义，请将其列入 `Unresolved` 并带上任务 id，不要直接忽略。",
      "4. 不要静默合并两个任务、跳过任务，或把某个任务错误应用到别的元素上。",
      "5. 除非任务明确要求，否则应将改动限制在 HTML/CSS 且保持最小。"
    ],
    taskTypeMap: {
      STYLE: "样式",
      CONTENT: "内容",
      ATTRIBUTE: "属性",
      MOVE: "移动",
      REMOVE: "删除",
      INTENT: "意图"
    }
  }
} as const;

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
    outerHTML = outerHTML.replace(/srcdoc="[^"]*"/g, 'srcdoc="[srcdoc hidden]"');
    
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
  const copy = PROMPT_COPY[isZh ? "zh" : "en"];

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
  lines.push(copy.pageContext);
  lines.push(`- URL: ${options.page.url || "unknown"}`);
  lines.push(copy.titleLine(options.page.title || "unknown"));
  lines.push(copy.scope);
  lines.push("");

  // 1. TodoList Generation
  lines.push(copy.todoList);
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
    
    const taskType = copy.taskTypeMap[intent.operation.action.toUpperCase() as keyof typeof copy.taskTypeMap];
    lines.push(`- [ ] ${taskId} | ${taskType} | ${copy.targetLabel}: ${shortTarget} | ${copy.detailsLabel}: ${opId}`);
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
    
    const taskType = changeTypes.map((type) => copy.taskTypeMap[type as keyof typeof copy.taskTypeMap]).join("/");
    lines.push(`- [ ] ${taskId} | ${taskType} | ${copy.targetLabel}: ${group.target} | ${copy.detailsLabel}: ${changeId}`);
    taskMap.push({ id: taskId, type: taskType, ref: changeId });
    changeRefs.push(changeId);
  }
  
  lines.push("");

  // 2. Global Rules
  lines.push(copy.howToUse);
  copy.howToUseRules.forEach((line) => lines.push(line));
  lines.push("");

  lines.push(copy.globalRules);
  copy.globalRuleLines.forEach((line) => lines.push(line));
  lines.push("");

  const hasMove = intents.some((input) => input.operation.action === "move");
  if (hasMove) {
    lines.push(copy.moveRules);
    copy.moveRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }

  const hasRemove = intents.some((input) => input.operation.action === "remove");
  if (hasRemove) {
    lines.push(copy.removeRules);
    copy.removeRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }
  
  const hasGeneralIntent = intents.some((input) => input.operation.action === "intent");
  if (hasGeneralIntent) {
    lines.push(copy.intentRules);
    copy.intentRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }

  // 3. Task Details
  lines.push(copy.taskDetails);
  lines.push("");

  // 3a. Intent Details
  for (let i = 0; i < intents.length; i++) {
    const input = intents[i];
    const opId = intentRefs[i];
    
    if (input.operation.action === "move") {
      (input as any).__promptLanguage = options.language;
      hasMediaReplacement = appendMoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else if (input.operation.action === "remove") {
      (input as any).__promptLanguage = options.language;
      hasMediaReplacement = appendRemoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else {
      (input as any).__promptLanguage = options.language;
      hasMediaReplacement = appendIntentOperation(lines, input, opId, true) || hasMediaReplacement;
    }
  }

  // 3b. Patch Details
  for (let i = 0; i < changeGroups.length; i++) {
    const group = changeGroups[i];
    const changeId = changeRefs[i];
    
    lines.push(`${changeId} | ${copy.typeLabel}: ${copy.patchType}`);
    lines.push(`   ${copy.targetField}: ${group.target}`);
    lines.push(`   ${copy.locatorField}: ${group.locator}`);
    if (group.slideContext) {
      lines.push(`   ${copy.slideContextField}: ${group.slideContext}`);
    }
    if (group.targetElement) {
      lines.push(...getComplexElementPromptNotes(group.targetElement, isZh));
    }

    const snippet = getLocalHtmlSnippet(group.targetElement);
    if (snippet) {
      lines.push(`   ${copy.codeSnippetField}:`);
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
  lines.push(copy.finalChecklist);
  copy.finalChecklistLines.forEach((line) => lines.push(line));

  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasMediaReplacement
  };
}
