// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  summarizeVisualUnit,
  rankRegionCandidates,
  findNearbyReferences,
  buildRegionContext,
  calculateAlignmentHints
} from "./region-context";
import { VisualUnit } from "./visual-units";
import { IntentRegion } from "./intent-region";

function mockUnit(kind: VisualUnit["kind"], rect: Partial<VisualUnit["rect"]>, extra: Partial<VisualUnit> = {}): VisualUnit {
  const r = {
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    width: rect.width ?? 100,
    height: rect.height ?? 100,
    right: (rect.left ?? 0) + (rect.width ?? 100),
    bottom: (rect.top ?? 0) + (rect.height ?? 100)
  };
  return {
    id: `u-${Math.random()}`,
    kind,
    element: document.createElement("div"),
    locator: {} as any,
    rect: r,
    documentRect: r,
    confidence: "high",
    ...extra
  };
}

function mockRegion(viewportBox: Partial<IntentRegion["viewportBox"]>, anchorConfidence: "high" | "medium" | "low" = "high"): IntentRegion {
  const r = {
    left: viewportBox.left ?? 0,
    top: viewportBox.top ?? 0,
    width: viewportBox.width ?? 100,
    height: viewportBox.height ?? 100,
    right: (viewportBox.left ?? 0) + (viewportBox.width ?? 100),
    bottom: (viewportBox.top ?? 0) + (viewportBox.height ?? 100)
  };
  return {
    id: "r1",
    action: "intent",
    userIntent: "test",
    pageMode: "slide",
    viewportBox: r,
    documentBox: r,
    anchor: { kind: "slide", confidence: anchorConfidence },
    createdAt: Date.now()
  };
}

