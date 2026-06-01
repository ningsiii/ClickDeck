import type { ClickDeckLogger } from "../diagnostics/logger";
import { detectPresentationSlides } from "../content/presentation-mode";

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

async function captureViewport(): Promise<HTMLImageElement> {
  const response = await new Promise<{ dataUrl?: string; error?: string }>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__MOCK_CAPTURE_VISIBLE_TAB) {
      resolve({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" });
      return;
    }
    chrome.runtime.sendMessage({ type: "CLICKDECK_CAPTURE_VISIBLE_TAB" }, resolve);
  });

  if (response.error || !response.dataUrl) {
    throw new Error(response.error || "No dataUrl returned from captureVisibleTab");
  }

  return await loadImage(response.dataUrl);
}

// Long-page MVP: Limit max height to 14400 pixels to prevent PDF generation errors.
const LONG_PAGE_MAX_HEIGHT = 14400;

export async function exportImagePdfLongSnapshot(logger: ClickDeckLogger): Promise<void> {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await wait(100);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const totalHeight = document.documentElement.scrollHeight;

    if (totalHeight > LONG_PAGE_MAX_HEIGHT) {
      alert("当前网页总高度超过推荐阈值，图片版 PDF 可能无法被部分阅读器打开或导致内存溢出。建议改用 A4 分页模式导出。");
    }

    // @ts-ignore
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({
      orientation: viewportWidth > totalHeight ? "landscape" : "portrait",
      unit: "px",
      format: [viewportWidth, totalHeight],
      compress: true
    });

    let currentY = 0;

    while (currentY < totalHeight) {
      window.scrollTo(0, currentY);
      await wait(300);

      const img = await captureViewport();
      const actualY = window.scrollY;

      pdf.addImage(img, "PNG", 0, actualY, viewportWidth, viewportHeight);
      logger.info(`Appended screen fragment to PDF at Y=${actualY}`);

      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-image-long-${timestamp}.pdf`;
    pdf.save(filename);
    logger.info("Image PDF Long export successful");

  } catch (error) {
    logger.error("Image PDF Long export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

export async function exportImagePdfA4Snapshot(logger: ClickDeckLogger): Promise<void> {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await wait(100);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const totalHeight = document.documentElement.scrollHeight;
    const dpr = window.devicePixelRatio || 1;

    // A4 aspect ratio is 1 : 1.414
    const a4Height = viewportWidth * 1.414;

    // @ts-ignore
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [viewportWidth, a4Height],
      compress: true
    });

    // We will use a temporary canvas to assemble one A4 page at a time.
    let a4Canvas = document.createElement("canvas");
    a4Canvas.width = viewportWidth * dpr;
    a4Canvas.height = a4Height * dpr;
    let ctx = a4Canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2d context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);

    let currentY = 0;
    let currentA4Page = 0;
    let isFirstPage = true;

    while (currentY < totalHeight) {
      window.scrollTo(0, currentY);
      await wait(300);

      const img = await captureViewport();
      const actualY = window.scrollY;

      let fragTop = actualY;
      let fragBottom = actualY + viewportHeight;
      
      while (fragTop < fragBottom) {
        const pageTop = currentA4Page * a4Height;
        const pageBottom = pageTop + a4Height;

        if (fragTop >= pageBottom) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;
          const pageDataUrl = a4Canvas.toDataURL("image/jpeg", 0.9);
          pdf.addImage(pageDataUrl, "JPEG", 0, 0, viewportWidth, a4Height);
          logger.info(`Appended A4 page ${currentA4Page + 1} to PDF`);

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);
          currentA4Page++;
          continue; 
        }

        const yOffsetInCanvas = actualY - pageTop;
        ctx.drawImage(img, 0, yOffsetInCanvas * dpr, viewportWidth * dpr, viewportHeight * dpr);
        fragTop = Math.min(fragBottom, pageBottom);
      }

      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    if (!isFirstPage) {
      pdf.addPage();
    }
    const finalPageDataUrl = a4Canvas.toDataURL("image/jpeg", 0.9);
    pdf.addImage(finalPageDataUrl, "JPEG", 0, 0, viewportWidth, a4Height);
    logger.info(`Appended final A4 page ${currentA4Page + 1} to PDF`);

    a4Canvas.width = 0;
    a4Canvas.height = 0;
    a4Canvas = null as unknown as HTMLCanvasElement;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-image-a4-${timestamp}.pdf`;
    pdf.save(filename);
    logger.info("Image PDF A4 export successful");

  } catch (error) {
    logger.error("Image PDF A4 export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

export async function exportImagePdfSlidesSnapshot(logger: ClickDeckLogger): Promise<void> {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  try {
    const slides = detectPresentationSlides();
    if (slides.length === 0) {
      alert("No slides detected on this page.");
      return;
    }

    document.documentElement.classList.add("clickdeck-exporting");
    await wait(100);

    const dpr = window.devicePixelRatio || 1;
    // Standard 16:9 1080p slide resolution
    const pdfWidth = 1920;
    const pdfHeight = 1080;

    // @ts-ignore
    const jsPDF = window.jspdf.jsPDF;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [pdfWidth, pdfHeight],
      compress: true
    });

    let isFirstPage = true;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      slide.scrollIntoView({ block: "center" });
      await wait(300);

      const img = await captureViewport();
      const rect = slide.getBoundingClientRect();

      const canvas = document.createElement("canvas");
      const cropX = Math.max(0, rect.left);
      const cropY = Math.max(0, rect.top);
      const cropWidth = Math.min(window.innerWidth - cropX, rect.width);
      const cropHeight = Math.min(window.innerHeight - cropY, rect.height);

      if (cropWidth <= 0 || cropHeight <= 0) {
        logger.warn(`Slide ${i} is not visible, skipping.`);
        continue;
      }

      canvas.width = cropWidth * dpr;
      canvas.height = cropHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2d context");
      
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        cropX * dpr, cropY * dpr, cropWidth * dpr, cropHeight * dpr,
        0, 0, cropWidth * dpr, cropHeight * dpr
      );

      const slideDataUrl = canvas.toDataURL("image/jpeg", 0.9);

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      const scale = Math.min(pdfWidth / cropWidth, pdfHeight / cropHeight);
      const drawWidth = cropWidth * scale;
      const drawHeight = cropHeight * scale;
      const drawX = (pdfWidth - drawWidth) / 2;
      const drawY = (pdfHeight - drawHeight) / 2;

      pdf.addImage(slideDataUrl, "JPEG", drawX, drawY, drawWidth, drawHeight);
      logger.info(`Appended slide ${i + 1} to PDF`);

      canvas.width = 0;
      canvas.height = 0;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-image-slides-${timestamp}.pdf`;
    pdf.save(filename);
    logger.info("Image PDF Slides export successful");

  } catch (error) {
    logger.error("Image PDF Slides export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
