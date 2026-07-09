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

  it("makes the zh variant explicitly reference-only instead of pretending to be the primary execution prompt", () => {
    const targetElement = document.createElement("div");
    const patch: EditorPatch = {
      id: "p-zh",
      createdAt: Date.now(),
      targetElement,
      targetDescriptor: "div",
      targetLocator: { cssPath: "div", descriptor: "div" },
      kind: "style",
      property: "font-size",
      before: "12px",
      after: "14px"
    } as unknown as EditorPatch;

    const resultZh = buildUnifiedPrompt([patch], [], { language: "zh", page: dummyPage });
    expect(resultZh.ok).toBe(true);
    if (resultZh.ok) {
      expect(resultZh.prompt).toContain("ClickDeck AI edit prompt");
      expect(resultZh.prompt).toContain("页面上下文:");
      expect(resultZh.prompt).toContain("执行待办清单:");
      expect(resultZh.prompt).toContain("定位信息使用说明:");
      expect(resultZh.prompt).toContain("全局编辑规则:");
      expect(resultZh.prompt).toContain("任务详情:");
      expect(resultZh.prompt).toContain("最终核对清单:");
      expect(resultZh.prompt).toContain("样式修改");
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

  it("describes complex element patch targets and hides iframe srcdoc in snippets", () => {
    document.body.innerHTML = `<iframe id="frame" srcdoc="<main>Nested source should stay hidden</main>"></iframe>`;
    const targetElement = document.getElementById("frame") as HTMLIFrameElement;

    const patch: EditorPatch = {
      id: "p-complex",
      createdAt: Date.now(),
      targetElement,
      targetDescriptor: "iframe#frame",
      targetLocator: { cssPath: "#frame", descriptor: "iframe #frame", tagName: "iframe", nthOfTypePath: "iframe:nth-of-type(1)", siblingIndex: 0 },
      kind: "style",
      property: "maxWidth",
      before: "",
      after: "100%"
    } as unknown as EditorPatch;

    const result = buildUnifiedPrompt([patch], [], { language: "en", page: dummyPage });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Complex element: iframe / srcdoc.");
      expect(result.prompt).toContain("Only the outer iframe is changed");
      expect(result.prompt).toContain('srcdoc="[srcdoc hidden]"');
      expect(result.prompt).not.toContain("Nested source should stay hidden");
    }
  });

  it("describes SVG text replacement as inline SVG while preserving simple text diffs", () => {
    document.body.innerHTML = `
      <svg id="svg-text" width="120" height="60">
        <text id="svg-text-node">Hello</text>
      </svg>
    `;
    const targetElement = document.querySelector("text#svg-text-node") as SVGTextElement | null;
    expect(targetElement).not.toBeNull();
    if (!targetElement) {
      return;
    }

    const patch: EditorPatch = {
      id: "p-svg-text",
      createdAt: Date.now(),
      targetElement,
      targetDescriptor: "svg text",
      targetLocator: {
        cssPath: "#svg-text text",
        descriptor: "svg text",
        tagName: "text",
        nthOfTypePath: "svg:nth-of-type(1) text:nth-of-type(1)",
        siblingIndex: 0
      },
      kind: "content",
      before: "Hello",
      after: "Lens"
    } as unknown as EditorPatch;

    const result = buildUnifiedPrompt([patch], [], { language: "en", page: dummyPage });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prompt).toContain("Complex element: inline SVG.");
      expect(result.prompt).toContain("Only detected simple SVG text content is changed");
      expect(result.prompt).toContain('Text replaced: "Hello" with "Lens".');
      expect(result.prompt).toContain('Final text should be: "Lens".');
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
      expect(prompt).toContain("Anchor and coordinate model:");
      expect(prompt).toContain("Viewport box fallback:");
      expect(prompt).toContain("Primary axis constraints:");
      expect(prompt).toContain("X axis: place Source A immediately to the left of [Title], with about 10px horizontal gap.");
      expect(prompt).toContain("Y axis: use placement offset; Target B top edge is about 80px below Source A top edge.");
      expect(prompt).toContain("Relation types: gap, adjacent");
      expect(prompt).toContain("Secondary references:");
      expect(prompt).toContain("- None beyond the primary constraints.");
      expect(prompt).toContain("Confidence notes:");
      expect(prompt).toContain("Placement references:");
      expect(prompt).toContain("- right: [Title], 10px away; avoid overlap / preserve offset.");
      expect(prompt).toContain("Final alignment guide:");
      expect(prompt).toContain("- No recorded active guide at drop; calculated high-confidence fallback: Left edge aligns with [Title] left edge (delta: 0px, confidence: high).");
    }
  });

  it("localizes zh move prompt structure while keeping technical fields raw", () => {
    const intent: IntentPromptInput = {
      operation: { action: "move", id: "op1" } as any,
      sourceContext: {
        region: {
          id: "r1",
          viewportBox: { left: 10, top: 20, width: 30, height: 40, right: 40, bottom: 60 },
          pageMode: "slide",
          userIntent: "",
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
        nearby: [{ direction: "left", summary: "适用场景与人群", distance: 43, layoutSemantic: "use it as horizontal context / preserve offset" } as any],
        alignmentHints: [],
        confidence: "high"
      } as any
    };

    const resultZh = buildUnifiedPrompt([], [intent], { language: "zh", page: dummyPage });
    expect(resultZh.ok).toBe(true);
    if (resultZh.ok) {
      expect(resultZh.prompt).toContain("移动操作规则:");
      expect(resultZh.prompt).toContain("放置摘要:");
      expect(resultZh.prompt).toContain("Anchor 与坐标系:");
      expect(resultZh.prompt).toContain("主轴约束:");
      expect(resultZh.prompt).toContain("次级参考:");
      expect(resultZh.prompt).toContain("置信度说明:");
      expect(resultZh.prompt).toContain("放置参考:");
      expect(resultZh.prompt).toContain("最终对齐参考:");
      expect(resultZh.prompt).toContain("X 轴：将 Source A 放在 \"适用场景与人群\" 的右侧附近");
    }
  });
});
