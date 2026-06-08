// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { IntentRegion } from "../content/intent-region";
import { RegionCandidate } from "../content/region-context";
import { VisualUnit, VisualUnitKind } from "../content/visual-units";
import { buildIntentPrompt, IntentPromptInput } from "./intent-prompt";

const viewportBox = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };

function createElement(tagName = "div", text = ""): HTMLElement {
  const element = document.createElement(tagName);
  element.textContent = text;
  Object.defineProperty(element, "getBoundingClientRect", {
    value: () => ({ left: 10, top: 20, width: 120, height: 40, right: 130, bottom: 60 }),
    configurable: true
  });
  document.body.appendChild(element);
  return element;
}

function mockVisualUnit(kind: VisualUnitKind, options: { text?: string; element?: HTMLElement } = {}): VisualUnit {
  const element = options.element ?? createElement(kind === "image" ? "img" : "div", options.text ?? "Sample content");
  return {
    id: `vu-${Math.random()}`,
    kind,
    element,
    locator: { descriptor: "sample", tagName: element.tagName.toLowerCase(), cssPath: "#sample", nthOfTypePath: "body > *:nth-of-type(1)", siblingIndex: 0 },
    rect: viewportBox,
    documentRect: viewportBox,
    textSnippet: options.text,
    confidence: "high"
  };
}

function mockCandidate(kind: VisualUnitKind, options: { text?: string; element?: HTMLElement } = {}): RegionCandidate {
  return {
    unit: mockVisualUnit(kind, options),
    rank: 1,
    reason: `Primary content (${kind})`,
    overlapRatio: 0.82,
    centerInBox: true
  };
}

function mockRegionContext(
  action: "intent" | "move",
  userIntent: string,
  empty: boolean,
  candidates: RegionCandidate[] = [],
  nearby: any[] = []
): IntentPromptInput {
  const region: IntentRegion = {
    id: "r1",
    action,
    userIntent,
    pageMode: "slide",
    viewportBox,
    documentBox: viewportBox,
    relativeBox: { left: 10, top: 20, width: 30, height: 40, right: 40, bottom: 60 },
    anchor: {
      kind: "slide",
      confidence: "high",
      locator: { descriptor: "section #slide-1 .slide", tagName: "section", cssPath: "#slide-1", nthOfTypePath: "body > section:nth-of-type(1)", siblingIndex: 0 }
    },
    createdAt: Date.now()
  };

  return {
    operation: {
      id: "op1",
      action,
      source: region,
      createdAt: Date.now()
    },
    sourceContext: {
      region,
      candidates,
      nearby,
      empty,
      confidence: empty ? "medium" : "high"
    }
  };
}

function addTargetContext(input: IntentPromptInput, userIntent = "", empty = true): void {
  input.targetContext = {
    region: {
      id: "r2",
      action: "move",
      userIntent,
      pageMode: "slide",
      viewportBox: { left: 200, top: 200, width: 100, height: 100, right: 300, bottom: 300 },
      documentBox: { left: 200, top: 200, width: 100, height: 100, right: 300, bottom: 300 },
      relativeBox: { left: 58, top: 13, width: 31, height: 78, right: 89, bottom: 91 },
      anchor: {
        kind: "slide",
        confidence: "high",
        locator: { descriptor: "section #slide-1 .slide", tagName: "section", cssPath: "#slide-1", nthOfTypePath: "body > section:nth-of-type(1)", siblingIndex: 0 }
      },
      createdAt: Date.now()
    },
    candidates: empty ? [] : [mockCandidate("textBlock", { text: "Target context" })],
    nearby: [{ direction: "above", summary: "[Title]", distance: 24 } as any],
    empty,
    confidence: empty ? "medium" : "high"
  };
}

