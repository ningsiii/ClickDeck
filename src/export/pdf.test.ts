/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildPrintHtml, exportPdfSnapshot } from "./pdf";
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
    expect(html).not.toContain("size: 16in 9in");
  });

  it("slides mode: contains 16:9 @page, .slide constraints, .deck overflow reset, .nav-dots hide", () => {
    const html = buildPrintHtml("slides", document);
    expect(html).toContain("size: 16in 9in");
    expect(html).toContain("width: 16in !important");
    expect(html).toContain("height: 9in !important");
    expect(html).toContain(".deck");
    expect(html).toContain("overflow: visible !important");
    expect(html).toContain(".nav-dots");
    expect(html).toContain("display: none !important");
    expect(html).toContain("break-inside: avoid");
  });

  it("long-page mode: no 16:9 CSS, base print CSS still present", () => {
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain("size: 16in 9in");
    expect(html).not.toContain("width: 16in !important");
    expect(html).toContain("break-inside: avoid");
  });

  it("removes ClickDeck UI elements from output", () => {
    document.body.innerHTML = '<div data-clickdeck="true">UI</div><p id="content">Content</p>';
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain('data-clickdeck="true"');
    expect(html).toContain("Content");
  });
});

// ---------------------------------------------------------------------------
// exportPdfSnapshot — smoke tests with iframe mock
// ---------------------------------------------------------------------------
describe("exportPdfSnapshot", () => {
  let logger: ClickDeckLogger;

  // Minimal iframe stub — now using srcdoc instead of document.write
  let capturedSrcdoc = "";
  const mockContentWindow = {
    print: vi.fn(),
    addEventListener: vi.fn(),
  };

  beforeEach(() => {
    logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    vi.useFakeTimers();
    capturedSrcdoc = "";
    mockContentWindow.print.mockClear();
    mockContentWindow.addEventListener.mockClear();

    // Stub createElement to intercept iframe creation
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "iframe") {
        const el = origCreate("div") as unknown as Record<string, unknown>;
        // Capture srcdoc assignment via property descriptor
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

  it("writes HTML into iframe srcdoc for a4 mode", async () => {
    exportPdfSnapshot("a4", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("size: A4");
  });

  it("writes HTML into iframe srcdoc for slides mode", async () => {
    exportPdfSnapshot("slides", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("16in 9in");
  });

  it("writes HTML into iframe srcdoc for long-page mode", async () => {
    exportPdfSnapshot("long-page", logger);
    await Promise.resolve();
    expect(capturedSrcdoc).toContain("break-inside: avoid");
  });

  it("calls contentWindow.print() after load", async () => {
    exportPdfSnapshot("a4", logger);
    await Promise.resolve();
    expect(mockContentWindow.print).toHaveBeenCalled();
  });
});
