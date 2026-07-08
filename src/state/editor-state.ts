import type { StyleProperty } from "./style-token";

export type ElementLocator = {
  descriptor: string;
  tagName: string;
  roleHint?: string;
  textSnippet?: string;
  imageHint?: string;
  classHint?: string;
  idHint?: string;
  cssPath: string;
  nthOfTypePath: string;
  siblingIndex: number;
  parentDescriptor?: string;
  backgroundImageHint?: string;
  semanticRole?: string;
  semanticAncestor?: string;
  previousSiblingDescriptor?: string;
  nextSiblingDescriptor?: string;
  selectorStability?: "high" | "medium" | "low";
  selectorStabilityReason?: string;
};

export type SelectedElementState = {
  element: Element;
  descriptor: string;
};

export type StylePatch = {
  id: string;
  kind: "style";
  batchId?: string;
  targetElement: Element;
  targetDescriptor: string;
  targetLocator?: ElementLocator;
  property: StyleProperty;
  before: string;
  after: string;
  createdAt: number;
};

export type ContentPatch = {
  id: string;
  kind: "content";
  batchId?: string;
  targetElement: Element;
  targetDescriptor: string;
  targetLocator?: ElementLocator;
  before: string;
  after: string;
  createdAt: number;
};

export type AttributePatch = {
  id: string;
  kind: "attribute";
  batchId?: string;
  targetElement: Element;
  targetDescriptor: string;
  targetLocator?: ElementLocator;
  attribute: "src";
  before: string;
  after: string;
  createdAt: number;
};

export type EditorPatch = StylePatch | ContentPatch | AttributePatch;

export type PersistedPatch = {
  id: string;
  kind: EditorPatch["kind"];
  targetDescriptor: string;
  targetLocator: ElementLocator;
  property?: StyleProperty;
  attribute?: "src";
  before: string;
  after: string;
  createdAt: number;
};

export type PersistedPageEdits = {
  version: 1;
  href: string;
  patches: PersistedPatch[];
  savedAt: number;
};

export type EditorState = {
  active: boolean;
  selected: SelectedElementState | null;
  patches: EditorPatch[];
};

export function createEditorState(): EditorState {
  return {
    active: false,
    selected: null,
    patches: []
  };
}

export function setEditorActive(state: EditorState, active: boolean): void {
  state.active = active;
}

export function setSelectedElement(state: EditorState, selected: SelectedElementState | null): void {
  state.selected = selected;
}

export function recordStylePatch(state: EditorState, patch: StylePatch): void {
  state.patches.push(patch);
}

export function recordContentPatch(state: EditorState, patch: ContentPatch): void {
  state.patches.push(patch);
}

export function buildStorageKey(href: string): string {
  // Keep key stable for the same page. Ignore URL hash to avoid polluting edits per-anchor.
  try {
    const url = new URL(href);
    return `clickdeck:page-edits:v1:${url.origin}${url.pathname}${url.search}`;
  } catch {
    const withoutHash = href.split("#")[0];
    return `clickdeck:page-edits:v1:${withoutHash}`;
  }
}

export function serializePatches(patches: EditorPatch[]): PersistedPatch[] {
  const persisted: PersistedPatch[] = [];
  for (const patch of patches) {
    const locator = patch.targetLocator;
    if (!locator) {
      continue;
    }
    if (patch.kind === "style") {
      persisted.push({
        id: patch.id,
        kind: patch.kind,
        targetDescriptor: patch.targetDescriptor,
        targetLocator: locator,
        property: patch.property,
        before: patch.before,
        after: patch.after,
        createdAt: patch.createdAt
      });
      continue;
    }
    if (patch.kind === "attribute") {
      persisted.push({
        id: patch.id,
        kind: patch.kind,
        targetDescriptor: patch.targetDescriptor,
        targetLocator: locator,
        attribute: patch.attribute,
        before: patch.before,
        after: patch.after,
        createdAt: patch.createdAt
      });
      continue;
    }
    persisted.push({
      id: patch.id,
      kind: patch.kind,
      targetDescriptor: patch.targetDescriptor,
      targetLocator: locator,
      before: patch.before,
      after: patch.after,
      createdAt: patch.createdAt
    });
  }
  return persisted;
}

export function findElementByLocator(locator: ElementLocator): Element | null {
  const candidates: string[] = [];
  if (locator.cssPath) candidates.push(locator.cssPath);
  if (locator.nthOfTypePath) candidates.push(locator.nthOfTypePath);

  for (const selector of candidates) {
    try {
      const el = document.querySelector(selector);
      if (!(el instanceof Element)) {
        continue;
      }
      if (el.tagName.toLowerCase() !== locator.tagName.toLowerCase()) {
        continue;
      }
      return el;
    } catch {
      // ignore invalid selector errors; try next
    }
  }

  return null;
}

export function hydratePersistedPatches(
  persisted: PersistedPatch[],
  logger?: { warn: (message: string, details?: unknown) => void }
): EditorPatch[] {
  const patches: EditorPatch[] = [];
  for (const entry of persisted) {
    const target = findElementByLocator(entry.targetLocator);
    if (!target) {
      logger?.warn?.("Persisted patch target not found; skipping", {
        target: entry.targetDescriptor,
        locator: entry.targetLocator
      });
      continue;
    }

    if (entry.kind === "style") {
      if (!(target instanceof HTMLElement)) {
        logger?.warn?.("Persisted style patch target is not an HTMLElement; skipping", {
          target: entry.targetDescriptor,
          locator: entry.targetLocator
        });
        continue;
      }
      patches.push({
        id: entry.id,
        kind: "style",
        targetElement: target,
        targetDescriptor: entry.targetDescriptor,
        targetLocator: entry.targetLocator,
        property: entry.property as StyleProperty,
        before: entry.before,
        after: entry.after,
        createdAt: entry.createdAt
      });
      continue;
    }

    if (entry.kind === "attribute") {
      if (!(target instanceof HTMLElement)) {
        logger?.warn?.("Persisted attribute patch target is not an HTMLElement; skipping", {
          target: entry.targetDescriptor,
          locator: entry.targetLocator
        });
        continue;
      }
      patches.push({
        id: entry.id,
        kind: "attribute",
        targetElement: target,
        targetDescriptor: entry.targetDescriptor,
        targetLocator: entry.targetLocator,
        attribute: (entry.attribute as "src") ?? "src",
        before: entry.before,
        after: entry.after,
        createdAt: entry.createdAt
      });
      continue;
    }

    patches.push({
      id: entry.id,
      kind: "content",
      targetElement: target,
      targetDescriptor: entry.targetDescriptor,
      targetLocator: entry.targetLocator,
      before: entry.before,
      after: entry.after,
      createdAt: entry.createdAt
    });
  }
  return patches;
}
