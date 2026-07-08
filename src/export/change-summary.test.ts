/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { buildAiEditPrompt } from "./change-summary";
import type { AttributePatch, ContentPatch, StylePatch } from "../state/editor-state";

const PAGE_EN = { language: "en" as const, page: { url: "https://example.com/", title: "Test Page" } };
const PAGE_ZH = { language: "zh" as const, page: { url: "https://example.com/", title: "Test Page" } };

describe("buildAiEditPrompt", () => {
  it("returns empty message when there are no patches", () => {
    const result = buildAiEditPrompt([], PAGE_EN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty");
      expect(result.message).toContain("No edits");
    }
  });

  it("includes page URL and title in English prompt", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const patch: StylePatch = {
      id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 },
      property: "fontSize", before: "16px", after: "20px", createdAt: 1
    };
    const result = buildAiEditPrompt([patch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("URL: https://example.com/");
      expect(result.prompt).toContain("Title: Test Page");
      expect(result.prompt).toContain("Current active browser page only.");
      expect(result.prompt).toContain("Changes:");
    }
  });

  it("includes page URL and title in Chinese prompt with Chinese headings", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const patch: StylePatch = {
      id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 },
      property: "fontSize", before: "16px", after: "20px", createdAt: 1
    };
    const result = buildAiEditPrompt([patch], PAGE_ZH);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("URL: https://example.com/");
      expect(result.prompt).toContain("修改列表");
    }
  });

  it("includes locator for style and content patches", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;

    const stylePatch: StylePatch = {
      id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: { descriptor: "h1 #t", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 },
      property: "fontSize", before: "16px", after: "20px", createdAt: 1
    };

    const contentPatch: ContentPatch = {
      id: "2", kind: "content", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: stylePatch.targetLocator, before: "Hello", after: "Hi", createdAt: 2
    };

    const result = buildAiEditPrompt([stylePatch, contentPatch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Locator: #t");
      expect(result.prompt).toContain("Style: fontSize changed");
      expect(result.prompt).toContain("Text replaced");
    }
  });

  it("does not dump full data URL for image src replacements", () => {
    document.body.innerHTML = `<main><img id="img" src="a.png" /></main>`;
    const el = document.getElementById("img") as HTMLImageElement;

    const patch: AttributePatch = {
      id: "a1", kind: "attribute", targetElement: el, targetDescriptor: "img#img",
      targetLocator: { descriptor: "img #img", tagName: "img", cssPath: "#img", nthOfTypePath: "img:nth-of-type(1)", siblingIndex: 0 },
      attribute: "src", before: "a.png", after: "data:image/png;base64,AAAAAA", createdAt: 1
    };

    const result = buildAiEditPrompt([patch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("[data URL image]");
      expect(result.prompt).not.toContain("data:image/png;base64,AAAAAA");
    }
  });

  it("describes complex elements without dumping iframe srcdoc", () => {
    document.body.innerHTML = `<main><iframe id="embed" srcdoc="<article>Hidden inner document</article>"></iframe></main>`;
    const el = document.getElementById("embed") as HTMLIFrameElement;

    const patch: StylePatch = {
      id: "1",
      kind: "style",
      targetElement: el,
      targetDescriptor: "iframe#embed",
      targetLocator: { descriptor: "iframe #embed", tagName: "iframe", cssPath: "#embed", nthOfTypePath: "iframe:nth-of-type(1)", siblingIndex: 0 },
      property: "maxWidth",
      before: "",
      after: "100%",
      createdAt: 1
    };

    const result = buildAiEditPrompt([patch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Complex element: iframe / srcdoc");
      expect(result.prompt).toContain("Only the outer iframe is changed");
      expect(result.prompt).not.toContain("Hidden inner document");
    }
  });

  it("returns empty when all patches have been undone (empty effective list)", () => {
    const result = buildAiEditPrompt([], PAGE_EN);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty");
    }
  });

  it("excludes undone patches when caller passes only effective patches", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;

    const undoneStylePatch: StylePatch = {
      id: "undone", kind: "style", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: { descriptor: "h1 #t", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 },
      property: "fontSize", before: "16px", after: "20px", createdAt: 1
    };

    // Controller provides only effective patches – undone patches excluded.
    const emptyResult = buildAiEditPrompt([], PAGE_EN);
    expect(emptyResult.ok).toBe(false);

    const effectiveOnly = buildAiEditPrompt([undoneStylePatch], PAGE_EN);
    expect(effectiveOnly.ok).toBe(true);
    if (effectiveOnly.ok) {
      expect(effectiveOnly.prompt).toContain("fontSize");
    }
  });

  it("includes slide context when target is inside a slide container", () => {
    document.body.innerHTML = `<main><section class="slide" data-slide="4"><h1 id="t">Hello</h1></section></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const patch: StylePatch = {
      id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t",
      targetLocator: { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 },
      property: "fontSize", before: "16px", after: "20px", createdAt: 1
    };
    
    // EN
    const resultEn = buildAiEditPrompt([patch], PAGE_EN);
    expect(resultEn.ok).toBe(true);
    if (resultEn.ok) {
      expect(resultEn.prompt).toContain("Slide/Page Context: Slide 4");
    }

    // ZH
    const resultZh = buildAiEditPrompt([patch], PAGE_ZH);
    expect(resultZh.ok).toBe(true);
    if (resultZh.ok) {
      expect(resultZh.prompt).toContain("所属页面/Slide: Slide 4");
    }
  });

  it("squashes multiple fontSize changes on the same element into one", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };
    
    const patch1: StylePatch = { id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "16px", after: "18px", createdAt: 1 };
    const patch2: StylePatch = { id: "2", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "18px", after: "20px", createdAt: 2 };
    const patch3: StylePatch = { id: "3", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "20px", after: "22px", createdAt: 3 };

    const result = buildAiEditPrompt([patch1, patch2, patch3], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('fontSize changed from "16px" to "22px"');
      expect(result.prompt).not.toContain("18px");
      expect(result.prompt).not.toContain("20px");
    }
  });

  it("groups fontSize and color changes under the same target number", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };
    
    const patch1: StylePatch = { id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "16px", after: "20px", createdAt: 1 };
    const patch2: StylePatch = { id: "2", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "color", before: "#222", after: "#fff", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt.match(/^1\. Target:/gm)).toHaveLength(1);
      expect(result.prompt.match(/^2\. Target:/gm)).toBeNull();
      expect(result.prompt).toContain("Style: fontSize changed");
      expect(result.prompt).toContain("Style: color changed");
    }
  });

  it("does not output a property if it was changed and then changed back to original", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };
    
    const patch1: StylePatch = { id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "16px", after: "18px", createdAt: 1 };
    const patch2: StylePatch = { id: "2", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "18px", after: "16px", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_EN);
    expect(result.ok).toBe(false);
  });

  it("squashes multiple text changes into one and hides intermediate changes", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };
    
    const patch1: ContentPatch = { id: "1", kind: "content", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, before: "old", after: "mid", createdAt: 1 };
    const patch2: ContentPatch = { id: "2", kind: "content", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, before: "mid", after: "new", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Text replaced: "old" with "new"');
      expect(result.prompt).not.toContain("mid");
    }
  });

  it("summarizes appended text so AI can reproduce title suffix edits", () => {
    document.body.innerHTML = `<main><h1 id="t">如何优雅地与 AI 沟通设计？</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };

    const patch: ContentPatch = {
      id: "1",
      kind: "content",
      targetElement: el,
      targetDescriptor: "h1#t",
      targetLocator: baseLocator,
      before: "如何优雅地与 AI 沟通设计？",
      after: "如何优雅地与 AI 沟通设计？（不说脏话版）",
      createdAt: 1
    };

    const result = buildAiEditPrompt([patch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Text appended: "（不说脏话版）"');
      expect(result.prompt).toContain("Final text should be");
    }
  });

  it("summarizes removed text fragments even when container text is long", () => {
    document.body.innerHTML = `<main><article id="frame"><h1>如何优雅地与 AI 沟通设计？</h1><p>不说脏话</p></article></main>`;
    const el = document.getElementById("frame") as HTMLElement;
    const baseLocator = { descriptor: "article", tagName: "article", cssPath: "#frame", nthOfTypePath: "article:nth-of-type(1)", siblingIndex: 0 };
    const before = "ClickDeck / Open Editorial Deck 01 / Cover Browser Extension · Chrome · Edge 如何优雅地与 AI 沟通设计？ 不说脏话 Design feedback should land on the page first.";
    const after = "ClickDeck / Open Editorial Deck 01 / Cover Browser Extension · Chrome · Edge 如何优雅地与 AI 沟通设计？ Design feedback should land on the page first.";

    const patch: ContentPatch = {
      id: "1",
      kind: "content",
      targetElement: el,
      targetDescriptor: "article#frame",
      targetLocator: baseLocator,
      before,
      after,
      createdAt: 1
    };

    const result = buildAiEditPrompt([patch], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Text removed: "不说脏话"');
      expect(result.prompt).not.toContain('Text changed from');
    }
  });

  it("squashes multiple image replacements and keeps data URL hidden", () => {
    document.body.innerHTML = `<main><img id="img" src="a.png" /></main>`;
    const el = document.getElementById("img") as HTMLImageElement;
    const baseLocator = { descriptor: "img #img", tagName: "img", cssPath: "#img", nthOfTypePath: "img:nth-of-type(1)", siblingIndex: 0 };

    const patch1: AttributePatch = { id: "1", kind: "attribute", targetElement: el, targetDescriptor: "img#img", targetLocator: baseLocator, attribute: "src", before: "a.png", after: "data:image/png;base64,111", createdAt: 1 };
    const patch2: AttributePatch = { id: "2", kind: "attribute", targetElement: el, targetDescriptor: "img#img", targetLocator: baseLocator, attribute: "src", before: "data:image/png;base64,111", after: "data:image/png;base64,222", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Attribute: src should be replaced with "[data URL image]"');
      expect(result.prompt).not.toContain("data:image/png;base64");
    }
  });

  it("outputs two numbered targets for changes on different elements", () => {
    document.body.innerHTML = `<main><h1 id="t1">1</h1><h1 id="t2">2</h1></main>`;
    const el1 = document.getElementById("t1") as HTMLElement;
    const el2 = document.getElementById("t2") as HTMLElement;
    
    const patch1: StylePatch = { id: "1", kind: "style", targetElement: el1, targetDescriptor: "h1#t1", targetLocator: { descriptor: "h1", tagName: "h1", cssPath: "#t1", nthOfTypePath: "h1", siblingIndex: 0 }, property: "fontSize", before: "16px", after: "20px", createdAt: 1 };
    const patch2: StylePatch = { id: "2", kind: "style", targetElement: el2, targetDescriptor: "h1#t2", targetLocator: { descriptor: "h1", tagName: "h1", cssPath: "#t2", nthOfTypePath: "h2", siblingIndex: 1 }, property: "fontSize", before: "16px", after: "20px", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_EN);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt.match(/^\d+\. Target:/gm)).toHaveLength(2);
    }
  });

  it("groups and squashes Chinese prompt correctly", () => {
    document.body.innerHTML = `<main><h1 id="t">Hello</h1></main>`;
    const el = document.getElementById("t") as HTMLElement;
    const baseLocator = { descriptor: "h1", tagName: "h1", cssPath: "#t", nthOfTypePath: "h1:nth-of-type(1)", siblingIndex: 0 };
    
    const patch1: StylePatch = { id: "1", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "16px", after: "18px", createdAt: 1 };
    const patch2: StylePatch = { id: "2", kind: "style", targetElement: el, targetDescriptor: "h1#t", targetLocator: baseLocator, property: "fontSize", before: "18px", after: "22px", createdAt: 2 };

    const result = buildAiEditPrompt([patch1, patch2], PAGE_ZH);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('样式修改：fontSize 从 "16px" 改为 "22px"');
      expect(result.prompt).not.toContain("18px");
    }
  });
});
