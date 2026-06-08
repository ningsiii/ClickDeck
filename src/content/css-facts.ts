export type CssFactKind = "text" | "media" | "layout" | "positioned" | "overlay" | "unknown";

export type CssFacts = {
  kind: CssFactKind;
  base: string[];
  text: string[];
  media: string[];
  layout: string[];
  positioning: string[];
  hints: string[];
};

const MEDIA_TAGS = new Set(["img", "svg", "canvas", "video"]);
const TEXT_TAGS = new Set(["p", "span", "a", "button", "label", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6"]);
const OVERLAY_HINT_PATTERN = /(^|[-_\s])(mask|mosaic|overlay|badge|tooltip|popover|modal|floating|absolute)([-_\s]|$)/i;

function addFact(facts: string[], name: string, value: string | null | undefined): void {
  const normalized = (value ?? "").trim();
  if (!normalized) return;
  facts.push(`${name}: ${normalized}`);
}

function addFactIfNot(facts: string[], name: string, value: string | null | undefined, ignored: string[]): void {
  const normalized = (value ?? "").trim();
  if (!normalized || ignored.includes(normalized)) return;
  addFact(facts, name, normalized);
}

function isIgnoredValue(value: string, ignored: string[]): boolean {
  return ignored.includes(value);
}

function hasTextFeature(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  return TEXT_TAGS.has(tagName) || (element.textContent ?? "").trim().length > 0;
}

function hasMediaFeature(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  const tagName = element.tagName.toLowerCase();
  if (MEDIA_TAGS.has(tagName)) return true;
  const objectFit = style.getPropertyValue("object-fit").trim();
  const objectPosition = style.getPropertyValue("object-position").trim();
  return Boolean(
    (objectFit && objectFit !== "fill") ||
    (objectPosition && objectPosition !== "50% 50%")
  );
}

function hasLayoutFeature(style: CSSStyleDeclaration): boolean {
  const display = style.getPropertyValue("display").trim();
  const hasNonDefault = (name: string, ignored: string[]) => {
    const value = style.getPropertyValue(name).trim();
    return Boolean(value && !isIgnoredValue(value, ignored));
  };
  return (
    display === "flex" ||
    display === "grid" ||
    hasNonDefault("gap", ["normal", "0px"]) ||
    hasNonDefault("row-gap", ["normal", "0px"]) ||
    hasNonDefault("column-gap", ["normal", "0px"]) ||
    hasNonDefault("padding", ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]) ||
    hasNonDefault("margin", ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]) ||
    hasNonDefault("align-items", ["normal", "stretch"]) ||
    hasNonDefault("justify-content", ["normal", "start", "flex-start"])
  );
}

function hasPositioningFeature(style: CSSStyleDeclaration): boolean {
  const position = style.getPropertyValue("position").trim();
  const transform = style.getPropertyValue("transform").trim();
  const zIndex = style.getPropertyValue("z-index").trim();
  return (
    Boolean(position && position !== "static") ||
    Boolean(transform && transform !== "none") ||
    Boolean(zIndex && zIndex !== "auto")
  );
}

function hasOverlayHint(element: HTMLElement, style: CSSStyleDeclaration): boolean {
  const hintText = [element.className, element.id, element.getAttribute("role")].join(" ");
  if (OVERLAY_HINT_PATTERN.test(hintText)) return true;
  if (element.getAttribute("aria-hidden") === "true" && hasPositioningFeature(style)) return true;
  return false;
}

function getRectSize(element: HTMLElement): string | null {
  const rect = element.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width <= 0 && height <= 0) return null;
  return `${width} x ${height}`;
}

function pickKind(element: HTMLElement, style: CSSStyleDeclaration): CssFactKind {
  if (hasOverlayHint(element, style)) return "overlay";
  if (hasMediaFeature(element, style)) return "media";
  if (hasPositioningFeature(style)) return "positioned";
  if (hasTextFeature(element)) return "text";
  if (hasLayoutFeature(style)) return "layout";
  return "unknown";
}

