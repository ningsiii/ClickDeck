/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exportHtmlSnapshot } from "./html";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("exportHtmlSnapshot", () => {
  let logger: ClickDeckLogger;
  let blobArgs: unknown[] | null = null;
  let originalBlob: typeof Blob | null = null;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    // Set up mock document
    document.documentElement.innerHTML = `
      <head>
        <title>Test Page</title>
        <style id="clickdeck-style">/* UI styles */</style>
      </head>
      <body>
        <h1 style="font-size: 24px;">Hello</h1>
        <img id="dataImg" src="data:image/svg+xml;base64,PHN2Zy8+" />
        <div data-clickdeck="true" class="clickdeck-panel">Panel</div>
        <div data-clickdeck="true" class="clickdeck-outline">Outline</div>
      </body>
    `;

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    // Capture Blob contents by wrapping the constructor.
    blobArgs = null;
    originalBlob = global.Blob;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Blob = function (...args: unknown[]) {
      blobArgs = args;
      // @ts-expect-error - constructing native Blob.
      return new originalBlob!(...args);
    };

    // Mock click
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    if (originalBlob) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).Blob = originalBlob;
    }
    vi.restoreAllMocks();
  });

  it("exports HTML snapshot without ClickDeck UI and injects <base>", () => {
    exportHtmlSnapshot(logger);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    expect(blobArgs).not.toBeNull();
    const parts = (blobArgs?.[0] as unknown[]) ?? [];
    const html = parts.join("");
    expect(html).toContain("<base");
    expect(html).not.toContain("data-clickdeck=\"true\"");
    expect(html).not.toContain("clickdeck-style");
    // data URL images are preserved.
    expect(html).toContain("data:image/svg+xml;base64,PHN2Zy8+");

    // Original DOM should remain unchanged.
    expect(document.querySelector("#clickdeck-style")).not.toBeNull();
    expect(document.querySelector("[data-clickdeck='true']")).not.toBeNull();
  });
});
