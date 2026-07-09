import { getPanelLabels } from "./i18n";
import { RectLike } from "./visual-units";
import type { ActiveAlignmentGuide, AlignmentEdge, GuideCandidate } from "./region-context";

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
  guideCandidates: GuideCandidate[];
  onChange: (finalRect: RectLike, activeGuides: ActiveAlignmentGuide[]) => void;
  onCancel: () => void;
};

type TargetGuidePosition = {
  axis: "x" | "y";
  position: number;
  targetEdge: AlignmentEdge;
};

const GUIDE_ORTHOGONAL_MAX = 240;
const SNAP_THRESHOLD_PX = 8;

function getTargetGuidePositions(rect: RectLike): TargetGuidePosition[] {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return [
    { axis: "x", position: rect.left, targetEdge: "left" },
    { axis: "x", position: rect.right, targetEdge: "right" },
    { axis: "x", position: centerX, targetEdge: "centerX" },
    { axis: "y", position: rect.top, targetEdge: "top" },
    { axis: "y", position: rect.bottom, targetEdge: "bottom" },
    { axis: "y", position: centerY, targetEdge: "centerY" }
  ];
}

function rangeDistance(startA: number, endA: number, startB: number, endB: number): number {
  if (endA < startB) return startB - endA;
  if (endB < startA) return startA - endB;
  return 0;
}

function isGuideLocallyRelevant(rect: RectLike, candidate: GuideCandidate): boolean {
  if (candidate.axis === "x") {
    const distanceY = rangeDistance(rect.top, rect.bottom, candidate.sourceRect.top, candidate.sourceRect.bottom);
    return distanceY <= Math.max(GUIDE_ORTHOGONAL_MAX, rect.height * 2);
  }
  const distanceX = rangeDistance(rect.left, rect.right, candidate.sourceRect.left, candidate.sourceRect.right);
  return distanceX <= Math.max(GUIDE_ORTHOGONAL_MAX, rect.width);
}

export function computeActiveGuides(
  rect: RectLike,
  guideCandidates: GuideCandidate[],
  threshold = SNAP_THRESHOLD_PX
): ActiveAlignmentGuide[] {
  const targetPositions = getTargetGuidePositions(rect);
  const bestByAxis = new Map<"x" | "y", ActiveAlignmentGuide>();

  for (const target of targetPositions) {
    for (const candidate of guideCandidates) {
      if (candidate.axis !== target.axis) continue;
      if (!isGuideLocallyRelevant(rect, candidate)) continue;
      const deltaPx = Math.abs(target.position - candidate.position);
      if (deltaPx > threshold) continue;

      const current = bestByAxis.get(candidate.axis);
      if (!current || deltaPx < current.deltaPx) {
        bestByAxis.set(candidate.axis, {
          axis: candidate.axis,
          position: candidate.position,
          targetEdge: target.targetEdge,
          sourceEdge: candidate.sourceEdge,
          unitSummary: candidate.unitSummary,
          deltaPx,
          confidence: "high"
        });
      }
    }
  }

  return Array.from(bestByAxis.values()).sort((a, b) => a.axis.localeCompare(b.axis));
}

function getEdgePosition(rect: RectLike, edge: AlignmentEdge): number {
  if (edge === "left") return rect.left;
  if (edge === "right") return rect.right;
  if (edge === "top") return rect.top;
  if (edge === "bottom") return rect.bottom;
  if (edge === "centerX") return rect.left + rect.width / 2;
  return rect.top + rect.height / 2;
}

function offsetRect(rect: RectLike, dx: number, dy: number): RectLike {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    width: rect.width,
    height: rect.height,
    right: rect.right + dx,
    bottom: rect.bottom + dy
  };
}

export function snapRectToGuides(
  rect: RectLike,
  guideCandidates: GuideCandidate[],
  threshold = SNAP_THRESHOLD_PX
): { rect: RectLike; guides: ActiveAlignmentGuide[]; dx: number; dy: number } {
  const guides = computeActiveGuides(rect, guideCandidates, threshold);
  let dx = 0;
  let dy = 0;

  const xGuide = guides.find((guide) => guide.axis === "x");
  if (xGuide) {
    dx = xGuide.position - getEdgePosition(rect, xGuide.targetEdge);
  }

  const yGuide = guides.find((guide) => guide.axis === "y");
  if (yGuide) {
    dy = yGuide.position - getEdgePosition(rect, yGuide.targetEdge);
  }

  if (dx === 0 && dy === 0) {
    return { rect, guides, dx, dy };
  }

  const snappedRect = offsetRect(rect, dx, dy);
  const snappedGuides = computeActiveGuides(snappedRect, guideCandidates, threshold).map((guide) => ({
    ...guide,
    deltaPx: 0
  }));
  return { rect: snappedRect, guides: snappedGuides, dx, dy };
}

function formatGuideHint(guides: ActiveAlignmentGuide[]): string | null {
  if (guides.length === 0) return null;
  const xGuide = guides.find((guide) => guide.axis === "x");
  const yGuide = guides.find((guide) => guide.axis === "y");
  const parts: string[] = [];
  if (xGuide) {
    parts.push(`X: ${xGuide.targetEdge} -> ${xGuide.unitSummary}`);
  }
  if (yGuide) {
    parts.push(`Y: ${yGuide.targetEdge} -> ${yGuide.unitSummary}`);
  }
  return parts.join(" | ");
}

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
  let previewTx = 0;
  let previewTy = 0;
  let lastPreviewRect: RectLike = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
  let lastPreviewGuides: ActiveAlignmentGuide[] = [];

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
    const baseRect = {
      left: lastPreviewRect.left - previewTx,
      top: lastPreviewRect.top - previewTy,
      width: lastPreviewRect.width,
      height: lastPreviewRect.height,
      right: lastPreviewRect.right - previewTx,
      bottom: lastPreviewRect.bottom - previewTy
    };
    const rawRect = offsetRect(baseRect, currentTx + tempDx, currentTy + tempDy);
    const snapped = snapRectToGuides(rawRect, options.guideCandidates);
    previewTx = currentTx + tempDx + snapped.dx;
    previewTy = currentTy + tempDy + snapped.dy;
    lastPreviewRect = snapped.rect;
    lastPreviewGuides = snapped.guides;
    element.style.transform = `translate(${previewTx}px, ${previewTy}px)`;
    
    // Update guide lines
    clearGuideLines();
    lastPreviewGuides.forEach((guide) => drawGuideLine(guide.axis === "x", guide.position));
    uiContainer.textContent = formatGuideHint(lastPreviewGuides) ?? labels.intentDragToPlace;
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    currentTx = previewTx;
    currentTy = previewTy;
    tempDx = 0;
    tempDy = 0;
    element.classList.remove("clickdeck-ghost-preview--dragging");
    clearGuideLines();
    uiContainer.textContent = formatGuideHint(lastPreviewGuides) ?? labels.intentDragToPlace;
    options.onChange(lastPreviewRect, lastPreviewGuides);
  }

  element.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  (options.anchorElement ?? document.body).appendChild(element);
  const initialRect = element.getBoundingClientRect();
  lastPreviewRect = {
    left: initialRect.left,
    top: initialRect.top,
    width: initialRect.width,
    height: initialRect.height,
    right: initialRect.right,
    bottom: initialRect.bottom
  };

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
