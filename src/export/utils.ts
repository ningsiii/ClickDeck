import type { ClickDeckLogger } from "../diagnostics/logger";

export type ScrollTarget = {
  element: Window | HTMLElement;
  getScrollTop: () => number;
  setScrollTop: (value: number) => void;
  getScrollHeight: () => number;
  getClientHeight: () => number;
  getClientWidth: () => number;
  restore: () => void;
};

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForVisualStability(baseWaitMs = 300): Promise<void> {
  await wait(baseWaitMs);
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font loading errors
    }
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

export async function waitForExportReadiness(baseWaitMs = 300): Promise<void> {
  await waitForVisualStability(baseWaitMs);

  const pendingImages = Array.from(document.images).filter((image) => !image.complete);
  if (pendingImages.length === 0) {
    return;
  }

  await Promise.allSettled(pendingImages.map((image) => waitForImageReady(image)));
  await waitForVisualStability(0);
}

async function waitForImageReady(image: HTMLImageElement): Promise<void> {
  const imageReady = typeof image.decode === "function"
    ? image.decode()
    : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });

  await Promise.race([
    imageReady.catch(() => undefined),
    wait(1500)
  ]);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function detectScrollTarget(): ScrollTarget {
  const windowOriginalScrollY = window.scrollY;
  const windowScrollTarget: ScrollTarget = {
    element: window,
    getScrollTop: () => window.scrollY,
    setScrollTop: (value: number) => window.scrollTo(0, value),
    getScrollHeight: () => document.documentElement.scrollHeight,
    getClientHeight: () => window.innerHeight,
    getClientWidth: () => window.innerWidth,
    restore: () => { window.scrollTo(0, windowOriginalScrollY); }
  };

  // 1. If window scrollable enough
  if (document.documentElement.scrollHeight > window.innerHeight + 2) {
    return windowScrollTarget;
  }

  // 2. Common deck/slide containers
  const candidateSelectors = [".deck", "[data-deck]", ".slides", ".reveal .slides", "main"];
  for (const selector of candidateSelectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.scrollHeight > el.clientHeight + 2) {
      const originalScrollTop = el.scrollTop;
      return {
        element: el,
        getScrollTop: () => el.scrollTop,
        setScrollTop: (value: number) => { el.scrollTop = value; },
        getScrollHeight: () => el.scrollHeight,
        getClientHeight: () => el.clientHeight,
        getClientWidth: () => el.clientWidth,
        restore: () => { el.scrollTop = originalScrollTop; }
      };
    }
  }

  // 3. Scan body for largest candidate
  let bestCandidate: HTMLElement | null = null;
  const elements = document.body.querySelectorAll<HTMLElement>("*");
  for (const el of elements) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
        if (!bestCandidate || (el.clientWidth * el.clientHeight > bestCandidate.clientWidth * bestCandidate.clientHeight)) {
          bestCandidate = el;
        }
      }
    }
  }

  if (bestCandidate) {
    const el = bestCandidate;
    const originalScrollTop = el.scrollTop;
    return {
      element: el,
      getScrollTop: () => el.scrollTop,
      setScrollTop: (value: number) => { el.scrollTop = value; },
      getScrollHeight: () => el.scrollHeight,
      getClientHeight: () => el.clientHeight,
      getClientWidth: () => el.clientWidth,
      restore: () => { el.scrollTop = originalScrollTop; }
    };
  }

  // 4. Fallback to window
  return windowScrollTarget;
}

let lastCaptureTime = 0;
const THROTTLE_INTERVAL = 1100;

export async function throttledCaptureViewport(logger: ClickDeckLogger): Promise<HTMLImageElement> {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const now = Date.now();
    const timeSinceLast = now - lastCaptureTime;
    if (timeSinceLast < THROTTLE_INTERVAL) {
      const delay = THROTTLE_INTERVAL - timeSinceLast;
      logger.info(`Capture throttled, waiting ${delay}ms`);
      await wait(delay);
    }

    lastCaptureTime = Date.now();

    const response = await new Promise<{ dataUrl?: string; error?: string }>((resolve) => {
      if ((window as any).__MOCK_CAPTURE_VISIBLE_TAB) {
        resolve({ dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==" });
        return;
      }
      chrome.runtime.sendMessage({ type: "CLICKDECK_CAPTURE_VISIBLE_TAB" }, resolve);
    });

    if (response.error === "This request exceeds the MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota.") {
      if (attempt < maxRetries) {
        attempt++;
        logger.warn(`Capture failed with quota error. Retrying... (${attempt}/${maxRetries})`);
        await wait(1500); // Wait an extra margin before retry
        continue;
      } else {
        logger.error("Capture failed after retries");
        throw new Error(response.error);
      }
    }

    if (response.error || !response.dataUrl) {
      throw new Error(response.error || "No dataUrl returned from captureVisibleTab");
    }

    return await loadImage(response.dataUrl);
  }

  throw new Error("Unexpected end of throttledCaptureViewport");
}
