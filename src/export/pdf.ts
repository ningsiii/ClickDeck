import type { ClickDeckLogger } from "../diagnostics/logger";

export type PdfExportMode = "long-page" | "a4" | "slides";

function buildModeCss(mode: PdfExportMode): string {
  if (mode === "a4") {
    return `
      @page { size: A4; margin: 16mm; }
    `.trim();
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
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `.trim();
  }
  // long-page: relies on default browser behavior
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

  // Remove ClickDeck UI elements and any previously injected styles
  clone.querySelectorAll(
    "[data-clickdeck='true'], #clickdeck-pdf-style, #clickdeck-style"
  ).forEach(el => el.remove());

  // Ensure <head> exists
  let head = clone.querySelector("head");
  if (!head) {
    head = document.createElement("head");
    clone.insertBefore(head, clone.firstChild);
  }

  // Inject <base> tag so relative URLs (images, CSS) resolve correctly
  const baseEl = document.createElement("base");
  baseEl.href = doc.location?.href ?? "";
  head.prepend(baseEl);

  // Inject combined print CSS
  const css = [buildModeCss(mode), BASE_PRINT_CSS].filter(Boolean).join("\n");
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  head.appendChild(styleEl);

  // Inject auto-print script; closes the window after the dialog is dismissed
  const scriptEl = document.createElement("script");
  scriptEl.textContent = [
    "window.addEventListener('load', function () {",
    "  window.print();",
    "  window.addEventListener('afterprint', function () { window.close(); });",
    "});"
  ].join("\n");
  head.appendChild(scriptEl);

  const doctype = doc.doctype
    ? `<!DOCTYPE ${doc.doctype.name}>`
    : "<!DOCTYPE html>";
  return `${doctype}\n${clone.outerHTML}`;
}

/**
 * Opens the current page in a new popup window with print CSS embedded,
 * then auto-triggers the browser print dialog from that window.
 *
 * Each invocation creates a fresh window, so there is no shared print-pipeline
 * state between successive exports — the root cause of the "corrupted PDF on
 * second export" bug when using executeScript + window.print().
 */
export function exportPdfSnapshot(mode: PdfExportMode, logger: ClickDeckLogger): void {
  logger.info("PDF export note: enable background graphics/colors in the print dialog for best results.");
  logger.info(`Triggering PDF export in ${mode} mode`);

  try {
    const html = buildPrintHtml(mode, document);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const printWin = window.open(url, "_blank");
    if (!printWin) {
      logger.warn("PDF export: the browser blocked the print popup. Please allow popups for this page and try again.");
    }

    // Revoke the blob URL after 30 s — the window should have printed by then
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } catch (err) {
    logger.error("PDF export failed", { err });
  }
}
