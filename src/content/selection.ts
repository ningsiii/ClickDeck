import { findFirstEditableDescendant, findMeaningfulDescendant, isClickDeckUiElement } from "./dom-utils";
import { findComplexElementFromTarget } from "./complex-elements";

export type TabDirection = "forward" | "backward";
export type EditableTargetResolutionSource =
  | "none"
  | "direct"
  | "large-container-fallback"
  | "background-block";
export type EditableTargetResolution = {
  target: HTMLElement | null;
  source: EditableTargetResolutionSource;
};

export function isSelectableElement(element: HTMLElement): boolean {
  if (isClickDeckUiElement(element)) {
    return false;
  }

  if (element === document.documentElement || element === document.body) {
    return false;
  }

  return true;
}

export function getTabSwitchTarget(
  current: HTMLElement,
  direction: TabDirection
): HTMLElement | null {
  const parent = current.parentElement;
  const child = findFirstEditableDescendant(current);

  const parentEligible = parent ? isSelectableElement(parent) : false;
  const childEligible = child ? isSelectableElement(child) : false;

  // Deterministic + easy-to-test rule:
  // - Tab: prefer parent, otherwise first eligible descendant.
  // - Shift+Tab: prefer first eligible descendant, otherwise parent.
  if (direction === "forward") {
    if (parentEligible) return parent;
    if (childEligible) return child;
    return null;
  }

  if (childEligible) return child;
  if (parentEligible) return parent;
  return null;
}

export function isLargeContainer(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === "img" || tagName === "video" || tagName === "svg" || tagName === "canvas") {
    return false;
  }
  
  if (["button", "input", "select", "textarea", "a", "label"].includes(tagName)) {
    return false;
  }

  const role = element.getAttribute("role");
  if (role === "dialog" || role === "toolbar" || role === "navigation") {
    return false;
  }
  if (element.getAttribute("aria-modal") === "true") {
    return false;
  }
  if (["dialog", "nav", "form", "table"].includes(tagName)) {
    return false;
  }
  if (element.isContentEditable) {
    return false;
  }

  try {
    const style = window.getComputedStyle(element);
    if (style.position === "fixed" || style.position === "sticky") {
      return false;
    }
  } catch {
    // ignore
  }

  const rect = element.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  const elementArea = rect.width * rect.height;

  if (elementArea <= viewportArea * 0.4) {
    return false;
  }

  const layoutTags = ["div", "main", "section", "article", "header", "footer", "aside"];
  if (!layoutTags.includes(tagName)) {
    return false;
  }

  if (!findMeaningfulDescendant(element)) {
    return false;
  }

  return true;
}

export function getEditableTarget(
  target: EventTarget | null,
  currentSelected?: HTMLElement | null
): HTMLElement | null {
  return resolveEditableTarget(target, currentSelected).target;
}

export function resolveEditableTarget(
  target: EventTarget | null,
  currentSelected?: HTMLElement | null
): EditableTargetResolution {
  const complexElement = findComplexElementFromTarget(target);
  if (complexElement) {
    return { target: complexElement as unknown as HTMLElement, source: "direct" };
  }

  if (!(target instanceof HTMLElement)) {
    return { target: null, source: "none" };
  }

  if (!isSelectableElement(target)) {
    return { target: null, source: "none" };
  }

  if (isLargeContainer(target)) {
    if (currentSelected === target) {
      return { target, source: "direct" };
    }

    const child = findMeaningfulDescendant(target);
    if (child && isSelectableElement(child)) {
      return { target: child, source: "large-container-fallback" };
    }
  }

  if (!isExplicitContentTarget(target)) {
    return { target: null, source: "background-block" };
  }

  return { target, source: "direct" };
}

function isExplicitContentTarget(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  if (
    /^h[1-6]$/.test(tagName) ||
    [
      "span",
      "p",
      "li",
      "td",
      "th",
      "strong",
      "em",
      "b",
      "i",
      "small",
      "mark",
      "code",
      "pre",
      "blockquote",
      "img",
      "video",
      "svg",
      "canvas",
      "button",
      "input",
      "select",
      "textarea",
      "a",
      "label"
    ].includes(tagName)
  ) {
    return true;
  }

  if (element.isContentEditable) {
    return true;
  }

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return true;
    }
  }

  return false;
}
