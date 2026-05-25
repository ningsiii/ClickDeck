/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { applyStyleAction } from "./style-actions";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("applyStyleAction", () => {
  let element: HTMLElement;
  let logger: ClickDeckLogger;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
  });

  afterEach(() => {
    element?.remove();
  });

  it("applies font-smaller and font-larger", () => {
    element.style.fontSize = "16px";
    
    applyStyleAction(logger, element, "font-larger");
    expect(element.style.fontSize).toBe("18px");

    applyStyleAction(logger, element, "font-smaller");
    expect(element.style.fontSize).toBe("16px");
  });

  it("applies alignments", () => {
    applyStyleAction(logger, element, "align-left");
    expect(element.style.textAlign).toBe("left");

    applyStyleAction(logger, element, "align-center");
    expect(element.style.textAlign).toBe("center");

    applyStyleAction(logger, element, "align-right");
    expect(element.style.textAlign).toBe("right");
  });

  it("applies colors", () => {
    // Mock parent for pick-bg-color
    const parent = document.createElement("div");
    parent.style.backgroundColor = "rgb(255, 0, 0)";
    parent.appendChild(element);
    document.body.appendChild(parent);

    applyStyleAction(logger, element, "pick-bg-color");
    expect(element.style.color).toBe("rgb(255, 0, 0)");

    applyStyleAction(logger, element, "reset-color");
    expect(element.style.color).toBe("");
    
    parent.remove();
  });

  it("applies font weight", () => {
    applyStyleAction(logger, element, "weight-light");
    expect(element.style.fontWeight).toBe("300");

    applyStyleAction(logger, element, "weight-normal");
    expect(element.style.fontWeight).toBe("normal");

    applyStyleAction(logger, element, "weight-bold");
    expect(element.style.fontWeight).toBe("bold");
  });

  it("applies spacing", () => {
    applyStyleAction(logger, element, "lineheight-compact");
    expect(element.style.lineHeight).toBe("1.2");

    applyStyleAction(logger, element, "lineheight-normal");
    expect(element.style.lineHeight).toBe("1.5");

    applyStyleAction(logger, element, "lineheight-loose");
    expect(element.style.lineHeight).toBe("1.8");
  });

  it("applies letter spacing presets", () => {
    applyStyleAction(logger, element, "letterspacing-tight");
    expect(element.style.letterSpacing).toBe("-0.02em");

    applyStyleAction(logger, element, "letterspacing-normal");
    expect(element.style.letterSpacing).toBe("0px");

    applyStyleAction(logger, element, "letterspacing-wide");
    expect(element.style.letterSpacing).toBe("0.04em");
  });

  it("applies background color presets", () => {
    applyStyleAction(logger, element, "bg-warm");
    expect(element.style.backgroundColor).toBe("rgb(247, 243, 234)");

    applyStyleAction(logger, element, "bg-transparent");
    expect(element.style.backgroundColor).toBe("transparent");

    applyStyleAction(logger, element, "bg-reset");
    expect(element.style.backgroundColor).toBe("");
  });

  it("applies border radius presets", () => {
    applyStyleAction(logger, element, "radius-none");
    expect(element.style.borderRadius).toBe("0px");

    applyStyleAction(logger, element, "radius-sm");
    expect(element.style.borderRadius).toBe("6px");

    applyStyleAction(logger, element, "radius-md");
    expect(element.style.borderRadius).toBe("10px");

    applyStyleAction(logger, element, "radius-lg");
    expect(element.style.borderRadius).toBe("16px");
  });
});
