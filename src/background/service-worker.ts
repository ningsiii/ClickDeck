chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "CLICKDECK_TOGGLE" });
  } catch (error) {
    console.warn("[ClickDeck] Unable to toggle content script", error);
  }
});

// Handle print request from content script.
// Content scripts run in an isolated world and cannot call window.print() reliably.
// Dynamic <script> injection is blocked by CSP on most sites.
// Using scripting.executeScript with world: "MAIN" is the correct MV3 approach.
chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.warn("[ClickDeck] print message received but sender tab id is missing");
    return;
  }

  // Legacy: print the current tab's own window (kept for compatibility)
  if (msg.type === "CLICKDECK_PRINT") {
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.print(),
    }).catch((err) => {
      console.warn("[ClickDeck] executeScript for print failed", err);
    });
  }

  // Primary path: print via a specific iframe (fresh iframe = no print-pipeline state).
  // Called from the content script after the print iframe's load event fires.
  // Must run in MAIN world — calling iframe.contentWindow.print() from the Isolated
  // World (content script) is unreliable in Chrome and produces 0 MB PDFs.
  if (msg.type === "CLICKDECK_PRINT_IFRAME" && msg.iframeId) {
    const iframeId: string = msg.iframeId;
    const sessionId: string | undefined = msg.debugSessionId;
    const prefix = sessionId ? `[TRACE_PDF_SW:${sessionId}]` : "[TRACE_PDF_SW]";

    console.log(`${prefix} 收到了来自 Tab ${tabId} 的打印消息, 目标 iframe ID: ${iframeId}`);
    console.log(`${prefix} 准备通过 executeScript 在 Main World 唤起打印`);

    const execStart = Date.now();
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [iframeId],
      func: (id: string) => {
        const iframe = document.getElementById(id) as HTMLIFrameElement | null;
        if (iframe?.contentWindow) {
          console.log(`[TRACE_PDF_SW:MAIN] 找到 iframe, 调用 contentWindow.print()`);
          iframe.contentWindow.print();
          return { success: true, iframeFound: true };
        } else {
          console.warn(`[TRACE_PDF_SW:MAIN] print iframe not found: ${id}`);
          return { success: false, iframeFound: false, error: "iframe not found" };
        }
      },
    }).then((results) => {
      const elapsed = Date.now() - execStart;
      const result = results?.[0]?.result;
      console.log(`${prefix} executeScript 成功执行 (${elapsed}ms)`, result);
    }).catch((err) => {
      const elapsed = Date.now() - execStart;
      console.warn(`${prefix} executeScript 失败 (${elapsed}ms)`, err);
      // Send failure info back to content script
      chrome.tabs.sendMessage(tabId, {
        type: "CLICKDECK_PRINT_RESULT",
        sessionId,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        elapsed,
      }).catch(() => { /* content script may not be listening */ });
    });
  }
});

// ── Download monitoring ──────────────────────────────────────────────
// Track completed downloads to detect 0MB PDFs and download errors.
// This is passive observation — does not modify any download behavior.

const recentDownloads: Array<{
  id: number;
  filename: string;
  fileSize: number;
  startTime: number | null;
  endTime: number | null;
  state: string;
  error: string | null;
  mime: string | null;
  sessionId: string | null;
}> = [];

chrome.downloads.onChanged.addListener((delta) => {
  let record = recentDownloads.find(r => r.id === delta.id);

  if (!record) {
    // New download event - must have a filename to be tracked
    if (!delta.filename?.current) return;
    const filename = delta.filename.current;
    const isPdf = filename.endsWith(".pdf") || filename.includes("clickdeck-debug");
    if (!isPdf) return;

    record = {
      id: delta.id,
      filename: filename,
      fileSize: 0,
      startTime: Date.now(),
      endTime: null,
      state: "in_progress",
      error: null,
      mime: null,
      sessionId: null,
    };
    recentDownloads.push(record);
    while (recentDownloads.length > 20) recentDownloads.shift();
  }

  if (!record) return;

  if (delta.state?.current) {
    record.state = delta.state.current;
    if (delta.state.current === "complete") {
      record.endTime = Date.now();
    }
  }
  if (delta.fileSize?.current !== undefined) {
    record.fileSize = delta.fileSize.current;
  }
  if (delta.error?.current !== undefined) {
    record.error = delta.error.current;
  }
  if (delta.mime?.current !== undefined) {
    record.mime = delta.mime.current;
  }

  // Log completion
  if (record.state === "complete") {
    const duration = record.endTime && record.startTime ? record.endTime - record.startTime : null;
    if (record.fileSize === 0) {
      console.warn(`[TRACE_PDF_SW:DOWNLOAD] EMPTY_PDF detected! filename="${record.filename}" fileSize=0 duration=${duration}ms`);
    } else {
      console.log(`[TRACE_PDF_SW:DOWNLOAD] download complete: "${record.filename}" fileSize=${record.fileSize} bytes duration=${duration}ms`);
    }
  }
  if (record.state === "interrupted") {
    console.warn(`[TRACE_PDF_SW:DOWNLOAD] download interrupted: "${record.filename}" error="${record.error}"`);
  }
});

// Handle debug report download requests and download info queries
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "CLICKDECK_QUERY_DOWNLOADS") {
    sendResponse({ downloads: recentDownloads });
    return true;
  }

  if (msg.type === "CLICKDECK_DOWNLOAD_DEBUG_REPORT" && msg.dataUrl && msg.filename) {
    chrome.downloads.download({
      url: msg.dataUrl,
      filename: msg.filename,
      saveAs: false,
    }).then((downloadId) => {
      console.log(`[TRACE_PDF_SW] debug report download started: id=${downloadId} filename="${msg.filename}"`);
    }).catch((err) => {
      console.warn(`[TRACE_PDF_SW] debug report download failed:`, err);
    });
    sendResponse({ ok: true });
    return true;
  }
});
