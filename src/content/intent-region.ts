import { ElementLocator } from "../state/editor-state";
import { createElementLocator } from "./dom-utils";
import { RectLike, calculateOverlap } from "./visual-units";

export type IntentAction = "intent" | "move" | "remove";
export type PageMode = "slide" | "long" | "unknown";

export const ANCHOR_OVERLAP_EPSILON = 10;

export type RegionAnchor = {
  kind: "slide" | "section" | "container" | "document";
  label?: string;
  locator?: ElementLocator;
  rect?: RectLike;
  confidence: "high" | "medium" | "low";
};

export type IntentRegion = {
  id: string;
  action: IntentAction;
  userIntent: string;
  pageMode: PageMode;
  viewportBox: RectLike;
  documentBox: RectLike;
  relativeBox?: RectLike;
  anchor: RegionAnchor;
  createdAt: number;
  isGhostPreview?: boolean;
};

export type IntentOperation = {
  id: string;
  action: IntentAction;
  source: IntentRegion;
  target?: IntentRegion;
  createdAt: number;
};

export type AnchorRelation = {
  shared: boolean;
  differentSection: boolean;
  confidence: "high" | "medium" | "low";
};

let nextRegionId = 1;
let nextOperationId = 1;

export function normalizeRect(input: Partial<RectLike>): RectLike {
  const left = input.left ?? 0;
  const top = input.top ?? 0;
  const width = input.width ?? 0;
  const height = input.height ?? 0;
  return {
    left,
    top,
    width,
    height,
    right: input.right ?? (left + width),
    bottom: input.bottom ?? (top + height)
  };
}

export function toDocumentRect(viewportBox: RectLike, scrollX?: number, scrollY?: number): RectLike {
  const sx = scrollX ?? (typeof window !== "undefined" ? window.scrollX : 0);
  const sy = scrollY ?? (typeof window !== "undefined" ? window.scrollY : 0);
  return {
    left: viewportBox.left + sx,
    top: viewportBox.top + sy,
    width: viewportBox.width,
    height: viewportBox.height,
    right: viewportBox.right + sx,
    bottom: viewportBox.bottom + sy
  };
}

export function toRelativeRect(box: RectLike, anchorRect: RectLike): RectLike {
  if (anchorRect.width === 0 || anchorRect.height === 0) {
    return { ...box };
  }
  const leftPct = ((box.left - anchorRect.left) / anchorRect.width) * 100;
  const topPct = ((box.top - anchorRect.top) / anchorRect.height) * 100;
  const widthPct = (box.width / anchorRect.width) * 100;
  const heightPct = (box.height / anchorRect.height) * 100;

  return {
    left: leftPct,
    top: topPct,
    width: widthPct,
    height: heightPct,
    right: leftPct + widthPct,
    bottom: topPct + heightPct
  };
}

export function isVisibleAnchorCandidate(element: HTMLElement): boolean {
  if (element.hasAttribute("hidden")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (parseFloat(style.opacity) < 0.01) return false;
  
  return true;
}

export function getAnchorPriority(element: HTMLElement): number {
  if (element.classList.contains("active")) return 10;
  if (element.getAttribute("aria-current") === "true") return 10;
  if (element.getAttribute("data-active") === "true") return 10;
  return 0;
}

export function detectPageMode(root: ParentNode = document.body): PageMode {
  if (typeof document === "undefined") return "unknown";
  
  const strongSlideElements = root.querySelectorAll('[aria-roledescription="slide"], .slide, [data-slide]');
  if (strongSlideElements.length > 0) {
    return "slide";
  }

  const sections = root.querySelectorAll('section');
  if (sections.length > 1) {
    let slideLikeSections = 0;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      if (rect.height >= viewportHeight * 0.8 && rect.width >= viewportWidth * 0.8) {
        slideLikeSections++;
      }
    }
    if (slideLikeSections > 1) {
      return "slide";
    }
  }

  const height = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;
  if (height > viewportHeight * 1.5) {
    return "long";
  }

  return "unknown";
}

