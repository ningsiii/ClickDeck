/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportImagePdfA4Snapshot, exportImagePdfLongSnapshot } from "./image-pdf";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("image PDF export", () => {
  let logger: ClickDeckLogger;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as ClickDeckLogger;

    window.__MOCK_CAPTURE_VISIBLE_TAB = true;
    window.alert = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:clickdeck-pdf");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      value: vi.fn((_x: number, y: number) => {
        Object.defineProperty(window, "scrollY", { value: y, writable: true, configurable: true });
      }),
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window, "innerWidth", { value: 1000, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 707, writable: true, configurable: true });
    Object.defineProperty(window, "scrollX", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "scrollY", { value: 0, writable: true, configurable: true });
    Object.defineProperty(window, "devicePixelRatio", { value: 1, writable: true, configurable: true });

    global.Image = class {
      onload: () => void = () => {};
      onerror: (error: unknown) => void = () => {};
      set src(_value: string) {
        setTimeout(() => this.onload(), 0);
      }
    } as unknown as typeof Image;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })) as any;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/jpeg;base64,/9j/");
    document.documentElement.classList.remove("clickdeck-exporting");
  });

  it("does not append a blank A4 page when content ends on a page boundary", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 1414, writable: true, configurable: true });

    await exportImagePdfA4Snapshot(logger);

    expect(logger.info).toHaveBeenCalledWith("Appended A4 page 1 to PDF");
    expect(logger.info).not.toHaveBeenCalledWith("Appended A4 page 2 to PDF");
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("adds a second A4 page only when content spills past the first page", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 2000, writable: true, configurable: true });

    await exportImagePdfA4Snapshot(logger);

    expect(logger.info).toHaveBeenCalledWith("Appended A4 page 1 to PDF");
    expect(logger.info).toHaveBeenCalledWith("Appended A4 page 2 to PDF");
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("shows a readable warning for oversized long-page PDFs", async () => {
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 14401, writable: true, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 20000, writable: true, configurable: true });

    await exportImagePdfLongSnapshot(logger);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("图片 PDF"));
    expect(window.alert).toHaveBeenCalledWith(expect.not.stringContaining("data URL"));
  });
});
