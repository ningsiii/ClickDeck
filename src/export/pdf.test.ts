/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildPrintHtml, exportPdfSnapshot } from "./pdf";
import type { ClickDeckLogger } from "../diagnostics/logger";

// ---------------------------------------------------------------------------
// buildPrintHtml — unit tests (pure function, no mocks needed)
// ---------------------------------------------------------------------------
describe("buildPrintHtml", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("a4 mode: contains A4 page size and base print CSS", () => {
    const html = buildPrintHtml("a4", document);
    expect(html).toContain("size: A4");
    expect(html).toContain("margin: 16mm");
    expect(html).toContain("break-inside: avoid");
    expect(html).not.toContain("size: 16in 9in");
  });

  it("slides mode: contains 16:9 @page, .slide constraints, .deck overflow reset, and .nav-dots hide", () => {
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

  it("long-page mode: does NOT include 16:9 slide CSS, but still has base print CSS", () => {
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain("size: 16in 9in");
    expect(html).not.toContain("width: 16in !important");
    expect(html).toContain("break-inside: avoid");
  });

  it("includes auto-print script", () => {
    const html = buildPrintHtml("a4", document);
    expect(html).toContain("window.print()");
    expect(html).toContain("afterprint");
  });

  it("removes ClickDeck UI elements from the output", () => {
    document.body.innerHTML = '<div data-clickdeck="true" id="ui">UI</div><p id="content">Content</p>';
    const html = buildPrintHtml("long-page", document);
    expect(html).not.toContain('data-clickdeck="true"');
    expect(html).toContain("Content");
  });
});

// ---------------------------------------------------------------------------
// exportPdfSnapshot — integration smoke tests
// ---------------------------------------------------------------------------
describe("exportPdfSnapshot", () => {
  let logger: ClickDeckLogger;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    vi.useFakeTimers();
    // Mock window.open so no real popup is created
    openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    // Mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue("blob:fake-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("opens a new window for a4 mode", () => {
    exportPdfSnapshot("a4", logger);
    expect(openSpy).toHaveBeenCalledWith("blob:fake-url", "_blank");
  });

  it("opens a new window for slides mode", () => {
    exportPdfSnapshot("slides", logger);
    expect(openSpy).toHaveBeenCalledWith("blob:fake-url", "_blank");
  });

  it("opens a new window for long-page mode", () => {
    exportPdfSnapshot("long-page", logger);
    expect(openSpy).toHaveBeenCalledWith("blob:fake-url", "_blank");
  });

  it("logs a warning when popup is blocked", () => {
    openSpy.mockReturnValue(null);
    exportPdfSnapshot("a4", logger);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("blocked"));
  });

  it("revokes the blob URL after 30 seconds", () => {
    exportPdfSnapshot("a4", logger);
    vi.advanceTimersByTime(30_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});
