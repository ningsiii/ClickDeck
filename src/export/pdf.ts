import type { ClickDeckLogger } from "../diagnostics/logger";
import {
  startDebugSession,
  installIframeMessageListener,
  registerSession,
  unregisterSession,
  buildIframeMonitorScript,
  downloadDebugReport,
} from "./debug-session";

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
    html, body {
      /* Removed print-color-adjust to test fast print speed */
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
export function buildPrintHtml(mode: PdfExportMode, doc: Document, bodyBgColor?: string): string {
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
  const dynamicBgCss = bodyBgColor ? `@media print { html, body { background-color: ${bodyBgColor} !important; } }` : "";
  const css = [buildModeCss(mode), BASE_PRINT_CSS, dynamicBgCss].filter(Boolean).join("\n");
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
  // ── Debug session init ──
  installIframeMessageListener();
  const session = startDebugSession(mode);
  registerSession(session);
  const sid = session.sessionId;

  console.log(`[TRACE_PDF] 0ms - 触发导出模式: ${mode} (session: ${sid})`);

  logger.info("PDF export note: enable background graphics/colors in the print dialog for best results.");
  logger.info(`Triggering PDF export in ${mode} mode (session: ${sid})`);

  // ── Step: cleanup stale iframes ──
  const cleanupStart = performance.now();
  document.querySelectorAll("[data-clickdeck-print-iframe='true']").forEach(el => el.remove());
  session.step("cleanup-old-iframes", {
    startTime: 0,
    endTime: performance.now() - cleanupStart,
    detail: "removed stale print iframes",
  });

  try {
    // ── Step: read computed styles ──
    const styleStart = performance.now();
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    session.step("read-computed-styles", {
      startTime: styleStart - cleanupStart,
      endTime: performance.now() - cleanupStart,
      detail: `body.backgroundColor="${bodyBg}"`,
      meta: { bodyBgColor: bodyBg },
    });
    console.log(`[TRACE_PDF] getComputedStyle(body).backgroundColor = "${bodyBg}"`);

    // ── Step: build print HTML ──
    const buildStart = performance.now();
    const html = buildPrintHtml(mode, document, bodyBg);
    session.step("build-print-html", {
      startTime: buildStart - cleanupStart,
      endTime: performance.now() - cleanupStart,
      detail: `HTML length: ${html.length} chars`,
      meta: { htmlLength: html.length },
    });
    console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - buildPrintHtml 完成 (HTML 长度: ${html.length})`);

    // ── Step: inject iframe monitor script into srcdoc ──
    const monitorScript = buildIframeMonitorScript(sid);
    // Insert the monitor script right before </body> (or at end if no </body>)
    const htmlWithMonitor = html.replace(/<\/body>\s*<\/html>\s*$/i, monitorScript + "\n</body></html>")
      || html + monitorScript;

    // ── Step: create iframe ──
    const createStart = performance.now();
    const frameId = `clickdeck-print-iframe-${Date.now()}`;

    const iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.setAttribute("data-clickdeck", "true");
    iframe.setAttribute("data-clickdeck-print-iframe", "true");
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

    session.step("create-iframe", {
      startTime: createStart - cleanupStart,
      endTime: performance.now() - cleanupStart,
      detail: `iframe injected: ${iframeWidth}x${iframeHeight}, id=${frameId}`,
      meta: { frameId, iframeWidth, iframeHeight },
    });
    console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - 新建 Iframe 注入 DOM (尺寸: ${iframeWidth}x${iframeHeight}, id: ${frameId})`);

    // ── Step: set srcdoc ──
    const srcdocStart = performance.now();
    iframe.srcdoc = htmlWithMonitor;
    session.step("set-srcdoc", {
      startTime: srcdocStart - cleanupStart,
      endTime: performance.now() - cleanupStart,
      detail: `srcdoc set, waiting for load event (HTML with monitor: ${htmlWithMonitor.length} chars)`,
      meta: { srcdocLength: htmlWithMonitor.length },
    });
    console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - Iframe 设置 srcdoc 完毕，开始等待 load 事件`);

    // ── Step: wait for iframe load ──
    const loadWaitStart = performance.now();

    // Timeout: if iframe doesn't load in 30s, mark as timeout
    const loadTimeout = setTimeout(() => {
      session.step("iframe-load", {
        startTime: loadWaitStart - cleanupStart,
        endTime: 30000,
        status: "timeout",
        detail: "iframe load event not fired within 30s",
      });
      session.warn("IFRAME_LOAD_TIMEOUT", "iframe load event not fired within 30s");
      session.finalize("TIMEOUT");
      downloadDebugReport(session.build());
      unregisterSession(sid);
    }, 30_000);

    iframe.addEventListener("load", () => {
      clearTimeout(loadTimeout);
      const loadTime = performance.now() - cleanupStart;
      session.step("iframe-load", {
        startTime: loadWaitStart - cleanupStart,
        endTime: loadTime,
        detail: `iframe load event fired`,
      });
      console.log(`[TRACE_PDF] ${loadTime.toFixed(1)}ms - Iframe 触发 onload 事件`);

      // ── Step: send print message to service worker ──
      const msgStart = performance.now();
      chrome.runtime.sendMessage({
        type: "CLICKDECK_PRINT_IFRAME",
        iframeId: frameId,
        debugSessionId: sid,
      });
      session.step("send-print-message", {
        startTime: msgStart - cleanupStart,
        endTime: performance.now() - cleanupStart,
        detail: `CLICKDECK_PRINT_IFRAME sent (iframeId=${frameId})`,
        meta: { frameId },
      });
      console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - 已向 Service Worker 发送 CLICKDECK_PRINT_IFRAME 消息`);

      // ── Step: register afterprint listener ──
      let cleaned = false;
      let afterprintFired = false;
      let reportDownloaded = false;

      // Download the debug report immediately (don't wait for iframe cleanup)
      const downloadReport = () => {
        if (reportDownloaded) return;
        reportDownloaded = true;
        session.finalize(afterprintFired ? "SUCCESS" : "USER_CANCELLED");
        const report = session.build();
        console.log(`[DEBUG_SESSION] ${sid} — 准备下载 debug-report.json，检查下载文件夹`);
        downloadDebugReport(report);
        unregisterSession(sid);
      };

      const cleanup = () => {
        if (!cleaned) {
          cleaned = true;
          document.getElementById(frameId)?.remove();
          session.step("cleanup-iframe", {
            detail: `iframe removed (afterprintFired=${afterprintFired})`,
            meta: { afterprintFired },
          });
          console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - 执行 iframe 销毁完成`);
          // Ensure report is downloaded even if afterprint never fired
          downloadReport();
        }
      };

      // afterprint
      iframe.contentWindow?.addEventListener("afterprint", () => {
        afterprintFired = true;
        const afterprintTime = performance.now() - cleanupStart;
        session.step("afterprint", {
          detail: "afterprint event fired (user closed print dialog)",
        });
        console.log(`[TRACE_PDF] ${afterprintTime.toFixed(1)}ms - 捕获到 afterprint 事件`);

        // Wait 4 seconds to allow the browser's download manager to finalize the file.
        // Then query the service worker for the PDF download record to get its final size.
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "CLICKDECK_QUERY_DOWNLOADS" })
            .then((res: { downloads?: any[] }) => {
              const downloads = res.downloads || [];
              // Find the most recent PDF download that happened after our session started
              const recentPdf = downloads.find((d) => 
                d.filename.endsWith(".pdf") && 
                d.startTime >= session.startTime - 10000
              );
              
              if (recentPdf) {
                session.setDownload(recentPdf);
                if (recentPdf.fileSize === 0) {
                  session.finalize("EMPTY_PDF");
                }
              }
            })
            .finally(() => {
              downloadReport();
            });
        }, 4000);

        // Still delay iframe removal to let Chrome finish writing the PDF
        setTimeout(cleanup, 30_000);
      }, { once: true });

      session.step("register-afterprint-listener", {
        detail: "afterprint listener registered, report downloads immediately, iframe cleanup after 30s",
      });
      console.log(`[TRACE_PDF] ${(performance.now() - cleanupStart).toFixed(1)}ms - 已注册 afterprint 监听器`);

      // Hard fallback: if afterprint never fires (e.g. user presses Esc), download report after 10s
      setTimeout(() => {
        if (!afterprintFired && !reportDownloaded) {
          session.warn("HARD_FALLBACK", "10s timeout — afterprint never fired, user may have cancelled");
          downloadReport();
        }
        if (!cleaned) {
          setTimeout(cleanup, 5_000); // cleanup 5s after report
        }
      }, 10_000);
    }, { once: true });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[TRACE_PDF] PDF 导出异常`, err);
    session.step("exception", { status: "error", detail: errMsg });
    session.finalize("FAILED");
    downloadDebugReport(session.build());
    unregisterSession(sid);
    logger.error("PDF export failed", { err });
  }
}
