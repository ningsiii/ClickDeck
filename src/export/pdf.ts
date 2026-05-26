import type { ClickDeckLogger } from "../diagnostics/logger";

export type PdfExportMode = "long-page" | "a4" | "slides";

function buildModeCss(mode: PdfExportMode): string {
  if (mode === "a4") {
    return "@page { size: A4; margin: 16mm; }";
  }
  if (mode === "slides") {
    return `
      @page { size: 16in 9in; margin: 0; }
      @media print {
        html, body {
          width: 16in; min-height: 9in;
          margin: 0 !important; padding: 0 !important;
          background: transparent !important;
        }
        .deck, .deck-container, [data-deck] {
          width: 16in !important; height: auto !important;
          overflow: visible !important; scroll-snap-type: none !important;
        }
        .slide, [data-slide], [aria-roledescription="slide"] {
          width: 16in !important; height: 9in !important; min-height: 9in !important;
          margin: 0 !important;
          break-after: page !important; page-break-after: always !important;
          break-inside: avoid !important; page-break-inside: avoid !important;
          overflow: hidden !important;
        }
        .slide:last-of-type, [data-slide]:last-of-type {
          break-after: auto !important; page-break-after: auto !important;
        }
        .nav-dots, .nav-dot { display: none !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `.trim();
  }
  return "";
}

const BASE_PRINT_CSS = `
  @media print {
    section, article, figure, blockquote,
    .card, .panel, .page, .slide,
    [data-card], [data-panel] {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`.trim();

/**
 * Builds a complete, self-contained HTML string for printing.
 * Exported for unit testing.
 */
export function buildPrintHtml(mode: PdfExportMode, doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;

  // Remove ClickDeck UI and any previously injected print styles
  clone.querySelectorAll(
    "[data-clickdeck='true'], #clickdeck-pdf-style, #clickdeck-style"
  ).forEach(el => el.remove());

  let head = clone.querySelector("head");
  if (!head) {
    head = document.createElement("head");
    clone.insertBefore(head, clone.firstChild);
  }

  // Remove any stale clickdeck print iframes that may have been left in the DOM
  clone.querySelectorAll("[data-clickdeck-print-iframe='true']").forEach(el => el.remove());

  // <base> tag so relative URLs resolve against the original page
  const baseEl = document.createElement("base");
  baseEl.href = doc.location?.href ?? "";
  head.prepend(baseEl);

  // Inject print CSS
  const css = [buildModeCss(mode), BASE_PRINT_CSS].filter(Boolean).join("\n");
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  head.appendChild(styleEl);

  const doctype = doc.doctype
    ? `<!DOCTYPE ${doc.doctype.name}>`
    : "<!DOCTYPE html>";
  return `${doctype}\n${clone.outerHTML}`;
}

/**
 * Prints by writing into a hidden iframe.
 *
 * Why iframe instead of window.open() or executeScript + window.print():
 *  - window.open(): Chrome blocks auto window.print() in popups (non-user-gesture), → 0 MB PDF.
 *  - executeScript + same-tab window.print(): Chrome's print pipeline retains state after the
 *    first dialog; the second call corrupts the generated PDF.
 *  - Hidden iframe: each call creates a fresh iframe document written directly, with no
 *    cross-origin restrictions and no state shared across invocations.
 *    iframe.contentWindow.print() IS treated as a user-gesture-proxied call because
 *    it originates from the same user action that triggered the content script handler.
 */
export function exportPdfSnapshot(mode: PdfExportMode, logger: ClickDeckLogger): void {
  logger.info("PDF export note: enable background graphics/colors in the print dialog for best results.");
  logger.info(`Triggering PDF export in ${mode} mode`);

  // Clean up any stale print iframes from a previous export that didn't clean up properly.
  // This prevents Chrome from showing "Print failed" when two print jobs overlap.
  document.querySelectorAll("[data-clickdeck-print-iframe='true']").forEach(el => el.remove());

  try {
    const html = buildPrintHtml(mode, document);

    // Create a hidden iframe with realistic print dimensions.
    // Chrome's PDF generator uses the iframe viewport for layout; 1×1 px produces blank output.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("data-clickdeck", "true");       // excluded from HTML export
    iframe.setAttribute("data-clickdeck-print-iframe", "true"); // tracked for cleanup
    // Off-screen but full-width so Chrome can render content correctly before printing
    iframe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-10000px",
      "width:" + (mode === "slides" ? "1920px" : "794px"),
      "height:" + (mode === "slides" ? "1080px" : "1123px"),
      "border:none",
      "visibility:hidden",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(iframe);

    // Use srcdoc instead of document.write().
    // Chrome's print pipeline handles srcdoc iframes correctly; document.write() on file://
    // parent pages can produce blank output in Chrome's PDF generator.
    iframe.srcdoc = html;

    // Wait for the iframe to finish loading, then print it
    iframe.addEventListener("load", () => {
      try {
        iframe.contentWindow?.print();
      } catch (printErr) {
        logger.error("PDF export: iframe print failed", { printErr });
      }
      // Clean up after the dialog is dismissed
      const cleanup = () => iframe.remove();
      iframe.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
      // Safety fallback in case afterprint never fires (e.g. user cancelled)
      setTimeout(cleanup, 60_000);
    }, { once: true });

  } catch (err) {
    logger.error("PDF export failed", { err });
  }
}