describe("Intent Prompt Builder", () => {
  it("returns empty message for no inputs", () => {
    const result = buildIntentPrompt([], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("empty");
    }
  });

  it("builds ordinary intent prompt with layered sections and no repeated To do / Do not blocks", () => {
    const input = mockRegionContext("intent", "Add a title here", true, [], [
      { direction: "above", summary: "[Image]", distance: 12 }
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "test.com", title: "Test" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("ClickDeck AI edit prompt");
      expect(prompt).toContain("Page context:");
      expect(prompt).toContain("How to use location hints:");
      expect(prompt).toContain("Global editing rules:");
      expect(prompt).toContain("Operations:");
      expect(prompt).toContain("OP-1 | type: intent");
      expect(prompt).toContain('User note: "Add a title here"');
      expect(prompt).toContain("Visual box: [x:10, y:20, w:30, h:40] relative to anchor, placement hint only");
      expect(prompt).toContain("Empty visual area; use it as intended placement area");
      expect(prompt).toContain("above: [Image] (distance: 12px)");
      expect(prompt).toContain("Completion checklist:");
      expect(prompt).not.toContain("Intent notes:");
      expect(prompt.match(/To do:/g)).toBeNull();
      expect(prompt.match(/Do not:/g)).toBeNull();
    }
  });

  it("keeps user wording as intent and does not force literal page copy", () => {
    const input = mockRegionContext("intent", "Remove this paragraph", false, [
      mockCandidate("textLine", { text: "Paragraph to remove" })
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain('User note: "Remove this paragraph"');
      expect(prompt).toContain("Do not treat the user note as literal page copy unless the user clearly asks to insert, write as, or replace with exact text.");
      expect(prompt).toContain("Do not redesign the whole slide/page or modify unrelated pages");
    }
  });

  it("includes short CSS facts without dumping full computed style", () => {
    const element = createElement("h1", "Styled headline");
    element.style.fontSize = "32px";
    element.style.fontWeight = "800";
    element.style.lineHeight = "1.2";
    element.style.color = "rgb(255, 109, 61)";
    element.style.margin = "0px";

    const input = mockRegionContext("intent", "Make this stronger", false, [
      mockCandidate("textLine", { text: "Styled headline", element })
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("CSS facts:");
      expect(prompt).toContain("kind: text");
      expect(prompt).toContain("text: font-size: 32px; font-weight: 800; line-height: 1.2; color: rgb(255, 109, 61)");
      expect(prompt).not.toContain("animation-duration");
      expect(prompt).not.toContain("margin: 0px");
    }
  });

  it("handles multiple operations with explicit operation IDs and checklist verification", () => {
    const op1 = mockRegionContext("intent", "Remove first", false, [mockCandidate("textBlock", { text: "First" })]);
    const op2 = mockRegionContext("intent", "Add second", true);

    const result = buildIntentPrompt([op1, op2], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("OP-1 | type: intent");
      expect(prompt).toContain("OP-2 | type: intent");
      expect(prompt).toContain('User note: "Remove first"');
      expect(prompt).toContain('User note: "Add second"');
      expect(prompt).toContain("Complete every operation exactly once: OP-1, OP-2.");
      expect(prompt).toContain("no operation ID was skipped");
    }
  });

  it("handles move operation without a move note", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", true);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("Move operation rules:");
      expect(prompt).toContain("OP-1 | type: move");
      expect(prompt).toContain("Move note: [not provided]");
      expect(prompt).toContain("Source A:");
      expect(prompt).toContain("Target B:");
      expect(prompt).toContain("Target B is the destination guide for placement and alignment, not replacement content.");
      expect(prompt).toContain("Without a move note, infer conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.");
      expect(prompt).toContain("Visual boxes are placement hints, not absolute CSS instructions");
      expect(prompt).toContain("Do not hard-code viewport coordinates as CSS top/left");
      expect(prompt).toContain("above: [Title] (distance: 24px)");
      expect(result.hasImageReplacement).toBe(true);
    }
  });

  it("keeps optional future move note when provided", () => {
    const input = mockRegionContext("move", "Move the logo group closer to the title", false, [
      mockCandidate("block", { text: "Logo group" })
    ]);
    addTargetContext(input, "", false);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Move note: "Move the logo group closer to the title"');
      expect(result.prompt).toContain("If Move note is provided, treat it as the primary semantic explanation of the move.");
    }
  });

  it("returns error if move operation is missing targetContext", () => {
    const input = mockRegionContext("move", "", false);
    
    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("missing target region");
    }
  });
});
