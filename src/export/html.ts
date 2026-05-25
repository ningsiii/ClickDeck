import type { ClickDeckLogger } from "../diagnostics/logger";

function ensureBaseTag(clone: HTMLElement): void {
  // Inject <base> tag to ensure relative URLs (images, css) still work.
  // Note: external resources still depend on their original URLs; this is not an offline packager.
  const baseEl = document.createElement("base");
  baseEl.href = window.location.href;
  const head = clone.querySelector("head");
  if (head) {
    head.prepend(baseEl);
    return;
  }

  const newHead = document.createElement("head");
  newHead.appendChild(baseEl);
  clone.insertBefore(newHead, clone.firstChild);
}

export function exportHtmlSnapshot(logger: ClickDeckLogger): void {
  try {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Remove ClickDeck UI
    const elementsToRemove = clone.querySelectorAll("[data-clickdeck='true'], #clickdeck-style");
    elementsToRemove.forEach(el => el.remove());

    ensureBaseTag(clone);

    const htmlContent = clone.outerHTML;
    // Prepend doctype if the document has one
    const doctype = document.doctype 
      ? `<!DOCTYPE ${document.doctype.name}>` 
      : "<!DOCTYPE html>";

    const fullHtml = `${doctype}\n${htmlContent}`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `clickdeck-snapshot-${Date.now()}.html`;
    a.click();

    URL.revokeObjectURL(url);
    logger.info(
      "HTML snapshot exported. Note: external images/fonts still rely on their original URLs. data: URL images are preserved."
    );
  } catch (error) {
    logger.error("Failed to export HTML snapshot", { error });
  }
}
