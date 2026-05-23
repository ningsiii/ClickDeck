import { createLogger } from "../diagnostics/logger";

const logger = createLogger("selection");
const rootId = "clickdeck-root";

type ClickDeckMessage = {
  type: "CLICKDECK_TOGGLE";
};

type StyleAction = "font-smaller" | "font-larger" | "align-left" | "align-center" | "align-right" | "accent";

let active = false;
let hoveredElement: HTMLElement | null = null;
let selectedElement: HTMLElement | null = null;
let root: HTMLDivElement | null = null;
let outline: HTMLDivElement | null = null;
let panel: HTMLDivElement | null = null;

chrome.runtime.onMessage.addListener((message: ClickDeckMessage) => {
  if (message.type === "CLICKDECK_TOGGLE") {
    toggleClickDeck();
  }
});

window.addEventListener("keydown", handleKeyDown, true);

function toggleClickDeck(): void {
  if (active) {
    deactivate();
  } else {
    activate();
  }
}

function activate(): void {
  active = true;
  mountUi();
  window.addEventListener("mousemove", handleMouseMove, true);
  window.addEventListener("click", handleClick, true);
  window.addEventListener("scroll", updateOutline, true);
  window.addEventListener("resize", updateOutline, true);
  logger.info("ClickDeck activated");
}

function deactivate(): void {
  active = false;
  hoveredElement = null;
  selectedElement = null;
  window.removeEventListener("mousemove", handleMouseMove, true);
  window.removeEventListener("click", handleClick, true);
  window.removeEventListener("scroll", updateOutline, true);
  window.removeEventListener("resize", updateOutline, true);
  root?.remove();
  root = null;
  outline = null;
  panel = null;
  logger.info("ClickDeck deactivated");
}

function mountUi(): void {
  if (document.getElementById(rootId)) {
    return;
  }

  injectBaseStyles();

  root = document.createElement("div");
  root.id = rootId;
  root.dataset.clickdeck = "true";

  outline = document.createElement("div");
  outline.className = "clickdeck-outline";
  outline.dataset.clickdeck = "true";

  panel = document.createElement("div");
  panel.className = "clickdeck-panel";
  panel.dataset.clickdeck = "true";
  panel.innerHTML = [
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

  panel.addEventListener("click", handlePanelClick);
  root.append(outline, panel);
  document.documentElement.append(root);
}

function buttonMarkup(action: StyleAction, label: string): string {
  return `<button class="clickdeck-button" data-action="${action}" type="button">${label}</button>`;
}

function injectBaseStyles(): void {
  if (document.getElementById("clickdeck-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "clickdeck-style";
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

function handleKeyDown(event: KeyboardEvent): void {
  if (event.altKey && event.shiftKey && event.code === "KeyC") {
    event.preventDefault();
    event.stopPropagation();
    toggleClickDeck();
  }
}

function handleMouseMove(event: MouseEvent): void {
  if (!active) {
    return;
  }

  const target = getEditableTarget(event.target);
  if (target === hoveredElement) {
    return;
  }

  hoveredElement = target;
  if (!selectedElement) {
    updateOutline();
  }
}

function handleClick(event: MouseEvent): void {
  if (!active) {
    return;
  }

  const target = getEditableTarget(event.target);
  if (!target) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectedElement = target;
  updatePanelHint(target);
  updateOutline();
  logger.info("Element selected", describeElement(target));
}

function handlePanelClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
  if (!button || !selectedElement) {
    return;
  }

  applyStyleAction(selectedElement, button.dataset.action as StyleAction);
  updateOutline();
}

function getEditableTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (target.closest("[data-clickdeck='true']")) {
    return null;
  }

  if (target === document.documentElement || target === document.body) {
    return null;
  }

  return target;
}

function updateOutline(): void {
  if (!outline) {
    return;
  }

  const target = selectedElement ?? hoveredElement;
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

function updatePanelHint(target: HTMLElement): void {
  const hint = panel?.querySelector(".clickdeck-panel__hint");
  if (!hint) {
    return;
  }

  hint.textContent = describeElement(target);
}

function describeElement(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const className = typeof element.className === "string" && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

function applyStyleAction(element: HTMLElement, action: StyleAction): void {
  const computed = window.getComputedStyle(element);

  switch (action) {
    case "font-smaller":
      element.style.fontSize = `${Math.max(10, parseFloat(computed.fontSize) - 2)}px`;
      break;
    case "font-larger":
      element.style.fontSize = `${parseFloat(computed.fontSize) + 2}px`;
      break;
    case "align-left":
      element.style.textAlign = "left";
      break;
    case "align-center":
      element.style.textAlign = "center";
      break;
    case "align-right":
      element.style.textAlign = "right";
      break;
    case "accent":
      element.style.color = "#2563eb";
      break;
  }

  logger.info("Style action applied", { action, target: describeElement(element) });
}
