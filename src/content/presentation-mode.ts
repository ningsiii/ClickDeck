import type { ClickDeckLogger } from "../diagnostics/logger";

export function detectPresentationSlides(root: ParentNode = document): HTMLElement[] {
  // 1. Check for .slide
  let slides = Array.from(root.querySelectorAll<HTMLElement>(".slide"));
  if (slides.length >= 2) return slides;

  // 2. Check for [data-slide]
  slides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
  if (slides.length >= 2) return slides;

  // 3. Check for [aria-roledescription="slide"]
  slides = Array.from(root.querySelectorAll<HTMLElement>('[aria-roledescription="slide"]'));
  if (slides.length >= 2) return slides;

  // 4. Check for .deck > section
  slides = Array.from(root.querySelectorAll<HTMLElement>(".deck > section"));
  if (slides.length >= 2) return slides;

  // 5. Check for main > section (only if they are mostly viewport height)
  const sections = Array.from(root.querySelectorAll<HTMLElement>("main > section"));
  if (sections.length >= 2) {
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const threshold = viewportHeight * 0.75; // "接近视口高度"
    const allTall = sections.every((s) => s.clientHeight >= threshold);
    if (allTall) {
      return sections;
    }
  }

  return [];
}

export type PresentationController = {
  enter: () => Promise<void>;
  exit: () => void;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
  destroy: () => void;
};

export function createPresentationController(options: {
  slides: HTMLElement[];
  logger: ClickDeckLogger;
}): PresentationController {
  const { slides, logger } = options;
  let currentIndex = 0;
  let isPresenting = false;
  let originalScrollY = 0;

  function updateSlideVisibility() {
    slides.forEach((slide, index) => {
      if (index === currentIndex) {
        slide.classList.add("clickdeck-presenting-slide");
      } else {
        slide.classList.remove("clickdeck-presenting-slide");
      }
    });
  }

  function goTo(index: number) {
    if (!isPresenting || slides.length === 0) return;
    if (index < 0) index = 0;
    if (index >= slides.length) index = slides.length - 1;
    
    currentIndex = index;
    slides[currentIndex].scrollIntoView({ block: "start", behavior: "smooth" });
    updateSlideVisibility();
  }

  function next() {
    if (currentIndex < slides.length - 1) {
      goTo(currentIndex + 1);
    }
  }

  function previous() {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isPresenting) return;
    
    // Ignore events from input fields
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) {
      return;
    }

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        e.preventDefault();
        e.stopPropagation(); // Prevent page's own scroll logic from running twice
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        e.stopPropagation();
        previous();
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        goTo(slides.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        exit();
        break;
    }
  }

  // Also handle fullscreen change to exit presentation if user presses Esc to exit fullscreen
  function onFullscreenChange() {
    if (isPresenting && !document.fullscreenElement) {
      // User exited fullscreen via browser native UI or Esc
      exit();
    }
  }

  async function enter() {
    if (isPresenting) return;
    if (slides.length === 0) return;

    isPresenting = true;
    originalScrollY = window.scrollY;

    // Determine current slide based on scroll position
    let bestIndex = 0;
    let minDistance = Infinity;
    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.top);
      if (distance < minDistance) {
        minDistance = distance;
        bestIndex = index;
      }
    });
    currentIndex = bestIndex;

    document.documentElement.classList.add("clickdeck-presenting");
    
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("fullscreenchange", onFullscreenChange);

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      logger.warn("Could not request fullscreen", err);
    }

    goTo(currentIndex);
    logger.info("Entered presentation mode", { slideCount: slides.length });
  }

  function exit() {
    if (!isPresenting) return;
    isPresenting = false;

    document.documentElement.classList.remove("clickdeck-presenting");
    slides.forEach(slide => slide.classList.remove("clickdeck-presenting-slide"));
    
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("fullscreenchange", onFullscreenChange);

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        logger.warn("Could not exit fullscreen", err);
      });
    }

    window.scrollTo({ top: originalScrollY, behavior: "auto" });
    logger.info("Exited presentation mode");
  }

  function destroy() {
    exit();
  }

  return { enter, exit, next, previous, goTo, destroy };
}
