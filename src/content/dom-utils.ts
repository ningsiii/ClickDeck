import type { ElementLocator } from "../state/editor-state";

export function describeElement(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const className = typeof element.className === "string" && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

export function isClickDeckUiElement(element: HTMLElement): boolean {
  return Boolean(element.closest("[data-clickdeck='true']"));
}

export function createElementLocator(element: HTMLElement): ElementLocator {
  const tagName = element.tagName.toLowerCase();
  const idHint = element.id ? `#${element.id}` : undefined;
  const classHint = pickStableClassHint(element);
  const roleHint = pickRoleHint(element);
  const textSnippet = pickTextSnippet(element);
  const imageHint = pickImageHint(element);
  const siblingIndex = getSiblingIndex(element);

  const descriptorParts = [tagName];
  if (idHint) descriptorParts.push(idHint);
  if (classHint) descriptorParts.push(classHint);
  if (textSnippet) descriptorParts.push(`"${textSnippet}"`);
  const descriptor = descriptorParts.join(" ");

  const cssPath = buildCssPath(element);
  const nthOfTypePath = buildNthOfTypePath(element);

  const { stability, reason } = assessSelectorStability(element, { cssPath, nthOfTypePath });

  return {
    descriptor,
    tagName,
    roleHint,
    textSnippet,
    imageHint,
    classHint,
    idHint,
    cssPath,
    nthOfTypePath,
    siblingIndex,
    parentDescriptor: pickParentDescriptor(element),
    backgroundImageHint: pickBackgroundImageHint(element),
    semanticRole: pickSemanticRole(element),
    semanticAncestor: pickSemanticAncestor(element),
    previousSiblingDescriptor: pickSiblingDescriptor(element, true),
    nextSiblingDescriptor: pickSiblingDescriptor(element, false),
    selectorStability: stability,
    selectorStabilityReason: reason
  };
}

function pickBackgroundImageHint(element: HTMLElement): string | undefined {
  try {
    const style = window.getComputedStyle(element);
    const bg = style.getPropertyValue("background-image");
    if (!bg || bg === "none" || bg === "initial") return undefined;
    if (bg.length > 100) return `${bg.slice(0, 97)}...`;
    return bg;
  } catch {
    return undefined;
  }
}

function pickSemanticRole(element: HTMLElement): string | undefined {
  const tagName = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "p") return "paragraph";
  if (tagName === "img" || tagName === "svg") return "image";
  if (tagName === "button") return "button";
  if (tagName === "a") return "link";
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return "input";
  if (tagName === "table") return "tableLike";
  
  const className = (typeof element.className === "string" ? element.className : "").toLowerCase();
  if (className.includes("card")) return "cardLike";
  if (className.includes("section") || className.includes("container") || className.includes("wrapper")) return "sectionLike";
  if (className.includes("chart") || className.includes("graph")) return "chartLike";
  
  return undefined;
}

function pickSemanticAncestor(element: HTMLElement): string | undefined {
  let curr = element.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const role = pickSemanticRole(curr);
    if (role === "cardLike" || role === "sectionLike") {
      const titleNode = curr.querySelector("h1, h2, h3, h4, h5, h6, .title, .header");
      if (titleNode && titleNode.textContent?.trim()) {
        const titleText = titleNode.textContent.trim();
        return `${role} ("${titleText.length > 20 ? titleText.slice(0, 17) + "..." : titleText}")`;
      }
      return role;
    }
    const slideCtx = getSlideContext(curr);
    if (slideCtx && slideCtx !== describeElement(curr)) {
      return slideCtx;
    }
    curr = curr.parentElement;
  }
  return undefined;
}

function pickSiblingDescriptor(element: HTMLElement, isPrevious: boolean): string | undefined {
  const sibling = isPrevious ? element.previousElementSibling : element.nextElementSibling;
  if (!sibling || !(sibling instanceof HTMLElement)) return undefined;
  return describeElement(sibling);
}

