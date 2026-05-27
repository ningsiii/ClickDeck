/**
 * PDF Export Debug Session — Observability Layer
 *
 * Captures structured, timestamped data for every PDF export attempt.
 * Does NOT modify any business logic. Only adds observability.
 *
 * Usage:
 *   const session = startDebugSession("slides");
 *   session.step("clone-html", ...);
 *   session.finalize("SUCCESS");
 *   downloadDebugReport(session.build());
 */

// ── Debug mode switch ────────────────────────────────────────────────
//
// Set DEBUG_PDF = true when you need to inspect the JSON report locally.
// Set DEBUG_PDF = false before any release — this has no relation to
// Chrome's "Developer mode" toggle (which only affects unpacked extension
// loading). This is a pure code-level switch controlled at build time.
//
const DEBUG_PDF = false;

// ── Types ────────────────────────────────────────────────────────────

export type ExportMode = "long-page" | "a4" | "slides";
export type ExportResult = "SUCCESS" | "FAILED" | "EMPTY_PDF" | "TIMEOUT" | "USER_CANCELLED" | "UNKNOWN";

export interface BrowserContext {
  userAgent: string;
  vendor: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  maxTouchPoints: number;
  isChrome: boolean;
  isEdge: boolean;
  chromeVersion: string | null;
}

export interface HtmlContext {
  url: string;
  origin: string;
  protocol: string;
  hostname: string;
  fileName: string;
  title: string;
  domNodeCount: number;
  imageCount: number;
  canvasCount: number;
  svgCount: number;
  iframeCount: number;
  pageWidth: number;
  pageHeight: number;
  bodyBgColor: string;
  bodyBgShorthand: string;
  bodyColor: string;
  cssVariableBg: string | null;
  linkCount: number;
  styleSheetCount: number;
}

export interface TimelineEntry {
  step: string;
  startTime: number;    // ms since session start
  endTime: number | null;
  duration: number | null;
  status: "ok" | "error" | "timeout" | "skipped";
  detail: string;
  meta?: Record<string, unknown>;
}

export interface IframeInternalEvent {
  event: string;
  time: number;         // ms since session start
  detail: string;
}

export interface DownloadRecord {
  filename: string;
  fileSize: number;
  exists: boolean;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
  state: string;
  error: string | null;
  mime: string | null;
}

export interface WarningEntry {
  time: number;
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface DebugReport {
  version: "1.0";
  sessionId: string;
  startTime: number;       // absolute timestamp (Date.now())
  endTime: number | null;
  totalDuration: number | null;
  result: ExportResult;
  exportMode: ExportMode;
  browser: BrowserContext;
  html: HtmlContext;
  timeline: TimelineEntry[];
  iframeEvents: IframeInternalEvent[];
  warnings: WarningEntry[];
  download: DownloadRecord | null;
  gitCommit: string | null;
}

// ── Session implementation ───────────────────────────────────────────

let sessionCounter = 0;

function generateSessionId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const yyyy = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const mmm = pad(now.getMilliseconds(), 3);
  return `EXPORT_${yyyy}${MM}${dd}_${HH}${mm}${ss}_${mmm}`;
}

function collectBrowserContext(): BrowserContext {
  const nav = navigator;
  const ua = nav.userAgent;
  const isChrome = /Chrome\//.test(ua) && !/Edg\//.test(ua);
  const isEdge = /Edg\//.test(ua);
  const chromeMatch = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);

  return {
    userAgent: ua,
    vendor: nav.vendor,
    platform: nav.platform,
    language: nav.language,
    cookieEnabled: nav.cookieEnabled,
    onLine: nav.onLine,
    hardwareConcurrency: nav.hardwareConcurrency,
    deviceMemory: "deviceMemory" in nav ? (nav as { deviceMemory: number }).deviceMemory : null,
    maxTouchPoints: nav.maxTouchPoints,
    isChrome,
    isEdge,
    chromeVersion: chromeMatch ? chromeMatch[1] : null,
  };
}

function collectHtmlContext(doc: Document): HtmlContext {
  const body = doc.body;
  const computedBg = window.getComputedStyle(body).backgroundColor;
  const computedColor = window.getComputedStyle(body).color;

  // Try to read the raw CSS background shorthand from stylesheets
  let bodyBgShorthand = "";
  let cssVarBg: string | null = null;
  try {
    for (const sheet of Array.from(doc.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSStyleRule && rule.selectorText === "body") {
            const bg = rule.style.background;
            if (bg) bodyBgShorthand = bg;
          }
        }
      } catch {
        // cross-origin stylesheet, skip
      }
    }
    // Try to read --bg variable from :root
    cssVarBg = getComputedStyle(doc.documentElement).getPropertyValue("--bg").trim() || null;
  } catch {
    // ignore
  }

  const loc = doc.location;
  const fileName = loc?.pathname?.split("/").pop() || "unknown";

  return {
    url: loc?.href ?? "unknown",
    origin: loc?.origin ?? "unknown",
    protocol: loc?.protocol ?? "unknown",
    hostname: loc?.hostname ?? "unknown",
    fileName,
    title: doc.title,
    domNodeCount: doc.querySelectorAll("*").length,
    imageCount: doc.querySelectorAll("img").length,
    canvasCount: doc.querySelectorAll("canvas").length,
    svgCount: doc.querySelectorAll("svg").length,
    iframeCount: doc.querySelectorAll("iframe").length,
    pageWidth: doc.documentElement.scrollWidth,
    pageHeight: doc.documentElement.scrollHeight,
    bodyBgColor: computedBg,
    bodyBgShorthand,
    bodyColor: computedColor,
    cssVariableBg: cssVarBg,
    linkCount: doc.querySelectorAll("link").length,
    styleSheetCount: doc.styleSheets.length,
  };
}

