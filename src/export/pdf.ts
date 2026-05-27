import type { ClickDeckLogger } from "../diagnostics/logger";

export type PdfExportMode = "long-page" | "a4" | "slides";

function buildModeCss(mode: PdfExportMode): string {
  if (mode === "a4") {
    return "@page { size: A4; margin: 16mm; }";
  }
  if (mode === "slides") {
    return `
      @page { size: 16in 9in landscape; margin: 0; }
      @media print {
        html, body {
          width: 16in; min-height: 9in;
          margin: 0 !important; padding: 0 !important;
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
      }
    `.trim();
  }
  return "";
}

const BASE_PRINT_CSS = `
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
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

  // IMPORTANT: Remove all <script> tags.
  // The cloned HTML is placed into an about:srcdoc iframe. Scripts like Vite's HMR
  // client or other extensions (e.g., Immersive Translate) will throw errors
  // (like wss://srcdoc/ws failed) and can hang the print pipeline or cause 0MB PDFs.
  clone.querySelectorAll("script").forEach(el => el.remove());

  let head = clone.querySelector("head");
  if (!head) {
    head = document.createElement("head");
    clone.insertBefore(head, clone.firstChild);
  }

  // Remove stale print iframes that may have been cloned
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
 * Prints by creating a hidden iframe, writing the serialized page HTML into it
 * via srcdoc, then asking the background service worker to call
 * iframe.contentWindow.print() via executeScript({ world: "MAIN" }).
 *
 * WHY MAIN WORLD:
 * Content scripts run in Chrome's Isolated World. Calling iframe.contentWindow.print()
 * from an Isolated World is unreliable in Chrome — it produces 0 MB PDFs or "print
 * failed" errors. Using executeScript({ world: "MAIN" }) is the only reliable way to
 * trigger printing from an extension, as proven by the original first-print success.
 *
 * WHY NEW IFRAME EACH TIME:
 * Calling window.print() via executeScript on the SAME tab after a previous print
 * produces corrupted PDFs because Chrome's print pipeline retains internal state.
 * A fresh iframe has no prior print state.
 */
export function exportPdfSnapshot(mode: PdfExportMode, logger: ClickDeckLogger): void {
  const t0 = performance.now();
  console.log(`[TRACE_PDF] 0ms - 触发导出模式: ${mode}`);

  logger.info("PDF export note: enable background graphics/colors in the print dialog for best results.");
  logger.info(`Triggering PDF export in ${mode} mode`);

  // Clean up stale print iframes (prevents "Print failed" from overlapping jobs)
  document.querySelectorAll("[data-clickdeck-print-iframe='true']").forEach(el => el.remove());
  console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 清理旧的 Iframe 完成`);

  try {
    const html = buildPrintHtml(mode, document);
    console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - buildPrintHtml 完成 (HTML 长度: ${html.length})`);

    // Unique ID so the service worker can find this specific iframe via executeScript
    const frameId = `clickdeck-print-iframe-${Date.now()}`;

    const iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.setAttribute("data-clickdeck", "true");             // excluded from HTML export
    iframe.setAttribute("data-clickdeck-print-iframe", "true"); // tracked for cleanup
    // Full-size viewport off-screen: Chrome's PDF generator uses the iframe viewport
    // dimensions to lay out the content. A 1×1 px iframe produces a blank PDF.
    const iframeWidth = mode === "slides" ? "1920px" : "794px";
    const iframeHeight = mode === "slides" ? "1080px" : "1123px";
    iframe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:-10000px",
      "width:" + iframeWidth,
      "height:" + iframeHeight,
      "border:none",
      "visibility:hidden",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(iframe);
    console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 新建 Iframe 注入 DOM (尺寸: ${iframeWidth}x${iframeHeight}, id: ${frameId})`);

    // srcdoc is preferred over document.write() — Chrome's print pipeline handles
    // srcdoc iframes correctly on file:// parent pages.
    iframe.srcdoc = html;
    console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - Iframe 设置 srcdoc 完毕，开始等待 load 事件`);

    iframe.addEventListener("load", () => {
      console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - Iframe 触发 onload 事件`);

      // Ask the service worker to call iframe.contentWindow.print() in the MAIN world.
      // This is required because calling print() from the Isolated World (content script)
      // does not trigger Chrome's PDF generator reliably.
      chrome.runtime.sendMessage({
        type: "CLICKDECK_PRINT_IFRAME",
        iframeId: frameId,
      });
      console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 已向 Service Worker 发送 CLICKDECK_PRINT_IFRAME 消息 (iframeId: ${frameId})`);

      // Schedule cleanup. Chrome fires afterprint when the dialog CLOSES, not when
      // the PDF file is fully written. We delay removal by 30 s so Chrome has time
      // to finish writing the file before we remove the document reference.
      let cleaned = false;
      const cleanup = () => {
        if (!cleaned) {
          cleaned = true;
          document.getElementById(frameId)?.remove();
          console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 执行 iframe 销毁完成 (id: ${frameId})`);
        }
      };
      // afterprint fires in the iframe's own window context — listen there
      iframe.contentWindow?.addEventListener("afterprint", () => {
        console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 捕获到 afterprint 事件 (用户点击了保存或取消)`);
        setTimeout(cleanup, 30_000);
      }, { once: true });
      console.log(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - 已注册 afterprint 监听器`);
      // Hard fallback in case afterprint never fires (e.g. user presses Esc)
      setTimeout(cleanup, 180_000);
    }, { once: true });

  } catch (err) {
    console.error(`[TRACE_PDF] ${(performance.now() - t0).toFixed(1)}ms - PDF 导出异常`, err);
    logger.error("PDF export failed", { err });
  }
}
