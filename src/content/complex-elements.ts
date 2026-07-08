export type ComplexElementKind = "svg" | "canvas" | "formula" | "iframe";

export type ComplexElementInfo = {
  kind: ComplexElementKind;
  label: string;
  promptLabel: string;
};

const FORMULA_SELECTOR = "math, .katex, .mathjax, mjx-container";

export function getComplexElementKind(element: Element | null | undefined): ComplexElementKind | null {
  if (!element) {
    return null;
  }

  const tagName = element.tagName.toLowerCase();
  if (tagName === "svg") return "svg";
  if (tagName === "canvas") return "canvas";
  if (tagName === "iframe") return "iframe";
  if (isFormulaElement(element)) return "formula";
  return null;
}

export function getComplexElementInfo(element: Element | null | undefined): ComplexElementInfo | null {
  if (!element) {
    return null;
  }
  const kind = getComplexElementKind(element);
  if (!kind) {
    return null;
  }

  switch (kind) {
    case "svg":
      return { kind, label: "svg", promptLabel: "inline SVG" };
    case "canvas":
      return { kind, label: "canvas", promptLabel: "canvas" };
    case "formula":
      return { kind, label: "formula", promptLabel: getFormulaPromptLabel(element) };
    case "iframe":
      return { kind, label: "iframe", promptLabel: getIframePromptLabel(element) };
  }
}

export function findComplexElementFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) {
    return null;
  }

  if (isInsideClickDeckUi(target)) {
    return null;
  }

  const directKind = getComplexElementKind(target);
  if (directKind) {
    return target;
  }

  const complex = target.closest(`svg, canvas, iframe, ${FORMULA_SELECTOR}`);
  return complex && !isInsideClickDeckUi(complex) ? complex : null;
}

export function isFormulaElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "math" || tagName === "mjx-container") {
    return true;
  }
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  return element.classList.contains("katex") || element.classList.contains("mathjax");
}

export function isInsideClickDeckUi(element: Element): boolean {
  return Boolean(element.closest("[data-clickdeck='true']"));
}

export function getComplexElementPromptNotes(element: Element, isZh: boolean): string[] {
  const info = getComplexElementInfo(element);
  if (!info) {
    return [];
  }

  if (isZh) {
    const lines = [`   复杂元素：${info.promptLabel}。`];
    if (info.kind === "svg") {
      lines.push("   说明：这是 inline SVG，当前只修改其外层样式，不进入内部 path/text/viewBox 结构。");
    } else if (info.kind === "canvas") {
      lines.push("   说明：这是 canvas，内容是绘制结果；当前只修改外层样式，不识别或修改内部绘图对象。");
    } else if (info.kind === "formula") {
      lines.push("   说明：这是渲染后的公式区域；当前只修改外层样式，不修改内部公式 DOM。");
    } else if (info.kind === "iframe") {
      lines.push(`   说明：这是 iframe 嵌入内容${getIframeDetails(element, true)}；当前只修改外层 iframe，不进入内部页面。`);
    }
    return lines;
  }

  const lines = [`   Complex element: ${info.promptLabel}.`];
  if (info.kind === "svg") {
    lines.push("   Note: This is inline SVG. Only outer styles are changed; internal path/text/viewBox structure is not edited.");
  } else if (info.kind === "canvas") {
    lines.push("   Note: This is canvas. Its content is drawn output; only outer styles are changed.");
  } else if (info.kind === "formula") {
    lines.push("   Note: This is a rendered formula region. Only outer styles are changed; internal formula DOM is not edited.");
  } else if (info.kind === "iframe") {
    lines.push(`   Note: This is embedded iframe content${getIframeDetails(element, false)}. Only the outer iframe is changed; internal DOM is not edited.`);
  }
  return lines;
}

function getFormulaPromptLabel(element: Element): string {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "math") return "formula / MathML";
  if (tagName === "mjx-container") return "formula / MathJax";
  if (element instanceof HTMLElement && element.classList.contains("katex")) return "formula / KaTeX";
  if (element instanceof HTMLElement && element.classList.contains("mathjax")) return "formula / MathJax";
  return "formula";
}

function getIframePromptLabel(element: Element): string {
  if (!(element instanceof HTMLIFrameElement)) {
    return "iframe";
  }
  return element.hasAttribute("srcdoc") ? "iframe / srcdoc" : "iframe";
}

function getIframeDetails(element: Element, isZh: boolean): string {
  if (!(element instanceof HTMLIFrameElement)) {
    return "";
  }
  const details: string[] = [];
  const src = element.getAttribute("src");
  if (src) {
    details.push(`src=${JSON.stringify(src.slice(0, 120))}`);
  }
  if (element.hasAttribute("srcdoc")) {
    details.push(isZh ? "包含 srcdoc" : "has srcdoc");
  }
  return details.length ? ` (${details.join(", ")})` : "";
}
