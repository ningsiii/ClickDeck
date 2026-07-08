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
    // 1. 字重增加：`normal` 或 `400` -> `500`
    element.style.fontWeight = "400";
    applyStyleAction(logger, element, "weight-increase");
    expect(element.style.fontWeight).toBe("500");

    // 2. 字重减少：`700` -> `600`
    element.style.fontWeight = "700";
    applyStyleAction(logger, element, "weight-decrease");
    expect(element.style.fontWeight).toBe("600");

    // 3. 字重边界：不低于 `100`，不高于 `900`
    element.style.fontWeight = "900";
    applyStyleAction(logger, element, "weight-increase");
    expect(element.style.fontWeight).toBe("900");

    element.style.fontWeight = "100";
    applyStyleAction(logger, element, "weight-decrease");
    expect(element.style.fontWeight).toBe("100");
  });

  it("applies line height", () => {
    // 4. 行距增加：`1.5` -> `1.6`
    element.style.lineHeight = "1.5";
    applyStyleAction(logger, element, "lineheight-increase");
    expect(element.style.lineHeight).toBe("1.6");

    // 5. 行距减少：`1.5` -> `1.4`
    element.style.lineHeight = "1.5";
    applyStyleAction(logger, element, "lineheight-decrease");
    expect(element.style.lineHeight).toBe("1.4");
  });

  it("applies letter spacing", () => {
    // 6. 字距增加：`normal` -> 正向 em 值 (assume computed reads normal as 0)
    element.style.letterSpacing = "0em";
    applyStyleAction(logger, element, "letterspacing-increase");
    expect(element.style.letterSpacing).toBe("0.02em");

    // 7. 字距减少：`0em` -> 负向 em 值，但不低于下限
    element.style.letterSpacing = "-0.08em";
    applyStyleAction(logger, element, "letterspacing-decrease");
    expect(element.style.letterSpacing).toBe("-0.08em");
  });

  it("applies border radius", () => {
    // 8. 圆角增加：`8px` -> `10px`
    element.style.borderTopLeftRadius = "8px";
    element.style.borderRadius = "8px";
    applyStyleAction(logger, element, "radius-increase");
    expect(element.style.borderRadius).toBe("10px");

    // 9. 圆角减少：`8px` -> `6px`
    element.style.borderTopLeftRadius = "8px";
    element.style.borderRadius = "8px";
    applyStyleAction(logger, element, "radius-decrease");
    expect(element.style.borderRadius).toBe("6px");
  });

  it("applies margin and padding", () => {
    // 10. margin / padding 增减分别生效
    element.style.margin = "10px";
    applyStyleAction(logger, element, "margin-increase");
    expect(element.style.margin).toBe("14px");

    element.style.margin = "10px";
    applyStyleAction(logger, element, "margin-decrease");
    expect(element.style.margin).toBe("6px");

    element.style.padding = "10px";
    applyStyleAction(logger, element, "padding-increase");
    expect(element.style.padding).toBe("14px");

    element.style.padding = "10px";
    applyStyleAction(logger, element, "padding-decrease");
    expect(element.style.padding).toBe("6px");
  });

  it("applies proportional media scale actions for images", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    img.style.width = "200px";
    img.style.height = "100px";
    const largerChanges = applyStyleAction(logger, img, "image-width-larger");
    expect(img.style.width).toBe("220px");
    expect(img.style.height).toBe("auto");
    expect(largerChanges?.map(change => change.property)).toEqual(["width", "height"]);

    const smallerChanges = applyStyleAction(logger, img, "image-width-smaller");
    expect(img.style.width).toBe("200px");
    expect(img.style.height).toBe("auto");
    expect(smallerChanges?.map(change => change.property)).toEqual(["width", "height"]);

    applyStyleAction(logger, img, "image-maxwidth-100");
    expect(img.style.maxWidth).toBe("100%");

    applyStyleAction(logger, img, "image-fit-contain");
    expect(img.style.objectFit).toBe("contain");

    applyStyleAction(logger, img, "image-fit-cover");
    expect(img.style.objectFit).toBe("cover");

    img.remove();
  });

  it("applies proportional media scale actions for videos", () => {
    const video = document.createElement("video");
    document.body.appendChild(video);

    video.style.width = "320px";
    video.style.height = "180px";

    const largerChanges = applyStyleAction(logger, video, "image-width-larger");
    expect(video.style.width).toBe("340px");
    expect(video.style.height).toBe("auto");
    expect(largerChanges?.map(change => change.property)).toEqual(["width", "height"]);

    const smallerChanges = applyStyleAction(logger, video, "image-width-smaller");
    expect(video.style.width).toBe("320px");
    expect(video.style.height).toBe("auto");
    expect(smallerChanges?.map(change => change.property)).toEqual(["width", "height"]);

    video.remove();
  });

  it("scales formula blocks through outer font size", () => {
    const formula = document.createElement("span");
    formula.className = "katex";
    formula.style.fontSize = "20px";
    formula.innerHTML = "<span>x + 1</span>";
    document.body.appendChild(formula);

    const largerChanges = applyStyleAction(logger, formula, "image-width-larger");
    expect(formula.style.fontSize).toBe("22px");
    expect(formula.style.width).toBe("");
    expect(largerChanges?.map(change => change.property)).toEqual(["fontSize"]);

    const smallerChanges = applyStyleAction(logger, formula, "image-width-smaller");
    expect(formula.style.fontSize).toBe("20px");
    expect(smallerChanges?.map(change => change.property)).toEqual(["fontSize"]);

    formula.remove();
  });

  it("applies image radius presets including round", () => {
    const img = document.createElement("img");
    document.body.appendChild(img);

    applyStyleAction(logger, img, "image-radius-none");
    expect(img.style.borderRadius).toBe("0px");

    applyStyleAction(logger, img, "image-radius-sm");
    expect(img.style.borderRadius).toBe("8px");

    applyStyleAction(logger, img, "image-radius-lg");
    expect(img.style.borderRadius).toBe("16px");

    applyStyleAction(logger, img, "image-radius-round");
    expect(img.style.borderRadius).toBe("9999px");

    img.remove();
  });
});
