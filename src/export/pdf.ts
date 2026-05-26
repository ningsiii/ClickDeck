import type { ClickDeckLogger } from "../diagnostics/logger";

export type PdfExportMode = "long-page" | "a4" | "slides";

function getBasePrintCss(): string {
  // Minimal print safety net: avoid common containers being cut in half when printing.
  // Not a full pagination engine; just a practical default.
  return `
    @media print {
      section, article, figure, blockquote,
      .card, .panel, .page, .slide,
      [data-card], [data-panel] {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;
}

export function exportPdfSnapshot(mode: PdfExportMode, logger: ClickDeckLogger): void {
  const styleId = "clickdeck-pdf-style";
  const oldStyle = document.getElementById(styleId);
  if (oldStyle) {
    oldStyle.remove();
  }
  
  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  document.head.append(styleEl);

  let css = "";
  if (mode === "a4") {
    css = `
      @page {
        size: A4;
        margin: 16mm;
      }
    `;
  } else if (mode === "slides") {
    css = `
      @page {
        size: 16in 9in;
        margin: 0;
      }
      @media print {
        html,
        body {
          width: 16in;
          min-height: 9in;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .deck,
        .deck-container,
        [data-deck] {
          width: 16in !important;
          height: auto !important;
          overflow: visible !important;
          scroll-snap-type: none !important;
        }
        .slide,
        [data-slide],
        [aria-roledescription="slide"] {
          width: 16in !important;
          height: 9in !important;
          min-height: 9in !important;
          margin: 0 !important;
          break-after: page !important;
          page-break-after: always !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          overflow: hidden !important;
        }
        .slide:last-of-type,
        [data-slide]:last-of-type {
          break-after: auto !important;
          page-break-after: auto !important;
        }
        .nav-dots,
        .nav-dot,
        [data-clickdeck="true"] {
          display: none !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
  } else {
    // long-page mode relies on the default browser behavior
    css = "";
  }

  styleEl.textContent = `${css}\n${getBasePrintCss()}`.trim();

  // Chrome/Edge print dialogs often don't include background colors/images by default.
  // We cannot control that setting from an extension, so we log a clear reminder.
  logger.info("PDF export note: enable background graphics/colors in the print dialog for best results.");
  logger.info(`Triggering PDF export in ${mode} mode`);

  // Content scripts run in an isolated world and cannot reliably call window.print().
  // Dynamic <script> injection is also blocked by strict CSPs on most real-world sites.
  // The correct MV3 approach: ask the background service worker to call window.print()
  // via chrome.scripting.executeScript({ world: "MAIN" }), which bypasses both limitations.
  //
  // We use requestAnimationFrame to let the browser apply the injected @page CSS
  // before handing control to the background for printing.
  requestAnimationFrame(() => {
    chrome.runtime.sendMessage({ type: "CLICKDECK_PRINT" });
    // The cleanup of this style element is securely handled by the background service worker.
    // It injects an 'afterprint' event listener into the MAIN world right before calling window.print().
    // This ensures the CSS is removed ONLY after the print dialog is completely closed,
    // avoiding the race condition that corrupts PDFs if the DOM is modified during PDF generation.
  });
}