function assessSelectorStability(element: HTMLElement, _paths: { cssPath: string; nthOfTypePath: string }): { stability: "high" | "medium" | "low"; reason: string } {
  if (element.id) {
    return { stability: "high", reason: "Has ID" };
  }
  
  const role = pickSemanticRole(element);
  const classHint = pickStableClassHint(element);
  
  if (classHint && role) {
    return { stability: "high", reason: "Has stable class and semantic role" };
  }
  
  const dataAttrs = Array.from(element.attributes).filter(a => a.name.startsWith("data-") || a.name.startsWith("aria-"));
  if (dataAttrs.length > 0) {
    return { stability: "high", reason: "Has data/aria attributes" };
  }
  
  if (element.textContent?.trim() || role || classHint) {
    return { stability: "medium", reason: "Has some semantic/content hints but relies on nth-of-type" };
  }
  
  return { stability: "low", reason: "Pure nth-of-type chain without text or semantics" };
}

export function canAutoStartTextEditing(element: HTMLElement): boolean {
  if (isClickDeckUiElement(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (
    tagName === "img" ||
    tagName === "button" ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "svg" ||
    tagName === "canvas"
  ) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const text = (element.textContent ?? "").trim();
  return text.length > 0;
}

export function findFirstEditableDescendant(root: HTMLElement): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node as HTMLElement;
    if (!isClickDeckUiElement(element) && element !== document.body && element !== document.documentElement) {
      return element;
    }
    node = walker.nextNode();
  }
  return null;
}

function pickRoleHint(element: HTMLElement): string | undefined {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel.slice(0, 80);

  const role = element.getAttribute("role")?.trim();
  if (role) return role.slice(0, 80);

  return undefined;
}

function pickTextSnippet(element: HTMLElement): string | undefined {
  const raw = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return undefined;
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}

function pickImageHint(element: HTMLElement): string | undefined {
  if (element.tagName.toLowerCase() !== "img") return undefined;
  const img = element as HTMLImageElement;
  const alt = img.alt?.trim();
  if (alt) return alt.length > 80 ? `${alt.slice(0, 77)}...` : alt;

  const src = img.currentSrc || img.src || "";
  const basename = safeBasename(src);
  return basename || undefined;
}

function pickStableClassHint(element: HTMLElement): string | undefined {
  const className = typeof element.className === "string" ? element.className : "";
  const classes = className
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of classes) {
    if (!isLikelyStableToken(candidate)) {
      continue;
    }
    return `.${candidate}`;
  }

  const fallback = classes[0];
  if (fallback && fallback.length <= 32) {
    return `.${fallback}`;
  }

  return undefined;
}

function isLikelyStableToken(value: string): boolean {
  if (value.length > 32) return false;
  if (looksLikeHash(value)) return false;
  if (/^\d+$/.test(value)) return false;
  return true;
}

export function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  let current: HTMLElement | null = element;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}

export function getSlideContext(element: HTMLElement): string | undefined {
  const container = element.closest('section, .slide, .page, [data-slide], [data-page], [aria-roledescription="slide"]');
  if (!container || !(container instanceof HTMLElement)) {
    return undefined;
  }
  
  const dataSlide = container.getAttribute("data-slide");
  const dataPage = container.getAttribute("data-page");
  const ariaLabel = container.getAttribute("aria-label");
  const id = container.id;
  
  if (dataSlide) return `Slide ${dataSlide}`;
  if (dataPage) return `Page ${dataPage}`;
  if (ariaLabel) return ariaLabel;
  if (id) return `Slide #${id}`;

  const firstHeading = container.querySelector('h1, h2, h3');
  if (firstHeading && firstHeading.textContent?.trim()) {
    const headingText = firstHeading.textContent.trim();
    return `Slide "${headingText.length > 30 ? headingText.slice(0, 27) + "..." : headingText}"`;
  }
  
  return describeElement(container);
}

