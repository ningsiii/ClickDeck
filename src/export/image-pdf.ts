import type { ClickDeckLogger } from "../diagnostics/logger";
import { detectPresentationSlides } from "../content/presentation-mode";
import { detectScrollTarget, throttledCaptureViewport, wait } from "./utils";

type JsPdfConstructor = new (options: {
  orientation: "portrait" | "landscape";
  unit: "px";
  format: [number, number];
  compress: boolean;
}) => {
  addImage: (...args: unknown[]) => void;
  addPage: () => void;
  save: (filename: string) => void;
};

declare global {
  interface Window {
    jspdf?: {
      jsPDF: JsPdfConstructor;
    };
    __MOCK_CAPTURE_VISIBLE_TAB?: boolean;
  }
}

function getJsPDF(): JsPdfConstructor {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    throw new Error("jsPDF runtime is not loaded");
  }
  return jsPDF;
}

// Long-page MVP: limit max height to reduce PDF reader and memory failures.
const LONG_PAGE_MAX_HEIGHT = 14400;

export async function exportImagePdfLongSnapshot(logger: ClickDeckLogger): Promise<void> {
  const scrollTarget = detectScrollTarget();

  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await wait(100);

    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();

    if (totalHeight > LONG_PAGE_MAX_HEIGHT) {
      alert("当前网页总高度超过推荐阈值，图片 PDF 可能无法被部分阅读器打开或导致内存溢出。建议改用 A4 分页模式导出。");
    }

    const jsPDF = getJsPDF();
    const pdf = new jsPDF({
      orientation: viewportWidth > totalHeight ? "landscape" : "portrait",
      unit: "px",
      format: [viewportWidth, totalHeight],
      compress: true
    });

    let currentY = 0;

    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await wait(300);

      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();

      pdf.addImage(img, "PNG", 0, actualY, viewportWidth, viewportHeight);
      logger.info(`Appended screen fragment to PDF at Y=${actualY}`);

      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    pdf.save(`clickdeck-image-long-${timestamp}.pdf`);
    logger.info("Image PDF Long export successful");
  } catch (error) {
    logger.error("Image PDF Long export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
  }
}

export async function exportImagePdfA4Snapshot(logger: ClickDeckLogger): Promise<void> {
  const scrollTarget = detectScrollTarget();

  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await wait(100);

    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();
    const dpr = window.devicePixelRatio || 1;
    const a4Height = viewportWidth * 1.414;

    const jsPDF = getJsPDF();
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [viewportWidth, a4Height],
      compress: true
    });

    const a4Canvas = document.createElement("canvas");
    a4Canvas.width = viewportWidth * dpr;
    a4Canvas.height = a4Height * dpr;

    const ctx = a4Canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }

    let currentY = 0;
    let currentA4Page = 0;
    let isFirstPage = true;
    let pageHasContent = false;

    const clearPageCanvas = (): void => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);
    };

    const appendCurrentPage = (): void => {
      if (!pageHasContent) {
        return;
      }
      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;
      const pageDataUrl = a4Canvas.toDataURL("image/jpeg", 0.9);
      pdf.addImage(pageDataUrl, "JPEG", 0, 0, viewportWidth, a4Height);
      logger.info(`Appended A4 page ${currentA4Page + 1} to PDF`);

      currentA4Page++;
      pageHasContent = false;
      clearPageCanvas();
    };

    clearPageCanvas();

    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await wait(300);

      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();
      const fragmentBottom = actualY + viewportHeight;
      let fragmentCursor = actualY;

      while (fragmentCursor < fragmentBottom) {
        const pageTop = currentA4Page * a4Height;
        const pageBottom = pageTop + a4Height;

        if (fragmentCursor >= pageBottom) {
          appendCurrentPage();
          continue;
        }

        const yOffsetInCanvas = actualY - pageTop;
        ctx.drawImage(img, 0, yOffsetInCanvas * dpr, viewportWidth * dpr, viewportHeight * dpr);
        pageHasContent = true;
        fragmentCursor = Math.min(fragmentBottom, pageBottom);
      }

      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    appendCurrentPage();
    a4Canvas.width = 0;
    a4Canvas.height = 0;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    pdf.save(`clickdeck-image-a4-${timestamp}.pdf`);
    logger.info("Image PDF A4 export successful");
  } catch (error) {
    logger.error("Image PDF A4 export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
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
    const pdfWidth = 1920;
    const pdfHeight = 1080;

    const jsPDF = getJsPDF();
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

      const img = await throttledCaptureViewport(logger);
      
      const cropTarget = slide.querySelector<HTMLElement>("[data-slide-content], .sheet, .slide-content, .page, .card") || slide;
      const rect = cropTarget.getBoundingClientRect();
      const cropX = Math.max(0, rect.left);
      const cropY = Math.max(0, rect.top);
      const cropWidth = Math.min(window.innerWidth - cropX, rect.width);
      const cropHeight = Math.min(window.innerHeight - cropY, rect.height);

      if (cropWidth <= 0 || cropHeight <= 0) {
        logger.warn(`Slide ${i + 1} content is not visible, skipping.`);
        continue;
      }

      const canvas = document.createElement("canvas");
      canvas.width = cropWidth * dpr;
      canvas.height = cropHeight * dpr;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2d context");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        cropX * dpr,
        cropY * dpr,
        cropWidth * dpr,
        cropHeight * dpr,
        0,
        0,
        cropWidth * dpr,
        cropHeight * dpr
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
    pdf.save(`clickdeck-image-slides-${timestamp}.pdf`);
    logger.info("Image PDF Slides export successful");
  } catch (error) {
    logger.error("Image PDF Slides export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
