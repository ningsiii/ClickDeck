import { getPanelLabels } from "./i18n";
import type { IntentOperation } from "./intent-region";

const STYLE_ID = "clickdeck-intent-draft-style";

export type IntentDraftPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  addDraft: (operation: IntentOperation) => void;
  hide: () => void;
  show: () => void;
};

export function createIntentDraftPanel(
  onSave: (operation: IntentOperation) => void,
  onCancel: (operationId: string) => void,
  onDelete: (operationId: string) => void,
  onHighlight: (operation: IntentOperation) => void
): IntentDraftPanel {
  injectBaseStyles();
  const labels = getPanelLabels();

  const element = document.createElement("div");
  element.className = "clickdeck-intent-draft clickdeck-intent-draft--hidden";
  element.dataset.clickdeck = "true";
  
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "clickdeck-intent-draft__cards";
  element.appendChild(cardsContainer);

  const cards = new Map<string, HTMLDivElement>();

  function createCardDOM(operation: IntentOperation) {
    const card = document.createElement("div");
    card.className = "clickdeck-intent-draft__card";
    
    card.innerHTML = `
      <div class="clickdeck-intent-draft__editing" style="display: flex;">
        <select class="clickdeck-intent-draft__action-select">
          <option value="add">${labels.intentActionAdd}</option>
          <option value="replace">${labels.intentActionReplace}</option>
          <option value="restyle">${labels.intentActionRestyle}</option>
          <option value="delete">${labels.intentActionDelete}</option>
        </select>
        <textarea class="clickdeck-intent-draft__textarea" placeholder="${labels.intentPlaceholder}"></textarea>
        <div class="clickdeck-intent-draft__actions">
          <button class="clickdeck-button clickdeck-button--outline" data-action="cancel" type="button">${labels.cancel}</button>
          <button class="clickdeck-button clickdeck-button--primary" data-action="save" type="button">${labels.save}</button>
        </div>
      </div>
      <div class="clickdeck-intent-draft__saved" style="display: none;">
        <div class="clickdeck-intent-draft__saved-content">
          <span class="clickdeck-intent-draft__saved-action"></span>
          <span class="clickdeck-intent-draft__saved-text"></span>
        </div>
        <button class="clickdeck-button clickdeck-button--icon clickdeck-button--danger" data-action="delete" type="button" title="${labels.delete}" aria-label="${labels.delete}">✕</button>
      </div>
    `;

    const editingView = card.querySelector(".clickdeck-intent-draft__editing") as HTMLElement;
    const savedView = card.querySelector(".clickdeck-intent-draft__saved") as HTMLElement;
    
    const actionSelect = card.querySelector(".clickdeck-intent-draft__action-select") as HTMLSelectElement;
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
    
    const savedActionSpan = card.querySelector(".clickdeck-intent-draft__saved-action") as HTMLElement;
    const savedTextSpan = card.querySelector(".clickdeck-intent-draft__saved-text") as HTMLElement;

    const btnCancel = card.querySelector('button[data-action="cancel"]') as HTMLButtonElement;
    const btnSave = card.querySelector('button[data-action="save"]') as HTMLButtonElement;
    const btnDelete = card.querySelector('button[data-action="delete"]') as HTMLButtonElement;

    actionSelect.value = operation.action;
    textarea.value = operation.source.userIntent;

    let isSaved = false;

    const updateSavedView = () => {
      let actionLabel = "";
      if (operation.action === "add") actionLabel = labels.intentActionAdd;
      else if (operation.action === "delete") actionLabel = labels.intentActionDelete;
      else if (operation.action === "replace") actionLabel = labels.intentActionReplace;
      else if (operation.action === "restyle") actionLabel = labels.intentActionRestyle;

      savedActionSpan.textContent = `[${actionLabel}]`;
      savedTextSpan.textContent = operation.source.userIntent || actionLabel;
      
      editingView.style.display = "none";
      savedView.style.display = "flex";
    };

    btnCancel.addEventListener("click", () => {
      if (isSaved) {
        // Revert to saved view
        actionSelect.value = operation.action;
        textarea.value = operation.source.userIntent;
        editingView.style.display = "none";
        savedView.style.display = "flex";
      } else {
        // Remove entirely
        card.remove();
        cards.delete(operation.id);
        onCancel(operation.id);
        updateContainerVisibility();
      }
    });

    btnSave.addEventListener("click", () => {
      const action = actionSelect.value as IntentOperation["action"];
      const text = textarea.value.trim();
      if (!text && action !== "delete") {
        textarea.focus();
        return;
      }
      operation.action = action;
      operation.source.action = action;
      operation.source.userIntent = text;
      isSaved = true;
      updateSavedView();
      onSave(operation);
    });

    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      card.remove();
      cards.delete(operation.id);
      onDelete(operation.id);
      updateContainerVisibility();
    });

    savedView.addEventListener("click", () => {
      // Toggle back to editing mode? Or just highlight?
      // Requirement: "每条草稿可折叠、展开、删除", let's allow clicking to highlight, and double click to edit, OR click to edit and have a highlight button?
      // Actually clicking the saved view can just open it for editing, and we trigger highlight.
      editingView.style.display = "flex";
      savedView.style.display = "none";
      textarea.focus();
      onHighlight(operation);
    });

    cardsContainer.appendChild(card);
    cards.set(operation.id, card);
    updateContainerVisibility();
    textarea.focus();
  }

  function updateContainerVisibility() {
    if (cards.size === 0) {
      element.classList.add("clickdeck-intent-draft--hidden");
    } else {
      element.classList.remove("clickdeck-intent-draft--hidden");
    }
  }

  return {
    element,
    destroy: () => {
      element.remove();
    },
    addDraft: (operation: IntentOperation) => {
      createCardDOM(operation);
    },
    hide: () => {
      element.classList.add("clickdeck-intent-draft--hidden");
    },
    show: () => {
      if (cards.size > 0) {
        element.classList.remove("clickdeck-intent-draft--hidden");
      }
    }
  };
}

function injectBaseStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clickdeck-intent-draft {
      position: fixed;
      top: 16px;
      right: 280px; /* Right next to the main panel (248px + 16px padding + gap) */
      width: 280px;
      background: #fff;
      border: 1px solid rgba(120, 84, 53, 0.22);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      z-index: 2147483647;
      transition: opacity 0.2s;
      font-family: Inter, system-ui, sans-serif;
      overflow: hidden;
    }
    .clickdeck-intent-draft--hidden {
      opacity: 0;
      pointer-events: none;
    }
    .clickdeck-intent-draft__editing {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
    }
    .clickdeck-intent-draft__action-select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    }
    .clickdeck-intent-draft__action-select:focus {
      border-color: #3b82f6;
    }
    .clickdeck-intent-draft__textarea {
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      resize: vertical;
      outline: none;
    }
    .clickdeck-intent-draft__textarea:focus {
      border-color: #3b82f6;
    }
    .clickdeck-intent-draft__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .clickdeck-intent-draft__saved {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: #f8fafc;
    }
    .clickdeck-intent-draft__saved:hover {
      background: #f1f5f9;
    }
    .clickdeck-intent-draft__saved-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }
    .clickdeck-intent-draft__saved-action {
      font-size: 12px;
      font-weight: 600;
      color: #3b82f6;
    }
    .clickdeck-intent-draft__saved-text {
      font-size: 13px;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.documentElement.appendChild(style);
}
