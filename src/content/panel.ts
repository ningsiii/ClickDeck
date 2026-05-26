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
  | "replace-image"
  | `color:${string}`;

export type PromptPreviewOptions = {
  promptEn: string;
  promptZh: string;
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
  showPromptPreview: (options: PromptPreviewOptions) => void;
  showSavedEditsNotice: (options: SavedEditsNoticeOptions) => void;
  hideSavedEditsNotice: () => void;
};

export function createPanel(onAction: (action: PanelAction) => void): ClickDeckPanel {
  const labels = getPanelLabels();
  const logoUrl = typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("brand/logo2-panel.png") : "brand/logo2-panel.png";
  const element = document.createElement("div");
  element.className = "clickdeck-panel";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <div class="clickdeck-panel__header">
      <span class="clickdeck-panel__title">
        <img class="clickdeck-panel__logo" src="${logoUrl}" alt="" />
        <span>ClickDeck</span>
        <span class="clickdeck-panel__status">${labels.active}</span>
      </span>
      <button class="clickdeck-button clickdeck-button--icon" data-action="close" type="button" aria-label="${labels.close}" title="${labels.close}">✕</button>
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
        ${buttonMarkup("weight-light", labels.light)}
        ${buttonMarkup("weight-normal", labels.normal)}
        ${buttonMarkup("weight-bold", labels.bold)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="line-height" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.lineHeight}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("lineheight-compact", labels.compact)}
        ${buttonMarkup("lineheight-normal", labels.normal)}
        ${buttonMarkup("lineheight-loose", labels.loose)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="letter-spacing" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.letterSpacing}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("letterspacing-tight", labels.tight)}
        ${buttonMarkup("letterspacing-normal", labels.normal)}
        ${buttonMarkup("letterspacing-wide", labels.wide)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="alignment" data-context="text,container">
      <div class="clickdeck-panel__section-title">${labels.alignment}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("align-left", labels.left)}
        ${buttonMarkup("align-center", labels.center)}
        ${buttonMarkup("align-right", labels.right)}
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
        ${buttonMarkup("radius-none", labels.none)}
        ${buttonMarkup("radius-sm", labels.small)}
        ${buttonMarkup("radius-md", labels.medium)}
        ${buttonMarkup("radius-lg", labels.large)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="spacing" data-context="text,container,image">
      <div class="clickdeck-panel__section-title">${labels.spacing}</div>
      <div class="clickdeck-panel__group" data-spacing-group="margin">
        ${buttonMarkup("margin-compact", `${labels.margin} ${labels.compact}`)}
        ${buttonMarkup("margin-normal", `${labels.margin} ${labels.normal}`)}
        ${buttonMarkup("margin-loose", `${labels.margin} ${labels.loose}`)}
      </div>
      <div class="clickdeck-panel__group" data-spacing-group="padding">
        ${buttonMarkup("padding-compact", `${labels.padding} ${labels.compact}`)}
        ${buttonMarkup("padding-normal", `${labels.padding} ${labels.normal}`)}
        ${buttonMarkup("padding-loose", `${labels.padding} ${labels.loose}`)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="history" data-context="text,container,image">
      <div class="clickdeck-panel__section-title">${labels.history}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("undo", labels.undo, true)}
        ${buttonMarkup("redo", labels.redo, true)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="finish">
      <div class="clickdeck-panel__section-title">${labels.finish}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-html", labels.export)}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-pdf-long", labels.long)}
        ${buttonMarkup("export-pdf-a4", "A4")}
        ${buttonMarkup("export-pdf-slides", "16:9")}
      </div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("copy-ai-prompt", labels.copyAiPrompt)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="image" data-context="image">
      <div class="clickdeck-panel__section-title">${labels.image}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("replace-image", labels.replaceImage, true)}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("image-width-smaller", labels.smaller)}
        ${buttonMarkup("image-width-larger", labels.larger)}
        ${buttonMarkup("image-maxwidth-100", "Max 100%")}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("image-fit-contain", "Contain")}
        ${buttonMarkup("image-fit-cover", "Cover")}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("image-radius-none", labels.none)}
        ${buttonMarkup("image-radius-sm", labels.small)}
        ${buttonMarkup("image-radius-lg", labels.large)}
        ${buttonMarkup("image-radius-round", labels.round)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="diagnostics">
      <div class="clickdeck-panel__section-title">${labels.diagnostics}</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("copy-diagnostics", labels.copyDiagnostics)}
      </div>
    </div>
  `;

  element.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
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
  if (header) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", (e: MouseEvent) => {
      // Ignore if clicking a button inside the header
      if ((e.target as HTMLElement).closest("button")) {
        return;
      }
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.right = "auto";
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }
  // --- Drag logic end ---

  let undoAvailable = false;
  let redoAvailable = false;
  let canReplaceImage = false;
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
      if (action === "close" || action === "copy-diagnostics" || action === "copy-ai-prompt" || action === "export-html" || action.startsWith("export-pdf-")) {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
