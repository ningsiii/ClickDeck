import { ElementLocator } from "../state/editor-state";
import { createElementLocator, isClickDeckUiElement } from "./dom-utils";

export type VisualUnitKind = "block" | "textBlock" | "textLine" | "image" | "video" | "background" | "interactive";

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type VisualUnit = {
  id: string;
  kind: VisualUnitKind;
  element: HTMLElement;
  locator: ElementLocator;
  rect: RectLike;
  documentRect: RectLike;
  textSnippet?: string;
  roleHint?: string;
  parentUnitId?: string;
  confidence: "high" | "medium" | "low";
};

export type VisualUnitMatch = {
  unit: VisualUnit;
  overlapRatio: number;
  overlapArea: number;
  centerInBox: boolean;
  score: number;
};

let nextUnitId = 1;

export function collectVisualUnits(root: Node = document.body): VisualUnit[] {
  const units: VisualUnit[] = [];
  
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (isClickDeckUiElement(element)) {
            return NodeFilter.FILTER_REJECT;
          }
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return NodeFilter.FILTER_REJECT;
          }
        } else if (node.nodeType === Node.TEXT_NODE) {
          if ((node.textContent ?? "").trim().length === 0) {
            return NodeFilter.FILTER_SKIP;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const style = window.getComputedStyle(element);
      const tagName = element.tagName.toLowerCase();
      let kind: VisualUnitKind | undefined;
      let textSnippet: string | undefined;

      if (tagName === "img" || tagName === "svg" || tagName === "canvas") {
        kind = "image";
      } else if (tagName === "video") {
        kind = "video";
      } else if (tagName === "button" || tagName === "a" || tagName === "input" || tagName === "select" || tagName === "textarea") {
        kind = "interactive";
        if (tagName === "input") {
          const type = (element.getAttribute("type") || "text").toLowerCase();
          const excludedTypes = ["hidden", "password", "file", "checkbox", "radio", "color", "button", "submit", "reset", "range"];
          if (!excludedTypes.includes(type)) {
            textSnippet = (element as HTMLInputElement).value;
          }
        } else if (tagName === "textarea") {
          textSnippet = (element as HTMLTextAreaElement).value;
        } else if (tagName === "select") {
          const select = element as HTMLSelectElement;
          if (select.multiple) {
            const selectedOptions = Array.from(select.selectedOptions);
            if (selectedOptions.length > 0) {
              textSnippet = selectedOptions.map(opt => opt.text || opt.value).join(", ");
            }
          } else {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
              textSnippet = selectedOption.text || selectedOption.value;
            } else {
              textSnippet = select.value;
            }
          }
        }
      } else if (style.backgroundImage !== "none" && !style.backgroundImage.startsWith("linear-gradient")) {
        kind = "background";
      } else if (tagName === "td" || tagName === "th") {
        kind = "textBlock";
        textSnippet = element.innerText || element.textContent || "";
        textSnippet = textSnippet.replace(/\s+/g, " ").trim();
      } else if (hasDirectTextContent(element)) {
        kind = "textBlock";
      } else {
        if (style.display === "block" || style.display === "flex" || style.display === "grid") {
          kind = "block";
        }
      }

      if (textSnippet) {
        textSnippet = textSnippet.trim();
        if (textSnippet.length > 80) {
          textSnippet = textSnippet.substring(0, 80) + "...";
        }
      }

      if (kind) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          units.push({
            id: `vu-${nextUnitId++}`,
            kind,
            element,
            locator: createElementLocator(element),
            rect: toRectLike(rect),
            documentRect: toDocumentRect(rect),
            textSnippet: textSnippet && textSnippet.length > 0 ? textSnippet : undefined,
            confidence: "high"
          });
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text.length > 0) {
        const parentElement = node.parentElement;
        if (parentElement) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = range.getClientRects();

          for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (r.width > 0 && r.height > 0) {
              units.push({
                id: `vu-textline-${nextUnitId++}`,
                kind: "textLine",
                element: parentElement,
                locator: createElementLocator(parentElement),
                rect: toRectLike(r),
                documentRect: toDocumentRect(r),
                textSnippet: text.substring(0, 80),
                confidence: "high"
              });
            }
          }
        }
      }
    }
    node = walker.nextNode();
  }

  return units;
}

function hasDirectTextContent(element: HTMLElement): boolean {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}

function toRectLike(rect: DOMRect | DOMRectReadOnly): RectLike {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom
  };
}

function toDocumentRect(rect: DOMRect | DOMRectReadOnly): RectLike {
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  return {
    left: rect.left + scrollX,
    top: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
    right: rect.right + scrollX,
    bottom: rect.bottom + scrollY
  };
}

export function rectsOverlap(a: RectLike, b: RectLike): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

export function calculateOverlap(a: RectLike, b: RectLike): { overlapArea: number; overlapRatio: number } {
  if (!rectsOverlap(a, b)) return { overlapArea: 0, overlapRatio: 0 };

  const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  const overlapArea = Math.max(0, overlapWidth) * Math.max(0, overlapHeight);

  const aArea = a.width * a.height;
  const overlapRatio = aArea > 0 ? overlapArea / aArea : 0;

  return { overlapArea, overlapRatio };
}

export function isCenterInBox(rect: RectLike, box: RectLike): boolean {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom;
}

export function findVisualUnitsInBox(units: VisualUnit[], box: RectLike): VisualUnitMatch[] {
  const matches: VisualUnitMatch[] = [];

  for (const unit of units) {
    const { overlapArea, overlapRatio } = calculateOverlap(unit.rect, box);

    if (overlapArea > 0) {
      const centerInBox = isCenterInBox(unit.rect, box);
      const score = overlapRatio * overlapArea + (centerInBox ? 1000 : 0);

      matches.push({
        unit,
        overlapRatio,
        overlapArea,
        centerInBox,
        score
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
