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
import { canAutoStartTextEditing, createElementLocator, describeElement, placeCaretFromPoint, isElementVisible } from "./dom-utils";
import { getAskGeminiPrompt, type AskGeminiPromptKey } from "../export/ask-gemini";
import { getPanelLabels, getPanelLanguage } from "./i18n";
import { createOverlay, type ClickDeckOverlay } from "./overlay";
import { createPanel, type ClickDeckPanel, type PanelAction, type SelectionContext } from "./panel";
import { getEditableTarget, getTabSwitchTarget, isLargeContainer } from "./selection";
import { applyStyleAction, type StyleAction } from "./style-actions";
import { exportHtmlSnapshot } from "../export/html";
import { buildUnifiedPrompt } from "../export/unified-prompt";
import type { IntentPromptInput } from "../export/intent-prompt";
import { detectPresentationSlides, createPresentationController, type PresentationController } from "./presentation-mode";
import { collectPresentationDiagnostics } from "./presentation-diagnostics";
import { exportLongImageSnapshot } from "../export/long-image";
import { exportImagePdfLongSnapshot, exportImagePdfA4Snapshot, exportImagePdfSlidesSnapshot } from "../export/image-pdf";
import { createIntentOverlay, type IntentOverlay } from "./intent-overlay";
import { createIntentDraftPanel, type IntentDraftPanel } from "./intent-draft-panel";
import { createIntentRegion, type IntentOperation, type IntentRegion } from "./intent-region";
import { buildIntentDraftVisualPlan, pickNextIntentColor } from "./intent-draft-state";
import { collectVisualUnits, findVisualUnitsInBox, type RectLike } from "./visual-units";
import { buildRegionContext, summarizeVisualUnit, type GuideCandidate, type RegionContext, type ActiveAlignmentGuide } from "./region-context";
import { createMoveTargetBox, type MoveTargetBox } from "./intent-ghost";

export type ClickDeckController = {
  toggle: () => void;
  isActive: () => boolean;
};