export function collectCssFacts(element: HTMLElement): CssFacts {
  const style = window.getComputedStyle(element);
  const facts: CssFacts = {
    kind: pickKind(element, style),
    base: [],
    text: [],
    media: [],
    layout: [],
    positioning: [],
    hints: []
  };

  addFact(facts.base, "tag", element.tagName.toLowerCase());
  addFact(facts.base, "display", style.getPropertyValue("display"));
  addFact(facts.base, "position", style.getPropertyValue("position"));
  addFact(facts.base, "visibility", style.getPropertyValue("visibility"));
  addFactIfNot(facts.base, "opacity", style.getPropertyValue("opacity"), ["1"]);
  addFactIfNot(facts.base, "transform", style.getPropertyValue("transform"), ["none"]);

  const rectSize = getRectSize(element);
  if (rectSize) addFact(facts.base, "rect-size", rectSize);

  if (hasTextFeature(element)) {
    addFactIfNot(facts.text, "font-size", style.getPropertyValue("font-size"), ["16px"]);
    addFactIfNot(facts.text, "font-weight", style.getPropertyValue("font-weight"), ["400", "normal"]);
    addFactIfNot(facts.text, "line-height", style.getPropertyValue("line-height"), ["normal"]);
    addFactIfNot(facts.text, "letter-spacing", style.getPropertyValue("letter-spacing"), ["normal", "0px"]);
    addFactIfNot(facts.text, "color", style.getPropertyValue("color"), ["rgb(0, 0, 0)"]);
    addFactIfNot(facts.text, "text-align", style.getPropertyValue("text-align"), ["start", "left"]);
  }

  if (hasMediaFeature(element, style)) {
    addFactIfNot(facts.media, "object-fit", style.getPropertyValue("object-fit"), ["fill"]);
    addFactIfNot(facts.media, "object-position", style.getPropertyValue("object-position"), ["50% 50%"]);
    addFactIfNot(facts.media, "aspect-ratio", style.getPropertyValue("aspect-ratio"), ["auto"]);
    addFactIfNot(facts.media, "border-radius", style.getPropertyValue("border-radius"), ["0px"]);
    const width = style.getPropertyValue("width").trim();
    const height = style.getPropertyValue("height").trim();
    if (width || height) addFact(facts.media, "css-size", `${width || "auto"} x ${height || "auto"}`);
  }

  if (hasLayoutFeature(style)) {
    addFactIfNot(facts.layout, "gap", style.getPropertyValue("gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "row-gap", style.getPropertyValue("row-gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "column-gap", style.getPropertyValue("column-gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "padding", style.getPropertyValue("padding"), ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]);
    addFactIfNot(facts.layout, "margin", style.getPropertyValue("margin"), ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]);
    addFactIfNot(facts.layout, "align-items", style.getPropertyValue("align-items"), ["normal", "stretch"]);
    addFactIfNot(facts.layout, "justify-content", style.getPropertyValue("justify-content"), ["normal", "start", "flex-start"]);
  }

  if (hasPositioningFeature(style) || hasOverlayHint(element, style)) {
    addFactIfNot(facts.positioning, "top", style.getPropertyValue("top"), ["auto"]);
    addFactIfNot(facts.positioning, "right", style.getPropertyValue("right"), ["auto"]);
    addFactIfNot(facts.positioning, "bottom", style.getPropertyValue("bottom"), ["auto"]);
    addFactIfNot(facts.positioning, "left", style.getPropertyValue("left"), ["auto"]);
    addFactIfNot(facts.positioning, "inset", style.getPropertyValue("inset"), ["auto"]);
    addFactIfNot(facts.positioning, "z-index", style.getPropertyValue("z-index"), ["auto"]);
    addFactIfNot(facts.positioning, "transform", style.getPropertyValue("transform"), ["none"]);
  }

  const className = typeof element.className === "string" ? element.className.trim() : "";
  if (className && OVERLAY_HINT_PATTERN.test(className)) {
    addFact(facts.hints, "class-hint", className);
  }
  if (element.getAttribute("aria-hidden") === "true") {
    facts.hints.push("aria-hidden: true");
  }

  return facts;
}
