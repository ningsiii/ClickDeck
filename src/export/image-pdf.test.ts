/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportImagePdfA4Snapshot, exportImagePdfLongSnapshot, exportImagePdfSlidesSnapshot } from "./image-pdf";
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
    document.documentElement.classList.remove("clickdeck-exporting", "clickdeck-presenting");
    delete window.__playSlide;
    delete window.__clickdeckSyncPresentationState;
    delete window.Reveal;
    delete window.impress;
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

  it("captures the edited DOM state before adding long-page PDF screenshots", async () => {
    window.__MOCK_CAPTURE_VISIBLE_TAB = false;
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 707, writable: true, configurable: true });
    document.body.innerHTML = `
      <h1 id="headline" style="font-size: 72px;">Edited PDF state</h1>
      <img id="hero" src="data:image/png;base64,ZmFrZS1wZGYtaW1hZ2U=" />
    `;
    const hero = document.querySelector<HTMLImageElement>("#hero")!;
    Object.defineProperty(hero, "complete", { value: true, configurable: true });

    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg, callback) => {
          if (msg.type === "CLICKDECK_CAPTURE_VISIBLE_TAB") {
            const headline = document.querySelector<HTMLElement>("#headline")!;
            const image = document.querySelector<HTMLImageElement>("#hero")!;
            expect(window.getComputedStyle(headline).fontSize).toBe("72px");
            expect(image.src).toContain("data:image/png;base64,ZmFrZS1wZGYtaW1hZ2U=");
            callback({ dataUrl: "data:image/png;base64,mocked" });
          }
        })
      }
    };

    await exportImagePdfLongSnapshot(logger);

    expect((global as any).chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "CLICKDECK_CAPTURE_VISIBLE_TAB" },
      expect.any(Function)
    );
  });

  it("uses the shared presentation host sync when exporting 16:9 slide PDFs", async () => {
    document.body.innerHTML = `
      <section class="slide" id="s1"><div class="slide-content">One</div></section>
      <section class="slide" id="s2"><div class="slide-content">Two</div></section>
    `;
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    slides.forEach((slide) => {
      slide.getBoundingClientRect = () => ({
        width: 1000,
        height: 707,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 707
      } as DOMRect);
      const content = slide.querySelector<HTMLElement>(".slide-content")!;
      content.getBoundingClientRect = () => ({
        width: 1000,
        height: 707,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 707
      } as DOMRect);
    });
    window.__playSlide = vi.fn();
    window.__clickdeckSyncPresentationState = vi.fn();

    await exportImagePdfSlidesSnapshot(logger);

    expect(window.__playSlide).toHaveBeenCalledWith(0);
    expect(window.__playSlide).toHaveBeenCalledWith(1);
    expect(window.__clickdeckSyncPresentationState).toHaveBeenNthCalledWith(1, expect.objectContaining({
      index: 0,
      total: 2,
      slide: slides[0],
      direction: "initial"
    }));
    expect(window.__clickdeckSyncPresentationState).toHaveBeenNthCalledWith(2, expect.objectContaining({
      index: 1,
      total: 2,
      slide: slides[1],
      direction: "next"
    }));
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

});
