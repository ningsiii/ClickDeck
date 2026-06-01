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

    // Mock download link
    HTMLAnchorElement.prototype.click = vi.fn();
    
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
    expect(document.documentElement.classList.contains("clickdeck-exporting")).toBe(false);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 100);
  });
});
