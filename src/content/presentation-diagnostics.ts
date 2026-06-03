export type DiagnosticPageInfo = {
  url: string;
  title: string;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  isClickDeckPresenting: boolean;
};

export type DiagnosticSlideDetection = {
  count: number;
  mode: string;
  slides: Array<{
    index: number;
    tagName: string;
    id: string;
    className: string;
    textSnippet: string;
  }>;
};

export type DiagnosticHostCapabilities = {
  hasPlaySlideHook: boolean;
  hasClickDeckSyncProtocol: boolean;
  hasRevealSlide: boolean;
  hasRevealSync: boolean;
  hasRevealLayout: boolean;
  hasImpress: boolean;
  hasNavDots: boolean;
  navDotCount: number;
  hasCurrentSlideCounter: boolean;
  hasTotalSlidesCounter: boolean;
};

export type DiagnosticSlideInfo = {
  tagName: string;
  id: string;
  className: string;
  textSnippet: string;
  computed: {
    display: string;
    visibility: string;
    opacity: string;
    transform: string;
    position: string;
    zIndex: string;
    pointerEvents: string;
  };
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isInViewport: boolean;
  hasNonZeroRect: boolean;
  isProbablyVisible: boolean;
  hiddenReasons: string[];
};

export type DiagnosticSnapshot = {
  capturedAt: string;
  presentingSlideIndex: number | null;
  activeSlideIndexes: number[];
  prevSlideIndexes: number[];
  hiddenByClickDeckIndexes: number[];
  navActiveIndexes: number[];
  currentSlideCounterText: string | null;
  totalSlidesCounterText: string | null;
  currentSlide: DiagnosticSlideInfo | null;
  contentCandidates: DiagnosticSlideInfo[];
};

export type PresentationDiagnosticReport = {
  createdAt: string;
  page: DiagnosticPageInfo;
  slideDetection: DiagnosticSlideDetection;
  hostCapabilities: DiagnosticHostCapabilities;
  snapshots: DiagnosticSnapshot[];
};

function truncateText(text: string, maxLength: number): string {
  const t = (text || "").trim();
  if (t.length <= maxLength) return t;
  return t.slice(0, maxLength) + "...";
}

function getSlideDetection(root: ParentNode = document): DiagnosticSlideDetection {
  let mode = "none";
  let slides: HTMLElement[] = [];

  let trySlides = Array.from(root.querySelectorAll<HTMLElement>(".slide"));
  if (trySlides.length >= 2) {
    mode = ".slide";
    slides = trySlides;
  } else {
    trySlides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
    if (trySlides.length >= 2) {
      mode = "[data-slide]";
      slides = trySlides;
    } else {
      trySlides = Array.from(root.querySelectorAll<HTMLElement>('[aria-roledescription="slide"]'));
      if (trySlides.length >= 2) {
        mode = '[aria-roledescription="slide"]';
        slides = trySlides;
      } else {
        trySlides = Array.from(root.querySelectorAll<HTMLElement>(".deck > section"));
        if (trySlides.length >= 2) {
          mode = ".deck > section";
          slides = trySlides;
        } else {
          trySlides = Array.from(root.querySelectorAll<HTMLElement>("main > section"));
          if (trySlides.length >= 2) {
            const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
            const threshold = viewportHeight * 0.75;
            const allTall = trySlides.every((s) => s.clientHeight >= threshold);
            if (allTall) {
              mode = "main > section";
              slides = trySlides;
            }
          }
        }
      }
    }
  }

  return {
    count: slides.length,
    mode,
    slides: slides.map((s, idx) => ({
      index: idx,
      tagName: s.tagName.toLowerCase(),
      id: s.id,
      className: s.className,
      textSnippet: truncateText(s.textContent || "", 80),
    })),
  };
}

function getElementInfo(element: HTMLElement): DiagnosticSlideInfo {
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  const hasNonZeroRect = rect.width > 0 && rect.height > 0;
  const isInViewport = 
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0;

  const hiddenReasons: string[] = [];
  if (computed.display === "none") hiddenReasons.push("display-none");
  if (computed.visibility === "hidden") hiddenReasons.push("visibility-hidden");
  if (parseFloat(computed.opacity) < 0.01) hiddenReasons.push("opacity-zero");
  if (!hasNonZeroRect) hiddenReasons.push("zero-size");
  if (hasNonZeroRect && !isInViewport) hiddenReasons.push("outside-viewport");
  if (element.classList.contains("clickdeck-presentation-hidden-slide")) hiddenReasons.push("clickdeck-hidden-class");
  if (element.getAttribute("aria-hidden") === "true") hiddenReasons.push("aria-hidden");
  if (element.hasAttribute("hidden")) hiddenReasons.push("hidden-attribute");

  const isProbablyVisible = 
    hasNonZeroRect && 
    isInViewport && 
    computed.display !== "none" && 
    computed.visibility !== "hidden" && 
    parseFloat(computed.opacity) >= 0.01 && 
    !element.hasAttribute("hidden") && 
    element.getAttribute("aria-hidden") !== "true";

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id,
    className: element.className,
    textSnippet: truncateText(element.textContent || "", 80),
    computed: {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      transform: computed.transform,
      position: computed.position,
      zIndex: computed.zIndex,
      pointerEvents: computed.pointerEvents,
    },
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    },
    isInViewport,
    hasNonZeroRect,
    isProbablyVisible,
    hiddenReasons,
  };
}

