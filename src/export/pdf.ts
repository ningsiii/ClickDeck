import type { ClickDeckLogger } from "../diagnostics/logger";

export type PdfExportMode = "long-page" | "a4" | "slides";

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

  styleEl.textContent = css;

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
