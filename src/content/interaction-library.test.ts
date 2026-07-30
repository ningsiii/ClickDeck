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
  it("keeps a fixed numbered index while relationship filters only de-emphasize non-matches", () => {
    const library = createInteractionLibrary("en");
    document.body.appendChild(library.element);

    expect(library.element.querySelectorAll("[data-library-pattern]")).toHaveLength(20);
    expect(library.element.querySelector("[data-library-relation='all']")?.textContent).toBe("All");
    expect(library.element.querySelector(".clickdeck-interaction-library__count")?.textContent).toBe("Fixed index");
    const initialItems = Array.from(library.element.querySelectorAll<HTMLElement>("[data-library-pattern]"));
    expect(initialItems[0].querySelector(".clickdeck-interaction-library__item-index")?.textContent).toBe("01");
    expect(initialItems[19].querySelector(".clickdeck-interaction-library__item-index")?.textContent).toBe("20");

    library.element.querySelector<HTMLButtonElement>("[data-library-relation='comparison-change']")?.click();

    const itemsAfterFilter = Array.from(library.element.querySelectorAll<HTMLElement>("[data-library-pattern]"));
    const matchingItems = itemsAfterFilter.filter((item) => item.dataset.filterMatch === "true");
    expect(itemsAfterFilter).toHaveLength(20);
    expect(itemsAfterFilter.every((item, index) => item === initialItems[index])).toBe(true);
    expect(matchingItems.map((item) => item.dataset.libraryPattern)).toEqual([
      "view-switcher",
      "compare-slider",
      "synchronized-comparison"
    ]);
    expect(library.element.querySelector(".clickdeck-interaction-library__count")?.textContent).toContain("3 matches");
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

  it("keeps left-index feedback static and uses neutral structural examples in every demo", () => {
    const englishLibrary = createInteractionLibrary("en");
    document.body.appendChild(englishLibrary.element);
    const styleText = englishLibrary.element.querySelector("style")?.textContent ?? "";
    expect(styleText).not.toContain(".clickdeck-interaction-library__item:hover");
    const currentIndexRule = styleText.match(/\.clickdeck-interaction-library__item\[aria-current="true"\] \.clickdeck-interaction-library__item-index\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(currentIndexRule).not.toMatch(/transform|transition|box-shadow/);

    let englishDemoText = "";
    for (const pattern of interactionPatterns) {
      englishLibrary.element.querySelector<HTMLButtonElement>(`[data-library-pattern='${pattern.id}']`)?.click();
      englishDemoText += ` ${englishLibrary.element.querySelector(".clickdeck-interaction-library__demo-wrap")?.textContent ?? ""}`;
    }
    expect(englishDemoText).not.toMatch(/community|space project|digital archive|community event|project summary|item detail/i);
    expect(englishDemoText).toContain("Logic 2");
    expect(englishDemoText).toContain("Cause A");
    englishLibrary.destroy();

    const chineseLibrary = createInteractionLibrary("zh");
    document.body.appendChild(chineseLibrary.element);
    let chineseDemoText = "";
    for (const pattern of interactionPatterns) {
      chineseLibrary.element.querySelector<HTMLButtonElement>(`[data-library-pattern='${pattern.id}']`)?.click();
      chineseDemoText += ` ${chineseLibrary.element.querySelector(".clickdeck-interaction-library__demo-wrap")?.textContent ?? ""}`;
    }
    expect(chineseDemoText).not.toMatch(/社区|空间项目|数字档案|社区活动|项目摘要|项目详情/);
    expect(chineseDemoText).toContain("逻辑二");
    expect(chineseDemoText).toContain("因 A");
    chineseLibrary.destroy();
  });

  it("keeps left hover and focus inert, then selects only on click", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      const tabsItem = library.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']");
      tabsItem?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      expect(tabsItem?.getAttribute("aria-current")).toBe("false");
      expect(library.element.querySelector("[data-demo-renderer='carousel']")).not.toBeNull();
      expect(library.element.querySelector("[data-demo-renderer='tabs']")).toBeNull();

      const drawerItem = library.element.querySelector<HTMLButtonElement>("[data-library-pattern='drawer']");
      drawerItem?.focus();
      expect(drawerItem?.getAttribute("aria-current")).toBe("false");
      expect(library.element.querySelector("[data-demo-renderer='carousel']")).not.toBeNull();

      tabsItem?.click();
      expect(tabsItem?.getAttribute("aria-current")).toBe("true");
      expect(library.element.querySelector("[data-demo-renderer='tabs']")).not.toBeNull();
      expect(library.element.querySelector("[data-demo-renderer='tabs']")?.classList.contains("is-previewing")).toBe(false);
      library.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("plays a complete preview only from the right stage and resets on pointer leave", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']")?.click();
      const stage = library.element.querySelector<HTMLElement>("[data-library-demo-stage]");
      stage?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      expect(library.element.querySelector("[data-demo-renderer='tabs']")?.classList.contains("is-previewing")).toBe(true);
      vi.advanceTimersByTime(510);
      expect(library.element.querySelector("[data-demo-output]")?.textContent).toContain("Logic 2");

      vi.advanceTimersByTime(2100);
      expect(library.element.querySelector<HTMLElement>("[data-demo-renderer='tabs']")?.dataset.previewStep).toBe("3");
      expect(library.element.querySelector<HTMLElement>("[data-demo-renderer='tabs']")?.dataset.previewCycle).toBe("1");
      expect(library.element.querySelector("[data-demo-output]")?.textContent).toContain("Logic 1");

      vi.advanceTimersByTime(1050);
      expect(library.element.querySelector<HTMLElement>("[data-demo-renderer='tabs']")?.dataset.previewStep).toBe("1");
      expect(library.element.querySelector("[data-demo-output]")?.textContent).toContain("Logic 2");

      stage?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      expect(library.element.querySelector<HTMLElement>("[data-demo-renderer='tabs']")?.dataset.previewStep).toBeUndefined();
      expect(library.element.querySelector("[data-demo-output]")?.textContent).toContain("Logic 1");

      library.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("supports click and keyboard playback fallbacks on the right stage", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);
      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='drawer']")?.click();

      const clickStage = library.element.querySelector<HTMLElement>("[data-library-demo-stage]");
      clickStage?.click();
      vi.advanceTimersByTime(510);
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(true);

      clickStage?.click();
      vi.advanceTimersByTime(2000);
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(true);
      expect(library.element.querySelector("[data-library-demo-stage]")?.getAttribute("data-preview-playing")).toBe("false");
      expect(library.element.querySelector(".clickdeck-interaction-library__demo-label")?.textContent).toContain("Paused");

      clickStage?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      const keyboardStage = library.element.querySelector<HTMLElement>("[data-library-demo-stage]");
      keyboardStage?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      vi.advanceTimersByTime(510);
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(true);
      keyboardStage?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      vi.advanceTimersByTime(2000);
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(true);

      library.element.querySelector<HTMLButtonElement>("[data-demo-action='drawer-close']")?.click();
      vi.advanceTimersByTime(2000);
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(false);

      library.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels a running right-stage preview when another left item is clicked", () => {
    vi.useFakeTimers();
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']")?.click();
      library.element.querySelector<HTMLElement>("[data-library-demo-stage]")
        ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(510);

      library.element.querySelector<HTMLButtonElement>("[data-library-pattern='drawer']")?.click();
      vi.advanceTimersByTime(5000);

      expect(library.element.querySelector("[data-demo-renderer='tabs']")).toBeNull();
      expect(library.element.querySelector("[data-demo-renderer='drawer']")).not.toBeNull();
      expect(library.element.querySelector("[data-demo-drawer]")?.classList.contains("is-open")).toBe(false);

      library.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs a complete multi-state sequence for every right-side demo", () => {
    vi.useFakeTimers();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn()
    });
    try {
      const library = createInteractionLibrary("en");
      document.body.appendChild(library.element);

      for (const pattern of interactionPatterns) {
        library.element.querySelector<HTMLButtonElement>(`[data-library-pattern='${pattern.id}']`)?.click();
        library.element.querySelector<HTMLElement>("[data-library-demo-stage]")
          ?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        vi.advanceTimersByTime(5000);

        const demo = library.element.querySelector<HTMLElement>(`[data-demo-renderer='${pattern.demoRenderer}']`);
        expect(Number(demo?.dataset.previewCycle ?? 0), pattern.id).toBeGreaterThanOrEqual(1);
        library.element.querySelector<HTMLElement>("[data-library-demo-stage]")
          ?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      }

      library.destroy();
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView
        });
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
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
      search.value = "A";
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

    expect(library.element.querySelector(".clickdeck-interaction-library__title")?.textContent).toBe("交互小字典");
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

    selectionLibrary.element.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']")?.click();
    selectionLibrary.element.querySelector<HTMLButtonElement>("[data-library-action='select']")?.click();

    expect(selections).toHaveLength(1);
    expect(selections[0].id).toBe("tabs");
    expect(selections[0].intentText).toContain("Tabs");
    expect(document.body.contains(selectionLibrary.element)).toBe(false);
  });
});
