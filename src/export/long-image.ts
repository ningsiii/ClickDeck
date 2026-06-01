import type { ClickDeckLogger } from "../diagnostics/logger";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function exportLongImageSnapshot(logger: ClickDeckLogger): Promise<void> {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  try {
    // 1. Hide UI
    document.documentElement.classList.add("clickdeck-exporting");
    
    // We intentionally let fixed elements repeat as per MVP restrictions, 
    // but we might need a short delay to let hiding take effect.
    await wait(100);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const totalHeight = document.documentElement.scrollHeight;
    const dpr = window.devicePixelRatio || 1;
    
    const screenshots: { img: HTMLImageElement, y: number }[] = [];
    
    let currentY = 0;
    
    // 2. Loop to capture
    while (currentY < totalHeight) {
      window.scrollTo(0, currentY);
      
      // Wait for rendering and any lazy loads or scroll events
      await wait(300);
      
      // Request screenshot from background
      const response = await new Promise<{ dataUrl?: string, error?: string }>((resolve) => {
        if ((window as any).__MOCK_CAPTURE_VISIBLE_TAB) {
          resolve({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" });
          return;
        }
        chrome.runtime.sendMessage({ type: "CLICKDECK_CAPTURE_VISIBLE_TAB" }, resolve);
      });
      
      if (response.error || !response.dataUrl) {
        throw new Error(response.error || "No dataUrl returned from captureVisibleTab");
      }
      
      const img = await loadImage(response.dataUrl);
      
      // In case scroll went beyond bounds, browser clamps it. 
      // We should use actual window.scrollY to place it on the canvas correctly.
      const actualY = window.scrollY;
      
      screenshots.push({ img, y: actualY });
      logger.info(`Captured screen at Y=${actualY}`);
      
      // Advance by one viewport height
      currentY += viewportHeight;
      
      // If actualY + viewportHeight >= totalHeight, we reached the bottom
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }
    
    logger.info(`Stitching ${screenshots.length} screenshots`);
    
    // 3. Stitch images
    const canvas = document.createElement("canvas");
    canvas.width = viewportWidth * dpr;
    canvas.height = totalHeight * dpr;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to get 2d context for stitching canvas");
    }
    
    for (const { img, y } of screenshots) {
      // The screenshot is already sized according to dpr
      // It captures the viewport width x height physical pixels.
      ctx.drawImage(img, 0, y * dpr, viewportWidth * dpr, viewportHeight * dpr);
    }
    
    const finalDataUrl = canvas.toDataURL("image/png");
    
    // 4. Download
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-long-image-${timestamp}.png`;
    downloadDataUrl(finalDataUrl, filename);
    
    logger.info("Long image export successful");
  } catch (error) {
    logger.error("Long image export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    // 5. Restore
    document.documentElement.classList.remove("clickdeck-exporting");
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
