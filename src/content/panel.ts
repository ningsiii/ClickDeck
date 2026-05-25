import type { StyleAction } from "./style-actions";

export type PanelAction = StyleAction | "undo" | "redo" | "close" | "copy-diagnostics" | "export-html" | "export-pdf-long" | "export-pdf-a4" | "export-pdf-slides" | `color:${string}` | "commit-text";

export type ClickDeckPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  setHint: (text: string) => void;
  setHistoryAvailability: (canUndo: boolean, canRedo: boolean) => void;
  setTextContent: (text: string) => void;
  getTextContent: () => string;
};

export function createPanel(onAction: (action: PanelAction) => void): ClickDeckPanel {
  const element = document.createElement("div");
  element.className = "clickdeck-panel";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <div class="clickdeck-panel__header">
      <span class="clickdeck-panel__title">ClickDeck <span class="clickdeck-panel__status">Active</span></span>
      <button class="clickdeck-button clickdeck-button--icon" data-action="close" type="button" aria-label="Close" title="Close">✕</button>
    </div>
    <div class="clickdeck-panel__hint">Select an element on the page.</div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Typography</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("font-smaller", "A-")}
        ${buttonMarkup("font-larger", "A+")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Weight</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("weight-light", "Light")}
        ${buttonMarkup("weight-normal", "Normal")}
        ${buttonMarkup("weight-bold", "Bold")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Spacing</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("spacing-compact", "Compact")}
        ${buttonMarkup("spacing-normal", "Normal")}
        ${buttonMarkup("spacing-loose", "Loose")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Alignment</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("align-left", "Left")}
        ${buttonMarkup("align-center", "Center")}
        ${buttonMarkup("align-right", "Right")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Color</div>
      <div class="clickdeck-panel__group">
        <input type="color" class="clickdeck-color-picker" value="#2563eb" title="Pick color" />
        <button class="clickdeck-button" data-action="pick-bg-color" type="button">Auto</button>
        <button class="clickdeck-button" data-action="reset-color" type="button">Reset</button>
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Text</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        <textarea class="clickdeck-text-editor" rows="3" placeholder="Select an element to edit text"></textarea>
        <button class="clickdeck-button" data-action="commit-text" type="button">Apply Text</button>
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">History</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("undo", "Undo", true)}
        ${buttonMarkup("redo", "Redo", true)}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Export HTML</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-html", "Export")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Export PDF</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("export-pdf-long", "Long")}
        ${buttonMarkup("export-pdf-a4", "A4")}
        ${buttonMarkup("export-pdf-slides", "16:9")}
      </div>
    </div>
    <div class="clickdeck-panel__section">
      <div class="clickdeck-panel__section-title">Diagnostics</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("copy-diagnostics", "Copy diagnostics")}
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
    },
    setTextContent: (text) => {
      const textarea = element.querySelector<HTMLTextAreaElement>(".clickdeck-text-editor");
      if (textarea) {
        textarea.value = text;
      }
    },
    getTextContent: () => {
      const textarea = element.querySelector<HTMLTextAreaElement>(".clickdeck-text-editor");
      return textarea?.value ?? "";
    }
  };
}

function buttonMarkup(action: PanelAction, label: string, disabled = false): string {
  return `<button class="clickdeck-button" data-action="${action}" type="button"${disabled ? " disabled" : ""}>${label}</button>`;
}
