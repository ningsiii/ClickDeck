const STYLE_ID = "clickdeck-style";

export type ClickDeckOverlay = {
  root: HTMLDivElement;
  outline: HTMLDivElement;
  destroy: () => void;
  updateOutline: (target: Element | null) => void;
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

function updateOutline(outline: HTMLDivElement, target: Element | null): void {
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
      transition: opacity 0.2s ease, width 0.2s ease, height 0.2s ease, padding 0.2s ease, border-radius 0.2s ease;
    }

    .clickdeck-panel--collapsed {
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    }

    .clickdeck-panel--collapsed:active {
      cursor: grabbing;
    }

    .clickdeck-panel--collapsed .clickdeck-panel__content-wrapper,
    .clickdeck-panel--collapsed .clickdeck-notice {
      display: none !important;
    }

    .clickdeck-panel__floating-button {
      display: none;
    }

    .clickdeck-panel--collapsed .clickdeck-panel__floating-button {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      cursor: inherit;
    }

    .clickdeck-panel__floating-button img {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      pointer-events: none;
    }

    .clickdeck-panel--opacity-70 {
      opacity: 0.7;
    }

    .clickdeck-panel--opacity-40 {
      opacity: 0.4;
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

    .clickdeck-panel__header-actions {
      display: flex;
      gap: 4px;
    }

    .clickdeck-panel__title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .clickdeck-panel__logo {
      width: 28px;
      height: 28px;
      border-radius: 999px;
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

    .clickdeck-panel__complex-notice {
      margin-top: 8px;
      padding: 8px 10px;
      border: 1px solid rgba(120, 84, 53, 0.18);
      border-radius: 8px;
      background: #fff8ed;
      color: #5b4635;
    }

    .clickdeck-panel__complex-notice[hidden] {
      display: none;
    }

    .clickdeck-panel__complex-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .clickdeck-panel__complex-body {
      font-size: 11px;
      line-height: 1.45;
      color: #7a6554;
    }

    .clickdeck-panel__section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(120, 84, 53, 0.14);
    }

    .clickdeck-panel__module-title {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(120, 84, 53, 0.18);
      font-size: 12px;
      font-weight: 700;
      color: #4f3828;
      letter-spacing: 0.03em;
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

    .clickdeck-panel__group--spacing {
      grid-template-columns: 1fr minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      margin-bottom: 6px;
    }

    .clickdeck-panel__group--spacing:last-child {
      margin-bottom: 0;
    }

    .clickdeck-panel__group--ask-gemini {
      grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
    }

    .clickdeck-panel__group--ask-gemini .clickdeck-button {
      min-height: 34px;
      white-space: nowrap;
    }

    .clickdeck-panel__group--media-replace {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .clickdeck-panel__group--media-size {
      grid-template-columns: 44px 44px minmax(0, 1fr);
      align-items: stretch;
    }

    .clickdeck-panel__spacing-label {
      font-size: 11px;
      color: #8a6a4e;
    }

    .clickdeck-panel__sub-section {
      margin-bottom: 8px;
    }

    .clickdeck-panel__sub-section:last-child {
      margin-bottom: 0;
    }

    .clickdeck-panel__sub-title {
      font-size: 10px;
      color: #a48c77;
      margin-bottom: 4px;
    }

    .clickdeck-panel__sub-hint {
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.45;
      color: #7a6554;
    }

    .clickdeck-panel__advanced {
      margin-top: 12px;
      border-top: 1px solid rgba(120, 84, 53, 0.14);
      padding-top: 12px;
    }

    .clickdeck-panel__advanced-summary {
      font-size: 11px;
      font-weight: 600;
      color: #8a6a4e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      user-select: none;
      outline: none;
    }

    .clickdeck-panel__advanced[hidden] {
      display: none;
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

    .clickdeck-button--media-source {
      min-height: 34px;
      white-space: nowrap;
      padding: 0 12px;
    }

    .clickdeck-button--media-size {
      min-width: 44px;
      padding: 0;
      font-size: 16px;
      font-weight: 600;
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

    .clickdeck-button--action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .clickdeck-button--action-icon svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
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

    .clickdeck-button--primary {
      background: #8a6a4e;
      color: #fff;
      border-color: #8a6a4e;
    }

    .clickdeck-button--primary:hover {
      background: #6b4e35;
      border-color: #6b4e35;
    }

    .clickdeck-button--active {
      background: #fff3df;
      border-color: #c8a47a;
      font-weight: 600;
    }

    .clickdeck-prompt-overlay {
      position: fixed;
      inset: 0;
      background: rgba(62, 45, 32, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .clickdeck-prompt-modal {
      background: #fffaf3;
      border: 1px solid #e8d5b0;
      border-radius: 10px;
      padding: 14px;
      width: min(760px, calc(100vw - 32px));
      max-height: min(760px, calc(100vh - 32px));
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(62, 45, 32, 0.18);
    }

    .clickdeck-prompt-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }

    .clickdeck-prompt-modal__title {
      font-size: 12px;
      font-weight: 700;
      color: #3d2f24;
    }

    .clickdeck-prompt-modal__lang {
      display: grid;
      grid-template-columns: repeat(2, minmax(72px, 1fr));
      gap: 4px;
    }

    .clickdeck-prompt-modal__textarea {
      width: 100%;
      min-height: 320px;
      max-height: calc(100vh - 220px);
      padding: 8px;
      border: 1px solid #e8d5b0;
      border-radius: 6px;
      background: #fff;
      color: #3d2f24;
      font-size: 13px;
      font-family: "Menlo", "Consolas", monospace;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
    }

    .clickdeck-prompt-modal__warning {
      padding: 10px;
      background: #fff1f0;
      border-left: 4px solid #ff4d4f;
      color: #cf1322;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 4px;
    }

    .clickdeck-prompt-modal__textarea:focus {
      outline: 2px solid #c8a47a;
      outline-offset: -1px;
    }

    .clickdeck-prompt-modal__footer {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .clickdeck-svg-text-modal__rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: min(360px, calc(100vh - 260px));
      overflow-y: auto;
    }

    .clickdeck-svg-text-modal__row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .clickdeck-svg-text-modal__label {
      font-size: 11px;
      font-weight: 600;
      color: #6b4e35;
    }

    .clickdeck-svg-text-modal__input {
      width: 100%;
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid #e8d5b0;
      border-radius: 6px;
      background: #fff;
      color: #3d2f24;
      font-size: 13px;
    }

    .clickdeck-svg-text-modal__input:focus {
      outline: 2px solid #c8a47a;
      outline-offset: -1px;
    }

    .clickdeck-notice {
      background: #fff3df;
      border: 1px solid #e8d5b0;
      border-radius: 8px;
      padding: 10px 12px;
      margin: 12px 14px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .clickdeck-notice__title {
      font-size: 12px;
      font-weight: 600;
      color: #3d2f24;
    }

    .clickdeck-notice__actions {
      display: flex;
      gap: 6px;
    }

    .clickdeck-panel__footer {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(120, 84, 53, 0.14);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      color: #8a6a4e;
      font-size: 11px;
      line-height: 1.4;
    }

    .clickdeck-panel__footer a {
      color: #6b4e35;
      text-decoration: underline;
      text-underline-offset: 2px;
      pointer-events: auto;
    }

    @media print {
      [data-clickdeck="true"] {
        display: none !important;
      }
    }

    .clickdeck-presenting [data-clickdeck="true"],
    .clickdeck-presenting .clickdeck-panel,
    .clickdeck-presenting .clickdeck-outline,
    .clickdeck-exporting [data-clickdeck="true"],
    .clickdeck-exporting .clickdeck-panel,
    .clickdeck-exporting .clickdeck-outline {
      display: none !important;
    }

    .clickdeck-exporting,
    .clickdeck-exporting body {
      scrollbar-width: none !important;
    }

    .clickdeck-exporting::-webkit-scrollbar,
    .clickdeck-exporting body::-webkit-scrollbar {
      display: none !important;
    }

    .clickdeck-presenting,
    .clickdeck-presenting body {
      overflow: hidden !important;
    }

    .clickdeck-presenting .clickdeck-presentation-hidden-slide {
      display: none !important;
    }

    .clickdeck-presenting .clickdeck-presenting-slide {
      position: fixed !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) scale(var(--clickdeck-present-scale, 1)) !important;
      transform-origin: center center !important;
      z-index: 2147483000 !important;
      max-width: none !important;
      max-height: none !important;
      animation: clickdeckFadeIn 0.3s ease-out;
    }

    @keyframes clickdeckFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.documentElement.append(style);
}
