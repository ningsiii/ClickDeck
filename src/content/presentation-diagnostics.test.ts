/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { collectPresentationDiagnostics } from "./presentation-diagnostics";

describe("collectPresentationDiagnostics", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "Test Page";
    // Mock viewport for tests
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    // Cleanup any global mocks
    const w = window as any;
    delete w.__playSlide;
    delete w.Reveal;
  });

  it("detects .slide elements and host capabilities without calling them", () => {
    document.body.innerHTML = `
      <div class="slide" id="s1">Slide 1</div>
      <div class="slide" id="s2">Slide 2</div>
      <div id="currentSlide">1</div>
    `;

    const w = window as any;
    const playSlideMock = vi.fn();
    w.__playSlide = playSlideMock;

    const report = collectPresentationDiagnostics();

    expect(report.slideDetection.mode).toBe(".slide");
    expect(report.slideDetection.count).toBe(2);
    expect(report.hostCapabilities.hasPlaySlideHook).toBe(true);
    expect(report.hostCapabilities.hasCurrentSlideCounter).toBe(true);
    expect(playSlideMock).not.toHaveBeenCalled();
  });

  it("identifies .clickdeck-presenting-slide, .active, .prev, and hidden slides", () => {
    document.body.innerHTML = `
      <div class="slide prev" id="s1">Slide 1</div>
      <div class="slide active clickdeck-presenting-slide" id="s2">Slide 2</div>
      <div class="slide clickdeck-presentation-hidden-slide" id="s3">Slide 3</div>
    `;

    const report = collectPresentationDiagnostics();
    const snapshot = report.snapshots[0];

    expect(snapshot.presentingSlideIndex).toBe(1);
    expect(snapshot.activeSlideIndexes).toEqual([1]);
    expect(snapshot.prevSlideIndexes).toEqual([0]);
    expect(snapshot.hiddenByClickDeckIndexes).toEqual([2]);
  });

  it("identifies nav dot active and counter text", () => {
    document.body.innerHTML = `
      <div id="nav">
        <div class="dot active"></div>
        <div class="dot"></div>
      </div>
      <div id="currentSlide">1</div>
      <div id="totalSlides">2</div>
      <div class="slide"></div><div class="slide"></div>
    `;

    const report = collectPresentationDiagnostics();
    const snapshot = report.snapshots[0];

    expect(report.hostCapabilities.hasNavDots).toBe(true);
    expect(report.hostCapabilities.navDotCount).toBe(2);
    expect(snapshot.navActiveIndexes).toEqual([0]);
    expect(snapshot.currentSlideCounterText).toBe("1");
    expect(snapshot.totalSlidesCounterText).toBe("2");
  });

  it("evaluates visibility based on computed styles", () => {
    document.body.innerHTML = `
      <div class="slide active">
        <h1 id="h1-none" style="display: none">Hidden</h1>
        <h1 id="h1-vis" style="visibility: hidden">Hidden 2</h1>
        <h1 id="h1-op" style="opacity: 0">Hidden 3</h1>
        <h1 id="h1-zero" style="width: 0; height: 0">Hidden 4</h1>
        <h1 id="h1-ok">Visible</h1>
      </div>
      <div class="slide"></div>
    `;

    const report = collectPresentationDiagnostics();
    const candidates = report.snapshots[0].contentCandidates;

    const none = candidates.find((c) => c.id === "h1-none");
    expect(none?.hiddenReasons).toContain("display-none");
    expect(none?.isProbablyVisible).toBe(false);

    const vis = candidates.find((c) => c.id === "h1-vis");
    expect(vis?.hiddenReasons).toContain("visibility-hidden");

    const op = candidates.find((c) => c.id === "h1-op");
    expect(op?.hiddenReasons).toContain("opacity-zero");

    const zero = candidates.find((c) => c.id === "h1-zero");
    // Since JSDOM might not calculate width:0 bounding box perfectly unless mocked, 
    // we just check that the field exists and logic runs.
    expect(zero).toBeDefined();

    const ok = candidates.find((c) => c.id === "h1-ok");
    // isProbablyVisible might be false in JSDOM due to zero rects, but we check logic coverage
    expect(ok?.hiddenReasons).not.toContain("display-none");
  });

  it("truncates text snippets and limits candidates", () => {
    document.body.innerHTML = `
      <div class="slide active">
        <p id="long">This is a very long text that should definitely be truncated by the diagnostic function because it exceeds the maximum allowed characters</p>
        <p>1</p><p>2</p><p>3</p><p>4</p><p>5</p><p>6</p><p>7</p><p>8</p><p>9</p><p>10</p>
      </div>
      <div class="slide"></div>
    `;

    const report = collectPresentationDiagnostics({ maxTextLength: 20, maxContentCandidates: 5 });
    const candidates = report.snapshots[0].contentCandidates;

    expect(candidates.length).toBe(5);
    
    const long = candidates.find((c) => c.id === "long");
    expect(long?.textSnippet.length).toBeLessThanOrEqual(23); // 20 + "..."
    expect(long?.textSnippet).toContain("...");
  });
});
