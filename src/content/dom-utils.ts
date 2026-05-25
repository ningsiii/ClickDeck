import type { ElementLocator } from "../state/editor-state";

export function describeElement(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const className = typeof element.className === "string" && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}

export function isClickDeckUiElement(element: HTMLElement): boolean {
  return Boolean(element.closest("[data-clickdeck='true']"));
}

export function createElementLocator(element: HTMLElement): ElementLocator {
  const tagName = element.tagName.toLowerCase();
  const idHint = element.id ? `#${element.id}` : undefined;
  const classHint = pickStableClassHint(element);
  const roleHint = pickRoleHint(element);
  const textSnippet = pickTextSnippet(element);
  const imageHint = pickImageHint(element);
  const siblingIndex = getSiblingIndex(element);

  const descriptorParts = [tagName];
  if (idHint) descriptorParts.push(idHint);
  if (classHint) descriptorParts.push(classHint);
  if (textSnippet) descriptorParts.push(`"${textSnippet}"`);
  const descriptor = descriptorParts.join(" ");

  return {
    descriptor,
    tagName,
    roleHint,
    textSnippet,
    imageHint,
    classHint,
    idHint,
    cssPath: buildCssPath(element),
    nthOfTypePath: buildNthOfTypePath(element),
    siblingIndex,
    parentDescriptor: pickParentDescriptor(element)
  };
}

export function canAutoStartTextEditing(element: HTMLElement): boolean {
  if (isClickDeckUiElement(element)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  if (
    tagName === "img" ||
    tagName === "button" ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "svg" ||
    tagName === "canvas"
  ) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const text = (element.textContent ?? "").trim();
  return text.length > 0;
}

export function findFirstEditableDescendant(root: HTMLElement): HTMLElement | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node as HTMLElement;
    if (!isClickDeckUiElement(element) && element !== document.body && element !== document.documentElement) {
      return element;
    }
    node = walker.nextNode();
  }
  return null;
}

function pickRoleHint(element: HTMLElement): string | undefined {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel.slice(0, 80);

  const role = element.getAttribute("role")?.trim();
  if (role) return role.slice(0, 80);

  return undefined;
}

function pickTextSnippet(element: HTMLElement): string | undefined {
  const raw = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return undefined;
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}

function pickImageHint(element: HTMLElement): string | undefined {
  if (element.tagName.toLowerCase() !== "img") return undefined;
  const img = element as HTMLImageElement;
  const alt = img.alt?.trim();
  if (alt) return alt.length > 80 ? `${alt.slice(0, 77)}...` : alt;

  const src = img.currentSrc || img.src || "";
  const basename = safeBasename(src);
  return basename || undefined;
}

function pickStableClassHint(element: HTMLElement): string | undefined {
  const className = typeof element.className === "string" ? element.className : "";
  const classes = className
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  for (const candidate of classes) {
    if (!isLikelyStableToken(candidate)) {
      continue;
    }
    return `.${candidate}`;
  }

  const fallback = classes[0];
  if (fallback && fallback.length <= 32) {
    return `.${fallback}`;
  }

  return undefined;
}

function isLikelyStableToken(value: string): boolean {
  if (value.length > 32) return false;
  if (looksLikeHash(value)) return false;
  if (/^\d+$/.test(value)) return false;
  return true;
}

function looksLikeHash(value: string): boolean {
  // Hex-like or base64-like long tokens usually come from build pipelines.
  if (value.length >= 16 && /^[a-f0-9]+$/i.test(value)) return true;
  if (value.length >= 22 && /^[a-z0-9_-]+$/i.test(value)) return true;
  return false;
}

function safeBasename(urlOrPath: string): string {
  try {
    const url = new URL(urlOrPath, window.location.href);
    const pathname = url.pathname || "";
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    const cleaned = urlOrPath.split("?")[0].split("#")[0];
    const last = cleaned.split("/").filter(Boolean).pop() ?? "";
    return last;
  }
}

function buildCssPath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    if (current.id) {
      parts.push(`#${cssEscape(current.id)}`);
      break;
    }

    parts.push(simpleSelector(current));
    current = current.parentElement;
  }

  const selector = parts.reverse().join(" > ");
  return selector || simpleSelector(element);
}

function buildNthOfTypePath(element: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    const tag = current.tagName.toLowerCase();
    const index = nthOfTypeIndex(current);
    parts.push(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;
  }

  const selector = parts.reverse().join(" > ");
  return selector || `${element.tagName.toLowerCase()}:nth-of-type(${nthOfTypeIndex(element)})`;
}

function simpleSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const index = nthOfTypeIndex(element);
  return `${tag}:nth-of-type(${index})`;
}

function nthOfTypeIndex(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return 1;
  const tag = element.tagName;
  const siblings = Array.from(parent.children).filter((child) => (child as HTMLElement).tagName === tag);
  const index = siblings.indexOf(element) + 1;
  return index > 0 ? index : 1;
}

function getSiblingIndex(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Array.from(parent.children).indexOf(element);
}

function pickParentDescriptor(element: HTMLElement): string | undefined {
  let current = element.parentElement;
  while (current && current.tagName.toLowerCase() !== "html") {
    const hasId = Boolean(current.id);
    const classHint = pickStableClassHint(current);
    const textSnippet = pickTextSnippet(current);
    const semantic = /^(main|section|article|header|footer|nav|aside)$/i.test(current.tagName);

    if (hasId || classHint || textSnippet || semantic) {
      const parts = [current.tagName.toLowerCase()];
      if (hasId) parts.push(`#${current.id}`);
      if (classHint) parts.push(classHint);
      if (textSnippet) parts.push(`"${textSnippet}"`);
      return parts.join(" ");
    }

    current = current.parentElement;
  }
  return undefined;
}

function cssEscape(value: string): string {
  // Minimal escape to keep selectors valid without adding dependencies.
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\s])/g, "\\$1");
}
