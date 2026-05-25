export type PanelLabels = {
  active: string;
  close: string;
  selectHint: string;
  typography: string;
  weight: string;
  spacing: string;
  alignment: string;
  color: string;
  history: string;
  exportHtml: string;
  exportPdf: string;
  diagnostics: string;
  light: string;
  normal: string;
  bold: string;
  compact: string;
  loose: string;
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
};

const englishLabels: PanelLabels = {
  active: "Active",
  close: "Close",
  selectHint: "Select an element on the page.",
  typography: "Typography",
  weight: "Weight",
  spacing: "Spacing",
  alignment: "Alignment",
  color: "Color",
  history: "History",
  exportHtml: "Export HTML",
  exportPdf: "Export PDF",
  diagnostics: "Diagnostics",
  light: "Light",
  normal: "Normal",
  bold: "Bold",
  compact: "Compact",
  loose: "Loose",
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
  pickColor: "Pick color"
};

const chineseLabels: PanelLabels = {
  active: "已启用",
  close: "关闭",
  selectHint: "选择页面中的元素。",
  typography: "字号",
  weight: "字重",
  spacing: "间距",
  alignment: "对齐",
  color: "颜色",
  history: "历史",
  exportHtml: "导出 HTML",
  exportPdf: "导出 PDF",
  diagnostics: "诊断",
  light: "轻",
  normal: "正常",
  bold: "加粗",
  compact: "紧凑",
  loose: "宽松",
  left: "左",
  center: "居中",
  right: "右",
  auto: "自动",
  reset: "重置",
  undo: "撤销",
  redo: "重做",
  export: "导出",
  long: "长页",
  copyDiagnostics: "复制诊断",
  pickColor: "选择颜色"
};

export function getPanelLabels(): PanelLabels {
  const extensionLanguage = typeof chrome !== "undefined" ? chrome.i18n?.getUILanguage?.() : undefined;
  const language = extensionLanguage ?? navigator.language ?? "";
  return language.toLowerCase().startsWith("zh") ? chineseLabels : englishLabels;
}

