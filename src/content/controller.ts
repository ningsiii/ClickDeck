import { getRecentLogs, type ClickDeckLogger } from "../diagnostics/logger";
import {
  createEditorState,
  recordStylePatch,
  recordContentPatch,
  setEditorActive,
  setSelectedElement,
  buildStorageKey,
  hydratePersistedPatches,
  serializePatches,
  type PersistedPageEdits,
  type StylePatch,
  type ContentPatch,
  type AttributePatch,
  type EditorPatch
} from "../state/editor-state";
import { createEditHistory } from "../state/history";
import { canAutoStartTextEditing, createElementLocator, describeElement } from "./dom-utils";
import { getPanelLabels } from "./i18n";
import { createOverlay, type ClickDeckOverlay } from "./overlay";
import { createPanel, type ClickDeckPanel, type PanelAction, type SelectionContext } from "./panel";
import { getEditableTarget, getTabSwitchTarget } from "./selection";
import { applyStyleAction, type StyleAction } from "./style-actions";
import { exportHtmlSnapshot } from "../export/html";
import { exportPdfSnapshot } from "../export/pdf";
import { buildAiEditPrompt } from "../export/change-summary";

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
  const pageHref = window.location.href;
  const storageKey = buildStorageKey(pageHref);
  const textTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "li", "strong", "em"]);
  const containerTags = new Set(["div", "section", "article", "main", "header", "footer", "nav", "aside"]);

  function getSelectionContext(target: HTMLElement | null): SelectionContext {
    if (!target) {
      return "none";
    }
    const tag = target.tagName.toLowerCase();
    if (tag === "img") {
      return "image";
    }
    if (textTags.has(tag) || canAutoStartTextEditing(target)) {
      return "text";
    }
    if (containerTags.has(tag)) {
      return "container";
    }
    return "container";
  }

  function getEffectivePatches(): EditorPatch[] {
    // Effective edits are exactly the patches currently in the undo stack.
    // Patches moved to redoStack have been "undone" and must not appear in
    // AI prompts, persisted storage, or restore flows.
    return [...history.undoStack];
  }

  function persistPatches(): void {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return;
    }

    const effective = getEffectivePatches();
    if (effective.length === 0) {
      // Nothing effective left – clear the stored entry so restore won't fire.
      clearPersistedPatches();
      return;
    }

    const payload: PersistedPageEdits = {
      version: 1,
      href: pageHref,
      patches: serializePatches(effective),
      savedAt: Date.now()
    };

    chrome.storage.local.set({ [storageKey]: payload }, () => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        logger.warn("Failed to persist page edits", { message: lastError.message });
        return;
      }
      logger.info("Page edits persisted", { key: storageKey, count: payload.patches.length });
    });
  }

  function clearPersistedPatches(): void {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return;
    }

    chrome.storage.local.remove(storageKey, () => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        logger.warn("Failed to clear persisted page edits", { message: lastError.message });
        return;
      }
      logger.info("Cleared persisted page edits", { key: storageKey });
    });
  }

  function tryRestorePersistedPatches(): void {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      return;
    }

    chrome.storage.local.get(storageKey, (result) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) {
        logger.warn("Failed to load persisted page edits", { message: lastError.message });
        return;
      }

      const payload = result?.[storageKey] as PersistedPageEdits | undefined;
      if (!payload || !Array.isArray(payload.patches) || payload.patches.length === 0) {
        return;
      }

      panel?.showSavedEditsNotice({
        count: payload.patches.length,
        onRestore: () => {
          const hydrated = hydratePersistedPatches(payload.patches, logger);
          if (hydrated.length === 0) {
            logger.warn("No persisted patches could be restored");
          } else {
            for (const patch of hydrated) {
              applyPatchValue(patch, patch.after);
              state.patches.push(patch);
              history.undoStack.push(patch);
            }
            history.redoStack.length = 0;
            refreshHistoryButtons();
            updateOutline();
            logger.info("Restored persisted page edits", { restored: hydrated.length, total: payload.patches.length });
          }
          panel?.hideSavedEditsNotice();
        },
        onDismiss: () => {
          panel?.hideSavedEditsNotice();
        },
        onClear: () => {
          clearPersistedPatches();
          panel?.hideSavedEditsNotice();
        }
      });
    });
  }

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
      persistPatches();
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
    } else if (patch.kind === "attribute") {
      if (patch.attribute === "src" && patch.targetElement instanceof HTMLImageElement) {
        patch.targetElement.src = value;
      } else {
        patch.targetElement.setAttribute(patch.attribute, value);
      }
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
    persistPatches();
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
    persistPatches();
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
    panel?.setReplaceImageAvailability(target.tagName.toLowerCase() === "img");
    panel?.setSelectionContext(getSelectionContext(target));

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
    panel?.setReplaceImageAvailability(false);
    panel?.setSelectionContext("none");
    updateOutline();
    logger.info("Selection cleared", { reason });
  }

  function selectElement(target: HTMLElement, reason: string): void {
    stopEditing();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);
    panel?.setReplaceImageAvailability(target.tagName.toLowerCase() === "img");
    panel?.setSelectionContext(getSelectionContext(target));
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
    persistPatches();
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

    if (action === "copy-ai-prompt") {
      const effective = getEffectivePatches();
      const page = { url: pageHref, title: document.title };

      const resultEn = buildAiEditPrompt(effective, { language: "en", page });
      if (!resultEn.ok) {
        logger.info("No effective edits to summarize for AI prompt");
        alert(labels.noEdits);
        return;
      }

      const resultZh = buildAiEditPrompt(effective, { language: "zh", page });

      panel?.showPromptPreview({
        promptEn: resultEn.prompt,
        promptZh: resultZh.ok ? resultZh.prompt : resultEn.prompt,
        onCopy: (value, lang) => {
          if (!value.trim()) {
            logger.info("Copy cancelled: empty prompt");
            return;
          }
          navigator.clipboard
            .writeText(value)
            .then(() => logger.info("AI edit prompt copied to clipboard", { lang }))
            .catch((error) => logger.error("Failed to copy AI edit prompt", { error }));
        }
      });
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

    if (action === "replace-image") {
      if (!(selectedElement instanceof HTMLImageElement)) {
        logger.warn("Replace image is only available for img elements");
        return;
      }

      const img = selectedElement;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      input.dataset.clickdeck = "true";
      document.body.appendChild(input);

      input.addEventListener(
        "change",
        () => {
          const file = input.files?.[0];
          if (!file) {
            input.remove();
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => {
            logger.error("Failed to read image file", { fileName: file.name });
            input.remove();
          };
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
              logger.error("Unexpected FileReader result when replacing image");
              input.remove();
              return;
            }

            const before = img.src;
            img.src = result;

            const patch: AttributePatch = {
              id: `${Date.now()}-${state.patches.length + 1}`,
              kind: "attribute",
              targetElement: img,
              targetDescriptor: describeElement(img),
              targetLocator: createElementLocator(img),
              attribute: "src",
              before,
              after: result,
              createdAt: Date.now()
            };

            state.patches.push(patch);
            history.undoStack.push(patch);
            history.redoStack.length = 0;
            refreshHistoryButtons();
            updateOutline();
            persistPatches();

            logger.info("Image replaced", { target: patch.targetDescriptor, fileName: file.name });
            input.remove();
          };

          reader.readAsDataURL(file);
        },
        { once: true }
      );

      input.click();
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
      persistPatches();
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
    panel.setReplaceImageAvailability(false);
    panel.setSelectionContext("none");

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", updateOutline, true);
    window.addEventListener("resize", updateOutline, true);
    window.addEventListener("keydown", handleHistoryShortcut, true);
    window.addEventListener("keydown", handleSelectionShortcut, true);
    logger.info("ClickDeck activated");

    // Minimal internal hook for clearing saved edits without adding UI.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__clickdeckClearSavedEdits = clearPersistedPatches;
    tryRestorePersistedPatches();
  }

  function deactivate(): void {
    active = false;
    stopEditing();
    setEditorActive(state, false);
    hoveredElement = null;
    selectedElement = null;
    setSelectedElement(state, null);
    panel?.setReplaceImageAvailability(false);
    panel?.setSelectionContext("none");

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
