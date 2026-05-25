import type { StyleAction } from "./style-actions";

export type PanelAction = StyleAction | "undo" | "redo" | "close" | "copy-diagnostics";

export type ClickDeckPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  setHint: (text: string) => void;
  setHistoryAvailability: (canUndo: boolean, canRedo: boolean) => void;
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
        ${buttonMarkup("accent", "Accent")}
        ${buttonMarkup("reset-color", "Reset Color")}
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
