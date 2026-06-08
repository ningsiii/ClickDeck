/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIntentDraftPanel } from "./intent-draft-panel";
import type { IntentOperation } from "./intent-region";

describe("intent-draft-panel", () => {
  beforeEach(() => {
    // Need a DOM environment for tests
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  function createMockOperation(): IntentOperation {
    return {
      id: "op-1",
      action: "intent",
      createdAt: 0,
      source: {
        id: "reg-1",
        action: "intent",
        userIntent: "",
        pageMode: "unknown",
        viewportBox: { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 },
        documentBox: { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100 },
        anchor: { kind: "document", confidence: "high" },
        createdAt: 0
      }
    };
  }

  it("should block empty intent save for normal intent", () => {
    const onSave = vi.fn();
    const panel = createIntentDraftPanel(onSave, vi.fn(), vi.fn(), vi.fn());
    
    const operation = createMockOperation();
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const btnSave = card.querySelector('button[data-action="save"]') as HTMLButtonElement;
    
    // Default textarea is empty, clicking save should focus it and NOT call onSave
    btnSave.click();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("should allow empty note save for move action", () => {
    const onSave = vi.fn();
    const panel = createIntentDraftPanel(onSave, vi.fn(), vi.fn(), vi.fn());
    
    const operation = createMockOperation();
    operation.action = "move"; // Pre-set to move
    operation.source.action = "move";
    
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const btnSave = card.querySelector('button[data-action="save"]') as HTMLButtonElement;
    
    btnSave.click();
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].source.userIntent).toBe("");
  });

  it("should capture optional placement note for move action", () => {
    const onSave = vi.fn();
    const panel = createIntentDraftPanel(onSave, vi.fn(), vi.fn(), vi.fn());
    
    const operation = createMockOperation();
    operation.action = "intent"; 
    
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const btnTarget = card.querySelector(".clickdeck-intent-draft__target-btn") as HTMLButtonElement;
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
    const btnSave = card.querySelector('button[data-action="save"]') as HTMLButtonElement;
    
    // Switch to move
    btnTarget.click();
    
    // Type placement note
    textarea.value = "align left edge";
    
    // Save
    btnSave.click();
    
    expect(onSave).toHaveBeenCalled();
    const savedOp = onSave.mock.calls[0][0] as IntentOperation;
    expect(savedOp.action).toBe("move");
    expect(savedOp.source.userIntent).toBe("align left edge");
  });
});
