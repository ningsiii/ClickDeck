import type { ClickDeckLogger } from "../diagnostics/logger";
import { describeElement } from "./dom-utils";

export type StyleAction =
  | "font-smaller"
  | "font-larger"
  | "align-left"
  | "align-center"
  | "align-right"
  | "accent";

export function applyStyleAction(logger: ClickDeckLogger, element: HTMLElement, action: StyleAction): void {
  const computed = window.getComputedStyle(element);

  switch (action) {
    case "font-smaller":
      element.style.fontSize = `${Math.max(10, parseFloat(computed.fontSize) - 2)}px`;
      break;
    case "font-larger":
      element.style.fontSize = `${parseFloat(computed.fontSize) + 2}px`;
      break;
    case "align-left":
      element.style.textAlign = "left";
      break;
    case "align-center":
      element.style.textAlign = "center";
      break;
    case "align-right":
      element.style.textAlign = "right";
      break;
    case "accent":
      element.style.color = "#2563eb";
      break;
  }

  logger.info("Style action applied", { action, target: describeElement(element) });
}

