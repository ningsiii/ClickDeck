export type PanelLabels = {
  active: string;
  close: string;
  selectHint: string;
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
  pdfGroup: string;
  imageMax100: string;
  imageContain: string;
  imageCover: string;
  smaller: string;
  larger: string;
  round: string;
  replaceImage: string;
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
  promptPreviewTitle: string;
  promptLangEn: string;
  promptLangZh: string;
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
  promptImageAIHint: string;
  promptImageUIReminder: string;
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
};

const englishLabels: PanelLabels = {
  active: "Active",
  close: "Close",
  selectHint: "Select an element on the page.",
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
  pdfGroup: "PDF (Print)",
  imageMax100: "Max 100%",
  imageContain: "Contain",
  imageCover: "Cover",
  smaller: "Smaller",
  larger: "Larger",
  round: "Round",
  replaceImage: "Replace image",
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
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "中文",
  promptCopy: "Copy",
  promptCopied: "Copied!",
  promptClose: "Close",
  finish: "Finish",
  savedEditsFound: "Saved edits found",
  restore: "Restore",
  dismiss: "Dismiss",
  clear: "Clear",
  collapse: "Collapse",
  restorePanel: "Restore panel",
  transparency: "Transparency",
  promptImageAIHint: "If this prompt does not include an image file or asset path, please ask the user for the replacement image before changing this src.",
  promptImageUIReminder: "Image reminder: This prompt references a replaced image. When sending it to AI, attach the image file or provide the asset path.",
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
  exportLongImage: "Export long image"
};

const chineseLabels: PanelLabels = {
  active: "已启用",
  close: "关闭",
  selectHint: "选择页面中的元素。",
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
  pdfGroup: "PDF 导出",
  imageMax100: "最大 100%",
  imageContain: "完整显示",
  imageCover: "填满裁切",
  smaller: "变小",
  larger: "变大",
  round: "圆形",
  replaceImage: "替换图片",
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
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "中文",
  promptCopy: "复制",
  promptCopied: "已复制！",
  promptClose: "关闭",
  finish: "完成",
  savedEditsFound: "发现已保存的修改",
  restore: "恢复",
  dismiss: "忽略",
  clear: "清空",
  collapse: "折叠",
  restorePanel: "展开",
  transparency: "透明度",
  promptImageAIHint: "如果这份 prompt 没有同时提供图片文件或资源路径，请先向用户索要替换图片，再修改这个 src。",
  promptImageUIReminder: "图片提醒：这份 prompt 提到了替换图片。发送给 AI 时，请额外附上图片文件，或提供项目中的图片路径。",
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
  exportLongImage: "导出长图"
};

export function getPanelLabels(): PanelLabels {
  const extensionLanguage = typeof chrome !== "undefined" ? chrome.i18n?.getUILanguage?.() : undefined;
  const language = extensionLanguage ?? navigator.language ?? "";
  return language.toLowerCase().startsWith("zh") ? chineseLabels : englishLabels;
}
