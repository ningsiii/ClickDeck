import type { ClickDeckLogger } from "../diagnostics/logger";
import {
  createEditorState,
  recordStylePatch,
  setEditorActive,
  setSelectedElement,
  type StylePatch
} from "../state/editor-state";
import { createEditHistory } from "../state/history";
import { describeElement } from "./dom-utils";
import { createOverlay, type ClickDeckOverlay } from "./overlay";
import { createPanel, type ClickDeckPanel, type PanelAction } from "./panel";
import { getEditableTarget } from "./selection";
import { applyStyleAction, type StyleAction } from "./style-actions";

export type ClickDeckController = {
  toggle: () => void;
  isActive: () => boolean;
};

export function createController(logger: ClickDeckLogger, rootId: string): ClickDeckController {
  const state = createEditorState();
  const history = createEditHistory();
  let active = false;
  let hoveredElement: HTMLElement | null = null;
  let selectedElement: HTMLElement | null = null;
  let overlay: ClickDeckOverlay | null = null;
  let panel: ClickDeckPanel | null = null;

  function updateOutline(): void {
    if (!overlay) {
      return;
    }

    overlay.updateOutline(selectedElement ?? hoveredElement);
  }

  function refreshHistoryButtons(): void {
    panel?.setHistoryAvailability(history.undoStack.length > 0, history.redoStack.length > 0);
  }

  function applyPatchValue(patch: StylePatch, value: string): void {
    patch.targetElement.style[patch.property] = value;
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
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);
    updateOutline();
    logger.info("Element selected", descriptor);
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
      targetElement: selectedElement,
      targetDescriptor: describeElement(selectedElement),
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
    if (action === "undo") {
      undoLastPatch();
      return;
    }

    if (action === "redo") {
      redoLastPatch();
      return;
    }

    handleStyleAction(action);
  }

  function handleHistoryShortcut(event: KeyboardEvent): void {
    if (!active || !event.ctrlKey || event.altKey || event.metaKey || event.code !== "KeyZ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
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
    logger.info("ClickDeck activated");
  }

  function deactivate(): void {
    active = false;
    setEditorActive(state, false);
    hoveredElement = null;
    selectedElement = null;
    setSelectedElement(state, null);

    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("scroll", updateOutline, true);
    window.removeEventListener("resize", updateOutline, true);
    window.removeEventListener("keydown", handleHistoryShortcut, true);

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
