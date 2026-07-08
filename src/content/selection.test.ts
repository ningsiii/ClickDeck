// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getTabSwitchTarget } from "./selection";

describe("getTabSwitchTarget", () => {
  it("Tab prefers parent when available", () => {
    document.body.innerHTML = `
      <main>
        <div id="parent">
          <span id="child">Hello</span>
        </div>
      </main>
    `;

    const child = document.getElementById("child") as HTMLElement;
    const parent = document.getElementById("parent") as HTMLElement;
    expect(getTabSwitchTarget(child, "forward")).toBe(parent);
  });

  it("Shift+Tab prefers first descendant when available", () => {
    document.body.innerHTML = `
      <main>
        <div id="parent">
          <span id="child">Hello</span>
        </div>
      </main>
    `;

    const parent = document.getElementById("parent") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;
    expect(getTabSwitchTarget(parent, "backward")).toBe(child);
  });

  it("falls back to descendant when parent is not selectable (body/html)", () => {
    document.body.innerHTML = `
      <div id="root">
        <span id="child">Hello</span>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;

    // root's parent is body (not selectable), so Tab uses first descendant.
    expect(getTabSwitchTarget(root, "forward")).toBe(child);
  });
});

describe("isLargeContainer and getEditableTarget", () => {
  describe("isLargeContainer refinements", () => {
    it("identifies large containers based on area and tag", async () => {
      const { isLargeContainer } = await import("./selection");

      const el = document.createElement("div");
      const span = document.createElement("span");
      span.textContent = "Meaningful descendant";
      span.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
        x: 0, y: 0, toJSON: () => {}
      });
      el.appendChild(span);
      document.body.appendChild(el);
      
      Object.defineProperty(window, "innerWidth", { value: 1000, writable: true });
      Object.defineProperty(window, "innerHeight", { value: 1000, writable: true });

      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
        x: 0, y: 0, toJSON: () => {}
      });

      expect(isLargeContainer(el)).toBe(true);

      // Make it small
      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
        x: 0, y: 0, toJSON: () => {}
      });
      expect(isLargeContainer(el)).toBe(false);
      
      document.body.removeChild(el);
    });

    it("rejects large elements that have no meaningful descendants", async () => {
      const { isLargeContainer } = await import("./selection");
      const el = document.createElement("div");
      // Intentionally empty
      document.body.appendChild(el);
      
      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
        x: 0, y: 0, toJSON: () => {}
      });
      
      expect(isLargeContainer(el)).toBe(false);
      document.body.removeChild(el);
    });

    it("rejects large elements that are not layout tags", async () => {
      const { isLargeContainer } = await import("./selection");
      const el = document.createElement("span");
      const span = document.createElement("span");
      span.textContent = "Meaningful descendant";
      span.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
        x: 0, y: 0, toJSON: () => {}
      });
      el.appendChild(span);
      document.body.appendChild(el);
      
      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
        x: 0, y: 0, toJSON: () => {}
      });
      expect(isLargeContainer(el)).toBe(false);
      document.body.removeChild(el);
    });

    it("rejects large elements with role dialog/navigation/toolbar", async () => {
      const { isLargeContainer } = await import("./selection");
      const el = document.createElement("div");
      el.innerHTML = "<span>Meaningful descendant</span>";
      document.body.appendChild(el);
      
      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
        x: 0, y: 0, toJSON: () => {}
      });
      
      el.setAttribute("role", "dialog");
      expect(isLargeContainer(el)).toBe(false);
      
      el.setAttribute("role", "toolbar");
      expect(isLargeContainer(el)).toBe(false);
      
      el.removeAttribute("role");
      el.setAttribute("aria-modal", "true");
      expect(isLargeContainer(el)).toBe(false);
      
      document.body.removeChild(el);
    });

    it("rejects large elements that are fixed or sticky", async () => {
      const { isLargeContainer } = await import("./selection");
      const el = document.createElement("div");
      el.innerHTML = "<span>Meaningful descendant</span>";
      document.body.appendChild(el);
      
      el.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
        x: 0, y: 0, toJSON: () => {}
      });
      
      el.style.position = "fixed";
      expect(isLargeContainer(el)).toBe(false);
      
      el.style.position = "sticky";
      expect(isLargeContainer(el)).toBe(false);
      
      document.body.removeChild(el);
    });

    it("rejects media, inputs, buttons and links even if they are large", async () => {
      const { isLargeContainer } = await import("./selection");
      
      for (const tag of ["img", "video", "canvas", "button", "input", "select", "textarea", "a", "label", "nav", "dialog"]) {
        const el = document.createElement(tag);
        document.body.appendChild(el);
        if (tag === "button" || tag === "a") {
          el.innerHTML = "<span>Meaningful descendant</span>";
        }
        
        el.getBoundingClientRect = () => ({
          left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
          x: 0, y: 0, toJSON: () => {}
        });
        
        expect(isLargeContainer(el)).toBe(false);
        document.body.removeChild(el);
      }
    });
  });

  it("getEditableTarget falls back to first meaningful child if target is large container", async () => {
    const { getEditableTarget, resolveEditableTarget } = await import("./selection");

    document.body.innerHTML = `
      <div id="large-container">
        <div id="empty-div"></div>
        <span id="layout-span"></span>
        <button id="child">Target Text</button>
      </div>
    `;

    const largeContainer = document.getElementById("large-container") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;
    const emptyDiv = document.getElementById("empty-div") as HTMLElement;
    const layoutSpan = document.getElementById("layout-span") as HTMLElement;

    largeContainer.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000,
      x: 0, y: 0, toJSON: () => {}
    });

    child.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
      x: 0, y: 0, toJSON: () => {}
    });
    
    emptyDiv.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
      x: 0, y: 0, toJSON: () => {}
    });
    
    layoutSpan.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
      x: 0, y: 0, toJSON: () => {}
    });

    // When clicking large container (and it's not currently selected), it falls back to child
    // It should skip emptyDiv and layoutSpan because they are not meaningful
    expect(getEditableTarget(largeContainer)).toBe(child);
    expect(resolveEditableTarget(largeContainer)).toEqual({
      target: child,
      source: "large-container-fallback"
    });

    // If large container IS already selected, it does NOT fall back (so controller can clear it)
    expect(getEditableTarget(largeContainer, largeContainer)).toBe(largeContainer);
    expect(resolveEditableTarget(largeContainer, largeContainer)).toEqual({
      target: largeContainer,
      source: "direct"
    });
  });

  it("marks generic container blocks as background targets instead of direct content targets", async () => {
    const { resolveEditableTarget } = await import("./selection");

    document.body.innerHTML = `
      <div id="poster">
        <div id="background-block"><div id="child-card"></div></div>
      </div>
    `;

    const block = document.getElementById("background-block") as HTMLElement;
    const card = document.getElementById("child-card") as HTMLElement;

    block.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400,
      x: 0, y: 0, toJSON: () => {}
    });

    card.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 200, bottom: 100, width: 200, height: 100,
      x: 0, y: 0, toJSON: () => {}
    });

    expect(resolveEditableTarget(block)).toEqual({
      target: null,
      source: "background-block"
    });
  });

  it("selects the outer svg when clicking inside inline SVG internals", async () => {
    const { resolveEditableTarget } = await import("./selection");

    document.body.innerHTML = `
      <svg id="diagram" width="100" height="80">
        <g>
          <path id="shape" d="M0 0L10 10"></path>
        </g>
      </svg>
    `;

    const svg = document.getElementById("diagram") as unknown as HTMLElement;
    const path = document.getElementById("shape") as unknown as HTMLElement;

    expect(resolveEditableTarget(path)).toEqual({
      target: svg,
      source: "direct"
    });
  });

  it("selects formula and iframe as whole complex blocks", async () => {
    const { resolveEditableTarget } = await import("./selection");

    document.body.innerHTML = `
      <span class="katex" id="formula"><span id="formula-child">x</span></span>
      <iframe id="embed" srcdoc="<p>Inner</p>"></iframe>
    `;

    const formula = document.getElementById("formula") as HTMLElement;
    const formulaChild = document.getElementById("formula-child") as HTMLElement;
    const iframe = document.getElementById("embed") as HTMLElement;

    expect(resolveEditableTarget(formulaChild)).toEqual({
      target: formula,
      source: "direct"
    });
    expect(resolveEditableTarget(iframe)).toEqual({
      target: iframe,
      source: "direct"
    });
  });
});