type IntentDraftState = {
  operation: IntentOperation;
  context: RegionContext;
  targetContext?: RegionContext;
  color: string;
  sourceMarker: HTMLDivElement;
  targetMarker?: HTMLDivElement;
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
  let intentOverlay: IntentOverlay | null = null;
  let intentDraftPanel: IntentDraftPanel | null = null;
  let intentDrafts: IntentDraftState[] = [];
  let moveTargetBox: MoveTargetBox | null = null;
  let presentationController: PresentationController | null = null;
  let editingElement: HTMLElement | null = null;
  let originalText: string = "";
  let visibilityCheckInterval: number | null = null;
  const pageHref = window.location.href;
  const storageKey = buildStorageKey(pageHref);
  const textTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "li", "strong", "em"]);
  const containerTags = new Set(["div", "section", "article", "main", "header", "footer", "nav", "aside"]);
  const intentColors = ["#e85d75", "#16a085", "#d97706", "#2563eb", "#8b5cf6", "#0f766e"];

  function getSelectionContext(target: HTMLElement | null): SelectionContext {
    if (!target) {
      return "none";
    }
    const tag = target.tagName.toLowerCase();
    if (tag === "img") {
      return "image";
    }
    if (tag === "video") {
      return "video";
    }
    if (textTags.has(tag) || canAutoStartTextEditing(target)) {
      return "text";
    }
    if (containerTags.has(tag)) {
      return "container";
    }
    return "container";
  }

  type IntentMarkerVariant = "source" | "target" | "remove";

  function createIntentMarker(
    region: IntentRegion,
    color: string,
    label?: string,
    variant: IntentMarkerVariant = "source"
  ): HTMLDivElement {
    const marker = document.createElement("div");
    marker.dataset.clickdeck = "true";
    marker.dataset.intentColor = color;
    marker.className = "clickdeck-intent-region-marker";

    const anchorElement = findIntentAnchorElement(region);
    const relativeBox = anchorElement ? region.relativeBox : undefined;
    const box = relativeBox ?? region.documentBox;
    const useRelativeBox = Boolean(anchorElement && relativeBox);

    if (anchorElement && window.getComputedStyle(anchorElement).position === "static") {
      anchorElement.style.position = "relative";
    }

    Object.assign(marker.style, {
      position: "absolute",
      left: useRelativeBox ? `${box.left}%` : `${box.left}px`,
      top: useRelativeBox ? `${box.top}%` : `${box.top}px`,
      width: useRelativeBox ? `${box.width}%` : `${box.width}px`,
      height: useRelativeBox ? `${box.height}%` : `${box.height}px`,
      border: `2px ${variant === "source" ? "solid" : "dashed"} ${color}`,
      backgroundColor: `${color}18`,
      boxShadow: `0 0 0 3px ${color}24`,
      borderRadius: "8px",
      pointerEvents: "none",
      zIndex: "2147483645",
      transition: "box-shadow 0.2s ease, background-color 0.2s ease"
    });

    if (label) {
      const badge = document.createElement("span");
      badge.textContent = label;
      badge.className = "clickdeck-intent-region-badge";
      Object.assign(badge.style, {
        position: "absolute",
        left: "-2px",
        top: "-24px",
        minWidth: "22px",
        height: "20px",
        padding: "0 7px",
        borderRadius: "999px",
        background: color,
        color: "#fff",
        fontSize: "12px",
        fontWeight: "700",
        lineHeight: "20px",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)"
      });
      marker.appendChild(badge);
    }
    (anchorElement ?? document.body).appendChild(marker);
    return marker;
  }

  function findIntentAnchorElement(region: IntentRegion): HTMLElement | null {
    const locator = region.anchor.locator;
    if (!locator || region.anchor.kind === "document") {
      return null;
    }

    const selectors = [locator.cssPath, locator.nthOfTypePath].filter(Boolean);
    for (const selector of selectors) {
      try {
        const element = document.querySelector<HTMLElement>(selector);
        if (element) {
          return element;
        }
      } catch {
        // Ignore unstable selectors and fall back to the next candidate.
      }
    }

    return null;
  }

  function pulseIntentMarker(marker?: HTMLDivElement): void {
    if (!marker) return;
    const color = marker.dataset.intentColor ?? "#3b82f6";
    const originalShadow = marker.style.boxShadow;
    const originalBackground = marker.style.backgroundColor;
    marker.style.boxShadow = `0 0 0 6px rgba(255,255,255,0.85), 0 0 0 10px ${color}40`;
    marker.style.backgroundColor = `${color}26`;
    window.setTimeout(() => {
      marker.style.boxShadow = originalShadow;
      marker.style.backgroundColor = originalBackground;
    }, 650);
  }

  function removeIntentDraftMarkers(draft: IntentDraftState): void {
    draft.sourceMarker.remove();
    draft.targetMarker?.remove();
  }

  function refreshIntentDraftMarkers(): void {
    const visualPlan = buildIntentDraftVisualPlan(
      intentDrafts.map(draft => ({
        id: draft.operation.id,
        action: draft.operation.action,
        color: draft.color,
        hasTarget: Boolean(draft.targetContext)
      })),
      getPanelLabels().intentDelBadge
    );

    const planById = new Map(visualPlan.map(item => [item.id, item]));
    for (const draft of intentDrafts) {
      const plan = planById.get(draft.operation.id);
      if (!plan) continue;

      draft.sourceMarker.remove();
      draft.sourceMarker = createIntentMarker(
        draft.context.region,
        draft.color,
        plan.sourceLabel,
        draft.operation.action === "remove" ? "remove" : "source"
      );

      draft.targetMarker?.remove();
      if (draft.targetContext && plan.targetLabel) {
        draft.targetMarker = createIntentMarker(
          draft.targetContext.region,
          draft.color,
          plan.targetLabel,
          "target"
        );
      } else {
        draft.targetMarker = undefined;
      }
    }
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
            clearPersistedPatches();
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

    if (isPanelCollapsed()) {
      overlay.updateOutline(null);
      return;
    }

    const target = selectedElement ?? hoveredElement;
    if (target && !isElementVisible(target)) {
      overlay.updateOutline(null);
      return;
    }

    overlay.updateOutline(target);
  }

  function isPanelCollapsed(): boolean {
    return panel?.element.classList.contains("clickdeck-panel--collapsed") ?? false;
  }

  function syncCollapsedBrowsingMode(): void {
    if (isPanelCollapsed()) {
      hoveredElement = null;
    }
    updateOutline();
  }

  function refreshHistoryButtons(): void {
    panel?.setHistoryAvailability(history.undoStack.length > 0, history.redoStack.length > 0);
  }

  function popPatchGroup(stack: EditorPatch[]): EditorPatch[] {
    const last = stack.pop();
    if (!last) {
      return [];
    }

    const groupCreatedAt = last.createdAt;
    const groupTarget = last.targetDescriptor;
    const collected: EditorPatch[] = [last];

    while (stack.length > 0) {
      const previous = stack[stack.length - 1];
      if (
        !previous ||
        previous.kind !== "style" ||
        last.kind !== "style" ||
        previous.createdAt !== groupCreatedAt ||
        previous.targetDescriptor !== groupTarget
      ) {
        break;
      }
      collected.push(stack.pop() as EditorPatch);
    }

    return collected.reverse();
  }

  function pushPatchGroup(stack: EditorPatch[], patches: EditorPatch[]): void {
    for (const patch of patches) {
      stack.push(patch);
    }
  }

  function applyPatchValue(patch: EditorPatch, value: string): void {
    if (patch.kind === "style") {
      patch.targetElement.style[patch.property] = value;
    } else if (patch.kind === "attribute") {
      if (patch.attribute === "src" && patch.targetElement instanceof HTMLImageElement) {
        patch.targetElement.src = value;
      } else {
        patch.targetElement.setAttribute(patch.attribute, value);
        if (patch.targetElement instanceof HTMLVideoElement || patch.targetElement instanceof HTMLSourceElement) {
          const videoEl = patch.targetElement instanceof HTMLVideoElement ? patch.targetElement : patch.targetElement.closest("video");
          if (videoEl) videoEl.load();
        }
      }
    } else {
      patch.targetElement.textContent = value;
    }
  }

  function undoLastPatch(): void {
    const patches = popPatchGroup(history.undoStack);
    if (patches.length === 0) {
      return;
    }

    for (const patch of [...patches].reverse()) {
      applyPatchValue(patch, patch.before);
    }
    pushPatchGroup(history.redoStack, patches);
    logger.info("Undo applied", {
      patchIds: patches.map(patch => patch.id),
      target: patches[0]?.targetDescriptor
    });
    updateOutline();
    refreshHistoryButtons();
    persistPatches();
  }

  function redoLastPatch(): void {
    const patches = popPatchGroup(history.redoStack);
    if (patches.length === 0) {
      return;
    }

    for (const patch of patches) {
      applyPatchValue(patch, patch.after);
    }
    pushPatchGroup(history.undoStack, patches);
    logger.info("Redo applied", {
      patchIds: patches.map(patch => patch.id),
      target: patches[0]?.targetDescriptor
    });
    updateOutline();
    refreshHistoryButtons();
    persistPatches();
  }

  function handleMouseMove(event: MouseEvent): void {
    if (!active || intentOverlay) {
      return;
    }

    if (isPanelCollapsed()) {
      if (hoveredElement) {
        hoveredElement = null;
        updateOutline();
      }
      return;
    }

    const target = getEditableTarget(event.target, selectedElement);
    if (target === hoveredElement) {
      return;
    }

    hoveredElement = target;
    if (!selectedElement) {
      updateOutline();
    }
  }

  function handleClick(event: MouseEvent): void {
    if (!active || intentOverlay || isPanelCollapsed()) {
      return;
    }

    const rawTarget = event.target as HTMLElement;

    // If clicking inside the currently editing element, do not intercept
    // This allows the user to click to place the cursor.
    if (editingElement && editingElement.contains(rawTarget)) {
      return;
    }

    if (selectedElement && rawTarget === selectedElement && isLargeContainer(selectedElement)) {
      event.preventDefault();
      event.stopPropagation();
      clearSelection("double-click large container");
      return;
    }

    const target = getEditableTarget(rawTarget, selectedElement);

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
    const tag = target.tagName.toLowerCase();
    const mediaType = tag === "img" ? "image" : tag === "video" ? "video" : "none";
    panel?.setReplaceMediaAvailability(mediaType !== "none", mediaType);
    panel?.setSelectionContext(getSelectionContext(target));

    // Only auto-start in-place text editing for text-like elements.
    // Non-text elements (img/button/input/...) must not be forced into contenteditable.
    if (canAutoStartTextEditing(target)) {
      editingElement = target;
      originalText = target.textContent ?? "";
      target.setAttribute("contenteditable", "true");
      target.focus();
      placeCaretFromPoint(target, event.clientX, event.clientY);
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
    panel?.setReplaceMediaAvailability(false, "none");
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
    const tag = target.tagName.toLowerCase();
    const mediaType = tag === "img" ? "image" : tag === "video" ? "video" : "none";
    panel?.setReplaceMediaAvailability(mediaType !== "none", mediaType);
    panel?.setSelectionContext(getSelectionContext(target));
    updateOutline();
    logger.info("Element selected", { descriptor, reason });
  }

  function handleSelectionShortcut(event: KeyboardEvent): void {
    if (!active) {
      return;
    }

    if (isPanelCollapsed()) {
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

    const changes = applyStyleAction(logger, selectedElement, action);
    if (!changes || changes.length === 0) {
      return;
    }

    const createdAt = Date.now();
    const baseId = `${createdAt}-${state.patches.length + 1}`;
    const targetElement = selectedElement;
    const targetDescriptor = describeElement(targetElement);
    const targetLocator = createElementLocator(targetElement);
    const patches = changes.map((change, index) => {
      const patch: StylePatch = {
        id: `${baseId}-${index + 1}`,
        kind: "style",
        targetElement,
        targetDescriptor,
        targetLocator,
        property: change.property,
        before: change.before,
        after: change.after,
        createdAt
      };
      recordStylePatch(state, patch);
      return patch;
    });

    pushPatchGroup(history.undoStack, patches);
    history.redoStack.length = 0;
    logger.info("Style patch recorded", {
      patchIds: patches.map(patch => patch.id),
      properties: patches.map(patch => patch.property),
      target: targetDescriptor
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

      const intentInputs: IntentPromptInput[] = intentDrafts.map(d => ({
        operation: d.operation,
        sourceContext: d.context,
        targetContext: d.targetContext
      }));

      const unifiedResultEn = buildUnifiedPrompt(effective, intentInputs, { language: "en", page });

      if (!unifiedResultEn.ok) {
        logger.info("No effective edits or intents to summarize for AI prompt", {
          intentMessage: unifiedResultEn.message
        });
        alert(unifiedResultEn.message);
        return;
      }

      let finalEn = unifiedResultEn.prompt;
      let hasMediaReplacement = unifiedResultEn.hasMediaReplacement;

      const unifiedResultZh = buildUnifiedPrompt(effective, intentInputs, { language: "zh", page });
      let finalZh = unifiedResultZh.ok ? unifiedResultZh.prompt : "";

      panel?.showPromptPreview({
        promptEn: finalEn,
        promptZh: finalZh || finalEn,
        hasMediaReplacement,
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

    if (action === "ask-gemini-flow" || action === "ask-gemini-focus" || action === "ask-gemini-interaction") {
      const promptKeyByAction: Record<typeof action, AskGeminiPromptKey> = {
        "ask-gemini-flow": "flow",
        "ask-gemini-focus": "focus",
        "ask-gemini-interaction": "interaction"
      };
      const promptText = getAskGeminiPrompt(promptKeyByAction[action], getPanelLanguage());

      navigator.clipboard
        .writeText(promptText)
        .then(() => {
          logger.info("Ask Gemini prompt copied to clipboard", { action });
          const btn = panel?.element.querySelector(`[data-action="${action}"]`);
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = labels.askGeminiCopied;
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          }
          panel?.element.classList.add("clickdeck-panel--collapsed");
          syncCollapsedBrowsingMode();
        })
        .catch((error) => {
          logger.error("Failed to copy Ask Gemini prompt", { action, error });
          const btn = panel?.element.querySelector(`[data-action="${action}"]`);
          if (btn) {
            const originalText = btn.textContent;
            btn.textContent = labels.copyFailed;
            setTimeout(() => { btn.textContent = originalText; }, 2000);
          }
        });
      return;
    }

    if (action === "export-html") {
      exportHtmlSnapshot(logger);
      return;
    }

    if (action === "export-long-image") {
      exportLongImageSnapshot(logger);
      return;
    }

    if (action === "export-image-pdf-long") {
      if (detectPresentationSlides().length >= 2) {
        alert(labels.slidesPdfOnlyHint);
        return;
      }
      exportImagePdfLongSnapshot(logger);
      return;
    }

    if (action === "export-image-pdf-a4") {
      if (detectPresentationSlides().length >= 2) {
        alert(labels.slidesPdfOnlyHint);
        return;
      }
      exportImagePdfA4Snapshot(logger);
      return;
    }

    if (action === "export-image-pdf-slides") {
      exportImagePdfSlidesSnapshot(logger);
      return;
    }

    if (action === "present") {
      if (presentationController) {
        presentationController.enter().catch(err => logger.error("Failed to enter presentation mode", err));
      }
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

    if (action === "replace-video") {
      if (!(selectedElement instanceof HTMLVideoElement)) {
        logger.warn("Replace video is only available for video elements");
        return;
      }

      const video = selectedElement;
      let targetForPatch: HTMLElement = video;
      let targetAttr: "src" = "src";
      
      if (!video.hasAttribute("src")) {
        const source = video.querySelector("source");
        if (source) {
          targetForPatch = source;
        }
      }

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
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
            logger.error("Failed to read video file", { fileName: file.name });
            input.remove();
          };
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
              logger.error("Unexpected FileReader result when replacing video");
              input.remove();
              return;
            }

            const before = targetForPatch.getAttribute(targetAttr) || "";
            targetForPatch.setAttribute(targetAttr, result);
            video.load();

            const patch: AttributePatch = {
              id: `${Date.now()}-${state.patches.length + 1}`,
              kind: "attribute",
              targetElement: targetForPatch,
              targetDescriptor: describeElement(targetForPatch),
              targetLocator: createElementLocator(targetForPatch),
              attribute: targetAttr,
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

            logger.info("Video replaced", { target: patch.targetDescriptor, fileName: file.name });
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

    if (action === "add-intent") {
      if (intentOverlay) return; // already in intent mode
      
      // Stop regular hover/select while drawing intent
      clearSelection("escape");

      intentOverlay = createIntentOverlay(
        "clickdeck-intent-overlay-root",
        (rect) => {
          // Finished drawing
          intentOverlay?.destroy();
          intentOverlay = null;
          
          // Build Region Context
          // Build Region Context
          const units = collectVisualUnits();
          const region = createIntentRegion({
            action: "intent",
            userIntent: "",
            viewportBox: rect
          });
          const context = buildRegionContext(region, units);

          // Prepare drafting
          const operation: IntentOperation = {
            id: `op-${Date.now()}`,
            action: "intent",
            source: region,
            createdAt: Date.now()
          };
          const color = pickNextIntentColor(
            intentDrafts.map(draft => draft.color),
            intentColors
          );
          const sourceMarker = createIntentMarker(region, color, "");
          
          intentDrafts.push({ operation, context, color, sourceMarker });
          refreshIntentDraftMarkers();

          if (!intentDraftPanel) {
            intentDraftPanel = createIntentDraftPanel(
              (op) => {
                // saved
                const idx = intentDrafts.findIndex(d => d.operation.id === op.id);
                if (idx !== -1) {
                  if (op.action === "move" && intentDrafts[idx].targetContext) {
                    op.target = intentDrafts[idx].targetContext.region;
                  }
                  intentDrafts[idx].operation = op;
                  
                  if (moveTargetBox && op.action === "move") {
                    moveTargetBox.destroy();
                    moveTargetBox = null;
                    if (intentDrafts[idx].targetContext) {
                      refreshIntentDraftMarkers();
                    }
                  }

                  if (op.action !== "move" && intentDrafts[idx].targetMarker) {
                    intentDrafts[idx].targetMarker?.remove();
                    intentDrafts[idx].targetMarker = undefined;
                    intentDrafts[idx].targetContext = undefined;
                  }
                }
              },
              (opId) => {
                // canceled
                const draft = intentDrafts.find(d => d.operation.id === opId);
                if (draft) removeIntentDraftMarkers(draft);
                intentDrafts = intentDrafts.filter(d => d.operation.id !== opId);
                refreshIntentDraftMarkers();
                if (intentDrafts.length === 0) {
                  intentDraftPanel?.hide();
                }
                if (moveTargetBox) {
                  moveTargetBox.destroy();
                  moveTargetBox = null;
                }
              },
              (opId) => {
                // deleted
                const draft = intentDrafts.find(d => d.operation.id === opId);
                if (draft) removeIntentDraftMarkers(draft);
                intentDrafts = intentDrafts.filter(d => d.operation.id !== opId);
                refreshIntentDraftMarkers();
                if (intentDrafts.length === 0) {
                  intentDraftPanel?.hide();
                }
                if (moveTargetBox) {
                  moveTargetBox.destroy();
                  moveTargetBox = null;
                }
              },
              (op) => {
                // highlight source
                const docBox = op.source.documentBox;
                window.scrollTo({
                  top: docBox.top - window.innerHeight / 2 + docBox.height / 2,
                  behavior: "smooth"
                });
                const draft = intentDrafts.find(d => d.operation.id === op.id);
                pulseIntentMarker(draft?.sourceMarker);
                pulseIntentMarker(draft?.targetMarker);
              },
              (opId) => {
                // onDrawTarget
                if (intentOverlay) return;
                const draft = intentDrafts.find(d => d.operation.id === opId);
                if (!draft) return;
                
                // Minimize panel if needed, but keeping it is fine as it's fixed.
                intentOverlay = createIntentOverlay(
                  "clickdeck-intent-target-overlay-root",
                  (rect) => {
                    intentOverlay?.destroy();
                    intentOverlay = null;
                    
                    const units = collectVisualUnits();
                    const region = createIntentRegion({
                      action: "move", // not strictly used for target context
                      userIntent: "",
                      viewportBox: rect
                    });
                    const idx = intentDrafts.findIndex(d => d.operation.id === opId);
                    const excludeTexts = idx !== -1 
                      ? intentDrafts[idx].context.candidates
                          .map(c => c.unit.textSnippet?.trim())
                          .filter(Boolean) as string[]
                      : undefined;

                    const targetContext = buildRegionContext(region, units, {
                      excludeTextSnippets: excludeTexts
                    });
                    if (idx !== -1) {
                      intentDrafts[idx].targetContext = targetContext;
                      intentDrafts[idx].operation.target = targetContext.region;
                      refreshIntentDraftMarkers();
                      pulseIntentMarker(intentDrafts[idx].targetMarker);
                    }
                  },
                  () => {
                    intentOverlay?.destroy();
                    intentOverlay = null;
                  },
                  labels.drawTargetRegionHint
                );
              },
              (opId) => {
                // onDragTarget
                if (moveTargetBox || intentOverlay) return;
                const draft = intentDrafts.find(d => d.operation.id === opId);
                if (!draft) return;

                const sourceViewportBox = draft.context.region.viewportBox;
                const anchorElement = findIntentAnchorElement(draft.context.region);
                const relativeBox = anchorElement ? draft.context.region.relativeBox : undefined;
                const useRelativeBox = Boolean(anchorElement && relativeBox);
                const box = relativeBox ?? draft.context.region.documentBox;

                const units = collectVisualUnits();
                const sourceUnits = findVisualUnitsInBox(units, sourceViewportBox).map(match => match.unit);
                const sourceTextSnippets = sourceUnits
                  .map(unit => unit.textSnippet?.trim())
                  .filter(Boolean) as string[];
                const sourceTextSet = new Set(sourceTextSnippets);
                const sourceElements = new Set(sourceUnits.map(unit => unit.element));
                const sourceUnitIds = new Set(sourceUnits.map(unit => unit.id));
                const guideCandidates: GuideCandidate[] = units
                  .filter(u => {
                    const textSnippet = u.textSnippet?.trim();
                    return !sourceUnitIds.has(u.id) && !sourceElements.has(u.element) && (!textSnippet || !sourceTextSet.has(textSnippet));
                  })
                  .flatMap((u) => {
                    const summary = summarizeVisualUnit(u);
                    const centerX = u.rect.left + u.rect.width / 2;
                    const centerY = u.rect.top + u.rect.height / 2;
                    return [
                      { axis: "x" as const, position: u.rect.left, sourceEdge: "left" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
                      { axis: "x" as const, position: u.rect.right, sourceEdge: "right" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
                      { axis: "x" as const, position: centerX, sourceEdge: "centerX" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
                      { axis: "y" as const, position: u.rect.top, sourceEdge: "top" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
                      { axis: "y" as const, position: u.rect.bottom, sourceEdge: "bottom" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
                      { axis: "y" as const, position: centerY, sourceEdge: "centerY" as const, unitSummary: summary, unitKind: u.kind, sourceRect: u.rect }
                    ];
                  });

                const updateTargetContext = (finalRect: RectLike, activeGuides: ActiveAlignmentGuide[] = []) => {
                  const region = createIntentRegion({
                    action: "move",
                    userIntent: "",
                    viewportBox: finalRect,
                    isGhostPreview: true
                  });
                  const idx = intentDrafts.findIndex(d => d.operation.id === opId);
                  const targetContext = buildRegionContext(region, units, {
                    excludeTextSnippets: sourceTextSnippets,
                    excludeElements: Array.from(sourceElements),
                    excludeUnitIds: Array.from(sourceUnitIds),
                    activeAlignmentGuides: activeGuides
                  });
                  if (idx !== -1) {
                    intentDrafts[idx].targetContext = targetContext;
                    intentDrafts[idx].operation.target = targetContext.region;
                  }
                };

                updateTargetContext(sourceViewportBox);

                draft.targetMarker?.remove();
                draft.targetMarker = undefined;

                const idx = intentDrafts.findIndex(d => d.operation.id === opId);
                moveTargetBox = createMoveTargetBox({
                  color: draft.color || "#3b82f6",
                  label: `${idx + 1}B`,
                  anchorElement,
                  useRelativeBox,
                  box,
                  guideCandidates,
                  onChange: (finalRect, activeGuides) => {
                    updateTargetContext(finalRect, activeGuides);
                  },
                  onCancel: () => {
                    moveTargetBox?.destroy();
                    moveTargetBox = null;
                    const d = intentDrafts.find(d => d.operation.id === opId);
                    if (d) {
                      d.targetContext = undefined;
                      d.operation.target = undefined;
                    }
                  }
                });
              },
              (opId, action) => {
                // onActionChange
                const idx = intentDrafts.findIndex(d => d.operation.id === opId);
                if (idx === -1) return;
                const draft = intentDrafts[idx];
                draft.operation.action = action;
                draft.context.region.action = action;

                if (action !== "move") {
                  if (moveTargetBox) {
                    moveTargetBox.destroy();
                    moveTargetBox = null;
                  }
                  if (draft.targetMarker) {
                    draft.targetMarker.remove();
                    draft.targetMarker = undefined;
                  }
                  draft.targetContext = undefined;
                  draft.operation.target = undefined;
                }

                refreshIntentDraftMarkers();
              }
            );
            document.documentElement.appendChild(intentDraftPanel.element);
          }
          
          intentDraftPanel.show();
          intentDraftPanel.addDraft(operation, color);
        },
        () => {
          // Cancelled
          intentOverlay?.destroy();
          intentOverlay = null;
        },
        labels.drawRegionHint
      );
      
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
    panel = createPanel(handlePanelAction, {
      onCollapsedChange: syncCollapsedBrowsingMode
    });
    overlay.root.append(panel.element);
    refreshHistoryButtons();
    panel.setReplaceMediaAvailability(false, "none");
    panel.setSelectionContext("none");

    const slides = detectPresentationSlides();
    if (slides.length >= 2) {
      presentationController = createPresentationController({ slides, logger });
      panel.setPresentationAvailability(true);
    } else {
      presentationController = null;
      panel.setPresentationAvailability(false);
    }

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__CLICKDECK_COLLECT_PRESENTATION_DIAGNOSTICS__ = () => collectPresentationDiagnostics();
    tryRestorePersistedPatches();

    visibilityCheckInterval = window.setInterval(() => {
      if (selectedElement || hoveredElement) {
        updateOutline();
      }
    }, 200);
  }

  function deactivate(): void {
    active = false;
    stopEditing();
    setEditorActive(state, false);
    hoveredElement = null;
    selectedElement = null;
    setSelectedElement(state, null);
    panel?.setReplaceMediaAvailability(false, "none");
    panel?.setSelectionContext("none");

    presentationController?.destroy();
    presentationController = null;

    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("scroll", updateOutline, true);
    window.removeEventListener("resize", updateOutline, true);
    window.removeEventListener("keydown", handleHistoryShortcut, true);
    window.removeEventListener("keydown", handleSelectionShortcut, true);

    if (visibilityCheckInterval !== null) {
      window.clearInterval(visibilityCheckInterval);
      visibilityCheckInterval = null;
    }

    panel?.destroy();
    panel = null;
    overlay?.destroy();
    overlay = null;
    intentOverlay?.destroy();
    intentOverlay = null;
    intentDraftPanel?.destroy();
    intentDraftPanel = null;
    intentDrafts.forEach(removeIntentDraftMarkers);
    intentDrafts = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__CLICKDECK_COLLECT_PRESENTATION_DIAGNOSTICS__;

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
