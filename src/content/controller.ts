import { getRecentLogs, type ClickDeckLogger } from "../diagnostics/logger";
import {
  createEditorState,
  recordStylePatch,
  recordContentPatch,
  setEditorActive,
  setSelectedElement,
  type StylePatch,
  type ContentPatch,
  type EditorPatch
} from "../state/editor-state";
import { createEditHistory } from "../state/history";
import { canAutoStartTextEditing, createElementLocator, describeElement } from "./dom-utils";
import { getPanelLabels } from "./i18n";
import { createOverlay, type ClickDeckOverlay } from "./overlay";
import { createPanel, type ClickDeckPanel, type PanelAction } from "./panel";
import { getEditableTarget, getTabSwitchTarget } from "./selection";
import { applyStyleAction, type StyleAction } from "./style-actions";
import { exportHtmlSnapshot } from "../export/html";
import { exportPdfSnapshot } from "../export/pdf";

export type ClickDeckController = {
  toggle: () => void;
  isActive: () => boolean;
};

export function createController(logger: ClickDeckLogger, rootId: string): ClickDeckController {
  const labels = getPanelLabels();
  const state = createEditorState();
  const history = createEditHistory();
  let active = false;
  let hoveredElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let overlay: ClickDeckOverlay | null = null;
  let panel: ClickDeckPanel | null = null;
  let editingElement: HTMLElement | null = null;
  let originalText: string = "";

  function stopEditing(): void {
    if (!editingElement) {
      return;
    }

    editingElement.removeAttribute("contenteditable");
    const newText = editingElement.textContent ?? "";

    if (newText !== originalText) {
      const locator = createElementLocator(editingElement);
      const patch: ContentPatch = {
        id: `${Date.now()}-${state.patches.length + 1}`,
        kind: "content",
        targetElement: editingElement,
        targetDescriptor: describeElement(editingElement),
        targetLocator: locator,
        before: originalText,
        after: newText,
        createdAt: Date.now()
      };
      recordContentPatch(state, patch);
      history.undoStack.push(patch);
      history.redoStack.length = 0;
      logger.info("In-place text editing completed", { target: patch.targetDescriptor });
      refreshHistoryButtons();
    }

    editingElement = null;
    originalText = "";
  }

  function updateOutline(): void {
    if (!overlay) {
      return;
    }

    overlay.updateOutline(selectedElement ?? hoveredElement);
  }

  function refreshHistoryButtons(): void {
    panel?.setHistoryAvailability(history.undoStack.length > 0, history.redoStack.length > 0);
  }

  function applyPatchValue(patch: EditorPatch, value: string): void {
    if (patch.kind === "style") {
      patch.targetElement.style[patch.property] = value;
    } else {
      patch.targetElement.textContent = value;
    }
  }

  function undoLastPatch(): void {
    const patch = history.undoStack.pop();
    if (!patch) {
      return;
    }

    applyPatchValue(patch, patch.before);
    history.redoStack.push(patch);
    logger.info("Undo applied", { patchId: patch.id, target: patch.targetDescriptor });
    updateOutline();
    refreshHistoryButtons();
  }

  function redoLastPatch(): void {
    const patch = history.redoStack.pop();
    if (!patch) {
      return;
    }

    applyPatchValue(patch, patch.after);
    history.undoStack.push(patch);
    logger.info("Redo applied", { patchId: patch.id, target: patch.targetDescriptor });
    updateOutline();
    refreshHistoryButtons();
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!active) {
      return;
    }

    const target = getEditableTarget(event.target);
    if (target === hoveredElement) {
      return;
    }

    hoveredElement = target;
    if (!selectedElement) {
      updateOutline();
    }
  }

  function handleClick(event: MouseEvent): void {
    if (!active) {
      return;
    }

    const target = getEditableTarget(event.target);

    // If clicking inside the currently editing element, do not intercept
    // This allows the user to click to place the cursor.
    if (editingElement && editingElement.contains(event.target as Node)) {
      return;
    }

    // Stop editing the previous element before selecting a new one
    stopEditing();

    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);

    // Only auto-start in-place text editing for text-like elements.
    // Non-text elements (img/button/input/...) must not be forced into contenteditable.
    if (canAutoStartTextEditing(target)) {
      editingElement = target;
      originalText = target.textContent ?? "";
      target.setAttribute("contenteditable", "true");
      target.focus();
    } else {
      editingElement = null;
      originalText = "";
    }

    updateOutline();
    logger.info("Element selected", descriptor);
  }

  function clearSelection(reason: string): void {
    stopEditing();
    selectedElement = null;
    setSelectedElement(state, null);
    panel?.setHint(labels.selectHint);
    updateOutline();
    logger.info("Selection cleared", { reason });
  }

  function selectElement(target: HTMLElement, reason: string): void {
    stopEditing();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);
    updateOutline();
    logger.info("Element selected", { descriptor, reason });
  }

  function handleSelectionShortcut(event: KeyboardEvent): void {
    if (!active) {
      return;
    }

    // Esc: stop editing + cancel selection, but keep ClickDeck active.
    if (event.code === "Escape") {
      if (!selectedElement && !editingElement) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearSelection("escape");
      return;
    }

    // Tab / Shift+Tab: simple deterministic parent/first-child switch.
    if (event.code === "Tab") {
      if (!selectedElement) {
        return;
      }

      // Avoid stealing focus when user is navigating native inputs.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const direction = event.shiftKey ? "backward" : "forward";
      const next = getTabSwitchTarget(selectedElement, direction);
      if (!next || next === selectedElement) {
        return;
      }

      selectElement(next, `tab:${direction}`);
    }
  }

  function handleStyleAction(action: StyleAction): void {
    if (!selectedElement) {
      return;
    }

    const change = applyStyleAction(logger, selectedElement, action);
    if (!change) {
      return;
    }

    const patch: StylePatch = {
      id: `${Date.now()}-${state.patches.length + 1}`,
      kind: "style",
      targetElement: selectedElement,
      targetDescriptor: describeElement(selectedElement),
      targetLocator: createElementLocator(selectedElement),
      property: change.property,
      before: change.before,
      after: change.after,
      createdAt: Date.now()
    };
    recordStylePatch(state, patch);
    history.undoStack.push(patch);
    history.redoStack.length = 0;
    logger.info("Style patch recorded", {
      patchId: patch.id,
      property: patch.property,
      target: patch.targetDescriptor
    });
    updateOutline();
    refreshHistoryButtons();
  }

  function handlePanelAction(action: PanelAction): void {
    // Commit any active text editing before handling other actions
    stopEditing();

    if (action === "close") {
      deactivate();
      return;
    }

    if (action === "copy-diagnostics") {
      void navigator.clipboard.writeText(JSON.stringify(getRecentLogs(), null, 2));
      logger.info("Diagnostics copied to clipboard");
      return;
    }

    if (action === "export-html") {
      exportHtmlSnapshot(logger);
      return;
    }

    if (action === "export-pdf-long") {
      exportPdfSnapshot("long-page", logger);
      return;
    }

    if (action === "export-pdf-a4") {
      exportPdfSnapshot("a4", logger);
      return;
    }

    if (action === "export-pdf-slides") {
      exportPdfSnapshot("slides", logger);
      return;
    }

    if (action === "undo") {
      undoLastPatch();
      return;
    }

    if (action === "redo") {
      redoLastPatch();
      return;
    }

    if (typeof action === "string" && action.startsWith("color:")) {
      if (!selectedElement) {
        return;
      }
      const colorValue = action.slice(6); // Remove "color:" prefix
      const before = selectedElement.style.color;
      selectedElement.style.color = colorValue;
      const patch: StylePatch = {
        id: `${Date.now()}-${state.patches.length + 1}`,
        kind: "style",
        targetElement: selectedElement,
        targetDescriptor: describeElement(selectedElement),
        targetLocator: createElementLocator(selectedElement),
        property: "color",
        before,
        after: colorValue,
        createdAt: Date.now()
      };
      recordStylePatch(state, patch);
      history.undoStack.push(patch);
      history.redoStack.length = 0;
      logger.info("Color picker applied", { color: colorValue, target: patch.targetDescriptor });
      updateOutline();
      refreshHistoryButtons();
      return;
    }

    handleStyleAction(action as StyleAction);
  }

  function handleHistoryShortcut(event: KeyboardEvent): void {
    if (!active || !event.ctrlKey || event.altKey || event.metaKey || event.code !== "KeyZ") {
      return;
    }

    // Let browser handle native undo if typing inside editable element
    if (editingElement && document.activeElement === editingElement) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    
    stopEditing();

    if (event.shiftKey) {
      redoLastPatch();
      return;
    }

    undoLastPatch();
  }

  function activate(): void {
    active = true;
    setEditorActive(state, true);
    overlay = createOverlay(rootId);
    panel = createPanel(handlePanelAction);
    overlay.root.append(panel.element);
    refreshHistoryButtons();

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", updateOutline, true);
    window.addEventListener("resize", updateOutline, true);
    window.addEventListener("keydown", handleHistoryShortcut, true);
    window.addEventListener("keydown", handleSelectionShortcut, true);
    logger.info("ClickDeck activated");
  }

  function deactivate(): void {
    active = false;
    stopEditing();
    setEditorActive(state, false);
    hoveredElement = null;
    selectedElement = null;
    setSelectedElement(state, null);

    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("scroll", updateOutline, true);
    window.removeEventListener("resize", updateOutline, true);
    window.removeEventListener("keydown", handleHistoryShortcut, true);
    window.removeEventListener("keydown", handleSelectionShortcut, true);

    panel?.destroy();
    panel = null;
    overlay?.destroy();
    overlay = null;

    logger.info("ClickDeck deactivated");
  }

  return {
    toggle: () => {
      if (active) {
        deactivate();
      } else {
        activate();
      }
    },
    isActive: () => active
  };
}
