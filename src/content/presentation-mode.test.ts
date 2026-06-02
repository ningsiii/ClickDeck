/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { detectPresentationSlides, createPresentationController } from "./presentation-mode";
import type { ClickDeckLogger } from "../diagnostics/logger";

describe("detectPresentationSlides", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("detects .slide elements", () => {
    document.body.innerHTML = `
      <div class="slide">1</div>
      <div class="slide">2</div>
      <div class="slide">3</div>
    `;
    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(3);
  });

  it("detects [data-slide] elements", () => {
    document.body.innerHTML = `
      <section data-slide="1">1</section>
      <section data-slide="2">2</section>
    `;
    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(2);
  });

  it("detects .deck > section elements", () => {
    document.body.innerHTML = `
      <div class="deck">
        <section>1</section>
        <section>2</section>
      </div>
    `;
    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(2);
  });

  it("does not return if less than 2 slides found", () => {
    document.body.innerHTML = `<div class="slide">1</div>`;
    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(0);
  });

  it("detects main > section if they are tall enough", () => {
    // Mock innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
    
    document.body.innerHTML = `
      <main>
        <section id="s1">1</section>
        <section id="s2">2</section>
      </main>
    `;
    const s1 = document.getElementById("s1")!;
    const s2 = document.getElementById("s2")!;
    Object.defineProperty(s1, 'clientHeight', { value: 800 });
    Object.defineProperty(s2, 'clientHeight', { value: 900 });

    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(2);
  });

  it("does not detect main > section if they are short", () => {
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });
    
    document.body.innerHTML = `
      <main>
        <section id="s1">1</section>
        <section id="s2">2</section>
      </main>
    `;
    const s1 = document.getElementById("s1")!;
    const s2 = document.getElementById("s2")!;
    Object.defineProperty(s1, 'clientHeight', { value: 500 }); // Below 0.75 * 1000 (750)
    Object.defineProperty(s2, 'clientHeight', { value: 900 });

    const slides = detectPresentationSlides(document.body);
    expect(slides.length).toBe(0); // All must be tall
  });
});

describe("createPresentationController", () => {
  let mockLogger: ClickDeckLogger;

  beforeEach(() => {
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {}
    } as any;
    
    document.body.innerHTML = `
      <div class="slide" id="s1">1</div>
      <div class="slide" id="s2">2</div>
    `;
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = () => {};
  });

  it("adds staging classes and CSS variables on enter, updates on navigation, and cleans up on exit", async () => {
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    document.body.style.background = "rgb(247, 242, 232)";
    
    // Mock getBoundingClientRect for scale calculation
    slides.forEach((s, idx) => {
      s.getBoundingClientRect = () => ({ width: 800, height: 600, top: idx === 0 ? 0 : 1000 } as any);
    });
    
    Object.defineProperty(window, 'innerWidth', { value: 1600, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 900, writable: true });

    const controller = createPresentationController({ slides, logger: mockLogger });
    
    await controller.enter();
    
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(true);
    expect(document.body.style.background).toBe("rgb(247, 242, 232)");
    expect(slides[0].classList.contains("clickdeck-presenting-slide")).toBe(true);
    expect(slides[1].classList.contains("clickdeck-presentation-hidden-slide")).toBe(true);
    
    // Math.min(1600/800, 900/600) => min(2, 1.5) => 1.5
    expect(slides[0].style.getPropertyValue("--clickdeck-present-scale")).toBe("1.5");
    
    // Navigate next
    controller.next();
    
    expect(slides[0].classList.contains("clickdeck-presenting-slide")).toBe(false);
    expect(slides[0].classList.contains("clickdeck-presentation-hidden-slide")).toBe(true);
    expect(slides[1].classList.contains("clickdeck-presenting-slide")).toBe(true);
    expect(slides[1].classList.contains("clickdeck-presentation-hidden-slide")).toBe(false);
    
    // Exit
    controller.exit();
    
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(false);
    expect(slides[1].classList.contains("clickdeck-presentation-hidden-slide")).toBe(false);
    expect(slides[1].style.getPropertyValue("--clickdeck-present-scale")).toBe("");
  });

  it("exits presentation when next is called on the last slide", async () => {
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    const controller = createPresentationController({ slides, logger: mockLogger });
    await controller.enter();

    // Go to last slide
    controller.goTo(1);
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(true);

    // Calling next on last slide should exit
    controller.next();
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(false);
  });
});
