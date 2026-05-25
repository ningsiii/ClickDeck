import { findFirstEditableDescendant, isClickDeckUiElement } from "./dom-utils";

export type TabDirection = "forward" | "backward";

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

export function getEditableTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (!isSelectableElement(target)) {
    return null;
  }

  return target;
}
