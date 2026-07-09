// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from "vitest";
import {
  compareRegionAnchors,
  normalizeRect,
  toDocumentRect,
  toRelativeRect,
  detectPageMode,
  findRegionAnchor,
  createIntentRegion
} from "./intent-region";

describe("Intent Region Core Functions", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Reset global scroll values for JSDOM
    window.scrollX = 0;
    window.scrollY = 0;
  });

  it("normalizeRect should fill missing right and bottom", () => {
    const rect = normalizeRect({ left: 10, top: 20, width: 100, height: 50 });
    expect(rect.right).toBe(110);
    expect(rect.bottom).toBe(70);
  });

  it("toDocumentRect should add scroll offsets", () => {
    const viewportBox = normalizeRect({ left: 10, top: 20, width: 100, height: 50 });
    const docBox = toDocumentRect(viewportBox, 15, 25);
    expect(docBox.left).toBe(25);
    expect(docBox.top).toBe(45);
    expect(docBox.right).toBe(125);
    expect(docBox.bottom).toBe(95);
  });

  it("toRelativeRect should correctly compute percentage based coordinates", () => {
    const anchorRect = normalizeRect({ left: 100, top: 100, width: 400, height: 400 });
    const box = normalizeRect({ left: 200, top: 300, width: 100, height: 50 });
    
    const rel = toRelativeRect(box, anchorRect);
    // (200 - 100) / 400 = 0.25 => 25%
    expect(rel.left).toBe(25);
    // (300 - 100) / 400 = 0.50 => 50%
    expect(rel.top).toBe(50);
    // 100 / 400 => 25%
    expect(rel.width).toBe(25);
    // 50 / 400 => 12.5%
    expect(rel.height).toBe(12.5);
    expect(rel.right).toBe(50);
    expect(rel.bottom).toBe(62.5);
  });

  it("detectPageMode should identify slide mode by aria-roledescription", () => {
    const div = document.createElement("div");
    div.setAttribute("aria-roledescription", "slide");
    document.body.appendChild(div);
    
    expect(detectPageMode(document.body)).toBe("slide");
  });

  it("detectPageMode should not trigger slide mode for a single generic section", () => {
    document.body.innerHTML = `
      <section style="width: 1000px; height: 1000px;"></section>
    `;
    // Mock dimensions
    const section = document.querySelector("section") as HTMLElement;
    (section as any).getBoundingClientRect = () => ({ width: 1000, height: 1000 });
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    expect(detectPageMode(document.body)).toBe("unknown");
  });

  it("detectPageMode should trigger slide mode for multiple large generic sections", () => {
    document.body.innerHTML = `
      <section style="width: 1000px; height: 1000px;"></section>
      <section style="width: 1000px; height: 1000px;"></section>
    `;
    const sections = document.querySelectorAll("section");
    (sections[0] as any).getBoundingClientRect = () => ({ width: 1000, height: 1000 });
    (sections[1] as any).getBoundingClientRect = () => ({ width: 1000, height: 1000 });
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    expect(detectPageMode(document.body)).toBe("slide");
  });

  it("detectPageMode should identify long mode based on scrollHeight", () => {
    // Override properties just for this test
    Object.defineProperty(document.body, 'scrollHeight', { value: 3000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    expect(detectPageMode(document.body)).toBe("long");
  });

  it("findRegionAnchor should find overlapping slide in slide mode", () => {
    document.body.innerHTML = `
      <section class="slide" id="slide1" style="width: 800px; height: 600px;"></section>
      <section class="slide" id="slide2" style="width: 800px; height: 600px;"></section>
    `;

    const slides = document.querySelectorAll(".slide");
    // Mock rects
    (slides[0] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    (slides[1] as any).getBoundingClientRect = () => ({ left: 0, top: 600, width: 800, height: 600, right: 800, bottom: 1200 });

    const box = normalizeRect({ left: 100, top: 700, width: 100, height: 100 });
    
    const anchor = findRegionAnchor(box, document.body);
    expect(anchor.kind).toBe("slide");
    expect(anchor.locator?.descriptor).toContain("#slide2");
  });

  it("findRegionAnchor should ignore hidden slides even with exact overlap", () => {
    document.body.innerHTML = `
      <section class="slide" id="slide1" style="width: 800px; height: 600px; opacity: 0;"></section>
      <section class="slide active" id="slide2" style="width: 800px; height: 600px; opacity: 1;"></section>
    `;

    const slides = document.querySelectorAll(".slide");
    // Both cover the same viewport area
    (slides[0] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    (slides[1] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    
    // Mock getComputedStyle for visibility checks
    window.getComputedStyle = (el) => ({
      display: "block",
      visibility: "visible",
      opacity: (el as HTMLElement).style.opacity || "1"
    }) as any;

    const box = normalizeRect({ left: 100, top: 100, width: 100, height: 100 });
    const anchor = findRegionAnchor(box, document.body);
    
    expect(anchor.kind).toBe("slide");
    expect(anchor.locator?.descriptor).toContain("#slide2");
  });

  it("findRegionAnchor should prioritize active slide over identical overlap", () => {
    document.body.innerHTML = `
      <section class="slide" id="slide1" style="width: 800px; height: 600px;"></section>
      <section class="slide active" id="slide2" style="width: 800px; height: 600px;"></section>
      <section class="slide" id="slide3" style="width: 800px; height: 600px;"></section>
    `;

    const slides = document.querySelectorAll(".slide");
    // All cover the exact same area
    (slides[0] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    (slides[1] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    (slides[2] as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });

    window.getComputedStyle = () => ({
      display: "block",
      visibility: "visible",
      opacity: "1"
    }) as any;

    const box = normalizeRect({ left: 100, top: 100, width: 100, height: 100 });
    const anchor = findRegionAnchor(box, document.body);
    
    expect(anchor.kind).toBe("slide");
    expect(anchor.locator?.descriptor).toContain("#slide2");
  });

  it("findRegionAnchor should ignore nested generic sections inside an active slide", () => {
    document.body.innerHTML = `
      <div class="slide active" id="slide1" style="width: 800px; height: 600px;">
        <section id="inner-section" style="width: 400px; height: 300px;"></section>
      </div>
    `;

    const slide = document.querySelector("#slide1") as HTMLElement;
    const section = document.querySelector("#inner-section") as HTMLElement;
    
    // Both are visible
    window.getComputedStyle = () => ({
      display: "block",
      visibility: "visible",
      opacity: "1"
    }) as any;

    (slide as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });
    (section as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300 });

    // The box exactly matches the inner section, so overlap is identical for the inner section
    const box = normalizeRect({ left: 0, top: 0, width: 400, height: 300 });
    const anchor = findRegionAnchor(box, document.body);
    
    // Should still anchor to the slide, not the generic section
    expect(anchor.kind).toBe("slide");
    expect(anchor.locator?.descriptor).toContain("#slide1");
  });

  it("createIntentRegion should preserve userIntent and compute correct properties", () => {
    document.body.innerHTML = `
      <section class="slide" id="slide1" style="width: 800px; height: 600px;"></section>
    `;
    const slide = document.querySelector("#slide1") as HTMLElement;
    (slide as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });

    const box = normalizeRect({ left: 200, top: 300, width: 100, height: 100 });
    const userIntent = "I want to delete this specific box please.";

    const region = createIntentRegion({
      action: "intent",
      userIntent,
      viewportBox: box,
      root: document.body
    });

    expect(region.action).toBe("intent");
    expect(region.userIntent).toBe(userIntent); // Must preserve exactly what user said
    expect(region.pageMode).toBe("slide");
    expect(region.anchor.kind).toBe("slide");
    expect(region.anchor.locator?.descriptor).toContain("#slide1");
    expect(region.relativeBox?.left).toBe(25); // (200 / 800) * 100
    expect(region.relativeBox?.top).toBe(50);  // (300 / 600) * 100
  });

  it("compareRegionAnchors detects shared anchors by locator identity", () => {
    const source = createIntentRegion({
      action: "move",
      userIntent: "",
      viewportBox: normalizeRect({ left: 100, top: 100, width: 100, height: 100 }),
      root: document.body
    });
    source.anchor = {
      kind: "slide",
      confidence: "high",
      locator: { descriptor: "section #slide-1 .slide", tagName: "section", cssPath: "#slide-1", nthOfTypePath: "body > section:nth-of-type(1)", siblingIndex: 0 }
    };

    const target = createIntentRegion({
      action: "move",
      userIntent: "",
      viewportBox: normalizeRect({ left: 200, top: 200, width: 100, height: 100 }),
      root: document.body
    });
    target.anchor = {
      kind: "slide",
      confidence: "high",
      locator: { descriptor: "section #slide-1 .slide", tagName: "section", cssPath: "#slide-1", nthOfTypePath: "body > section:nth-of-type(1)", siblingIndex: 0 }
    };

    expect(compareRegionAnchors(source, target)).toEqual({
      shared: true,
      differentSection: false,
      confidence: "high"
    });
  });

  it("compareRegionAnchors marks different anchors as low-confidence cross-section placement", () => {
    const source = createIntentRegion({
      action: "move",
      userIntent: "",
      viewportBox: normalizeRect({ left: 100, top: 100, width: 100, height: 100 }),
      root: document.body
    });
    source.anchor = {
      kind: "slide",
      confidence: "high",
      locator: { descriptor: "section #slide-1 .slide", tagName: "section", cssPath: "#slide-1", nthOfTypePath: "body > section:nth-of-type(1)", siblingIndex: 0 }
    };

    const target = createIntentRegion({
      action: "move",
      userIntent: "",
      viewportBox: normalizeRect({ left: 200, top: 200, width: 100, height: 100 }),
      root: document.body
    });
    target.anchor = {
      kind: "section",
      confidence: "high",
      locator: { descriptor: "section #slide-2 .slide", tagName: "section", cssPath: "#slide-2", nthOfTypePath: "body > section:nth-of-type(2)", siblingIndex: 1 }
    };

    expect(compareRegionAnchors(source, target)).toEqual({
      shared: false,
      differentSection: true,
      confidence: "low"
    });
  });
});
