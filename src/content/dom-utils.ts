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

