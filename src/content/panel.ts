import type { StyleAction } from "./style-actions";

export type PanelAction = StyleAction | "undo" | "redo";

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
  element.innerHTML = [
    `<div class="clickdeck-panel__title">ClickDeck</div>`,
    `<div class="clickdeck-panel__hint">Select an element on the page.</div>`,
    `<div class="clickdeck-panel__group">`,
    buttonMarkup("font-smaller", "A-"),
    buttonMarkup("font-larger", "A+"),
    buttonMarkup("accent", "Accent"),
    `</div>`,
    `<div class="clickdeck-panel__group">`,
    buttonMarkup("align-left", "Left"),
    buttonMarkup("align-center", "Center"),
    buttonMarkup("align-right", "Right"),
    `</div>`,
    `<div class="clickdeck-panel__group">`,
    buttonMarkup("undo", "Undo", true),
    buttonMarkup("redo", "Redo", true),
    `</div>`
  ].join("");

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
