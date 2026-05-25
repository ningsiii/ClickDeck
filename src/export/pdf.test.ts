/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exportPdfSnapshot } from "./pdf";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("exportPdfSnapshot", () => {
  let logger: ClickDeckLogger;

  let appendChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    vi.useFakeTimers();
    // We suppress console error because JSDOM throws "Not implemented" when evaluating window.print()
    vi.spyOn(console, "error").mockImplementation(() => {});
    appendChildSpy = vi.spyOn(document.body, "appendChild");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("injects a4 style and prints", () => {
    exportPdfSnapshot("a4", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain("size: A4");
    expect(styleEl.textContent).toContain("margin: 16mm");

    const scriptAppended = appendChildSpy.mock.calls.some(call => 
      call[0] instanceof HTMLScriptElement && call[0].textContent === "window.print();"
    );
    expect(scriptAppended).toBe(true);
  });

  it("injects slides style and prints", () => {
    exportPdfSnapshot("slides", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toContain("size: 16in 9in");
    expect(styleEl.textContent).toContain("page-break-after: always");

    const scriptAppended = appendChildSpy.mock.calls.some(call => 
      call[0] instanceof HTMLScriptElement && call[0].textContent === "window.print();"
    );
    expect(scriptAppended).toBe(true);
  });

  it("injects empty style for long-page and prints", () => {
    exportPdfSnapshot("long-page", logger);

    const styleEl = document.getElementById("clickdeck-pdf-style") as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(styleEl.textContent).toBe("");

    const scriptAppended = appendChildSpy.mock.calls.some(call => 
      call[0] instanceof HTMLScriptElement && call[0].textContent === "window.print();"
    );
    expect(scriptAppended).toBe(true);
  });
});
