export type PanelLabels = {
  active: string;
  close: string;
  selectHint: string;
  selectedHintPrefix: string;
  typography: string;
  weight: string;
  lineHeight: string;
  letterSpacing: string;
  spacing: string;
  margin: string;
  padding: string;
  alignment: string;
  color: string;
  background: string;
  radius: string;
  history: string;
  exportHtml: string;
  exportPdf: string;
  diagnostics: string;
  light: string;
  normal: string;
  bold: string;
  compact: string;
  loose: string;
  tight: string;
  wide: string;
  none: string;
  small: string;
  medium: string;
  large: string;
  warm: string;
  white: string;
  transparent: string;
  image: string;
  imageSource: string;
  imageSize: string;
  imageFit: string;
  imageRadius: string;
  exportHtmlButton: string;
  exportHtmlDesc: string;
  exportPdfLong: string;
  exportPdfA4: string;
  exportPdfSlides: string;
  exportImagePdfLong: string;
  exportImagePdfA4: string;
  exportImagePdfSlides: string;
  imagePdfTooltip: string;
  slidesPdfOnlyHint: string;
  pdfGroup: string;
  imageMax100: string;
  imageContain: string;
  imageCover: string;
  complexSelectedSvg: string;
  complexSelectedCanvas: string;
  complexSelectedFormula: string;
  complexSelectedIframe: string;
  complexSvgHint: string;
  complexCanvasHint: string;
  complexFormulaHint: string;
  complexIframeHint: string;
  svgTextSection: string;
  editSvgText: string;
  svgTextEditableHint: string;
  svgTextNoneEditable: string;
  svgTextComplex: string;
  svgTextWarning: string;
  svgTextEditorTitle: string;
  svgTextApply: string;
  svgTextCancel: string;
  svgTextItemPrefix: string;
  smaller: string;
  larger: string;
  round: string;
  replaceImage: string;
  replaceVideo: string;
  ai: string;
  copyAiPrompt: string;
  noEdits: string;
  left: string;
  center: string;
  right: string;
  auto: string;
  reset: string;
  undo: string;
  redo: string;
  export: string;
  long: string;
  copyDiagnostics: string;
  pickColor: string;
  pickBgColor: string;
  promptPreviewTitle: string;
  promptLangEn: string;
  promptLangZh: string;
  promptEnglishPrimaryNote: string;
  promptChineseReferenceNote: string;
  promptCopy: string;
  promptCopied: string;
  promptClose: string;
  finish: string;
  savedEditsFound: string;
  restore: string;
  dismiss: string;
  clear: string;
  collapse: string;
  restorePanel: string;
  transparency: string;
  promptMediaAIHint: string;
  promptMediaUIReminder: string;
  promptSwitchLangConfirm: string;
  increaseWeight: string;
  decreaseWeight: string;
  increaseLineHeight: string;
  decreaseLineHeight: string;
  increaseLetterSpacing: string;
  decreaseLetterSpacing: string;
  increaseRadius: string;
  decreaseRadius: string;
  increaseMargin: string;
  decreaseMargin: string;
  increasePadding: string;
  decreasePadding: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  present: string;
  noSlides: string;
  exportLongImage: string;
  advanced: string;
  visualEditing: string;
  
  // Intent draft UI
  intentSection: string;
  aiPromptSection: string;
  askGeminiSection: string;
  askGeminiHint: string;
  askGeminiVisibilityHint: string;
  askGeminiToggle: string;
  askGeminiFlow: string;
  askGeminiFlowTooltip: string;
  askGeminiFocus: string;
  askGeminiFocusTooltip: string;
  askGeminiInteraction: string;
  askGeminiInteractionTooltip: string;
  askGeminiCopied: string;
  copyFailed: string;
  addIntent: string;
  intentActionMove: string;
  intentMoveTo: string;
  intentPlaceholder: string;
  intentMovePlaceholder: string;
  intentDragGhost: string;
  intentDragGhostHint: string;
  intentDragToPlace: string;
  intentUsePosition: string;
  intentCancelPreview: string;
  intentMarkRemoval: string;
  intentDelBadge: string;
  removeActionConstraint: string;
  save: string;
  cancel: string;
  delete: string;
  drawRegionHint: string;
  drawTargetRegionHint: string;
  selectTargetRegion: string;
}

