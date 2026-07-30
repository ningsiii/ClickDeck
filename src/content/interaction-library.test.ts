// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  createInteractionLibrary,
  getInteractionIntentText,
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

  it("creates concise bilingual intent text without inventing page content", () => {
    const pattern = interactionPatterns.find((item) => item.id === "filter-chips");
    expect(pattern).toBeDefined();
    if (!pattern) return;

    const zh = getInteractionIntentText(pattern, "zh");
    const en = getInteractionIntentText(pattern, "en");

    expect(zh).toContain("分类筛选（Filter Chips）");
    expect(zh).toContain("不添加页面中不存在的内容");
    expect(en).toContain("Filter Chips");
    expect(en).toContain("invent no new content");
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

  it("switches and previews patterns on hover or keyboard focus without a click", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      const tabsItem = library.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']");
      tabsItem?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      expect(tabsItem?.getAttribute("aria-current")).toBe("true");
      expect(library.element.querySelector("[data-demo-renderer='tabs']")).not.toBeNull();
      expect(library.element.querySelector("[data-demo-renderer='tabs']")?.classList.contains("is-previewing")).toBe(true);

      vi.advanceTimersByTime(150);
      expect(library.element.querySelector("[data-demo-renderer='tabs'] [data-demo-output]")?.textContent).toContain("Data content");

      const drawerItem = library.element.querySelector<HTMLButtonElement>("[data-library-pattern='drawer']");
      drawerItem?.focus();
      expect(drawerItem?.getAttribute("aria-current")).toBe("true");
      expect(library.element.querySelector("[data-demo-renderer='drawer']")).not.toBeNull();

      library.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a pending preview when the pointer quickly moves to another pattern", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='drawer']")
        ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='compare-slider']")
        ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      vi.advanceTimersByTime(150);

      expect(library.element.querySelector("[data-demo-renderer='drawer']")).toBeNull();
      expect(library.element.querySelector<HTMLElement>("[data-demo-compare]")?.style.width).toBe("72%");

      library.destroy();
    } finally {
      vi.useRealTimers();
    }
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

  it("offers an explicit selection action only when connected to a suggestion", () => {
    const referenceLibrary = createInteractionLibrary("en");
    document.body.appendChild(referenceLibrary.element);
    expect(referenceLibrary.element.querySelector("[data-library-action='select']")).toBeNull();
    referenceLibrary.destroy();

    const selections: { id: string; intentText: string }[] = [];
    const selectionLibrary = createInteractionLibrary("en", {
      onSelect: (pattern, intentText) => {
        selections.push({ id: pattern.id, intentText });
      }
    });
    document.body.appendChild(selectionLibrary.element);

    selectionLibrary.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']")
      ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    selectionLibrary.element.querySelector<HTMLButtonElement>("[data-library-action='select']")?.click();

    expect(selections).toHaveLength(1);
    expect(selections[0].id).toBe("tabs");
    expect(selections[0].intentText).toContain("Tabs");
    expect(document.body.contains(selectionLibrary.element)).toBe(false);
  });
});
