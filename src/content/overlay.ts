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
      border: 2px solid #2563eb;
      border-radius: 4px;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
      pointer-events: none;
    }

    .clickdeck-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 232px;
      padding: 12px;
      color: #111827;
      background: #ffffff;
      border: 1px solid rgba(17, 24, 39, 0.14);
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
      pointer-events: auto;
    }

    .clickdeck-panel__title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .clickdeck-panel__hint {
      min-height: 18px;
      margin-bottom: 10px;
      color: #4b5563;
      font-size: 12px;
      line-height: 1.4;
    }

    .clickdeck-panel__group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin-top: 8px;
    }

    .clickdeck-button {
      min-height: 32px;
      padding: 0 8px;
      color: #111827;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
    }

    .clickdeck-button:hover {
      background: #eff6ff;
      border-color: #93c5fd;
    }
  `;
  document.documentElement.append(style);
}

