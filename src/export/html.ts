import type { ClickDeckLogger } from "../diagnostics/logger";

export function exportHtmlSnapshot(logger: ClickDeckLogger): void {
  try {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    
    // Remove ClickDeck UI
    const elementsToRemove = clone.querySelectorAll("[data-clickdeck='true'], #clickdeck-style");
    elementsToRemove.forEach(el => el.remove());

    // Inject <base> tag to ensure relative URLs (images, css) still work
    const baseEl = document.createElement("base");
    baseEl.href = window.location.href;
    const head = clone.querySelector("head");
    if (head) {
      head.prepend(baseEl);
    } else {
      const newHead = document.createElement("head");
      newHead.appendChild(baseEl);
      clone.insertBefore(newHead, clone.firstChild);
    }

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
    logger.info("HTML snapshot exported successfully");
  } catch (error) {
    logger.error("Failed to export HTML snapshot", { error });
  }
}
