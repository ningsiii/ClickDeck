import { getPanelLabels } from "./i18n";
import type { IntentOperation, IntentAction } from "./intent-region";

const STYLE_ID = "clickdeck-intent-draft-style";

export type IntentDraftPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  addDraft: (operation: IntentOperation, color?: string) => void;
  hide: () => void;
  show: () => void;
};

export function createIntentDraftPanel(
  onSave: (operation: IntentOperation) => void,
  onCancel: (operationId: string) => void,
  onDelete: (operationId: string) => void,
  onHighlight: (operation: IntentOperation) => void,
  _onDrawTarget?: (operationId: string) => void,
  onDragTarget?: (operationId: string) => void,
  onActionChange?: (operationId: string, action: IntentAction) => void
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

  function createCardDOM(operation: IntentOperation, color = "#3b82f6") {
    const card = document.createElement("div");
    card.className = "clickdeck-intent-draft__card";
    card.style.setProperty("--clickdeck-intent-color", color);
    
    card.innerHTML = `
      <div class="clickdeck-intent-draft__editing" style="display: flex;">
        <textarea class="clickdeck-intent-draft__textarea" placeholder="${labels.intentPlaceholder}"></textarea>
        <div class="clickdeck-intent-draft__target-actions" style="display: flex; gap: 8px;">
          <button class="clickdeck-button clickdeck-button--outline clickdeck-intent-draft__target-btn" type="button">
            ${labels.intentMoveTo}
          </button>
          <button class="clickdeck-button clickdeck-button--outline clickdeck-intent-draft__remove-btn" type="button">
            ${labels.intentMarkRemoval}
          </button>
        </div>
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
    
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
    
    const savedActionSpan = card.querySelector(".clickdeck-intent-draft__saved-action") as HTMLElement;
    const savedTextSpan = card.querySelector(".clickdeck-intent-draft__saved-text") as HTMLElement;

    const btnCancel = card.querySelector('button[data-action="cancel"]') as HTMLButtonElement;
    const btnSave = card.querySelector('button[data-action="save"]') as HTMLButtonElement;
    const btnDelete = card.querySelector('button[data-action="delete"]') as HTMLButtonElement;
    const btnTarget = card.querySelector('.clickdeck-intent-draft__target-btn') as HTMLButtonElement;
    const btnRemove = card.querySelector('.clickdeck-intent-draft__remove-btn') as HTMLButtonElement;

    textarea.value = operation.source.userIntent;

    let isSaved = false;
    let draftAction = operation.action;

    const syncMoveButton = () => {
      const isMove = draftAction === "move";
      btnTarget.classList.toggle("clickdeck-intent-draft__target-btn--active", isMove);
      btnTarget.textContent = isMove ? labels.intentDragGhost : labels.intentMoveTo;
      
      const isRemove = draftAction === "remove";
      btnRemove.classList.toggle("clickdeck-intent-draft__remove-btn--active", isRemove);
      
      textarea.hidden = false;
      textarea.placeholder = isMove ? labels.intentMovePlaceholder : labels.intentPlaceholder;
    }
    syncMoveButton();

    btnTarget.addEventListener("click", () => {
      const changed = draftAction !== "move";
      draftAction = "move";
      syncMoveButton();
      if (changed) {
        onActionChange?.(operation.id, "move");
      }
      onDragTarget?.(operation.id);
    });

    btnRemove.addEventListener("click", () => {
      const changed = draftAction !== "remove";
      draftAction = "remove";
      syncMoveButton();
      if (changed) onActionChange?.(operation.id, "remove");
    });

    const updateSavedView = () => {
      const isMove = operation.action === "move";
      const isRemove = operation.action === "remove";
      
      if (isMove) {
        savedActionSpan.textContent = `[${labels.intentActionMove}]`;
        savedActionSpan.hidden = false;
        savedTextSpan.textContent = operation.source.userIntent || labels.intentActionMove;
      } else if (isRemove) {
        savedActionSpan.textContent = `[${labels.intentMarkRemoval}]`;
        savedActionSpan.hidden = false;
        savedTextSpan.textContent = operation.source.userIntent || labels.intentMarkRemoval;
      } else {
        savedActionSpan.textContent = "";
        savedActionSpan.hidden = true;
        savedTextSpan.textContent = operation.source.userIntent || labels.addIntent;
      }
      
      editingView.style.display = "none";
      savedView.style.display = "flex";
    };

    btnCancel.addEventListener("click", () => {
      if (isSaved) {
        // Revert to saved view
        draftAction = operation.action;
        syncMoveButton();
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
      const text = textarea.value.trim();
      if (!text && draftAction !== "move" && draftAction !== "remove") {
        textarea.focus();
        return;
      }
      operation.action = draftAction;
      operation.source.action = draftAction;
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
      if (operation.action === "move") {
        btnTarget.focus();
      } else {
        textarea.focus();
      }
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
    addDraft: (operation: IntentOperation, color?: string) => {
      createCardDOM(operation, color);
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
      max-height: calc(100vh - 32px);
      overflow-y: auto;
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
      border-left: 4px solid var(--clickdeck-intent-color, #3b82f6);
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
    .clickdeck-intent-draft__target-btn {
      align-self: flex-start;
      font-size: 12px;
      padding: 4px 8px;
    }
    .clickdeck-intent-draft__target-btn--active {
      border-color: var(--clickdeck-intent-color, #3b82f6);
      color: var(--clickdeck-intent-color, #3b82f6);
      background: color-mix(in srgb, var(--clickdeck-intent-color, #3b82f6) 10%, white);
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
      border-left: 4px solid var(--clickdeck-intent-color, #3b82f6);
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
      color: var(--clickdeck-intent-color, #3b82f6);
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