export function collectPresentationDiagnostics(options?: {
  maxTextLength?: number;
  maxContentCandidates?: number;
}): PresentationDiagnosticReport {
  const maxText = options?.maxTextLength || 80;
  const maxCandidates = options?.maxContentCandidates || 8;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const hostCapabilities: DiagnosticHostCapabilities = {
    hasPlaySlideHook: typeof w.__playSlide === "function",
    hasClickDeckSyncProtocol: typeof w.__clickdeckSyncPresentationState === "function",
    hasRevealSlide: typeof w.Reveal?.slide === "function",
    hasRevealSync: typeof w.Reveal?.sync === "function",
    hasRevealLayout: typeof w.Reveal?.layout === "function",
    hasImpress: typeof w.impress === "function",
    hasNavDots: false,
    navDotCount: 0,
    hasCurrentSlideCounter: !!document.getElementById("currentSlide"),
    hasTotalSlidesCounter: !!document.getElementById("totalSlides"),
  };

  const navDots = Array.from(document.querySelectorAll<HTMLElement>("#nav .dot, .nav-dot, .nav-dots .nav-dot"));
  hostCapabilities.hasNavDots = navDots.length > 0;
  hostCapabilities.navDotCount = navDots.length;

  const slideDetection = getSlideDetection();
  const allDetectedSlides = slideDetection.mode === "none" 
    ? [] 
    : Array.from(document.querySelectorAll<HTMLElement>(slideDetection.mode));

  let presentingIndex: number | null = null;
  const activeIndexes: number[] = [];
  const prevIndexes: number[] = [];
  const hiddenByClickDeckIndexes: number[] = [];

  allDetectedSlides.forEach((slide, idx) => {
    if (slide.classList.contains("clickdeck-presenting-slide")) presentingIndex = idx;
    if (slide.classList.contains("active")) activeIndexes.push(idx);
    if (slide.classList.contains("prev")) prevIndexes.push(idx);
    if (slide.classList.contains("clickdeck-presentation-hidden-slide")) hiddenByClickDeckIndexes.push(idx);
  });

  const navActiveIndexes: number[] = [];
  navDots.forEach((dot, idx) => {
    if (dot.classList.contains("active") || dot.getAttribute("aria-current") === "true") {
      navActiveIndexes.push(idx);
    }
  });

  let targetSlideNode: HTMLElement | null = null;
  if (presentingIndex !== null && allDetectedSlides[presentingIndex]) {
    targetSlideNode = allDetectedSlides[presentingIndex];
  } else if (activeIndexes.length > 0 && allDetectedSlides[activeIndexes[0]]) {
    targetSlideNode = allDetectedSlides[activeIndexes[0]];
  } else if (allDetectedSlides.length > 0) {
    targetSlideNode = allDetectedSlides[0];
  }

  const contentCandidates: DiagnosticSlideInfo[] = [];
  if (targetSlideNode) {
    const candElements = Array.from(
      targetSlideNode.querySelectorAll<HTMLElement>(
        "h1, h2, h3, p, li, img, svg, canvas, [data-anim], [data-motion], .content, .card, .panel, .text, .title"
      )
    ).slice(0, maxCandidates);

    for (const el of candElements) {
      const info = getElementInfo(el);
      info.textSnippet = truncateText(info.textSnippet, maxText);
      contentCandidates.push(info);
    }
  }

  const snapshot: DiagnosticSnapshot = {
    capturedAt: new Date().toISOString(),
    presentingSlideIndex: presentingIndex,
    activeSlideIndexes: activeIndexes,
    prevSlideIndexes: prevIndexes,
    hiddenByClickDeckIndexes: hiddenByClickDeckIndexes,
    navActiveIndexes: navActiveIndexes,
    currentSlideCounterText: document.getElementById("currentSlide")?.textContent || null,
    totalSlidesCounterText: document.getElementById("totalSlides")?.textContent || null,
    currentSlide: targetSlideNode ? getElementInfo(targetSlideNode) : null,
    contentCandidates,
  };

  if (snapshot.currentSlide) {
    snapshot.currentSlide.textSnippet = truncateText(snapshot.currentSlide.textSnippet, maxText);
  }

  return {
    createdAt: new Date().toISOString(),
    page: {
      url: window.location.href,
      title: document.title,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      isClickDeckPresenting: document.documentElement.classList.contains("clickdeck-presenting"),
    },
    slideDetection,
    hostCapabilities,
    snapshots: [snapshot],
  };
}
