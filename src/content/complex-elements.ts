export type ComplexElementKind = "svg" | "canvas" | "formula" | "iframe";

export type ComplexElementInfo = {
  kind: ComplexElementKind;
  label: string;
  promptLabel: string;
};

export type EditableSvgTextItem = {
  id: string;
  label: string;
  value: string;
  target: SVGTextElement | SVGTSpanElement;
};

export type SvgTextEditState =
  | { mode: "editable"; items: EditableSvgTextItem[] }
  | { mode: "none" }
  | { mode: "complex" };

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
  const info = getComplexElementInfo(resolvePromptTarget(element));
  if (!info) {
    return [];
  }

  const isSvgTextTarget = isSimpleSvgTextTarget(element);

  if (isZh) {
    const lines = [`   复杂元素：${info.promptLabel}。`];
    if (info.kind === "svg") {
      lines.push(
        isSvgTextTarget
          ? "   说明：这是 inline SVG。当前只替换已检测到的简单 SVG 文字内容，不修改内部路径、图形或 viewBox 结构。"
          : "   说明：这是 inline SVG，当前只修改其外层样式，不进入内部 path/text/viewBox 结构。"
      );
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
    lines.push(
      isSvgTextTarget
        ? "   Note: This is inline SVG. Only detected simple SVG text content is changed; internal paths, graphics, and viewBox structure are not edited."
        : "   Note: This is inline SVG. Only outer styles are changed; internal path/text/viewBox structure is not edited."
    );
  } else if (info.kind === "canvas") {
    lines.push("   Note: This is canvas. Its content is drawn output; only outer styles are changed.");
  } else if (info.kind === "formula") {
    lines.push("   Note: This is a rendered formula region. Only outer styles are changed; internal formula DOM is not edited.");
  } else if (info.kind === "iframe") {
    lines.push(`   Note: This is embedded iframe content${getIframeDetails(element, false)}. Only the outer iframe is changed; internal DOM is not edited.`);
  }
  return lines;
}

function isSimpleSvgTextTarget(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  return tagName === "text" || tagName === "tspan";
}

export function getSvgTextEditState(element: Element | null | undefined): SvgTextEditState | null {
  if (!(element instanceof SVGSVGElement)) {
    return null;
  }

  const textElements = Array.from(element.querySelectorAll("text"));
  if (textElements.length === 0) {
    return { mode: "none" };
  }

  const items: EditableSvgTextItem[] = [];
  let sawComplex = false;

  for (const textEl of textElements) {
    if (isInsideUnsupportedSvgContainer(textEl) || textEl.querySelector("textPath, foreignObject")) {
      sawComplex = true;
      continue;
    }

    if (textEl.children.length === 0) {
      const value = normalizeSvgText(textEl.textContent);
      if (value) {
        items.push({
          id: `text-${items.length + 1}`,
          label: `Text ${items.length + 1}`,
          value,
          target: textEl
        });
      }
      continue;
    }

    const childElements = Array.from(textEl.children);
    const hasOnlySimpleTspans =
      childElements.length > 0 &&
      childElements.every((child) => child.tagName.toLowerCase() === "tspan") &&
      childElements.every((child) => child.children.length === 0) &&
      hasNoDirectTextOutsideChildren(textEl);

    if (!hasOnlySimpleTspans) {
      sawComplex = true;
      continue;
    }

    for (const child of childElements) {
      const tspan = child as SVGTSpanElement;
      const value = normalizeSvgText(tspan.textContent);
      if (!value) {
        continue;
      }
      items.push({
        id: `text-${items.length + 1}`,
        label: `Text ${items.length + 1}`,
        value,
        target: tspan
      });
    }
  }

  if (sawComplex) {
    return { mode: "complex" };
  }

  if (items.length === 0) {
    return { mode: "none" };
  }

  return { mode: "editable", items };
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

function resolvePromptTarget(element: Element): Element {
  if (getComplexElementKind(element)) {
    return element;
  }
  return element.closest(`svg, canvas, iframe, ${FORMULA_SELECTOR}`) ?? element;
}

function isInsideUnsupportedSvgContainer(element: SVGTextElement): boolean {
  return Boolean(element.closest("defs, mask, clipPath, foreignObject"));
}

function hasNoDirectTextOutsideChildren(element: SVGTextElement): boolean {
  return Array.from(element.childNodes).every((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      return true;
    }
    return !(node.textContent ?? "").trim();
  });
}

function normalizeSvgText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