export function findRegionAnchor(box: RectLike, root: ParentNode = document.body): RegionAnchor {
  const mode = detectPageMode(root);
  
  if (mode === "slide") {
    const slides = Array.from(root.querySelectorAll('[aria-roledescription="slide"], .slide, [data-slide]')) as HTMLElement[];
    let bestSlide: HTMLElement | null = null;
    let maxOverlap = 0;
    let bestPriority = -1;
    
    for (const slide of slides) {
      if (!isVisibleAnchorCandidate(slide)) continue;

      const rect = slide.getBoundingClientRect();
      const { overlapArea } = calculateOverlap(rect, box);
      const priority = getAnchorPriority(slide);

      if (overlapArea > 0) {
        const areaDiff = overlapArea - maxOverlap;
        if (areaDiff > ANCHOR_OVERLAP_EPSILON) {
          maxOverlap = overlapArea;
          bestPriority = priority;
          bestSlide = slide;
        } else if (Math.abs(areaDiff) <= ANCHOR_OVERLAP_EPSILON && priority > bestPriority) {
          maxOverlap = Math.max(maxOverlap, overlapArea);
          bestPriority = priority;
          bestSlide = slide;
        }
      }
    }

    if (bestSlide) {
      const rect = bestSlide.getBoundingClientRect();
      return {
        kind: "slide",
        locator: createElementLocator(bestSlide),
        rect: {
          left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom
        },
        confidence: "high"
      };
    }
  }

  const containers = Array.from(root.querySelectorAll('section, article, main, [class*="container"], [class*="wrapper"]')) as HTMLElement[];
  let bestContainer: HTMLElement | null = null;
  let minArea = Infinity;

  for (const container of containers) {
    const rect = container.getBoundingClientRect();
    const { overlapArea } = calculateOverlap(rect, box);
    
    if (overlapArea > 0 && overlapArea / (box.width * box.height) > 0.8) {
      const area = rect.width * rect.height;
      if (area > 0 && area < minArea) {
        minArea = area;
        bestContainer = container;
      }
    }
  }

  if (bestContainer) {
    const rect = bestContainer.getBoundingClientRect();
    return {
      kind: bestContainer.tagName.toLowerCase() === 'section' ? "section" : "container",
      locator: createElementLocator(bestContainer),
      rect: {
        left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom
      },
      confidence: "medium"
    };
  }

  return {
    kind: "document",
    confidence: "low"
  };
}

export function createIntentRegion(options: {
  action: IntentAction;
  userIntent: string;
  viewportBox: RectLike;
  root?: ParentNode;
  isGhostPreview?: boolean;
}): IntentRegion {
  const root = options.root ?? document.body;
  const pageMode = detectPageMode(root);
  const documentBox = toDocumentRect(options.viewportBox);
  const anchor = findRegionAnchor(options.viewportBox, root);
  
  let relativeBox: RectLike | undefined;
  if (anchor.rect) {
    relativeBox = toRelativeRect(options.viewportBox, anchor.rect);
  }

  return {
    id: `ir-${nextRegionId++}`,
    action: options.action,
    userIntent: options.userIntent,
    pageMode,
    viewportBox: options.viewportBox,
    documentBox,
    relativeBox,
    anchor,
    createdAt: Date.now(),
    isGhostPreview: options.isGhostPreview
  };
}

export function createIntentOperation(source: IntentRegion, target?: IntentRegion): IntentOperation {
  return {
    id: `iop-${nextOperationId++}`,
    action: source.action,
    source,
    target,
    createdAt: Date.now()
  };
}

function getAnchorIdentity(anchor: RegionAnchor): string | null {
  if (anchor.locator?.descriptor) {
    return `${anchor.kind}:${anchor.locator.descriptor}`;
  }
  if (anchor.kind === "document") {
    return "document";
  }
  return null;
}

export function compareRegionAnchors(source: IntentRegion, target: IntentRegion): AnchorRelation {
  const sourceId = getAnchorIdentity(source.anchor);
  const targetId = getAnchorIdentity(target.anchor);

  if (sourceId && targetId && sourceId === targetId) {
    return {
      shared: true,
      differentSection: false,
      confidence: source.anchor.confidence === "high" && target.anchor.confidence === "high" ? "high" : "medium"
    };
  }

  if (source.anchor.kind === target.anchor.kind && source.anchor.kind !== "document") {
    return {
      shared: false,
      differentSection: false,
      confidence: "medium"
    };
  }

  return {
    shared: false,
    differentSection: source.anchor.kind !== target.anchor.kind || Boolean(sourceId && targetId && sourceId !== targetId),
    confidence: "low"
  };
}
