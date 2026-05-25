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
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.append(styleEl);
  }

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
        section, .slide, .page {
          page-break-after: always;
          break-after: page;
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
    // Clean up the print style after the dialog has had time to open
    setTimeout(() => styleEl?.remove(), 3000);
  });
}
