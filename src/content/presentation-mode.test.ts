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

  it("adds and removes clickdeck-presenting class on enter/exit", async () => {
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    const controller = createPresentationController({ slides, logger: mockLogger });
    
    await controller.enter();
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(true);
    
    controller.exit();
    expect(document.documentElement.classList.contains("clickdeck-presenting")).toBe(false);
  });
});