const englishLabels: PanelLabels = {
  active: "Active",
  close: "Close",
  selectHint: "Select an element on the page.",
  selectedHintPrefix: "Selected:",
  typography: "Typography",
  weight: "Weight",
  lineHeight: "Line height",
  letterSpacing: "Letter spacing",
  spacing: "Spacing",
  margin: "Margin",
  padding: "Padding",
  alignment: "Alignment",
  color: "Color",
  background: "Background",
  radius: "Radius",
  history: "History",
  exportHtml: "Export HTML",
  exportPdf: "Export PDF",
  diagnostics: "Diagnostics",
  light: "Light",
  normal: "Normal",
  bold: "Bold",
  compact: "Compact",
  loose: "Loose",
  tight: "Tight",
  wide: "Wide",
  none: "None",
  small: "Small",
  medium: "Medium",
  large: "Large",
  warm: "Warm",
  white: "White",
  transparent: "Transparent",
  image: "Image",
  imageSource: "Source",
  imageSize: "Size",
  imageFit: "Fit",
  imageRadius: "Radius",
  exportHtmlButton: "Export HTML",
  exportHtmlDesc: "Export the current page snapshot. ClickDeck edits applied to the page are preserved where possible; source files are not rewritten.",
  exportPdfLong: "PDF Long",
  exportPdfA4: "PDF A4",
  exportPdfSlides: "PDF 16:9",
  exportImagePdfLong: "Image PDF Long",
  exportImagePdfA4: "Image PDF A4",
  exportImagePdfSlides: "Image PDF 16:9",
  imagePdfTooltip: "High fidelity layout preservation, but text is not selectable.",
  slidesPdfOnlyHint: "This page looks like a slide deck. Please use Image PDF 16:9 for slide export.",
  pdfGroup: "PDF (Print)",
  imageMax100: "Max 100%",
  imageContain: "Contain",
  imageCover: "Cover",
  complexSelectedSvg: "Selected: svg",
  complexSelectedCanvas: "Selected: canvas",
  complexSelectedFormula: "Selected: formula",
  complexSelectedIframe: "Selected: iframe",
  complexSvgHint: "Supports outer scaling, spacing, export, and AI prompt handoff. Internal SVG editing is not supported.",
  complexCanvasHint: "Canvas content is drawn output. Only the whole block size and spacing can be adjusted.",
  complexFormulaHint: "Formula regions support only outer size and spacing adjustments. Edit the source formula separately.",
  complexIframeHint: "Embedded iframe content is not edited internally. Modify the loaded page or srcdoc source first.",
  svgTextSection: "SVG text",
  editSvgText: "Edit SVG text",
  svgTextEditableHint: "Simple editable SVG text detected. Text does not reflow automatically.",
  svgTextNoneEditable: "No editable SVG text was detected. It may already be converted into shapes.",
  svgTextComplex: "SVG text was detected, but the structure is too complex to edit safely. Update the original SVG code instead.",
  svgTextWarning: "SVG text does not reflow automatically. Longer text may overflow.",
  svgTextEditorTitle: "Edit SVG text",
  svgTextApply: "Apply",
  svgTextCancel: "Close",
  svgTextItemPrefix: "Text",
  smaller: "-",
  larger: "+",
  round: "Round",
  replaceImage: "Replace image",
  replaceVideo: "Replace video",
  ai: "AI",
  copyAiPrompt: "Copy AI edit prompt",
  noEdits: "No edits to summarize yet.",
  left: "Left",
  center: "Center",
  right: "Right",
  auto: "Auto",
  reset: "Reset",
  undo: "Undo",
  redo: "Redo",
  export: "Export",
  long: "Long",
  copyDiagnostics: "Copy diagnostics",
  pickColor: "Pick color",
  pickBgColor: "Pick bg color",
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "Chinese ref",
  promptEnglishPrimaryNote: "English is the primary execution prompt. Use this version when copying to coding AI.",
  promptChineseReferenceNote: "Chinese is a review-only reference for checking task intent and completeness. Prefer the English version for actual execution.",
  promptCopy: "Copy",
  promptCopied: "Copied!",
  promptClose: "Close",
  finish: "Output",
  savedEditsFound: "Saved edits found",
  restore: "Restore",
  dismiss: "Dismiss",
  clear: "Clear",
  collapse: "Collapse",
  restorePanel: "Restore panel",
  transparency: "Transparency",
  promptMediaAIHint: "If this prompt does not include an image/video file or asset path, please ask the user for the replacement media before changing this src.",
  promptMediaUIReminder: "Media reminder: This prompt references a replaced image or video. When sending it to AI, attach the media file or provide the asset path.",
  promptSwitchLangConfirm: "You have manually edited the prompt. Switching language will discard your changes. Continue?",
  increaseWeight: "Increase weight",
  decreaseWeight: "Decrease weight",
  increaseLineHeight: "Increase line height",
  decreaseLineHeight: "Decrease line height",
  increaseLetterSpacing: "Increase letter spacing",
  decreaseLetterSpacing: "Decrease letter spacing",
  increaseRadius: "Increase radius",
  decreaseRadius: "Decrease radius",
  increaseMargin: "Increase margin",
  decreaseMargin: "Decrease margin",
  increasePadding: "Increase padding",
  decreasePadding: "Decrease padding",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  present: "Present",
  noSlides: "No slides detected",
  exportLongImage: "Export long image",
  advanced: "Advanced",
  visualEditing: "Visual editing",
  
  // Intent draft UI
  intentSection: "Edit suggestions",
  aiPromptSection: "AI Prompt",
  askGeminiSection: "Review with AI",
  askGeminiHint: "Use with an AI that can see the current page. Best for what is on screen now; multi-page decks may still need page-by-page review.",
  askGeminiVisibilityHint: "If parts of the page are hidden, AI suggestions may only be based on currently visible content.",
  askGeminiToggle: "Choose review type",
  askGeminiFlow: "Flow",
  askGeminiFlowTooltip: "Ask AI to review page order, cause-and-effect, and narrative flow.",
  askGeminiFocus: "Focus",
  askGeminiFocusTooltip: "Ask AI to spot weak visual hierarchy and buried key messages.",
  askGeminiInteraction: "Interaction",
  askGeminiInteractionTooltip: "Ask AI to review buttons, tabs, scrolling, and reveal patterns.",
  askGeminiCopied: "Copied. Paste it into Review with AI.",
  copyFailed: "Copy failed",
  addIntent: "Add suggestion",
  intentActionMove: "Move",
  intentMoveTo: "Move to...",
  intentPlaceholder: "Enter your instructions for AI...",
  intentMovePlaceholder: "Optional: align left edge / cover this text / avoid the title / keep size",
  intentDragGhost: "Move target box",
  intentDragGhostHint: "Drag the target box to describe where AI should move this region.\nThis does not change the page yet.",
  intentDragToPlace: "Drag to place",
  intentUsePosition: "Use this position",
  intentCancelPreview: "Cancel preview",
  intentMarkRemoval: "Mark removal",
  intentDelBadge: "Del",
  removeActionConstraint: "Preserve surrounding layout when removing.",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  drawRegionHint: "Drag to draw a region for AI editing",
  drawTargetRegionHint: "Drag to draw target region",
  selectTargetRegion: "Select target region"
};

