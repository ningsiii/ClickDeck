import type { ClickDeckLogger } from "../diagnostics/logger";
import { detectScrollTarget, throttledCaptureViewport, waitForExportReadiness } from "./utils";

const MAX_CANVAS_PIXELS = 80_000_000;

function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.dataset.clickdeck = "true";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode long image canvas"));
        return;
      }
      resolve(blob);
    }, type);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  if (!URL.createObjectURL) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        downloadDataUrl(reader.result, filename);
      }
    };
    reader.readAsDataURL(blob);
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.dataset.clickdeck = "true";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function exportLongImageSnapshot(logger: ClickDeckLogger): Promise<void> {
  logger.info("Long image export started");
  const scrollTarget = detectScrollTarget();
  logger.info("Scroll target detected");

  try {
    // 1. Hide UI
    document.documentElement.classList.add("clickdeck-exporting");
    
    await waitForExportReadiness(100);

    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();
    const dpr = window.devicePixelRatio || 1;
    
    if (viewportWidth * dpr * totalHeight * dpr > MAX_CANVAS_PIXELS) {
      logger.warn("Long image canvas exceeds MAX_CANVAS_PIXELS, aborting export");
      alert("当前页面过长，长图导出可能导致浏览器卡死。请改用图片 PDF A4，或缩小浏览器缩放比例后重试。");
      return;
    }
    
    const screenshots: { img: HTMLImageElement, y: number }[] = [];
    
    let currentY = 0;
    
    // 2. Loop to capture
    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      
      await waitForExportReadiness(300);
      
      // Request screenshot from background using throttled utility
      const img = await throttledCaptureViewport(logger);
      
      const actualY = scrollTarget.getScrollTop();
      
      screenshots.push({ img, y: actualY });
      logger.info(`Captured fragment at Y=${actualY}`);
      
      // Advance by one viewport height
      currentY += viewportHeight;
      
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }
    
    logger.info("Stitching started");
    
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
    
    logger.info("Encoding long image");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-long-image-${timestamp}.png`;
    const blob = await canvasToBlob(canvas, "image/png");
    logger.info("Download triggered");
    downloadBlob(blob, filename);
    
    logger.info("Long image export successful");
  } catch (error) {
    logger.error("Long image export failed", { error: error instanceof Error ? error.message : String(error) });
    alert(`长图导出失败：${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 5. Restore
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
  }
}
