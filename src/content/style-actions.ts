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
  | "weight-decrease"
  | "weight-increase"
  | "lineheight-decrease"
  | "lineheight-increase"
  | "letterspacing-decrease"
  | "letterspacing-increase"
  | "margin-decrease"
  | "margin-increase"
  | "padding-decrease"
  | "padding-increase"
  | "bg-warm"
  | "bg-white"
  | "bg-transparent"
  | "bg-reset"
  | "radius-decrease"
  | "radius-increase"
  | "image-width-smaller"
  | "image-width-larger"
  | "image-maxwidth-100"
  | "image-fit-contain"
  | "image-fit-cover"
  | "image-radius-none"
  | "image-radius-sm"
  | "image-radius-lg"
  | "image-radius-round";

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
    case "weight-decrease": {
      const current = readFontWeight(computed.fontWeight);
      change = {
        property: "fontWeight",
        before: element.style.fontWeight,
        after: `${clamp(current - 100, 100, 900)}`
      };
      break;
    }
    case "weight-increase": {
      const current = readFontWeight(computed.fontWeight);
      change = {
        property: "fontWeight",
        before: element.style.fontWeight,
        after: `${clamp(current + 100, 100, 900)}`
      };
      break;
    }
    case "lineheight-decrease": {
      const current = readLineHeightRatio(computed);
      change = {
        property: "lineHeight",
        before: element.style.lineHeight,
        after: `${roundTo(clamp(current - 0.1, 1.0, 2.4), 1)}`
      };
      break;
    }
    case "lineheight-increase": {
      const current = readLineHeightRatio(computed);
      change = {
        property: "lineHeight",
        before: element.style.lineHeight,
        after: `${roundTo(clamp(current + 0.1, 1.0, 2.4), 1)}`
      };
      break;
    }
    case "letterspacing-decrease": {
      const current = readLetterSpacingEm(computed);
      change = {
        property: "letterSpacing",
        before: element.style.letterSpacing,
        after: `${roundTo(clamp(current - 0.02, -0.08, 0.16), 2)}em`
      };
      break;
    }
    case "letterspacing-increase": {
      const current = readLetterSpacingEm(computed);
      change = {
        property: "letterSpacing",
        before: element.style.letterSpacing,
        after: `${roundTo(clamp(current + 0.02, -0.08, 0.16), 2)}em`
      };
      break;
    }
    case "margin-decrease": {
      const current = readPixelValue(computed.marginTop, 0);
      change = {
        property: "margin",
        before: element.style.margin,
        after: `${clamp(current - 4, 0, 96)}px`
      };
      break;
    }
    case "margin-increase": {
      const current = readPixelValue(computed.marginTop, 0);
      change = {
        property: "margin",
        before: element.style.margin,
        after: `${clamp(current + 4, 0, 96)}px`
      };
      break;
    }
    case "padding-decrease": {
      const current = readPixelValue(computed.paddingTop, 0);
      change = {
        property: "padding",
        before: element.style.padding,
        after: `${clamp(current - 4, 0, 96)}px`
      };
      break;
    }
    case "padding-increase": {
      const current = readPixelValue(computed.paddingTop, 0);
      change = {
        property: "padding",
        before: element.style.padding,
        after: `${clamp(current + 4, 0, 96)}px`
      };
      break;
    }
    case "bg-warm":
      change = {
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "#f7f3ea"
      };
      break;
    case "bg-white":
      change = {
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "#ffffff"
      };
      break;
    case "bg-transparent":
      change = {
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "transparent"
      };
      break;
    case "bg-reset":
      change = {
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: ""
      };
      break;
    case "radius-decrease": {
      const current = readPixelValue(computed.borderTopLeftRadius, 0);
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: `${clamp(current - 2, 0, 48)}px`
      };
      break;
    }
    case "radius-increase": {
      const current = readPixelValue(computed.borderTopLeftRadius, 0);
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: `${clamp(current + 2, 0, 48)}px`
      };
      break;
    }
    case "image-width-smaller": {
      const current = element.style.width || computed.width;
      const next = stepSize(current, -1);
      change = {
        property: "width",
        before: element.style.width,
        after: next
      };
      break;
    }
    case "image-width-larger": {
      const current = element.style.width || computed.width;
      const next = stepSize(current, +1);
      change = {
        property: "width",
        before: element.style.width,
        after: next
      };
      break;
    }
    case "image-maxwidth-100":
      change = {
        property: "maxWidth",
        before: element.style.maxWidth,
        after: "100%"
      };
      break;
    case "image-fit-contain":
      change = {
        property: "objectFit",
        before: element.style.objectFit,
        after: "contain"
      };
      break;
    case "image-fit-cover":
      change = {
        property: "objectFit",
        before: element.style.objectFit,
        after: "cover"
      };
      break;
    case "image-radius-none":
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "0"
      };
      break;
    case "image-radius-sm":
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "8px"
      };
      break;
    case "image-radius-lg":
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "16px"
      };
      break;
    case "image-radius-round":
      change = {
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "9999px"
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

function stepSize(value: string, direction: -1 | 1): string {
  const trimmed = (value || "").toString().trim();
  const percentMatch = trimmed.match(/^(-?\\d+(?:\\.\\d+)?)%$/);
  if (percentMatch) {
    const current = Number(percentMatch[1]);
    const delta = 5 * direction;
    const next = clamp(current + delta, 10, 200);
    return `${next}%`;
  }

  const pxMatch = trimmed.match(/^(-?\\d+(?:\\.\\d+)?)px$/);
  if (pxMatch) {
    const current = Number(pxMatch[1]);
    const delta = 20 * direction;
    const next = clamp(current + delta, 20, 2000);
    return `${next}px`;
  }

  // Fallback: try parse float and treat as px.
  const parsed = Number.parseFloat(trimmed);
  if (Number.isFinite(parsed)) {
    const next = clamp(parsed + 20 * direction, 20, 2000);
    return `${next}px`;
  }

  // Last resort: set a reasonable default.
  return direction > 0 ? "320px" : "160px";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, digits: number): number {
  const m = Math.pow(10, digits);
  return Math.round(value * m) / m;
}

function readPixelValue(value: string, fallback: number): number {
  if (!value || value === "normal" || value === "auto") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFontWeight(value: string): number {
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}

function readLineHeightRatio(computed: CSSStyleDeclaration): number {
  const value = computed.lineHeight;
  if (value === "normal") return 1.5;
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    const lhPx = Number(pxMatch[1]);
    const fsPx = readPixelValue(computed.fontSize, 16);
    if (fsPx > 0) return lhPx / fsPx;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && !value.endsWith("px") && !value.endsWith("%")) {
    return parsed;
  }
  return 1.5;
}

function readLetterSpacingEm(computed: CSSStyleDeclaration): number {
  const value = computed.letterSpacing;
  if (value === "normal") return 0;
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    const lsPx = Number(pxMatch[1]);
    const fsPx = readPixelValue(computed.fontSize, 16);
    if (fsPx > 0) return lsPx / fsPx;
  }
  const emMatch = value.match(/^(-?\d+(?:\.\d+)?)em$/);
  if (emMatch) return Number(emMatch[1]);
  return 0;
}
