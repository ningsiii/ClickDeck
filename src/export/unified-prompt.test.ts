// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { buildUnifiedPrompt } from "./unified-prompt";
import type { EditorPatch } from "../state/editor-state";
import type { IntentPromptInput } from "./intent-prompt";

describe("buildUnifiedPrompt", () => {
  const dummyPage = { url: "http://test", title: "Test" };

  it("returns empty result if no patches and no intents", () => {
    const resultEn = buildUnifiedPrompt([], [], { language: "en", page: dummyPage });
    expect(resultEn.ok).toBe(false);
    if (!resultEn.ok) {
      expect(resultEn.message).toContain("No edits to summarize");
    }

    const resultZh = buildUnifiedPrompt([], [], { language: "zh", page: dummyPage });
    expect(resultZh.ok).toBe(false);
    if (!resultZh.ok) {
      expect(resultZh.message).toContain("当前没有可总结的修改");
    }
  });

  it("generates a TodoList with both intent ops and normal changes", () => {
    const targetElement = document.createElement("div");
    targetElement.className = "test test-class";
    targetElement.innerHTML = "<span>Hello</span>";
    
    const patch: EditorPatch = {
      id: "p1",
      createdAt: Date.now(),
      targetElement,
      targetDescriptor: "div",
      targetLocator: { cssPath: "div.test", descriptor: "test div" },
      kind: "style",
      property: "font-size",
      before: "12px",
      after: "14px"
    } as unknown as EditorPatch;

    const intent: IntentPromptInput = {
      operation: { action: "remove", regionId: "r1" },
      sourceContext: {
        region: { 
          id: "r1", 
          rect: { left: 0, top: 0, width: 10, height: 10 }, 
          viewportBox: { left: 0, top: 0, width: 10, height: 10, right: 10, bottom: 10 },
          pageMode: "html", 
          userIntent: "remove this block", 
          anchor: { kind: "visual", confidence: "low" } 
        },
        empty: false,
        candidates: [],
        nearby: [],
        confidence: "low"
      }
    } as unknown as IntentPromptInput;

    const result = buildUnifiedPrompt([patch], [intent], { language: "en", page: dummyPage });
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      const prompt = result.prompt;
      
      // Should have TodoList
      expect(prompt).toContain("Execution TodoList:");
      
      // Should contain the intent op
      expect(prompt).toContain("- [ ] TASK-1 | REMOVE |");
      
      // Should contain the patch op
      expect(prompt).toContain("- [ ] TASK-2 | STYLE | Target: test div | Details: Change-1");
      
      // Should contain the HTML snippet correctly formatted
      expect(prompt).toContain("Context code snippet:");
      expect(prompt).toContain('<div class="test test-class"><span>Hello</span></div>');
      
      // Should contain the final checklist
      expect(prompt).toContain("Final alignment checklist:");
      
      // Should NOT contain repetitive expected results inside the detail block
      // Instead it's in the global rules
      expect(prompt).toContain("Remove operation rules:");
      expect(prompt).toContain("Remove the selected region from the source HTML/CSS");
    }
  });

  it("integrates Move intent prompt structure with Placement summary and Final alignment guide", () => {
    const intent: IntentPromptInput = {
      operation: { action: "move", id: "op1" } as any,
      sourceContext: {
        region: { 
          id: "r1", 
          viewportBox: { left: 10, top: 20, width: 30, height: 40, right: 40, bottom: 60 },
          pageMode: "slide", 
          userIntent: "move this block", 
          anchor: { kind: "slide", confidence: "high" } 
        },
        empty: false,
        candidates: [],
        nearby: [],
        confidence: "high"
      } as any,
      targetContext: {
        region: {
          id: "r2",
          viewportBox: { left: 100, top: 100, width: 30, height: 40, right: 130, bottom: 140 },
          pageMode: "slide",
          userIntent: "",
          anchor: { kind: "slide", confidence: "high" }
        },
        empty: true,
        candidates: [],
        nearby: [{ direction: "right", summary: "[Title]", distance: 10, layoutSemantic: "avoid overlap / preserve offset" } as any],
        alignmentHints: [
          { summary: "Left edge aligns with [Title] left edge", deltaPx: 0, confidence: "high" }
        ],
        confidence: "high"
      } as any
    };

    const result = buildUnifiedPrompt([], [intent], { language: "en", page: dummyPage });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const prompt = result.prompt;
      
      expect(prompt).toContain("Placement summary:");
      expect(prompt).toContain("Treat Source A as the selected visual content group inside Source A's visual box");
      expect(prompt).toContain("Target B is below and shifted to the right of Source A");
      expect(prompt).toContain("Placement offset:");
      expect(prompt).toContain("Primary placement constraints:");
      expect(prompt).toContain("Place Source A to the left of [Title] while avoiding overlap.");
      expect(prompt).toContain("Placement references:");
      expect(prompt).toContain("- right: [Title], 10px away; avoid overlap / preserve offset.");
      expect(prompt).toContain("Final alignment guide:");
      expect(prompt).toContain("- No recorded active guide at drop; calculated high-confidence fallback: Left edge aligns with [Title] left edge (delta: 0px, confidence: high).");
    }
  });
});
