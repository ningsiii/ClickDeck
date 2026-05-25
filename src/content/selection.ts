import { isClickDeckUiElement } from "./dom-utils";

export function getEditableTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (isClickDeckUiElement(target)) {
    return null;
  }

  if (target === document.documentElement || target === document.body) {
    return null;
  }

  return target;
}

