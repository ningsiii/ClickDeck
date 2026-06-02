/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportLongImageSnapshot } from "./long-image";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("exportLongImageSnapshot", () => {
  let mockLogger: ClickDeckLogger;
  let sentMessages: any[] = [];
  
  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    sentMessages = [];
    
    // Mock chrome API
    (global as any).chrome = {
      runtime: {
        sendMessage: vi.fn((msg, callback) => {
          sentMessages.push(msg);
          if (msg.type === "CLICKDECK_CAPTURE_VISIBLE_TAB") {
            // Return a 1x1 transparent png data url
            callback({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" });
          }
        }),
      }
    };
    
    // Mock window sizes and positions
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true });
    
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, writable: true });
    
    window.scrollTo = vi.fn((_x: any, y: any) => {
      window.scrollY = y as number;
    }) as any;

    // Mock HTMLImageElement
    global.Image = class {
      onload: () => void = () => {};
      onerror: (e: any) => void = () => {};
      private _src = "";
      set src(value: string) {
        this._src = value;
        setTimeout(() => this.onload(), 0);
      }
      get src() {
        return this._src;
      }
    } as any;

    // Mock Canvas
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    }) as any);
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,mocked");
    HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
      callback(new Blob(["mocked"], { type: "image/png" }));
    });

    // Mock download link
    HTMLAnchorElement.prototype.click = vi.fn();
    URL.createObjectURL = vi.fn(() => "blob:mocked");
    URL.revokeObjectURL = vi.fn();
    window.alert = vi.fn();
    
    document.documentElement.classList.remove("clickdeck-exporting");
  });

  it("adds and removes clickdeck-exporting class", async () => {
    // Make it short so it finishes fast
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 800, writable: true });
    
    const promise = exportLongImageSnapshot(mockLogger);
    
    // Wait a tick for the wait(100) to start
    await new Promise(r => setTimeout(r, 0));
    expect(document.documentElement.classList.contains("clickdeck-exporting")).toBe(true);
    
    await promise;
    expect(document.documentElement.classList.contains("clickdeck-exporting")).toBe(false);
  });

  it("scrolls multiple times for long pages", async () => {
    // 2000 height, 800 viewport -> 3 screenshots (0, 800, 1200)
    await exportLongImageSnapshot(mockLogger);
    
    // Should have sent 3 capture requests
    expect(sentMessages.length).toBe(3);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 800);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 1600);
    
    // Should restore original scroll
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 100);
  });

  it("handles errors gracefully and restores scroll", async () => {
    (global as any).chrome.runtime.sendMessage = vi.fn((_msg, callback) => {
      callback({ error: "Simulated capture failure" });
    });
    
    await exportLongImageSnapshot(mockLogger);
    
    expect(mockLogger.error).toHaveBeenCalledWith("Long image export failed", expect.any(Object));
    expect(window.alert).toHaveBeenCalledWith("长图导出失败：Simulated capture failure");
    expect(document.documentElement.classList.contains("clickdeck-exporting")).toBe(false);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 100);
  });

  it("downloads the stitched image as a blob URL instead of a large data URL", async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 800, writable: true });

    await exportLongImageSnapshot(mockLogger);

    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("stops when canvas exceeds MAX_CANVAS_PIXELS", async () => {
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, writable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 20000, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 2000, writable: true });
    // 2000 * 3 * 20000 * 3 = 360,000,000 > 80_000_000

    await exportLongImageSnapshot(mockLogger);

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("过长"));
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("MAX_CANVAS_PIXELS"));
    expect(sentMessages.length).toBe(0); // Should not start capturing
  });

  it("handles MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota error and retries", async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 800, writable: true });
    
    let attempts = 0;
    (global as any).chrome.runtime.sendMessage = vi.fn((_msg, callback) => {
      attempts++;
      if (attempts === 1) {
        callback({ error: "This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota." });
      } else {
        callback({ dataUrl: "data:image/png;base64,mocked" });
      }
    });
    
    await exportLongImageSnapshot(mockLogger);
    
    expect(attempts).toBe(2);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("quota error"));
    expect(document.documentElement.classList.contains("clickdeck-exporting")).toBe(false);
  });
});
