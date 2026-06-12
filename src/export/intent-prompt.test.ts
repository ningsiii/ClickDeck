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

function mockCandidateFromElement(element: HTMLElement, text: string, rank: number): RegionCandidate {
  return {
    unit: mockVisualUnit("textLine", { text, element }),
    rank,
    reason: "Primary content (textLine)",
    overlapRatio: 1,
    centerInBox: true
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
  action: "intent" | "move" | "remove",
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
    nearby: [{ direction: "above", summary: "[Title]", distance: 24, layoutSemantic: "place Target B below this reference / preserve vertical spacing" } as any],
    alignmentHints: [
      { summary: "Left edge aligns with [Title] left edge", deltaPx: 2, confidence: "high" },
      { summary: "Top edge is 24px below [Header] bottom edge", deltaPx: 24, confidence: "high" }
    ],
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
      expect(prompt).toContain("- above: [Image], 12px away");
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
      expect(prompt).toContain("Interpret the move as the desired final visual placement of Source A content");
      expect(prompt).toContain("Before changing CSS, identify the existing layout mechanism that controls Source A placement.");
      expect(prompt).toContain("Prefer stable local layout edits such as flex/grid alignment, parent alignment, margin, max-width, gap, order, or local wrapper placement.");
      expect(prompt).toContain("Do not recreate or preserve ClickDeck editing UI such as selection boxes, target boxes, dashed outlines, badges, or marker labels.");
      expect(prompt).toContain("Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.");
      expect(prompt).toContain("Visual boxes are placement hints, not absolute CSS instructions");
      expect(prompt).toContain("Do not hard-code viewport coordinates as CSS top/left");
      expect(prompt).toContain("Placement summary:");
      expect(prompt).toContain("Treat Source A as the selected visual content group inside Source A's visual box");
      expect(prompt).toContain("Do not include nearby labels, headings, or parent-container text unless they overlap Source A");
      expect(prompt).toContain("Target B is below and shifted to the right of Source A.");
      expect(prompt).toContain("Placement offset:");
      expect(prompt).toContain("Target B left edge is about 48% to the right of Source A left edge.");
      expect(prompt).toContain("Target B top edge is about 7% above Source A top edge.");
      expect(prompt).toContain("Primary placement constraints:");
      expect(prompt).toContain("Keep Source A below [Title] and preserve the vertical spacing.");
      expect(prompt).toContain("Placement references:");
      expect(prompt).toContain("- above: [Title], 24px away; place Target B below this reference / preserve vertical spacing.");
      expect(prompt).toContain("Final alignment guide:");
      expect(prompt).toContain("- No recorded active guide at drop; calculated high-confidence fallback: Left edge aligns with [Title] left edge (delta: 2px, confidence: high).");
      expect(prompt).toContain("- No recorded active guide at drop; calculated high-confidence fallback: Top edge is 24px below [Header] bottom edge (delta: 24px, confidence: high).");
      expect(result.hasMediaReplacement).toBe(true);
    }
  });

  it("scopes grouped source semantics to the visual box and adds implementation hint for sibling items", () => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = "适用场景与人群";
    const chip1 = document.createElement("span");
    chip1.textContent = "PPT 演示 / 汇报";
    const chip2 = document.createElement("span");
    chip2.textContent = "产品经理 (PM)";
    row.append(label, chip1, chip2);
    document.body.appendChild(row);

    const input = mockRegionContext("move", "", false, [
      mockCandidateFromElement(chip1, "PPT 演示 / 汇报", 1),
      mockCandidateFromElement(chip2, "产品经理 (PM)", 2)
    ]);
    addTargetContext(input, "", true);
    input.targetContext!.nearby = [
      { direction: "left", summary: "适用场景与人群", distance: 37, layoutSemantic: "use it as horizontal context / preserve offset" } as any
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Source implementation hint:");
      expect(result.prompt).toContain("Source A contains multiple sibling items; prefer moving their shared row/wrapper container");
      expect(result.prompt).toContain("Exclude nearby labels/headings outside Source A's visual box");
      expect(result.prompt).toContain("Do not include nearby labels, headings, or parent-container text unless they overlap Source A");
      expect(result.prompt).toContain("- left: 适用场景与人群, 37px away; use it as horizontal context / preserve offset.");
      expect(result.prompt).toContain("Primary placement constraints:");
      expect(result.prompt).toContain('Place Source A to the right of "适用场景与人群" while preserving the horizontal relationship.');
    }
  });

  it("summarizes the key left and below relationships as primary placement constraints", () => {
    const input = mockRegionContext("move", "", false, [
      mockCandidate("textLine", { text: "PPT 演示 / 汇报" }),
      mockCandidate("textLine", { text: "产品经理 (PM)" })
    ]);
    addTargetContext(input, "", true);
    input.targetContext!.nearby = [
      { direction: "left", summary: "适用场景与人群", distance: 43, layoutSemantic: "use it as horizontal context / preserve offset" } as any,
      { direction: "below", summary: "超越代码补全：", distance: 51, layoutSemantic: "place Target B above this reference / preserve vertical spacing" } as any
    ];
    input.targetContext!.activeAlignmentGuides = [
      {
        axis: "y",
        position: 120,
        targetEdge: "centerY",
        sourceEdge: "centerY",
        unitSummary: "适用场景与人群",
        deltaPx: 0
      }
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("Primary placement constraints:");
      expect(prompt).toContain('Preserve the recorded guide: Target B center Y aligns with "适用场景与人群" center Y.');
      expect(prompt).toContain('Place Source A to the right of "适用场景与人群" while preserving the horizontal relationship.');
      expect(prompt).toContain('Keep Source A above "超越代码补全：" and preserve the vertical spacing.');
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

  it("handles move operation without alignment hints", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", true);
    input.targetContext!.alignmentHints = [];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Final alignment guide:");
      expect(result.prompt).toContain("- None active at drop; use Placement references and Target B visual box.");
    }
  });

  it("handles move operation with only low-confidence alignment hints", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", true);
    input.targetContext!.alignmentHints = [
      { summary: "Center aligns with [Something]", deltaPx: 10, confidence: "low" },
      { summary: "Top aligns with [Something Else]", deltaPx: 8, confidence: "medium" }
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Final alignment guide:");
      expect(result.prompt).toContain("- None active at drop; use Placement references and Target B visual box.");
      expect(result.prompt).not.toContain("Center aligns with");
      expect(result.prompt).not.toContain("Top aligns with");
    }
  });

  it("replaces low-overlap block contents with fallback in Target B", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", false);
    
    // Set Target B candidates to only low overlap blocks
    input.targetContext!.candidates = [
      { unit: mockVisualUnit("block"), rank: 1, reason: "bg", overlapRatio: 0.05, centerInBox: false },
      { unit: mockVisualUnit("block"), rank: 2, reason: "bg", overlapRatio: 0.08, centerInBox: false }
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Target B placement reference:");
      expect(result.prompt).toContain("- Mostly empty/structural area; use nearby references and alignment hints as placement context.");
      // Ensure it doesn't output the typical formatCandidate details
      expect(result.prompt).not.toContain("overlap 5%");
    }
  });

  it("only includes high confidence hints and drops low/medium confidence ones", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", false);
    
    input.targetContext!.alignmentHints = [
      { summary: "Low edge aligns", deltaPx: 12, confidence: "low" },
      { summary: "Medium edge aligns", deltaPx: 5, confidence: "medium" },
      { summary: "High edge aligns", deltaPx: 2, confidence: "high" }
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("- No recorded active guide at drop; calculated high-confidence fallback: High edge aligns (delta: 2px, confidence: high).");
      expect(prompt).not.toContain("Low edge aligns");
      expect(prompt).not.toContain("Medium edge aligns");
    }
  });

  it("uses recorded active guides before calculated fallback hints", () => {
    const input = mockRegionContext("move", "", false, [mockCandidate("image")]);
    addTargetContext(input, "", true);
    input.targetContext!.activeAlignmentGuides = [
      {
        axis: "y",
        position: 220,
        targetEdge: "centerY",
        sourceEdge: "centerY",
        unitSummary: "超越代码补全：直接引入页面级的评审诊断",
        deltaPx: 0
      }
    ];

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain('Target B center Y aligns with "超越代码补全：直接引入页面级的评审诊断" center Y (delta: 0px).');
      expect(prompt).not.toContain("calculated high-confidence fallback");
    }
  });

  it("handles remove operation with note", () => {
    const input = mockRegionContext("remove", "just delete this", false, [mockCandidate("block")]);
    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("OP-1 | type: remove");
      expect(result.prompt).toContain('Remove note: "just delete this"');
      expect(result.prompt).toContain("Remove the selected region from the source HTML/CSS");
      expect(result.prompt).toContain("Preserve surrounding layout where possible");
      expect(result.prompt).toContain("Do not redesign unrelated sections");
    }
  });

  it("handles remove operation without note", () => {
    const input = mockRegionContext("remove", "", false, [mockCandidate("block")]);
    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("OP-1 | type: remove");
      expect(result.prompt).toContain("Remove note: [not provided]");
    }
  });
});