const chineseLabels: PanelLabels = {
  active: "已启用",
  close: "关闭",
  selectHint: "选择页面中的元素。",
  selectedHintPrefix: "当前选中：",
  typography: "字号",
  weight: "字重",
  lineHeight: "行高",
  letterSpacing: "字间距",
  spacing: "间距",
  margin: "外边距",
  padding: "内边距",
  alignment: "对齐",
  color: "颜色",
  background: "背景",
  radius: "圆角",
  history: "历史",
  exportHtml: "导出 HTML",
  exportPdf: "导出 PDF",
  diagnostics: "诊断",
  light: "轻",
  normal: "正常",
  bold: "加粗",
  compact: "紧凑",
  loose: "宽松",
  tight: "更紧",
  wide: "更宽",
  none: "无",
  small: "小",
  medium: "中",
  large: "大",
  warm: "暖色",
  white: "白色",
  transparent: "透明",
  image: "图片",
  imageSource: "图片来源",
  imageSize: "尺寸",
  imageFit: "裁切",
  imageRadius: "圆角",
  exportHtmlButton: "导出 HTML",
  exportHtmlDesc: "导出当前页面快照。已应用到页面上的 ClickDeck 修改会尽量保留；不会写回原始源代码。",
  exportPdfLong: "PDF 长页",
  exportPdfA4: "PDF A4",
  exportPdfSlides: "PDF 16:9",
  exportImagePdfLong: "图片 PDF 长页",
  exportImagePdfA4: "图片 PDF A4",
  exportImagePdfSlides: "图片 PDF 16:9",
  imagePdfTooltip: "布局高保真还原，但文字不可复制",
  slidesPdfOnlyHint: "检测到这是幻灯片页面，请使用「图片 PDF 16:9」导出。",
  pdfGroup: "PDF 导出",
  imageMax100: "最大 100%",
  imageContain: "完整显示",
  imageCover: "填满裁切",
  complexSelectedSvg: "当前选中：svg",
  complexSelectedCanvas: "当前选中：canvas",
  complexSelectedFormula: "当前选中：公式",
  complexSelectedIframe: "当前选中：iframe",
  complexSvgHint: "支持整体缩放、间距、导出和 AI prompt 交接；不支持编辑 SVG 内部结构。",
  complexCanvasHint: "Canvas 内容是绘制结果，只能调整整体尺寸和间距，不能直接修改内部内容。",
  complexFormulaHint: "公式区域仅支持整体大小和间距调整，内部内容需要修改源公式。",
  complexIframeHint: "iframe 是嵌入页面，不进入内部结构；内部内容需要先修改所加载页面或 srcdoc 源代码。",
  svgTextSection: "SVG 文字",
  editSvgText: "修改 SVG 文字",
  svgTextEditableHint: "检测到可编辑 SVG 文字，仅支持简单文字替换，不会自动重新排版。",
  svgTextNoneEditable: "未检测到可编辑 SVG 文字，可能已被转为图形。",
  svgTextComplex: "检测到 SVG 文字，但结构较复杂，当前无法直接修改。请先修改该 SVG 的原始结构代码。",
  svgTextWarning: "SVG 文字不会自动重新排版，文字变长可能会溢出。",
  svgTextEditorTitle: "修改 SVG 文字",
  svgTextApply: "应用",
  svgTextCancel: "关闭",
  svgTextItemPrefix: "文字",
  smaller: "-",
  larger: "+",
  round: "圆形",
  replaceImage: "替换图片",
  replaceVideo: "替换视频",
  ai: "AI",
  copyAiPrompt: "复制 AI edit prompt",
  noEdits: "当前没有可总结的修改。",
  left: "左",
  center: "居中",
  right: "右",
  auto: "自动",
  reset: "重置",
  undo: "撤销",
  redo: "重做",
  export: "导出",
  long: "长页",
  copyDiagnostics: "复制诊断信息",
  pickColor: "选择颜色",
  pickBgColor: "自定义背景",
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "中文参考",
  promptEnglishPrimaryNote: "English 是正式执行版 prompt。复制给 coding AI 时，优先使用这个版本。",
  promptChineseReferenceNote: "中文仅用于人工核对任务是否完整、目标是否准确、是否有歧义。真正执行时，优先复制 English 版本。",
  promptCopy: "复制",
  promptCopied: "已复制！",
  promptClose: "关闭",
  finish: "输出",
  savedEditsFound: "发现已保存的修改",
  restore: "恢复",
  dismiss: "忽略",
  clear: "清除",
  collapse: "折叠",
  restorePanel: "展开",
  transparency: "透明度",
  promptMediaAIHint: "如果这份 prompt 没有同时提供媒体文件或资源路径，请先向用户索要替换文件，再修改这个 src。",
  promptMediaUIReminder: "媒体提醒：这份 prompt 提到了替换媒体文件。发送给 AI 时，请额外附上媒体文件，或提供项目中的资源路径。",
  promptSwitchLangConfirm: "你已手动编辑了 prompt，切换语言将丢失这些编辑，确定继续吗？",
  increaseWeight: "增大字重",
  decreaseWeight: "减小字重",
  increaseLineHeight: "增大行高",
  decreaseLineHeight: "减小行高",
  increaseLetterSpacing: "增大字间距",
  decreaseLetterSpacing: "减小字间距",
  increaseRadius: "增大圆角",
  decreaseRadius: "减小圆角",
  increaseMargin: "增大外边距",
  decreaseMargin: "减小外边距",
  increasePadding: "增大内边距",
  decreasePadding: "减小内边距",
  alignLeft: "左对齐",
  alignCenter: "居中对齐",
  alignRight: "右对齐",
  present: "演示",
  noSlides: "未检测到可演示分页",
  exportLongImage: "导出长图",
  advanced: "高级选项",
  visualEditing: "视觉编辑",
  
  // Intent draft UI
  intentSection: "修改意见",
  aiPromptSection: "AI Prompt",
  askGeminiSection: "让 AI 看页面",
  askGeminiHint: "给能看见当前页面的 AI 用。更适合评审眼前这一页；如果是多页 deck，通常仍要逐页看逻辑。",
  askGeminiVisibilityHint: "若部分页面未显示，AI 提供的建议可能只基于当前可见内容。",
  askGeminiToggle: "选择评审方向",
  askGeminiFlow: "看逻辑",
  askGeminiFlowTooltip: "让 AI 给页面顺序、因果关系和叙事节奏提建议。",
  askGeminiFocus: "看重点",
  askGeminiFocusTooltip: "让 AI 找出视觉主次问题，提醒哪些重点被埋没。",
  askGeminiInteraction: "看交互",
  askGeminiInteractionTooltip: "让 AI 检查按钮、切换和滚动路径是否顺手。",
  askGeminiCopied: "已复制，可粘贴给 AI 看页面",
  copyFailed: "复制失败",
  addIntent: "添加修改意见",
  intentActionMove: "移动",
  intentMoveTo: "移动到...",
  intentPlaceholder: "输入你想让 AI 做的操作...",
  intentMovePlaceholder: "可选：对齐左边缘 / 盖住这里 / 避开标题 / 保持大小",
  intentDragGhost: "拖动目标框",
  intentDragGhostHint: "拖动目标框来告诉 AI 移动到哪里。\n这不会修改当前页面的 DOM。",
  intentDragToPlace: "拖动到目标位置",
  intentUsePosition: "使用这个位置",
  intentCancelPreview: "取消预览",
  intentMarkRemoval: "标记删除",
  intentDelBadge: "删除",
  removeActionConstraint: "局部删除并保持周围布局稳定，不要引起页面排版崩塌。",
  save: "保存",
  cancel: "取消",
  delete: "删除",
  drawRegionHint: "拖拽框选，告诉 AI 在哪操作",
  drawTargetRegionHint: "拖拽框选，告诉 AI 移动到哪",
  selectTargetRegion: "框选目标区域"
};

export function getPanelLanguage(): "en" | "zh" {
  const extensionLanguage = typeof chrome !== "undefined" ? chrome.i18n?.getUILanguage?.() : undefined;
  const language = extensionLanguage ?? navigator.language ?? "";
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function getPanelLabels(): PanelLabels {
  return getPanelLanguage() === "zh" ? chineseLabels : englishLabels;
}
