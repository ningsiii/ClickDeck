// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  createInteractionLibrary,
  interactionPatterns,
  interactionRelations
} from "./interaction-library";

describe("interaction library data", () => {
  it("defines six relationships and exactly twenty unique patterns", () => {
    expect(interactionRelations).toHaveLength(6);
    expect(interactionPatterns).toHaveLength(20);
    expect(new Set(interactionPatterns.map((pattern) => pattern.id))).toHaveLength(20);
    expect(new Set(interactionPatterns.map((pattern) => pattern.demoRenderer))).toHaveLength(20);

    const relationIds = new Set(interactionRelations.map((relation) => relation.id));
    for (const pattern of interactionPatterns) {
      expect(relationIds.has(pattern.relationId)).toBe(true);
      expect(pattern.prerequisitesZh.length).toBeGreaterThan(0);
      expect(pattern.prerequisitesEn.length).toBeGreaterThan(0);
      expect(pattern.avoidWhenZh.length).toBeGreaterThan(0);
      expect(pattern.avoidWhenEn.length).toBeGreaterThan(0);
      expect(pattern.mobileNoteZh).not.toBe("");
      expect(pattern.mobileNoteEn).not.toBe("");
    }
  });
});

describe("createInteractionLibrary", () => {
  it("filters patterns by relationship and keeps a valid selected pattern", () => {
    const library = createInteractionLibrary("en");
    document.body.appendChild(library.element);

    expect(library.element.querySelectorAll("[data-library-pattern]")).toHaveLength(20);

    library.element.querySelector<HTMLButtonElement>("[data-library-relation='comparison-change']")?.click();

    const visibleItems = library.element.querySelectorAll<HTMLElement>("[data-library-pattern]");
    expect(visibleItems).toHaveLength(3);
    expect(Array.from(visibleItems).map((item) => item.dataset.libraryPattern)).toEqual([
      "view-switcher",
      "compare-slider",
      "synchronized-comparison"
    ]);
    expect(library.element.querySelector("[data-demo-renderer='view-switcher']")).not.toBeNull();

    library.destroy();
  });

  it("renders a distinct interactive micro-demo for every pattern", () => {
    const library = createInteractionLibrary("en");
    document.body.appendChild(library.element);

    for (const pattern of interactionPatterns) {
      library.element.querySelector<HTMLButtonElement>(`[data-library-pattern='${pattern.id}']`)?.click();
      const demo = library.element.querySelector<HTMLElement>(`[data-demo-renderer='${pattern.demoRenderer}']`);
      expect(demo, pattern.id).not.toBeNull();
      expect(demo?.querySelector("button, input, summary"), pattern.id).not.toBeNull();
    }

    library.destroy();
  });

  it("supports live filtering and compare-slider input", () => {
    const library = createInteractionLibrary("en");
    document.body.appendChild(library.element);

    library.element.querySelector<HTMLButtonElement>("[data-library-pattern='live-filter']")?.click();
    const search = library.element.querySelector<HTMLInputElement>("[data-demo-action='live-filter']");
    expect(search).not.toBeNull();
    if (search) {
      search.value = "community";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const searchItems = library.element.querySelectorAll<HTMLElement>("[data-demo-search]");
    expect(Array.from(searchItems).filter((item) => !item.hidden)).toHaveLength(2);

    library.element.querySelector<HTMLButtonElement>("[data-library-pattern='compare-slider']")?.click();
    const slider = library.element.querySelector<HTMLInputElement>("[data-demo-action='compare-slider']");
    const compareLayer = library.element.querySelector<HTMLElement>("[data-demo-compare]");
    expect(slider).not.toBeNull();
    if (slider) {
      slider.value = "72";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    }
    expect(compareLayer?.style.width).toBe("72%");

    library.destroy();
  });

  it("localizes labels and closes without modifying host content", () => {
    const host = document.createElement("main");
    host.textContent = "Host page remains unchanged";
    document.body.appendChild(host);

    const library = createInteractionLibrary("zh");
    document.body.appendChild(library.element);

    expect(library.element.textContent).toContain("交互小字典 · 20 种");
    expect(library.element.textContent).toContain("同级浏览");
    library.element.querySelector<HTMLButtonElement>("[data-library-action='close']")?.click();

    expect(document.body.contains(library.element)).toBe(false);
    expect(host.textContent).toBe("Host page remains unchanged");
    host.remove();
  });
});
