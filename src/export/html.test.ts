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

    document.documentElement.classList.add("clickdeck-presenting", "clickdeck-exporting");

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
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain('<!-- Exported by ClickDeck Snapshot');
    expect(html).not.toContain("data-clickdeck=\"true\"");
    expect(html).not.toContain("clickdeck-style");
    expect(html).not.toContain("clickdeck-presenting");
    expect(html).not.toContain("clickdeck-exporting");
    expect(html).not.toContain("clickdeck-panel");
    // data URL images are preserved.
    expect(html).toContain("data:image/svg+xml;base64,PHN2Zy8+");

    // Original DOM should remain unchanged.
    expect(document.querySelector("#clickdeck-style")).not.toBeNull();
    expect(document.querySelector("[data-clickdeck='true']")).not.toBeNull();
  });

  it("preserves edited text, inline styles, and replaced image sources in the HTML snapshot", () => {
    const heading = document.querySelector<HTMLHeadingElement>("h1")!;
    const image = document.querySelector<HTMLImageElement>("#dataImg")!;
    heading.textContent = "Edited headline";
    heading.style.fontSize = "48px";
    heading.style.color = "rgb(255, 0, 0)";
    image.src = "data:image/png;base64,ZmFrZS1pbWFnZQ==";

    exportHtmlSnapshot(logger);

    expect(blobArgs).not.toBeNull();
    const parts = (blobArgs?.[0] as unknown[]) ?? [];
    const html = parts.join("");
    expect(html).toContain("Edited headline");
    expect(html).toContain('style="font-size: 48px; color: rgb(255, 0, 0);"');
    expect(html).toContain("data:image/png;base64,ZmFrZS1pbWFnZQ==");
  });
});
