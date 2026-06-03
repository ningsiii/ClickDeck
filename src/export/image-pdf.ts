import type { ClickDeckLogger } from "../diagnostics/logger";
import { detectPresentationSlides } from "../content/presentation-mode";
import { detectScrollTarget, throttledCaptureViewport, wait } from "./utils";
import { downloadPdfBlob, imageElementToJpegDataUrl, SimpleImagePdf } from "./simple-image-pdf";

declare global {
  interface Window {
    __MOCK_CAPTURE_VISIBLE_TAB?: boolean;
  }
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

    const pdf = new SimpleImagePdf();
    const pageIndex = pdf.addPage(viewportWidth, totalHeight);

    let currentY = 0;

    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await wait(300);

      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();

      const jpeg = imageElementToJpegDataUrl(img);
      pdf.addJpegImage(pageIndex, jpeg.dataUrl, {
        pixelWidth: jpeg.pixelWidth,
        pixelHeight: jpeg.pixelHeight,
        x: 0,
        y: actualY,
        width: viewportWidth,
        height: viewportHeight
      });
      logger.info(`Appended screen fragment to PDF at Y=${actualY}`);

      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-long-${timestamp}.pdf`);
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

    const pdf = new SimpleImagePdf();

    const a4Canvas = document.createElement("canvas");
    a4Canvas.width = viewportWidth * dpr;
    a4Canvas.height = a4Height * dpr;

    const ctx = a4Canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }

    let currentY = 0;
    let currentA4Page = 0;
    let pageHasContent = false;

    const clearPageCanvas = (): void => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);
    };

    const appendCurrentPage = (): void => {
      if (!pageHasContent) {
        return;
      }
      const pageDataUrl = a4Canvas.toDataURL("image/jpeg", 0.9);
      const pageIndex = pdf.addPage(viewportWidth, a4Height);
      pdf.addJpegImage(pageIndex, pageDataUrl, {
        pixelWidth: a4Canvas.width,
        pixelHeight: a4Canvas.height,
        x: 0,
        y: 0,
        width: viewportWidth,
        height: a4Height
      });
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
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-a4-${timestamp}.pdf`);
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
  const originalScale = document.documentElement.style.getPropertyValue("--clickdeck-present-scale");
  let slideStates: Array<{ slide: HTMLElement; className: string; style: string | null }> = [];
  let transformedAncestorStates: Array<{ element: HTMLElement; style: string | null }> = [];

  try {
    const slides = detectPresentationSlides();
    if (slides.length === 0) {
      alert("No slides detected on this page.");
      return;
    }

    slideStates = slides.map((slide) => ({
      slide,
      className: slide.className,
      style: slide.getAttribute("style")
    }));
    const slideSizes = slides.map((slide) => {
      const rect = slide.getBoundingClientRect();
      return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight
      };
    });
    transformedAncestorStates = collectTransformedAncestors(slides);

    document.documentElement.classList.add("clickdeck-exporting", "clickdeck-presenting");
    neutralizeTransformedAncestors(transformedAncestorStates);
    window.scrollTo(0, 0);
    await wait(100);

    const dpr = window.devicePixelRatio || 1;
    const pdfWidth = 1920;
    const pdfHeight = 1080;

    const pdf = new SimpleImagePdf();

    let isFirstPage = true;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideSize = slideSizes[i];
      const scale = Math.min(window.innerWidth / slideSize.width, window.innerHeight / slideSize.height, 1);
      document.documentElement.style.setProperty("--clickdeck-present-scale", String(scale));

      for (const candidate of slides) {
        candidate.classList.toggle("clickdeck-presenting-slide", candidate === slide);
        candidate.classList.toggle("clickdeck-presentation-hidden-slide", candidate !== slide);
      }

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

      isFirstPage = false;

      const drawScale = Math.min(pdfWidth / cropWidth, pdfHeight / cropHeight);
      const drawWidth = cropWidth * drawScale;
      const drawHeight = cropHeight * drawScale;
      const drawX = (pdfWidth - drawWidth) / 2;
      const drawY = (pdfHeight - drawHeight) / 2;

      const pageIndex = pdf.addPage(pdfWidth, pdfHeight);
      pdf.addJpegImage(pageIndex, slideDataUrl, {
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
      logger.info(`Appended slide ${i + 1} to PDF`);

      canvas.width = 0;
      canvas.height = 0;
    }

    if (isFirstPage) {
      alert("No visible slide content was captured.");
      logger.warn("Image PDF Slides export captured no visible slides.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-slides-${timestamp}.pdf`);
    logger.info("Image PDF Slides export successful");
  } catch (error) {
    logger.error("Image PDF Slides export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting", "clickdeck-presenting");
    if (originalScale) {
      document.documentElement.style.setProperty("--clickdeck-present-scale", originalScale);
    } else {
      document.documentElement.style.removeProperty("--clickdeck-present-scale");
    }
    restoreSlideStates(slideStates);
    restoreTransformedAncestors(transformedAncestorStates);
    window.scrollTo(originalScrollX, originalScrollY);
  }
}

function collectTransformedAncestors(slides: HTMLElement[]): Array<{ element: HTMLElement; style: string | null }> {
  const states = new Map<HTMLElement, string | null>();

  for (const slide of slides) {
    let current = slide.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
      const computed = window.getComputedStyle(current);
      const createsFixedContainingBlock =
        computed.transform !== "none" ||
        computed.perspective !== "none" ||
        computed.filter !== "none";

      if (createsFixedContainingBlock && !states.has(current)) {
        states.set(current, current.getAttribute("style"));
      }

      current = current.parentElement;
    }
  }

  return Array.from(states.entries()).map(([element, style]) => ({ element, style }));
}

function neutralizeTransformedAncestors(states: Array<{ element: HTMLElement; style: string | null }>): void {
  for (const { element } of states) {
    element.style.transform = "none";
    element.style.perspective = "none";
    element.style.filter = "none";
  }
}

function restoreTransformedAncestors(states: Array<{ element: HTMLElement; style: string | null }>): void {
  for (const { element, style } of states) {
    if (style === null) {
      element.removeAttribute("style");
    } else {
      element.setAttribute("style", style);
    }
  }
}

function restoreSlideStates(states: Array<{ slide: HTMLElement; className: string; style: string | null }>): void {
  for (const { slide, className, style } of states) {
    slide.className = className;
    if (style === null) {
      slide.removeAttribute("style");
    } else {
      slide.setAttribute("style", style);
    }
  }
}
