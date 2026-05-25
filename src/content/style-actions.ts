import type { ClickDeckLogger } from "../diagnostics/logger";
import type { StyleProperty } from "../state/style-token";
import { describeElement } from "./dom-utils";

export type StyleAction =
  | "font-smaller"
  | "font-larger"
  | "align-left"
  | "align-center"
  | "align-right"
  | "pick-bg-color"
  | "reset-color"
  | "weight-light"
  | "weight-normal"
  | "weight-bold"
  | "spacing-compact"
  | "spacing-normal"
  | "spacing-loose";

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
    case "pick-bg-color": {
      // Walk up the DOM tree to find the nearest ancestor with a non-transparent background
      let bg = "";
      let current: HTMLElement | null = element.parentElement;
      while (current) {
        const computedBg = window.getComputedStyle(current).backgroundColor;
        // "transparent" or "rgba(0, 0, 0, 0)" are both considered transparent
        if (computedBg && computedBg !== "transparent" && computedBg !== "rgba(0, 0, 0, 0)") {
          bg = computedBg;
          break;
        }
        current = current.parentElement;
      }
      if (!bg) {
        logger.info("No non-transparent background found in ancestors");
        return null;
      }
      change = {
        property: "color",
        before: element.style.color,
        after: bg
      };
      break;
    }
    case "reset-color":
      change = {
        property: "color",
        before: element.style.color,
        after: ""
      };
      break;
    case "weight-light":
      change = {
        property: "fontWeight",
        before: element.style.fontWeight,
        after: "300"
      };
      break;
    case "weight-normal":
      change = {
        property: "fontWeight",
        before: element.style.fontWeight,
        after: "normal"
      };
      break;
    case "weight-bold":
      change = {
        property: "fontWeight",
        before: element.style.fontWeight,
        after: "bold"
      };
      break;
    case "spacing-compact":
      change = {
        property: "lineHeight",
        before: element.style.lineHeight,
        after: "1.2"
      };
      break;
    case "spacing-normal":
      change = {
        property: "lineHeight",
        before: element.style.lineHeight,
        after: "1.5"
      };
      break;
    case "spacing-loose":
      change = {
        property: "lineHeight",
        before: element.style.lineHeight,
        after: "1.8"
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