export interface DebugSession {
  readonly sessionId: string;
  readonly startTime: number;

  /** Record a pipeline step with start/end timing */
  step(
    name: string,
    opts: {
      startTime?: number;
      endTime?: number;
      status?: "ok" | "error" | "timeout" | "skipped";
      detail?: string;
      meta?: Record<string, unknown>;
    }
  ): void;

  /** Record a warning */
  warn(code: string, message: string, meta?: Record<string, unknown>): void;

  /** Record an iframe-internal event (from postMessage) */
  recordIframeEvent(event: string, time: number, detail: string): void;

  /** Record download information (set from service worker) */
  setDownload(record: DownloadRecord): void;

  /** Set the final result */
  finalize(result: ExportResult): void;

  /** Set git commit hash (optional) */
  setGitCommit(hash: string): void;

  /** Build the final report */
  build(): DebugReport;
}

export function startDebugSession(mode: ExportMode): DebugSession {
  const sessionId = generateSessionId();
  const startTime = Date.now();
  const t0 = performance.now();

  const browser = collectBrowserContext();
  const html = collectHtmlContext(document);

  const timeline: TimelineEntry[] = [];
  const iframeEvents: IframeInternalEvent[] = [];
  const warnings: WarningEntry[] = [];
  let downloadRecord: DownloadRecord | null = null;
  let finalResult: ExportResult = "UNKNOWN";
  let gitCommit: string | null = null;

  console.log(`[DEBUG_SESSION] ${sessionId} started — mode=${mode}, browser=${browser.isChrome ? "Chrome" : browser.isEdge ? "Edge" : "Other"}, html=${html.fileName}, domNodes=${html.domNodeCount}`);

  return {
    sessionId,
    startTime,

    step(name, opts = {}) {
      const now = performance.now();
      const entry: TimelineEntry = {
        step: name,
        startTime: opts.startTime ?? now - t0,
        endTime: opts.endTime ?? now - t0,
        duration: (opts.endTime ?? now - t0) - (opts.startTime ?? now - t0),
        status: opts.status ?? "ok",
        detail: opts.detail ?? "",
        meta: opts.meta,
      };
      timeline.push(entry);
      console.log(`[DEBUG_SESSION] ${sessionId} | ${entry.step} | ${entry.duration != null ? entry.duration.toFixed(1) + "ms" : "n/a"} | ${entry.status} | ${entry.detail}`);
    },

    warn(code, message, meta) {
      warnings.push({ time: performance.now() - t0, code, message, meta });
      console.warn(`[DEBUG_SESSION] ${sessionId} | WARN ${code}: ${message}`);
    },

    recordIframeEvent(event, time, detail) {
      iframeEvents.push({ event, time, detail });
      console.log(`[DEBUG_SESSION] ${sessionId} | IFRAME | ${event} @ ${time.toFixed(1)}ms | ${detail}`);
    },

    setDownload(record) {
      downloadRecord = record;
    },

    finalize(result) {
      finalResult = result;
    },

    setGitCommit(hash) {
      gitCommit = hash;
    },

    build() {
      const endTime = Date.now();
      return {
        version: "1.0",
        sessionId,
        startTime,
        endTime,
        totalDuration: endTime - startTime,
        result: finalResult,
        exportMode: mode,
        browser,
        html,
        timeline,
        iframeEvents,
        warnings,
        download: downloadRecord,
        gitCommit,
      };
    },
  };
}

// ── Iframe monitoring injection ──────────────────────────────────────

/**
 * Returns a <script> string to inject into the srcdoc.
 * The script posts messages to the parent window for key lifecycle events.
 * The parent window listens via window.addEventListener("message", ...).
 */
