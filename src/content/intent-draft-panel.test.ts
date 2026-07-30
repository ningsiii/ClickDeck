/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createIntentDraftPanel } from "./intent-draft-panel";
import type { IntentOperation } from "./intent-region";
import type { PanelLayout } from "./panel";

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

  const mockLayout: PanelLayout = {
    left: 600,
    top: 40,
    width: 248,
    height: 500,
    collapsed: false
  };

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

  it("writes a selected interaction into the existing editable suggestion", () => {
    const onSave = vi.fn();
    const panel = createIntentDraftPanel(onSave, vi.fn(), vi.fn(), vi.fn());
    const operation = createMockOperation();
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
    card.querySelector<HTMLButtonElement>(".clickdeck-intent-draft__interaction-btn")?.click();

    const library = panel.element.querySelector(".clickdeck-interaction-library") as HTMLElement;
    expect(library).not.toBeNull();
    library.querySelector<HTMLButtonElement>("[data-library-pattern='filter-chips']")?.click();
    library.querySelector<HTMLButtonElement>("[data-library-action='select']")?.click();

    expect(textarea.value).toContain("Filter Chips");
    expect(textarea.value).toContain("invent no new content");
    expect(panel.element.querySelector(".clickdeck-interaction-library")).toBeNull();

    card.querySelector<HTMLButtonElement>('button[data-action="save"]')?.click();
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].source.userIntent).toBe(textarea.value);

    panel.destroy();
  });

  it("appends interaction text without overwriting an existing note and restores intent action", () => {
    const onActionChange = vi.fn();
    const panel = createIntentDraftPanel(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      onActionChange
    );
    const operation = createMockOperation();
    operation.action = "move";
    operation.source.action = "move";
    operation.source.userIntent = "Keep the heading in view.";
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
    card.querySelector<HTMLButtonElement>(".clickdeck-intent-draft__interaction-btn")?.click();

    const library = panel.element.querySelector(".clickdeck-interaction-library") as HTMLElement;
    library.querySelector<HTMLButtonElement>("[data-library-pattern='tabs']")?.click();
    library.querySelector<HTMLButtonElement>("[data-library-action='select']")?.click();

    expect(textarea.value).toMatch(/^Keep the heading in view\.\n\nChange this region to Tabs/);
    expect(onActionChange).toHaveBeenCalledWith("op-1", "intent");

    card.querySelector<HTMLButtonElement>('button[data-action="save"]')?.click();
    expect(operation.action).toBe("intent");

    panel.destroy();
  });

  it("should trigger onDragTarget on Move to click immediately", () => {
    const onDragTarget = vi.fn();
    const onActionChange = vi.fn();
    const panel = createIntentDraftPanel(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), onDragTarget, onActionChange);
    
    const operation = createMockOperation();
    operation.action = "intent";
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const btnTarget = card.querySelector(".clickdeck-intent-draft__target-btn") as HTMLButtonElement;
    
    // Click Move to... should trigger both action change and drag target immediately
    btnTarget.click();
    expect(onActionChange).toHaveBeenCalledWith(operation.id, "move");
    expect(onDragTarget).toHaveBeenCalledWith(operation.id);
  });

  it("should display only the single Target button in Move mode", () => {
    const panel = createIntentDraftPanel(vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn());
    
    const operation = createMockOperation();
    operation.action = "move";
    panel.addDraft(operation);

    const card = panel.element.querySelector(".clickdeck-intent-draft__card") as HTMLElement;
    const btnTarget = card.querySelector(".clickdeck-intent-draft__target-btn") as HTMLButtonElement;
    const btnGhost = card.querySelector(".clickdeck-intent-draft__ghost-btn") as HTMLButtonElement;
    
    // Ghost button should not exist
    expect(btnGhost).toBeNull();
    
    // Target button should exist and have the active class for move
    expect(btnTarget).not.toBeNull();
    expect(btnTarget.classList.contains("clickdeck-intent-draft__target-btn--active")).toBe(true);
  });

  it("shows one colored tab per draft and expands the whole drawer together", () => {
    const panel = createIntentDraftPanel(vi.fn(), vi.fn(), vi.fn(), vi.fn());
    panel.setAnchorLayout(mockLayout);

    const first = createMockOperation();
    const second = createMockOperation();
    second.id = "op-2";
    second.source.id = "reg-2";

    panel.addDraft(first, "#e85d75");
    panel.addDraft(second, "#16a085");

    const tabs = panel.element.querySelectorAll(".clickdeck-intent-draft__tab");
    expect(tabs).toHaveLength(2);
    expect((tabs[0] as HTMLElement).style.background).toContain("232, 93, 117");
    expect((tabs[1] as HTMLElement).style.background).toContain("22, 160, 133");

    const collapse = panel.element.querySelector(".clickdeck-intent-draft__collapse") as HTMLButtonElement;
    collapse.click();
    expect(panel.element.classList.contains("clickdeck-intent-draft--expanded")).toBe(false);

    const rail = panel.element.querySelector(".clickdeck-intent-draft__rail") as HTMLButtonElement;
    rail.click();
    expect(panel.element.classList.contains("clickdeck-intent-draft--expanded")).toBe(true);
  });

  it("hides the drawer when the main panel is collapsed", () => {
    const panel = createIntentDraftPanel(vi.fn(), vi.fn(), vi.fn(), vi.fn());
    panel.setAnchorLayout(mockLayout);
    panel.addDraft(createMockOperation(), "#e85d75");

    expect(panel.element.classList.contains("clickdeck-intent-draft--hidden")).toBe(false);

    panel.setAnchorLayout({ ...mockLayout, collapsed: true });
    expect(panel.element.classList.contains("clickdeck-intent-draft--hidden")).toBe(true);
  });
});
