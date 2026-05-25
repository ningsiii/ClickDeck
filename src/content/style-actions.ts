import type { ClickDeckLogger } from "../diagnostics/logger";
import type { StyleProperty } from "../state/style-token";
import { describeElement } from "./dom-utils";

export type StyleAction =
  | "font-smaller"
  | "font-larger"
  | "align-left"
  | "align-center"
  | "align-right"
  | "accent"
  | "reset-color";

export type AppliedStyleChange = {
  property: StyleProperty;
  before: string;
  after: string;
};

export function applyStyleAction(
  logger: ClickDeckLogger,
  element: HTMLElement,
  action: StyleAction
): AppliedStyleChange | null {
  const computed = window.getComputedStyle(element);
  let change: AppliedStyleChange | null = null;

  switch (action) {
    case "font-smaller":
      change = {
        property: "fontSize",
        before: element.style.fontSize,
        after: `${Math.max(10, parseFloat(computed.fontSize) - 2)}px`
      };
      break;
    case "font-larger":
      change = {
        property: "fontSize",
        before: element.style.fontSize,
        after: `${parseFloat(computed.fontSize) + 2}px`
      };
      break;
    case "align-left":
      change = {
        property: "textAlign",
        before: element.style.textAlign,
        after: "left"
      };
      break;
    case "align-center":
      change = {
        property: "textAlign",
        before: element.style.textAlign,
        after: "center"
      };
      break;
    case "align-right":
      change = {
        property: "textAlign",
        before: element.style.textAlign,
        after: "right"
      };
      break;
    case "accent":
      change = {
        property: "color",
        before: element.style.color,
        after: "#2563eb"
      };
      break;
    case "reset-color":
      change = {
        property: "color",
        before: element.style.color,
        after: ""
      };
      break;
  }

  if (!change) {
    return null;
  }

  element.style[change.property] = change.after;
  logger.info("Style action applied", { action, target: describeElement(element) });
  return change;
}
