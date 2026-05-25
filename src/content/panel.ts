import type { StyleAction } from "./style-actions";
import { getPanelLabels } from "./i18n";

export type PanelAction = StyleAction | "undo" | "redo" | "close" | "copy-diagnostics" | "export-html" | "export-pdf-long" | "export-pdf-a4" | "export-pdf-slides" | `color:${string}`;

export type ClickDeckPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  setHint: (text: string) => void;
  setHistoryAvailability: (canUndo: boolean, canRedo: boolean) => void;
};

export function createPanel(onAction: (action: PanelAction) => void): ClickDeckPanel {
  const labels = getPanelLabels();
  const logoUrl = chrome.runtime.getURL("brand/logo2-panel.png");
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
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.typography}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("font-smaller", "A-")}
        ${buttonMarkup("font-larger", "A+")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.weight}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("weight-light", labels.light)}
        ${buttonMarkup("weight-normal", labels.normal)}
        ${buttonMarkup("weight-bold", labels.bold)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.lineHeight}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("lineheight-compact", labels.compact)}
        ${buttonMarkup("lineheight-normal", labels.normal)}
        ${buttonMarkup("lineheight-loose", labels.loose)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.letterSpacing}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("letterspacing-tight", labels.tight)}
        ${buttonMarkup("letterspacing-normal", labels.normal)}
        ${buttonMarkup("letterspacing-wide", labels.wide)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.alignment}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("align-left", labels.left)}
        ${buttonMarkup("align-center", labels.center)}
        ${buttonMarkup("align-right", labels.right)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.color}</div>
      <div class="clickdeck-panel__group">
        <input type="color" class="clickdeck-color-picker" value="#2563eb" title="${labels.pickColor}" />
        <button class="clickdeck-button" data-action="pick-bg-color" type="button">${labels.auto}</button>
        <button class="clickdeck-button" data-action="reset-color" type="button">${labels.reset}</button>
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.background}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("bg-warm", labels.warm)}
        ${buttonMarkup("bg-white", labels.white)}
        ${buttonMarkup("bg-transparent", labels.transparent)}
        ${buttonMarkup("bg-reset", labels.reset)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.radius}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("radius-none", labels.none)}
        ${buttonMarkup("radius-sm", labels.small)}
        ${buttonMarkup("radius-md", labels.medium)}
        ${buttonMarkup("radius-lg", labels.large)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.spacing}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("margin-compact", `${labels.margin} ${labels.compact}`)}
        ${buttonMarkup("margin-normal", `${labels.margin} ${labels.normal}`)}
        ${buttonMarkup("margin-loose", `${labels.margin} ${labels.loose}`)}
      </div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("padding-compact", `${labels.padding} ${labels.compact}`)}
        ${buttonMarkup("padding-normal", `${labels.padding} ${labels.normal}`)}
        ${buttonMarkup("padding-loose", `${labels.padding} ${labels.loose}`)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.history}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("undo", labels.undo, true)}
        ${buttonMarkup("redo", labels.redo, true)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.exportHtml}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-html", labels.export)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">${labels.exportPdf}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-pdf-long", labels.long)}
        ${buttonMarkup("export-pdf-a4", "A4")}
        ${buttonMarkup("export-pdf-slides", "16:9")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
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
      const undoButton = element.querySelector<HTMLButtonElement>("[data-action='undo']");
      const redoButton = element.querySelector<HTMLButtonElement>("[data-action='redo']");
      if (undoButton) {
        undoButton.disabled = !canUndo;
      }
      if (redoButton) {
        redoButton.disabled = !canRedo;
      }
    }
  };
}

function buttonMarkup(action: PanelAction, label: string, disabled = false): string {
  return `<button class="clickdeck-button" data-action="${action}" type="button"${disabled ? " disabled" : ""}>${label}</button>`;
}
