/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exportPdfSnapshot } from "./pdf";
import type { ClickDeckLogger } from "../diagnostics/logger";

// Mock chrome.runtime.sendMessage (not available in jsdom)
const sendMessageMock = vi.fn();
vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: sendMessageMock,
  },
});

describe("exportPdfSnapshot", () => {
  let logger: ClickDeckLogger;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    vi.useFakeTimers();
    sendMessageMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects a4 style and sends CLICKDECK_PRINT message", () => {
    exportPdfSnapshot("a4", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain("size: A4");
    expect(styleEl.textContent).toContain("margin: 16mm");
    expect(styleEl.textContent).toContain("break-inside: avoid");

    // Flush requestAnimationFrame
    vi.runAllTicks();
    vi.runAllTimers();

    expect(sendMessageMock).toHaveBeenCalledWith({ type: "CLICKDECK_PRINT" });
  });

  it("injects slides style and sends CLICKDECK_PRINT message", () => {
    exportPdfSnapshot("slides", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    const css = styleEl.textContent || "";
    expect(css).toContain("size: 16in 9in");
    expect(css).toContain(".slide");
    expect(css).toContain("width: 16in !important");
    expect(css).toContain("height: 9in !important");
    expect(css).toContain(".deck");
    expect(css).toContain("overflow: visible !important");
    expect(css).toContain(".nav-dots");
    expect(css).toContain("display: none !important");
    expect(css).toContain("break-inside: avoid");

    vi.runAllTicks();
    vi.runAllTimers();

    expect(sendMessageMock).toHaveBeenCalledWith({ type: "CLICKDECK_PRINT" });
  });

  it("injects empty style for long-page and sends CLICKDECK_PRINT message", () => {
    exportPdfSnapshot("long-page", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain("break-inside: avoid");

    vi.runAllTicks();
    vi.runAllTimers();

    expect(sendMessageMock).toHaveBeenCalledWith({ type: "CLICKDECK_PRINT" });
  });
});