export function buildIframeMonitorScript(sessionId: string): string {
  const code = `
(function() {
  var t0 = performance.now();
  var sid = "${sessionId}";
  function post(event, detail) {
    try {
      parent.postMessage({ type: "CLICKDECK_DEBUG_IFRAME", sessionId: sid, event: event, time: performance.now() - t0, detail: detail }, "*");
    } catch(e) {}
  }

  post("iframe-script-start", "monitoring script loaded");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      post("dom-content-loaded", "DOMContentLoaded fired");
    });
  } else {
    post("dom-content-loaded-already", "document.readyState=" + document.readyState);
  }

  window.addEventListener("load", function() {
    post("window-load", "window load fired");

    var imgs = document.querySelectorAll("img");
    var loaded = 0, failed = 0, total = imgs.length;
    if (total === 0) {
      post("images-complete", "no images to load");
    } else {
      post("images-start", total + " images found");
      imgs.forEach(function(img) {
        if (img.complete) {
          loaded++;
          if (loaded + failed >= total) post("images-complete", "loaded=" + loaded + " failed=" + failed);
        } else {
          img.addEventListener("load", function() {
            loaded++;
            if (loaded + failed >= total) post("images-complete", "loaded=" + loaded + " failed=" + failed);
          });
          img.addEventListener("error", function() {
            failed++;
            if (loaded + failed >= total) post("images-complete", "loaded=" + loaded + " failed=" + failed);
          });
        }
      });
      setTimeout(function() {
        post("images-timeout", "15s timeout, loaded=" + loaded + " failed=" + failed + " total=" + total);
      }, 15000);
    }

    if (document.fonts && document.fonts.ready) {
      post("fonts-start", "waiting for document.fonts.ready");
      document.fonts.ready.then(function() {
        post("fonts-ready", "all fonts loaded");
      }).catch(function(e) {
        post("fonts-error", String(e));
      });
    } else {
      post("fonts-skip", "document.fonts API not available");
    }

    requestAnimationFrame(function() {
      post("first-rAF", "first requestAnimationFrame after load, body.scrollHeight=" + document.body.scrollHeight);
    });
  });

  window.addEventListener("beforeprint", function() {
    post("beforeprint", "beforeprint fired");
  });
  window.addEventListener("afterprint", function() {
    post("afterprint", "afterprint fired");
  });

  window.addEventListener("error", function(e) {
    post("js-error", e.message + " at " + e.filename + ":" + e.lineno);
  });
  window.addEventListener("unhandledrejection", function(e) {
    post("unhandled-rejection", String(e.reason));
  });
})();
  `;
  // Using base64 to bypass some basic CSP restrictions that block inline scripts
  const b64 = btoa(code);
  return `<script src="data:text/javascript;base64,${b64}"></script>`;
}

// ── Report download ──────────────────────────────────────────────────

/**
 * Sends the debug report to the service worker for download via chrome.downloads API.
 * Content scripts cannot reliably trigger programmatic downloads, so we delegate
 * to the background service worker which has access to chrome.downloads.
 */
export function downloadDebugReport(report: DebugReport): void {
  // Only auto-download when DEBUG_PDF is enabled.
  // In production this is false, so no JSON files appear in the user's Downloads.
  // To debug: set DEBUG_PDF = true at the top of this file, rebuild, reload extension.
  if (!DEBUG_PDF && report.result === "SUCCESS") {
    console.log(`[DEBUG_SESSION] ${report.sessionId} — export complete (debug report suppressed in production mode)`);
    return;
  }

  const json = JSON.stringify(report, null, 2);
  const filename = `clickdeck-debug-${report.sessionId}.json`;

  // Send as a data URL to the service worker
  const dataUrl = "data:application/json;charset=utf-8," + encodeURIComponent(json);

  chrome.runtime.sendMessage({
    type: "CLICKDECK_DOWNLOAD_DEBUG_REPORT",
    dataUrl,
    filename,
  }).then(() => {
    console.log(`[DEBUG_SESSION] ${report.sessionId} — debug report sent to service worker for download (${json.length} bytes)`);
  }).catch((err) => {
    console.warn(`[DEBUG_SESSION] ${report.sessionId} — failed to send report to service worker:`, err);
    // Fallback: try content-script download (may be blocked by browser)
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`[DEBUG_SESSION] ${report.sessionId} — fallback download triggered`);
    } catch (e) {
      console.error(`[DEBUG_SESSION] ${report.sessionId} — fallback download also failed:`, e);
    }
  });
}

// ── Message listener setup ───────────────────────────────────────────

let listenerInstalled = false;
const activeSessions = new Map<string, DebugSession>();

/**
 * Installs a global message listener that routes iframe postMessage events
 * to the correct debug session. Call once per page load.
 */
export function installIframeMessageListener(): void {
  if (listenerInstalled) return;
  listenerInstalled = true;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "CLICKDECK_DEBUG_IFRAME" || !data.sessionId) return;

    const session = activeSessions.get(data.sessionId);
    if (session) {
      session.recordIframeEvent(data.event, data.time, data.detail);
    }
  });
}

/**
 * Register a session so iframe postMessage events can be routed to it.
 */
export function registerSession(session: DebugSession): void {
  activeSessions.set(session.sessionId, session);
}

/**
 * Unregister a session after export is complete.
 * Delayed to allow late iframe events to arrive.
 */
export function unregisterSession(sessionId: string): void {
  setTimeout(() => activeSessions.delete(sessionId), 20_000);
}
