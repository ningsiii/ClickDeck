import type { StyleAction } from "./style-actions";

export type ClickDeckPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  setHint: (text: string) => void;
};

export function createPanel(onAction: (action: StyleAction) => void): ClickDeckPanel {
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
    `</div>`
  ].join("");

  element.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!button) {
      return;
    }

    onAction(button.dataset.action as StyleAction);
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
    }
  };
}

function buttonMarkup(action: StyleAction, label: string): string {
  return `<button class="clickdeck-button" data-action="${action}" type="button">${label}</button>`;
}

