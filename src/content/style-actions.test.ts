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
    applyStyleAction(logger, element, "accent");
    expect(element.style.color).toBe("rgb(37, 99, 235)"); // #2563eb

    applyStyleAction(logger, element, "reset-color");
    expect(element.style.color).toBe("");
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
    applyStyleAction(logger, element, "spacing-compact");
    expect(element.style.lineHeight).toBe("1.2");

    applyStyleAction(logger, element, "spacing-normal");
    expect(element.style.lineHeight).toBe("1.5");

    applyStyleAction(logger, element, "spacing-loose");
    expect(element.style.lineHeight).toBe("1.8");
  });
});
