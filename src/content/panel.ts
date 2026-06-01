import type { StyleAction } from "./style-actions";
import { getPanelLabels } from "./i18n";

export type PanelAction =
  | StyleAction
  | "undo"
  | "redo"
  | "close"
  | "copy-diagnostics"
  | "copy-ai-prompt"
  | "export-html"
  | "export-pdf-long"
  | "export-pdf-a4"
  | "export-pdf-slides"
  | "present"
  | "export-long-image"
  | "replace-image"
  | `color:${string}`;

export type PromptPreviewOptions = {
  promptEn: string;
  promptZh: string;
  hasImageReplacement: boolean;
  onCopy: (value: string, lang: "en" | "zh") => void;
};

export type SelectionContext = "none" | "text" | "image" | "container";

export type SavedEditsNoticeOptions = {
  count: number;
  onRestore: () => void;
  onDismiss: () => void;
  onClear: () => void;
};

export type ClickDeckPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  setHint: (text: string) => void;
  setHistoryAvailability: (canUndo: boolean, canRedo: boolean) => void;
  setReplaceImageAvailability: (enabled: boolean) => void;
  setSelectionContext: (context: SelectionContext) => void;
  setPresentationAvailability: (hasSlides: boolean) => void;
  showPromptPreview: (options: PromptPreviewOptions) => void;
  showSavedEditsNotice: (options: SavedEditsNoticeOptions) => void;
  hideSavedEditsNotice: () => void;
};

