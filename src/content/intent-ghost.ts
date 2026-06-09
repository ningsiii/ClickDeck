import { getPanelLabels } from "./i18n";
import { RectLike } from "./visual-units";

export type MoveTargetBox = {
  element: HTMLDivElement;
  destroy: () => void;
};

const STYLE_ID = "clickdeck-ghost-preview-style";

export type MoveTargetBoxOptions = {
  color: string;
  label: string;
  anchorElement: HTMLElement | null;
  useRelativeBox: boolean;
  box: RectLike;
  guideCandidatesX: number[];
  guideCandidatesY: number[];
  onChange: (finalRect: RectLike) => void;
  onCancel: () => void;
};

export function createMoveTargetBox(options: MoveTargetBoxOptions): MoveTargetBox {
  injectBaseStyles();
  const labels = getPanelLabels();

  const element = document.createElement("div");
  element.className = "clickdeck-ghost-preview";
  element.dataset.clickdeck = "true";
  element.style.setProperty("--ghost-color", options.color);
  element.style.setProperty("--ghost-bg", `color-mix(in srgb, ${options.color} 15%, transparent)`);
  
  let originalPosition: string | null = null;
  if (options.anchorElement && window.getComputedStyle(options.anchorElement).position === "static") {
    originalPosition = options.anchorElement.style.position;
    options.anchorElement.style.position = "relative";
  }

  Object.assign(element.style, {
    position: "absolute",
    left: options.useRelativeBox ? `${options.box.left}%` : `${options.box.left}px`,
    top: options.useRelativeBox ? `${options.box.top}%` : `${options.box.top}px`,
    width: options.useRelativeBox ? `${options.box.width}%` : `${options.box.width}px`,
    height: options.useRelativeBox ? `${options.box.height}%` : `${options.box.height}px`,
    transform: `translate(0px, 0px)`
  });

  // Guide lines
  const guideLines: HTMLDivElement[] = [];
  function clearGuideLines() {
    guideLines.forEach(l => l.remove());
    guideLines.length = 0;
  }
  function drawGuideLine(isVertical: boolean, position: number) {
    const line = document.createElement("div");
    line.className = "clickdeck-ghost-guide-line";
    line.dataset.clickdeck = "true";
    if (isVertical) {
      line.style.left = `${position}px`;
      line.style.top = "0";
      line.style.width = "1px";
      line.style.height = "100vh";
    } else {
      line.style.left = "0";
      line.style.top = `${position}px`;
      line.style.width = "100vw";
      line.style.height = "1px";
    }
    document.body.appendChild(line);
    guideLines.push(line);
  }

  // Create UI overlay
  const uiContainer = document.createElement("div");
  uiContainer.className = "clickdeck-ghost-preview__center-hint";
  uiContainer.textContent = labels.intentDragToPlace;
  element.appendChild(uiContainer);

  const labelBadge = document.createElement("div");
  labelBadge.className = "clickdeck-ghost-preview__label";
  labelBadge.style.background = options.color;
  labelBadge.textContent = options.label;
  element.appendChild(labelBadge);

  const btnCancel = document.createElement("div");
  btnCancel.className = "clickdeck-ghost-preview__close";
  btnCancel.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  btnCancel.addEventListener("click", (e) => {
    e.stopPropagation();
    options.onCancel();
  });
  element.appendChild(btnCancel);

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentTx = 0;
  let currentTy = 0;
  let tempDx = 0;
  let tempDy = 0;

  function onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.clickdeck-ghost-preview__close')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    element.classList.add("clickdeck-ghost-preview--dragging");
    e.preventDefault(); // prevent text selection
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    
    tempDx = e.clientX - startX;
    tempDy = e.clientY - startY;
    element.style.transform = `translate(${currentTx + tempDx}px, ${currentTy + tempDy}px)`;
    
    // Update guide lines
    clearGuideLines();
    const threshold = 8;
    const currentRect = element.getBoundingClientRect();
    const boxCenterX = currentRect.left + currentRect.width / 2;
    const boxCenterY = currentRect.top + currentRect.height / 2;
    
    const candidatesX = [
      ...options.guideCandidatesX.map(anchorPos => ({ anchorPos, boxPos: currentRect.left })),
      ...options.guideCandidatesX.map(anchorPos => ({ anchorPos, boxPos: currentRect.right })),
      ...options.guideCandidatesX.map(anchorPos => ({ anchorPos, boxPos: boxCenterX }))
    ];
    
    const candidatesY = [
      ...options.guideCandidatesY.map(anchorPos => ({ anchorPos, boxPos: currentRect.top })),
      ...options.guideCandidatesY.map(anchorPos => ({ anchorPos, boxPos: currentRect.bottom })),
      ...options.guideCandidatesY.map(anchorPos => ({ anchorPos, boxPos: boxCenterY }))
    ];
    
    let closestX = null;
    let minDx = Infinity;
    for (const cx of candidatesX) {
      const dist = Math.abs(cx.boxPos - cx.anchorPos);
      if (dist <= threshold && dist < minDx) {
        minDx = dist;
        closestX = cx.anchorPos;
      }
    }
    
    let closestY = null;
    let minDy = Infinity;
    for (const cy of candidatesY) {
      const dist = Math.abs(cy.boxPos - cy.anchorPos);
      if (dist <= threshold && dist < minDy) {
        minDy = dist;
        closestY = cy.anchorPos;
      }
    }
    
    if (closestX !== null) drawGuideLine(true, closestX);
    if (closestY !== null) drawGuideLine(false, closestY);
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    currentTx += tempDx;
    currentTy += tempDy;
    tempDx = 0;
    tempDy = 0;
    element.classList.remove("clickdeck-ghost-preview--dragging");
    clearGuideLines();
    options.onChange(element.getBoundingClientRect());
  }

  element.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  (options.anchorElement ?? document.body).appendChild(element);

  return {
    element,
    destroy: () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      element.remove();
      clearGuideLines();
      if (options.anchorElement && originalPosition !== null) {
        if (originalPosition === "") {
          options.anchorElement.style.removeProperty("position");
        } else {
          options.anchorElement.style.position = originalPosition;
        }
      }
    }
  };
}

function injectBaseStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clickdeck-ghost-preview {
      position: absolute;
      background: var(--ghost-bg);
      border: 2px dashed var(--ghost-color);
      border-radius: 8px;
      cursor: grab;
      z-index: 2147483647; /* high z-index */
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      backdrop-filter: blur(2px);
      user-select: none;
    }
    .clickdeck-ghost-preview--dragging {
      cursor: grabbing;
      opacity: 0.8;
      border: 2px solid var(--ghost-color);
    }
    .clickdeck-ghost-preview__label {
      position: absolute;
      top: 0;
      left: 0;
      transform: translateY(-100%);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px 4px 0 0;
      pointer-events: none;
    }
    .clickdeck-ghost-preview__center-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--ghost-color);
      font-size: 14px;
      font-weight: 600;
      pointer-events: none;
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(255,255,255,0.8);
      background: rgba(255,255,255,0.7);
      padding: 4px 12px;
      border-radius: 999px;
    }
    .clickdeck-ghost-preview__close {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 20px;
      height: 20px;
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 10;
    }
    .clickdeck-ghost-preview__close:hover {
      background: #f3f4f6;
      color: #000;
    }
    .clickdeck-ghost-guide-line {
      position: fixed;
      background-color: #3b82f688;
      pointer-events: none;
      z-index: 2147483646;
      box-shadow: 0 0 2px rgba(59, 130, 246, 0.5);
    }
  `;
  document.documentElement.appendChild(style);
}