function looksLikeHash(value: string): boolean {
  // Hex-like or base64-like long tokens usually come from build pipelines.
  if (value.length >= 16 && /^[a-f0-9]+$/i.test(value)) return true;
  if (value.length >= 22 && /^[a-z0-9_-]+$/i.test(value)) return true;
  return false;
}

function safeBasename(urlOrPath: string): string {
  try {
    const url = new URL(urlOrPath, window.location.href);
    const pathname = url.pathname || "";
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    const cleaned = urlOrPath.split("?")[0].split("#")[0];
    const last = cleaned.split("/").filter(Boolean).pop() ?? "";
    return last;
  }
}

function buildCssPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    if (current.id) {
      parts.push(`#${cssEscape(current.id)}`);
      break;
    }

    parts.push(simpleSelector(current));
    current = current.parentElement;
  }

  const selector = parts.reverse().join(" > ");
  return selector || simpleSelector(element);
}

function buildNthOfTypePath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    const tag = current.tagName.toLowerCase();
    const index = nthOfTypeIndex(current);
    parts.push(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;
  }

  const selector = parts.reverse().join(" > ");
  return selector || `${element.tagName.toLowerCase()}:nth-of-type(${nthOfTypeIndex(element)})`;
}

function simpleSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const index = nthOfTypeIndex(element);
  return `${tag}:nth-of-type(${index})`;
}

function nthOfTypeIndex(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return 1;
  const tag = element.tagName;
  const siblings = Array.from(parent.children).filter((child) => (child as HTMLElement).tagName === tag);
  const index = siblings.indexOf(element) + 1;
  return index > 0 ? index : 1;
}

function getSiblingIndex(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Array.from(parent.children).indexOf(element);
}

function pickParentDescriptor(element: HTMLElement): string | undefined {
  let current = element.parentElement;
  while (current && current.tagName.toLowerCase() !== "html") {
    const hasId = Boolean(current.id);
    const classHint = pickStableClassHint(current);
    const textSnippet = pickTextSnippet(current);
    const semantic = /^(main|section|article|header|footer|nav|aside)$/i.test(current.tagName);

    if (hasId || classHint || textSnippet || semantic) {
      const parts = [current.tagName.toLowerCase()];
      if (hasId) parts.push(`#${current.id}`);
      if (classHint) parts.push(classHint);
      if (textSnippet) parts.push(`"${textSnippet}"`);
      return parts.join(" ");
    }

    current = current.parentElement;
  }
  return undefined;
}

function cssEscape(value: string): string {
  // Minimal escape to keep selectors valid without adding dependencies.
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\s])/g, "\\$1");
}

export function placeCaretFromPoint(target: HTMLElement, x: number, y: number): boolean {
  try {
    let range: Range | null = null;
    let node: Node | null = null;
    let offset = 0;

    if (typeof document.caretRangeFromPoint === "function") {
      range = document.caretRangeFromPoint(x, y);
      if (range) {
        node = range.startContainer;
        offset = range.startOffset;
      }
    } else if (typeof (document as any).caretPositionFromPoint === "function") {
      const position = (document as any).caretPositionFromPoint(x, y);
      if (position) {
        node = position.offsetNode;
        offset = position.offset;
      }
    }

    if (node && target.contains(node)) {
      // Validate offset bounds
      const maxOffset = node.nodeType === Node.TEXT_NODE ? (node.nodeValue?.length ?? 0) : node.childNodes.length;
      
      if (offset >= 0 && offset <= maxOffset) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.setStart(node, offset);
          newRange.collapse(true);
          sel.addRange(newRange);
          return true;
        }
      }
    }
  } catch (e) {
    // Ignore and fallback
  }

  // Safe fallback: place caret at the end of the target
  try {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(target);
      newRange.collapse(false);
      sel.addRange(newRange);
    }
  } catch (e) {
    // Ignore error
  }

  return false;
}
