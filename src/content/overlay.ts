const STYLE_ID = "clickdeck-style";

export type ClickDeckOverlay = {
  root: HTMLDivElement;
  outline: HTMLDivElement;
  destroy: () => void;
  updateOutline: (target: HTMLElement | null) => void;
};

export function createOverlay(rootId: string): ClickDeckOverlay {
  injectBaseStyles(rootId);

  const root = document.createElement("div");
  root.id = rootId;
  root.dataset.clickdeck = "true";

  const outline = document.createElement("div");
  outline.className = "clickdeck-outline";
  outline.dataset.clickdeck = "true";

  root.append(outline);
  document.documentElement.append(root);

  return {
    root,
    outline,
    destroy: () => {
      root.remove();
    },
    updateOutline: (target) => updateOutline(outline, target)
  };
}

function updateOutline(outline: HTMLDivElement, target: HTMLElement | null): void {
  if (!target) {
    outline.style.display = "none";
    return;
  }

  const rect = target.getBoundingClientRect();
  outline.style.display = "block";
  outline.style.left = `${rect.left}px`;
  outline.style.top = `${rect.top}px`;
  outline.style.width = `${rect.width}px`;
  outline.style.height = `${rect.height}px`;
}

function injectBaseStyles(rootId: string): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${rootId}, #${rootId} * {
      box-sizing: border-box;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${rootId} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
    }

    .clickdeck-outline {
      position: fixed;
      display: none;
      border: 2px solid #f97316;
      border-radius: 8px;
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.16);
      pointer-events: none;
    }

    .clickdeck-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 248px;
      padding: 14px;
      color: #2f261f;
      background: #fffaf2;
      border: 1px solid rgba(120, 84, 53, 0.22);
      border-radius: 14px;
      box-shadow: 0 18px 44px rgba(84, 58, 36, 0.18);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      pointer-events: auto;
    }

    .clickdeck-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      cursor: grab;
    }

    .clickdeck-panel__header:active {
      cursor: grabbing;
    }

    .clickdeck-panel__title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .clickdeck-panel__logo {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      object-fit: cover;
      box-shadow: 0 2px 8px rgba(84, 58, 36, 0.16);
    }

    .clickdeck-panel__status {
      font-size: 10px;
      font-weight: 500;
      color: #4f7a1f;
      background: #eef8d4;
      padding: 2px 6px;
      border-radius: 9999px;
    }

    .clickdeck-panel__hint {
      min-height: 18px;
      color: #6f5f52;
      font-size: 12px;
      line-height: 1.4;
    }

    .clickdeck-panel__section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(120, 84, 53, 0.14);
    }

    .clickdeck-panel__section-title {
      font-size: 11px;
      font-weight: 600;
      color: #8a6a4e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .clickdeck-panel__group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .clickdeck-button {
      min-height: 32px;
      padding: 0 8px;
      color: #3d2f24;
      background: #fffdf8;
      border: 1px solid #decbb7;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
    }

    .clickdeck-button:hover {
      background: #fff3df;
      border-color: #f2ad63;
    }

    .clickdeck-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f4ece2;
      border-color: #e8dccd;
    }

    .clickdeck-color-picker {
      min-height: 32px;
      width: 100%;
      padding: 2px;
      border: 1px solid #decbb7;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
    }

    .clickdeck-button--icon {
      min-height: 24px;
      width: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: #8a6a4e;
    }

    .clickdeck-button--icon:hover {
      background: #fff3df;
      color: #3d2f24;
      border-color: transparent;
    }

    @media print {
      [data-clickdeck="true"] {
        display: none !important;
      }
    }
  `;
  document.documentElement.append(style);
}
