// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  summarizeVisualUnit,
  rankRegionCandidates,
  findNearbyReferences,
  buildRegionContext
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
    
    const above1 = mockUnit("block", { left: 100, top: 0, width: 100, height: 50 });
    const above2 = mockUnit("block", { left: 100, top: 60, width: 100, height: 20 }); // Closer!
    const below = mockUnit("block", { left: 100, top: 250, width: 100, height: 50 });
    
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
    const nearbyUnit = mockUnit("block", { left: 0, top: 150, width: 100, height: 50 });
    const ctx3 = buildRegionContext(regionLow, [nearbyUnit]);
    expect(ctx3.empty).toBe(true);
    expect(ctx3.confidence).toBe("medium");

    // Empty, no nearby -> low confidence
    const farUnit = mockUnit("block", { left: 0, top: 1000, width: 100, height: 50 });
    const ctx4 = buildRegionContext(regionLow, [farUnit]); // Too far
    expect(ctx4.empty).toBe(true);
    expect(ctx4.confidence).toBe("low");
  });
});