describe("Region Context", () => {
  it("summarizeVisualUnit formats correctly", () => {
    expect(summarizeVisualUnit(mockUnit("image", {}))).toBe("[Image]");
    expect(summarizeVisualUnit(mockUnit("video", {}))).toBe("[Video]");
    expect(summarizeVisualUnit(mockUnit("background", {}))).toBe("[Background Container]");
    expect(summarizeVisualUnit(mockUnit("textLine", {}, { textSnippet: "Short" }))).toBe("Short");
    expect(summarizeVisualUnit(mockUnit("textLine", {}, { textSnippet: "This is a very long string that should exceed the fifty character limit and be truncated" }))).toBe("This is a very long string that should exceed t...");
    expect(summarizeVisualUnit(mockUnit("block", {}, { roleHint: "navigation" }))).toBe("[navigation]");
    expect(summarizeVisualUnit(mockUnit("block", {}))).toBe("[block]");
  });

  it("rankRegionCandidates prioritizes textLine over block", () => {
    const parentBlock = mockUnit("block", { left: 0, top: 0, width: 200, height: 200 });
    const childTextLine = mockUnit("textLine", { left: 50, top: 50, width: 100, height: 20 }, { textSnippet: "Hello" });
    
    // Box covers exactly the textLine
    const region = mockRegion({ left: 40, top: 40, width: 120, height: 40 });
    
    const candidates = rankRegionCandidates(region, [parentBlock, childTextLine]);
    
    expect(candidates.length).toBe(2);
    expect(candidates[0].unit.kind).toBe("textLine");
    expect(candidates[0].rank).toBe(1);
    expect(candidates[1].unit.kind).toBe("block");
    expect(candidates[1].rank).toBe(2);
  });

  it("findNearbyReferences finds closest elements", () => {
    const region = mockRegion({ left: 100, top: 100, width: 100, height: 100 });
    
    const above1 = mockUnit("textBlock", { left: 100, top: 0, width: 100, height: 50 });
    const above2 = mockUnit("textBlock", { left: 100, top: 60, width: 100, height: 20 }); // Closer!
    const below = mockUnit("textBlock", { left: 100, top: 250, width: 100, height: 50 });
    
    const refs = findNearbyReferences(region, [above1, above2, below]);
    
    const aboveRef = refs.find(r => r.direction === "above");
    expect(aboveRef).toBeDefined();
    expect(aboveRef?.unit).toBe(above2); // Should pick the closer one
    expect(aboveRef?.distance).toBe(20); // 100 - (60+20) = 20
    
    const belowRef = refs.find(r => r.direction === "below");
    expect(belowRef).toBeDefined();
    expect(belowRef?.unit).toBe(below);
    expect(belowRef?.distance).toBe(50); // 250 - (100+100) = 50
  });

  it("findNearbyReferences excludes source text snippets from placement references", () => {
    const region = mockRegion({ left: 100, top: 100, width: 100, height: 100 });
    const sourceChip = mockUnit("textLine", { left: 100, top: 250, width: 100, height: 20 }, { textSnippet: "产品经理 (PM)" });
    const title = mockUnit("textLine", { left: 100, top: 280, width: 100, height: 20 }, { textSnippet: "超越代码补全" });

    const refs = findNearbyReferences(region, [sourceChip, title], {
      excludeTextSnippets: ["产品经理 (PM)"]
    });

    expect(refs.some(ref => ref.summary === "产品经理 (PM)")).toBe(false);
    expect(refs.some(ref => ref.summary === "超越代码补全")).toBe(true);
  });

  it("findNearbyReferences prefers source element exclusion without removing same text elsewhere", () => {
    const region = mockRegion({ left: 100, top: 100, width: 100, height: 100 });
    const sourceElement = document.createElement("span");
    const duplicateElement = document.createElement("span");
    const sourceChip = mockUnit("textLine", { left: 100, top: 250, width: 100, height: 20 }, { textSnippet: "重复文本", element: sourceElement });
    const duplicateNearby = mockUnit("textLine", { left: 100, top: 280, width: 100, height: 20 }, { textSnippet: "重复文本", element: duplicateElement });

    const refs = findNearbyReferences(region, [sourceChip, duplicateNearby], {
      excludeElements: [sourceElement]
    });

    expect(refs.some(ref => ref.unit === sourceChip)).toBe(false);
    expect(refs.some(ref => ref.unit === duplicateNearby)).toBe(true);
  });

  it("findNearbyReferences excludes every source visual unit by id, even when it was not a top candidate", () => {
    const region = mockRegion({ left: 100, top: 100, width: 100, height: 100 });
    const sourceChip = mockUnit("textLine", { left: 100, top: 250, width: 100, height: 20 }, { id: "source-chip", textSnippet: "UI 设计 / 排版" });
    const title = mockUnit("textLine", { left: 100, top: 290, width: 240, height: 40 }, { textSnippet: "超越代码补全：" });

    const refs = findNearbyReferences(region, [sourceChip, title], {
      excludeUnitIds: ["source-chip"]
    });

    expect(refs.some(ref => ref.summary === "UI 设计 / 排版")).toBe(false);
    expect(refs.some(ref => ref.summary === "超越代码补全：")).toBe(true);
  });


  it("buildRegionContext returns correct confidence", () => {
    const regionHigh = mockRegion({ left: 0, top: 0, width: 100, height: 100 }, "high");
    const regionLow = mockRegion({ left: 0, top: 0, width: 100, height: 100 }, "low");
    
    // Has candidates, high anchor -> high confidence
    const unit1 = mockUnit("block", { left: 0, top: 0, width: 100, height: 100 });
    const ctx1 = buildRegionContext(regionHigh, [unit1]);
    expect(ctx1.confidence).toBe("high");
    expect(ctx1.empty).toBe(false);

    // Has candidates, low anchor -> medium confidence
    const ctx2 = buildRegionContext(regionLow, [unit1]);
    expect(ctx2.confidence).toBe("medium");

    // Empty, but has nearby -> medium confidence
    const nearbyUnit = mockUnit("textBlock", { left: 0, top: 150, width: 100, height: 50 });
    const ctx3 = buildRegionContext(regionLow, [nearbyUnit]);
    expect(ctx3.empty).toBe(true);
    expect(ctx3.confidence).toBe("medium");

    // Empty, no nearby -> low confidence
    const farUnit = mockUnit("textBlock", { left: 0, top: 1000, width: 100, height: 50 });
    const ctx4 = buildRegionContext(regionLow, [farUnit]); // Too far
    expect(ctx4.empty).toBe(true);
    expect(ctx4.confidence).toBe("low");
  });

  it("calculateAlignmentHints prioritizes edge over center, limits center to 1", () => {
    const box = { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200 };
    const anchor = { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 };
    
    // U1 has perfect center X and Y match, but edges are 50px away
    const unit1 = mockUnit("textLine", { left: 150, top: 125, width: 100, height: 50 }, { textSnippet: "U1" });
    // U2 has perfect left edge match, other edges far away
    const unit2 = mockUnit("image", { left: 100, top: 300, width: 50, height: 50 }); // Left edge aligns
    
    const hints = calculateAlignmentHints(box, anchor, [unit1, unit2]);
    
    // Expect edge hint to be before center hint
    const edgeIndex = hints.findIndex(h => h.summary.includes("edge"));
    const centerIndex = hints.findIndex(h => h.summary.includes("Center"));
    expect(edgeIndex).toBe(0);
    expect(centerIndex).toBe(1);
    expect(edgeIndex).toBeLessThan(centerIndex);

    // Expect at most 1 center hint across all elements
    const centerHints = hints.filter(h => h.summary.includes("Center"));
    expect(centerHints.length).toBe(1);
  });

  it("calculateAlignmentHints downgrades far elements and scores spacing correctly", () => {
    const box = { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200 };
    
    // Nearby spacing (24px below)
    const unitNearby = mockUnit("textLine", { left: 100, top: 56, width: 200, height: 20 }, { textSnippet: "Nearby" }); 
    // Top of box is 100. Bottom of unitNearby is 76. Spacing is 24.
    
    // Far element with perfect center match
    const unitFar = mockUnit("video", { left: 1000, top: 100, width: 200, height: 100 }); 
    // Center Y perfectly matches, but it's far away (left is 1000 vs 300)
    
    const hints = calculateAlignmentHints(box, undefined, [unitNearby, unitFar]);
    
    // Spacing 24px should NOT be high, but medium
    const spacingHint = hints.find(h => h.summary.includes("below"));
    expect(spacingHint).toBeDefined();
    expect(spacingHint?.confidence).toBe("medium");
    expect(spacingHint?.deltaPx).toBe(24);

    // The nearby spacing hint should beat the far center hint
    const spacingIndex = hints.indexOf(spacingHint!);
    const farCenterHint = hints.find(h => h.summary.includes("Center Y is close to [Video]"));
    
    if (farCenterHint) {
      const farCenterIndex = hints.indexOf(farCenterHint);
      expect(spacingIndex).toBeLessThan(farCenterIndex);
    }
  });

  it("calculateAlignmentHints prioritizes high confidence edge over low confidence edge", () => {
    const box = { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200 };
    
    // Low confidence edge: delta is 15px (which is low confidence, getConfidence(15) === "low")
    const unitLow = mockUnit("textLine", { left: 85, top: 0, width: 20, height: 20 }, { textSnippet: "Low" });
    
    // High confidence edge: delta is 2px (which is high confidence, getConfidence(2) === "high")
    // Let's make it a far away unit so its reference priority is lower
    const unitHigh = mockUnit("image", { left: 102, top: 800, width: 50, height: 50 }); // Left is 102, box left is 100
    
    const hints = calculateAlignmentHints(box, undefined, [unitLow, unitHigh]);
    
    const lowHint = hints.find(h => h.summary.includes("Left edge aligns with Low"));
    const highHint = hints.find(h => h.summary.includes("Left edge aligns with [Image]"));
    
    expect(lowHint).toBeDefined();
    expect(highHint).toBeDefined();
    
    const lowIndex = hints.indexOf(lowHint!);
    const highIndex = hints.indexOf(highHint!);
    
    // Both are nearby edges. High confidence has delta 2, Low has delta 15.
    // High confidence should beat low confidence.
    expect(highIndex).toBeLessThan(lowIndex);
  });

  it("calculateAlignmentHints excludes snippets if options.excludeTextSnippets is provided", () => {
    const box = { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200 };
    const unitSource = mockUnit("textLine", { left: 100, top: 100, width: 200, height: 100 }, { textSnippet: "Source A Content" });
    const unitOther = mockUnit("textLine", { left: 100, top: 200, width: 200, height: 100 }, { textSnippet: "Other Content" });
    
    const hints = calculateAlignmentHints(box, undefined, [unitSource, unitOther], { excludeTextSnippets: ["Source A Content"] });
    
    const sourceHint = hints.find(h => h.summary.includes("Source A Content"));
    expect(sourceHint).toBeUndefined();
    
    const otherHint = hints.find(h => h.summary.includes("Other Content"));
    expect(otherHint).toBeDefined();
  });

  it("buildRegionContext carries recorded active alignment guides", () => {
    const region = mockRegion({ left: 100, top: 100, width: 100, height: 100 });
    const activeAlignmentGuides = [{
      axis: "y" as const,
      position: 150,
      targetEdge: "centerY" as const,
      sourceEdge: "centerY" as const,
      unitSummary: "Title",
      deltaPx: 0
    }];

    const ctx = buildRegionContext(region, [], { activeAlignmentGuides });
    expect(ctx.activeAlignmentGuides).toEqual(activeAlignmentGuides);
  });
});
