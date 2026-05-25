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
  
  // We must call window.print() in the main world. Content scripts often have restrictions.
  const script = document.createElement("script");
  script.textContent = "window.print();";
  document.body.appendChild(script);
  script.remove();
  
  // Clean up after print dialog closes (heuristically)
  setTimeout(() => styleEl?.remove(), 2000);
}