export function createPanel(onAction: (action: PanelAction) => void): ClickDeckPanel {
  const labels = getPanelLabels();
  const panelLogoUrl = typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("brand/logo2-panel.png") : "brand/logo2-panel.png";
  const collapsedLogoUrl = typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("icons/icon48.png") : "icons/icon48.png";
  // Legacy browser-print PDF export is paused. Keep the code path for debugging/rollback,
  // but hide the end-user buttons by default. See roadmap task 44A.
  const SHOW_LEGACY_PDF_EXPORT = false;
  const element = document.createElement("div");
  element.className = "clickdeck-panel";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <div class="clickdeck-panel__floating-button" data-internal-action="restore" title="${labels.restorePanel}" aria-label="${labels.restorePanel}">
      <img src="${collapsedLogoUrl}" alt="ClickDeck" />
    </div>
    <div class="clickdeck-panel__content-wrapper">
      <div class="clickdeck-panel__header">
        <span class="clickdeck-panel__title">
          <img class="clickdeck-panel__logo" src="${panelLogoUrl}" alt="" />
          <span>ClickDeck</span>
          <span class="clickdeck-panel__status">${labels.active}</span>
        </span>
        <span class="clickdeck-panel__header-actions">
          <button class="clickdeck-button clickdeck-button--icon" data-internal-action="transparency" type="button" aria-label="${labels.transparency}" title="${labels.transparency}">◐</button>
          <button class="clickdeck-button clickdeck-button--icon" data-internal-action="collapse" type="button" aria-label="${labels.collapse}" title="${labels.collapse}">−</button>
          <button class="clickdeck-button clickdeck-button--icon" data-action="close" type="button" aria-label="${labels.close}" title="${labels.close}">✕</button>
        </span>
      </div>
    <div class="clickdeck-panel__hint">${labels.selectHint}</div>
    <div class="clickdeck-panel__section" data-section="typography" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.typography}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("font-smaller", "A-")}
        ${buttonMarkup("font-larger", "A+")}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="weight" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.weight}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("weight-decrease", `<span style="font-weight:300;">B-</span>`, labels.decreaseWeight)}
        ${iconButtonMarkup("weight-increase", `<span style="font-weight:700;">B+</span>`, labels.increaseWeight)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="line-height" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.lineHeight}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("lineheight-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16M8 9l4 -3l4 3M8 15l4 3l4 -3"/></svg>`, labels.decreaseLineHeight)}
        ${iconButtonMarkup("lineheight-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16M8 3l4 -3l4 3M8 21l4 3l4 -3"/></svg>`, labels.increaseLineHeight)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="letter-spacing" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.letterSpacing}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("letterspacing-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h8M10 9l-3 3l3 3M14 9l3 3l-3 3M4 4v16M20 4v16"/></svg>`, labels.decreaseLetterSpacing)}
        ${iconButtonMarkup("letterspacing-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M7 9l-3 3l3 3M17 9l3 3l-3 3M8 4v16M16 4v16"/></svg>`, labels.increaseLetterSpacing)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="alignment" data-context="text,container">
      <div class="clickdeck-panel__section-title">${labels.alignment}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("align-left", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignLeft)}
        ${iconButtonMarkup("align-center", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignCenter)}
        ${iconButtonMarkup("align-right", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignRight)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="color" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.color}</div>
      <div class="clickdeck-panel__group">
        <input type="color" class="clickdeck-color-picker" value="#2563eb" title="${labels.pickColor}" />
        <button class="clickdeck-button" data-action="pick-bg-color" type="button">${labels.auto}</button>
        <button class="clickdeck-button" data-action="reset-color" type="button">${labels.reset}</button>
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="background" data-context="container">
      <div class="clickdeck-panel__section-title">${labels.background}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("bg-warm", labels.warm)}
        ${buttonMarkup("bg-white", labels.white)}
        ${buttonMarkup("bg-transparent", labels.transparent)}
        ${buttonMarkup("bg-reset", labels.reset)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="radius" data-context="container">
      <div class="clickdeck-panel__section-title">${labels.radius}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("radius-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="0" ry="0"/></svg>`, labels.decreaseRadius)}
        ${iconButtonMarkup("radius-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="8" ry="8"/></svg>`, labels.increaseRadius)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="spacing" data-context="text,container,image">
      <div class="clickdeck-panel__section-title">${labels.spacing}</div>
      <div class="clickdeck-panel__group clickdeck-panel__group--spacing" data-spacing-group="margin">
        <span class="clickdeck-panel__spacing-label">${labels.margin}</span>
        ${iconButtonMarkup("margin-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/><path d="M12 2v4M12 22v-4M2 12h4M22 12h-4"/></svg>`, labels.decreaseMargin)}
        ${iconButtonMarkup("margin-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/><path d="M12 6v-4M12 18v4M6 12h-4M18 12h4"/></svg>`, labels.increaseMargin)}
      </div>
      <div class="clickdeck-panel__group clickdeck-panel__group--spacing" data-spacing-group="padding">
        <span class="clickdeck-panel__spacing-label">${labels.padding}</span>
        ${iconButtonMarkup("padding-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20"/><rect x="8" y="8" width="8" height="8"/><path d="M12 2v6M12 22v-6M2 12h6M22 12h-6"/></svg>`, labels.decreasePadding)}
        ${iconButtonMarkup("padding-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20"/><rect x="8" y="8" width="8" height="8"/><path d="M12 8v-6M12 16v6M8 12h-6M16 12h6"/></svg>`, labels.increasePadding)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="history" data-context="text,container,image">
      <div class="clickdeck-panel__section-title">${labels.history}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("undo", labels.undo, true)}
        ${buttonMarkup("redo", labels.redo, true)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="image" data-context="image">
      <div class="clickdeck-panel__section-title">${labels.image}</div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageSource}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("replace-image", labels.replaceImage, true)}
        </div>
      </div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageSize}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("image-width-smaller", labels.smaller)}
          ${buttonMarkup("image-width-larger", labels.larger)}
          ${buttonMarkup("image-maxwidth-100", labels.imageMax100)}
        </div>
      </div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageFit}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("image-fit-contain", labels.imageContain)}
          ${buttonMarkup("image-fit-cover", labels.imageCover)}
        </div>
      </div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageRadius}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("image-radius-none", labels.none)}
          ${buttonMarkup("image-radius-sm", labels.small)}
          ${buttonMarkup("image-radius-lg", labels.large)}
          ${buttonMarkup("image-radius-round", labels.round)}
        </div>
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="finish">
      <div class="clickdeck-panel__section-title">${labels.finish}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-long-image", labels.exportLongImage)}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-html", labels.exportHtmlButton)}
        ${buttonMarkup("present", labels.present, true)}
      </div>
      ${
        SHOW_LEGACY_PDF_EXPORT
          ? `<div class="clickdeck-panel__group">
        ${buttonMarkup("export-pdf-long", labels.exportPdfLong)}
        ${buttonMarkup("export-pdf-a4", labels.exportPdfA4)}
        ${buttonMarkup("export-pdf-slides", labels.exportPdfSlides)}
      </div>`
          : ""
      }
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("copy-ai-prompt", labels.copyAiPrompt)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="diagnostics">
      <div class="clickdeck-panel__section-title">${labels.diagnostics}</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("copy-diagnostics", labels.copyDiagnostics)}
      </div>
    </div>
    </div>
    </div>
  `;

  element.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const internalButton = target.closest<HTMLButtonElement | HTMLDivElement>("[data-internal-action]");
    
    if (internalButton) {
      const action = internalButton.dataset.internalAction;
      if (action === "collapse") {
        element.classList.add("clickdeck-panel--collapsed");
      } else if (action === "restore") {
        element.classList.remove("clickdeck-panel--collapsed");
      } else if (action === "transparency") {
        if (element.classList.contains("clickdeck-panel--opacity-70")) {
          element.classList.remove("clickdeck-panel--opacity-70");
          element.classList.add("clickdeck-panel--opacity-40");
        } else if (element.classList.contains("clickdeck-panel--opacity-40")) {
          element.classList.remove("clickdeck-panel--opacity-40");
        } else {
          element.classList.add("clickdeck-panel--opacity-70");
        }
      }
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-action]");
    if (!button) {
      return;
    }

    onAction(button.dataset.action as PanelAction);
  });

  const colorPicker = element.querySelector<HTMLInputElement>(".clickdeck-color-picker");
  if (colorPicker) {
    colorPicker.addEventListener("input", () => {
      onAction(`color:${colorPicker.value}` as PanelAction);
    });
  }

  // --- Drag logic start ---
  const header = element.querySelector<HTMLElement>(".clickdeck-panel__header");
  const floatingBtn = element.querySelector<HTMLElement>(".clickdeck-panel__floating-button");
  
  if (header && floatingBtn) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      // Ignore if clicking a button inside the header
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      isDragging = true;
      hasMoved = false;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      e.preventDefault();
    };

    header.addEventListener("mousedown", onMouseDown);
    floatingBtn.addEventListener("mousedown", onMouseDown);

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      hasMoved = true;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.right = "auto";
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Prevent click on floating button if we were dragging
    floatingBtn.addEventListener("click", (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, { capture: true });
  }
  // --- Drag logic end ---

  let undoAvailable = false;
  let redoAvailable = false;
  let canReplaceImage = false;
  let canPresent = false;
  let currentContext: SelectionContext = "none";

  const updateContextUI = (): void => {
    element.querySelectorAll<HTMLElement>(".clickdeck-panel__section[data-context]").forEach((section) => {
      const allowedContexts = (section.dataset.context ?? "").split(",").map((value) => value.trim());
      section.hidden = !allowedContexts.includes(currentContext);
    });

    const paddingGroup = element.querySelector<HTMLElement>("[data-spacing-group='padding']");
    if (paddingGroup) {
      paddingGroup.hidden = currentContext === "image";
    }

    const colorPickerEl = element.querySelector<HTMLInputElement>(".clickdeck-color-picker");
    if (colorPickerEl) {
      colorPickerEl.disabled = currentContext !== "text";
    }

    element.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      const action = button.dataset.action as PanelAction;
      if (action === "close" || action === "copy-diagnostics" || action === "copy-ai-prompt" || action === "export-html" || action === "export-long-image" || action.startsWith("export-pdf-")) {
        return;
      }
      if (action === "present") {
        button.disabled = !canPresent;
        button.title = canPresent ? "" : labels.noSlides;
        return;
      }
      if (action === "undo") {
        button.disabled = currentContext === "none" || !undoAvailable;
        return;
      }
      if (action === "redo") {
        button.disabled = currentContext === "none" || !redoAvailable;
        return;
      }
      if (action === "replace-image") {
        button.disabled = currentContext !== "image" || !canReplaceImage;
        return;
      }
      button.disabled = currentContext === "none";
    });
  };

  updateContextUI();

  return {
    element,
    destroy: () => {
      element.remove();
    },
    setHint: (text) => {
      const hint = element.querySelector(".clickdeck-panel__hint");
      if (hint) {
        hint.textContent = text;
      }
    },
    setHistoryAvailability: (canUndo, canRedo) => {
      undoAvailable = canUndo;
      redoAvailable = canRedo;
      updateContextUI();
    },
    setReplaceImageAvailability: (enabled) => {
      canReplaceImage = enabled;
      updateContextUI();
    },
    setSelectionContext: (context) => {
      currentContext = context;
      updateContextUI();
    },
    setPresentationAvailability: (hasSlides) => {
      canPresent = hasSlides;
      updateContextUI();
    },
    showPromptPreview: (options: PromptPreviewOptions) => {
      // Remove any existing preview
      element.querySelector(".clickdeck-prompt-overlay")?.remove();

      let currentLang: "en" | "zh" = "en";
      let isDirty = false;

      const overlay = document.createElement("div");
      overlay.className = "clickdeck-prompt-overlay";
      overlay.dataset.clickdeck = "true";

      const render = (): void => {
        const promptText = currentLang === "zh" ? options.promptZh : options.promptEn;
        overlay.innerHTML = `
          <div class="clickdeck-prompt-modal">
            <div class="clickdeck-prompt-modal__header">
              <span class="clickdeck-prompt-modal__title">${labels.promptPreviewTitle}</span>
              <div class="clickdeck-prompt-modal__lang">
                <button class="clickdeck-button${currentLang === "en" ? " clickdeck-button--active" : ""}" data-lang="en" type="button">${labels.promptLangEn}</button>
                <button class="clickdeck-button${currentLang === "zh" ? " clickdeck-button--active" : ""}" data-lang="zh" type="button">${labels.promptLangZh}</button>
              </div>
            </div>
            ${options.hasImageReplacement ? `<div class="clickdeck-prompt-modal__warning">${labels.promptImageUIReminder}</div>` : ""}
            <textarea class="clickdeck-prompt-modal__textarea">${escapeHtml(promptText)}</textarea>
            <div class="clickdeck-prompt-modal__footer">
              <button class="clickdeck-button clickdeck-button--primary" data-prompt-action="copy" type="button">${labels.promptCopy}</button>
              <button class="clickdeck-button" data-prompt-action="close" type="button">${labels.promptClose}</button>
            </div>
          </div>
        `;

        overlay.querySelector("textarea")?.addEventListener("input", () => {
          isDirty = true;
        });

        overlay.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach(btn => {
          btn.addEventListener("click", () => {
            const newLang = btn.dataset.lang as "en" | "zh";
            if (newLang === currentLang) return;
            if (isDirty) {
              const confirmMsg = currentLang === "zh"
                ? "你已手动编辑了 prompt，切换语言将丢失这些编辑，确定继续吗？"
                : "You have manually edited the prompt. Switching language will discard your changes. Continue?";
              if (!confirm(confirmMsg)) return;
            }
            currentLang = newLang;
            isDirty = false;
            render();
          });
        });

        const copyBtn = overlay.querySelector<HTMLButtonElement>("[data-prompt-action='copy']");
        copyBtn?.addEventListener("click", () => {
          const textarea = overlay.querySelector<HTMLTextAreaElement>("textarea");
          const value = textarea?.value ?? "";
          options.onCopy(value, currentLang);
          if (copyBtn) {
            const original = copyBtn.textContent ?? "";
            copyBtn.textContent = labels.promptCopied;
            setTimeout(() => { copyBtn.textContent = original; }, 1500);
          }
        });

        overlay.querySelector<HTMLButtonElement>("[data-prompt-action='close']")?.addEventListener("click", () => {
          overlay.remove();
        });
      };

      render();
      element.appendChild(overlay);
    },
    showSavedEditsNotice: (options: SavedEditsNoticeOptions) => {
      let notice = element.querySelector(".clickdeck-notice");
      if (notice) {
        notice.remove();
      }

      notice = document.createElement("div");
      notice.className = "clickdeck-notice";
      notice.innerHTML = `
        <div class="clickdeck-notice__title">${labels.savedEditsFound} (${options.count})</div>
        <div class="clickdeck-notice__actions">
          <button class="clickdeck-button clickdeck-button--primary" data-notice-action="restore" type="button">${labels.restore}</button>
          <button class="clickdeck-button" data-notice-action="dismiss" type="button">${labels.dismiss}</button>
          <button class="clickdeck-button" data-notice-action="clear" type="button">${labels.clear}</button>
        </div>
      `;

      notice.querySelector("[data-notice-action='restore']")?.addEventListener("click", () => options.onRestore());
      notice.querySelector("[data-notice-action='dismiss']")?.addEventListener("click", () => options.onDismiss());
      notice.querySelector("[data-notice-action='clear']")?.addEventListener("click", () => options.onClear());

      const header = element.querySelector(".clickdeck-panel__header");
      if (header && header.nextSibling) {
        header.parentNode?.insertBefore(notice, header.nextSibling);
      }
    },
    hideSavedEditsNotice: () => {
      element.querySelector(".clickdeck-notice")?.remove();
    }
  };
}

function buttonMarkup(action: PanelAction, label: string, disabled = false): string {
  return `<button class="clickdeck-button" data-action="${action}" type="button"${disabled ? " disabled" : ""}>${label}</button>`;
}

function iconButtonMarkup(action: PanelAction, icon: string, label: string, disabled = false): string {
  return `<button class="clickdeck-button clickdeck-button--action-icon" data-action="${action}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${disabled ? " disabled" : ""}>${icon}</button>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
