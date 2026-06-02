// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { buildIntentPrompt, IntentPromptInput } from "./intent-prompt";
import { RegionContext } from "../content/region-context";

function mockRegionContext(
  action: "add" | "delete" | "replace" | "restyle",
  userIntent: string,
  empty: boolean,
  candidates: any[] = [],
  nearby: any[] = []
): IntentPromptInput {
  return {
    operation: {
      id: "op1",
      action,
      source: {} as any,
      createdAt: Date.now()
    },
    sourceContext: {
      region: {
        id: "r1",
        action,
        userIntent,
        pageMode: "slide",
        viewportBox: { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 },
        documentBox: { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 },
        anchor: { kind: "slide", confidence: "high" },
        createdAt: Date.now()
      },
      candidates,
      nearby,
      empty,
      confidence: "high"
    }
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

  it("builds add prompt for empty visual area with nearby references", () => {
    const input = mockRegionContext("add", "Add a title here", true, [], [
      { direction: "above", summary: "[Image]" }
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain("Operation 1");
      expect(prompt).toContain('Action: add');
      expect(prompt).toContain('User intent: "Add a title here"');
      expect(prompt).toContain("This appears to be an empty visual area.");
      expect(prompt).toContain("- above: [Image]");
      expect(prompt).toContain("Allowed changes:");
      expect(prompt).toContain("Add new content near or inside the target region.");
      expect(prompt).toContain("Do not change:");
    }
  });

  it("builds delete prompt with specific red lines", () => {
    const input = mockRegionContext("delete", "Remove this paragraph", false, [
      { unit: { kind: "textLine" } }
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      expect(prompt).toContain('Action: delete');
      expect(prompt).toContain("Do not redesign the whole slide/page");
    }
  });

  it("builds restyle prompt without omitting style reference", () => {
    const input = mockRegionContext("restyle", "Make this red", false, [
      { unit: { kind: "textLine" } }
    ]);

    const result = buildIntentPrompt([input], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain('Action: restyle');
      expect(result.prompt).toContain("Style reference:");
    }
  });

  it("handles multiple operations correctly", () => {
    const op1 = mockRegionContext("delete", "Remove first", false);
    const op2 = mockRegionContext("add", "Add second", true);

    const result = buildIntentPrompt([op1, op2], { language: "en", page: { url: "", title: "" } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Operation 1");
      expect(result.prompt).toContain("Operation 2");
    }
  });
});
