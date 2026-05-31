/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildPrintHtml, buildPrintSnapshot, exportPdfSnapshot } from "./pdf";
import type { ClickDeckLogger } from "../diagnostics/logger";

// ---------------------------------------------------------------------------
// buildPrintHtml — pure-function unit tests
// ---------------------------------------------------------------------------
describe("buildPrintHtml", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("a4 mode: contains A4 page size and base print CSS, not 16:9", () => {
    const html = buildPrintHtml("a4", document);
    expect(html).toContain("size: A4");
    expect(html).toContain("margin: 16mm");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("thead");
    expect(html).toContain("display: table-header-group");
    expect(html).toContain("canvas");
    expect(html).toContain("max-width: 100% !important");
    expect(html).not.toContain("background-image: none !important");
    expect(html).not.toContain("size: 16in 9in");
  });

  it("slides mode: contains 16:9 landscape @page, slide constraints, deck overflow reset, nav-dots hide", () => {
    const html = buildPrintHtml("slides", document);
    expect(html).toContain("16in 9in landscape");
    expect(html).toContain("width: 16in !important");
    expect(html).toContain("height: 9in !important");
    expect(html).toContain(".deck");
    expect(html).toContain("overflow: visible !important");
    expect(html).toContain(".nav-dots");
    expect(html).toContain("display: none !important");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("background-image: none !important");
    expect(html).not.toContain("display: table-header-group");
  });

  it("long-page mode: no 16:9 CSS, base print CSS still present", () => {
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain("16in 9in");
    expect(html).not.toContain("width: 16in !important");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("thead");
    expect(html).toContain("display: table-header-group");
    expect(html).toContain("canvas");
    expect(html).toContain("max-width: 100% !important");
    expect(html).not.toContain("background-image: none !important");
  });

  it("long-page and A4 preserve backgrounds while slides keep the isolated slide policy", () => {
    expect(buildPrintSnapshot("long-page", document).strategy.backgroundPolicy).toBe("preserve-backgrounds");
    expect(buildPrintSnapshot("a4", document).strategy.backgroundPolicy).toBe("preserve-backgrounds");
    expect(buildPrintSnapshot("slides", document).strategy.backgroundPolicy).toBe("strip-background-images");
  });

  it("removes ClickDeck UI elements from output", () => {
    document.body.innerHTML = '<div data-clickdeck="true">UI</div><p id="content">Content</p>';
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain('<div data-clickdeck="true">UI</div>');
    expect(html).toContain("Content");
  });

  it("returns print strategy metadata without changing the generated print HTML contract", () => {
    document.head.innerHTML = "<script src='/app.js'></script>";
    document.body.innerHTML = [
      '<div data-clickdeck="true">UI</div>',
      '<div id="clickdeck-style"></div>',
      "<p>Content</p>",
    ].join("");

    const { html, strategy } = buildPrintSnapshot("slides", document, "rgb(1, 2, 3)", {
      width: "1920px",
      height: "1080px",
    });

    expect(html).toContain("16in 9in landscape");
    expect(html).toContain("Content");
    expect(html).not.toContain("<script");
    expect(html).not.toContain('<div data-clickdeck="true">UI</div>');
    expect(html).not.toContain('<div id="clickdeck-style"></div>');
    expect(strategy).toMatchObject({
      printIframeSize: { width: "1920px", height: "1080px" },
      scriptRemovedCount: 1,
      clickDeckUiRemovedCount: 2,
      bodyBgColor: "rgb(1, 2, 3)",
      pageSizePolicy: "slides-16-9",
    });
    expect(strategy.backgroundPolicy).toBe("strip-background-images");
    expect(strategy.printCssLength).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// exportPdfSnapshot — smoke tests
// ---------------------------------------------------------------------------

// Mock chrome.runtime (not available in jsdom)
const sendMessageMock = vi.fn();
vi.stubGlobal("chrome", {
  runtime: { sendMessage: sendMessageMock },
});

describe("exportPdfSnapshot", () => {
  let logger: ClickDeckLogger;
  let capturedSrcdoc = "";

  const mockContentWindow = { addEventListener: vi.fn() };

  beforeEach(() => {
    logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.useFakeTimers();
    capturedSrcdoc = "";
    sendMessageMock.mockClear();
    mockContentWindow.addEventListener.mockClear();

    // Stub createElement to capture iframe creation
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "iframe") {
        const el = origCreate("div") as unknown as Record<string, unknown>;
        Object.defineProperty(el, "srcdoc", {
          set(val: string) { capturedSrcdoc = val; },
          get() { return capturedSrcdoc; },
        });
        Object.defineProperty(el, "contentWindow", { get: () => mockContentWindow });
        // Fire load event asynchronously when listener is added
        (el as unknown as HTMLElement).addEventListener = (event: string, cb: EventListenerOrEventListenerObject) => {
          if (event === "load") {
            Promise.resolve().then(() => (cb as EventListener)(new Event("load")));
          }
        };
        return el as unknown as HTMLIFrameElement;
      }
      return origCreate(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("sets iframe srcdoc containing A4 CSS for a4 mode", async () => {
    exportPdfSnapshot("a4", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("size: A4");
  });

  it("sets iframe srcdoc containing 16:9 landscape CSS for slides mode", async () => {
    exportPdfSnapshot("slides", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("16in 9in landscape");
  });

  it("sets iframe srcdoc for long-page mode", async () => {
    exportPdfSnapshot("long-page", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("break-inside: avoid");
  });

  it("sends CLICKDECK_PRINT_IFRAME message to service worker after load", async () => {
    exportPdfSnapshot("a4", logger);
    await Promise.resolve();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CLICKDECK_PRINT_IFRAME", iframeId: expect.stringContaining("clickdeck-print-iframe") })
    );
  });
});
