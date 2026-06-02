import { getPanelLabels } from "./i18n";
import type { IntentOperation } from "./intent-region";

const STYLE_ID = "clickdeck-intent-draft-style";

export type IntentDraftPanel = {
  element: HTMLDivElement;
  destroy: () => void;
  showEditing: () => void;
  showSaved: (operation: IntentOperation) => void;
  hide: () => void;
};

export function createIntentDraftPanel(
  onSave: (action: IntentOperation["action"], intentText: string) => void,
  onCancel: () => void,
  onDelete: () => void,
  onHighlight: () => void
): IntentDraftPanel {
  injectBaseStyles();
  const labels = getPanelLabels();

  const element = document.createElement("div");
  element.className = "clickdeck-intent-draft clickdeck-intent-draft--hidden";
  element.dataset.clickdeck = "true";

  // HTML structure
  element.innerHTML = `
    <div class="clickdeck-intent-draft__editing" style="display: none;">
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

  const editingView = element.querySelector(".clickdeck-intent-draft__editing") as HTMLElement;
  const savedView = element.querySelector(".clickdeck-intent-draft__saved") as HTMLElement;
  
  const actionSelect = element.querySelector(".clickdeck-intent-draft__action-select") as HTMLSelectElement;
  const textarea = element.querySelector(".clickdeck-intent-draft__textarea") as HTMLTextAreaElement;
  
  const savedActionSpan = element.querySelector(".clickdeck-intent-draft__saved-action") as HTMLElement;
  const savedTextSpan = element.querySelector(".clickdeck-intent-draft__saved-text") as HTMLElement;

  const btnCancel = element.querySelector('button[data-action="cancel"]') as HTMLButtonElement;
  const btnSave = element.querySelector('button[data-action="save"]') as HTMLButtonElement;
  const btnDelete = element.querySelector('button[data-action="delete"]') as HTMLButtonElement;

  btnCancel.addEventListener("click", () => {
    onCancel();
  });

  btnSave.addEventListener("click", () => {
    const action = actionSelect.value as IntentOperation["action"];
    const text = textarea.value.trim();
    if (!text && action !== "delete") {
      textarea.focus();
      return;
    }
    onSave(action, text);
  });

  btnDelete.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent triggering onHighlight
    onDelete();
  });

  savedView.addEventListener("click", () => {
    onHighlight();
  });

  return {
    element,
    destroy: () => {
      element.remove();
    },
    showEditing: () => {
      element.classList.remove("clickdeck-intent-draft--hidden");
      editingView.style.display = "flex";
      savedView.style.display = "none";
      textarea.value = "";
      textarea.focus();
    },
    showSaved: (operation: IntentOperation) => {
      element.classList.remove("clickdeck-intent-draft--hidden");
      editingView.style.display = "none";
      savedView.style.display = "flex";
      
      let actionLabel = "";
      if (operation.action === "add") actionLabel = labels.intentActionAdd;
      else if (operation.action === "delete") actionLabel = labels.intentActionDelete;
      else if (operation.action === "replace") actionLabel = labels.intentActionReplace;
      else if (operation.action === "restyle") actionLabel = labels.intentActionRestyle;

      savedActionSpan.textContent = `[${actionLabel}]`;
      // No Move yet for MVP intent draft panel
      
      // Fallback intent text to action name if empty (e.g., delete)
      savedTextSpan.textContent = operation.source.userIntent || actionLabel;
    },
    hide: () => {
      element.classList.add("clickdeck-intent-draft--hidden");
      editingView.style.display = "none";
      savedView.style.display = "none";
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
