// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { collectCssFacts } from "./css-facts";

function mockRect(element: HTMLElement, width = 120, height = 40): void {
  (element as any).getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height
  });
}

describe("collectCssFacts", () => {
  it("extracts text facts from a text element", () => {
    const el = document.createElement("h1");
    el.textContent = "Hello";
    el.style.display = "block";
    el.style.fontSize = "32px";
    el.style.fontWeight = "700";
    el.style.lineHeight = "1.2";
    el.style.letterSpacing = "0.04em";
    el.style.color = "rgb(20, 30, 40)";
    el.style.textAlign = "center";
    mockRect(el, 300, 80);
    document.body.appendChild(el);

    const facts = collectCssFacts(el);

    expect(facts.kind).toBe("text");
    expect(facts.base).toContain("tag: h1");
    expect(facts.base).toContain("display: block");
    expect(facts.base).toContain("rect-size: 300 x 80");
    expect(facts.text).toEqual(expect.arrayContaining([
      "font-size: 32px",
      "font-weight: 700",
      "line-height: 1.2",
      "letter-spacing: 0.04em",
      "color: rgb(20, 30, 40)",
      "text-align: center"
    ]));
  });

  it("extracts media facts from an image element", () => {
    const el = document.createElement("img");
    el.src = "test.png";
    el.style.display = "block";
    el.style.width = "240px";
    el.style.height = "160px";
    el.style.objectFit = "cover";
    el.style.objectPosition = "20% 30%";
    el.style.borderRadius = "16px";
    mockRect(el, 240, 160);
    document.body.appendChild(el);

    const facts = collectCssFacts(el);

    expect(facts.kind).toBe("media");
    expect(facts.base).toContain("tag: img");
    expect(facts.media).toEqual(expect.arrayContaining([
      "object-fit: cover",
      "object-position: 20% 30%",
      "border-radius: 16px",
      "css-size: 240px x 160px"
    ]));
  });

  it("recognizes video as media facts", () => {
    const el = document.createElement("video");
    el.style.display = "block";
    el.style.width = "320px";
    el.style.height = "180px";
    el.style.objectFit = "contain";
    mockRect(el, 320, 180);
    document.body.appendChild(el);

    const facts = collectCssFacts(el);

    expect(facts.kind).toBe("media");
    expect(facts.base).toContain("tag: video");
    expect(facts.media).toEqual(expect.arrayContaining([
      "object-fit: contain",
      "css-size: 320px x 180px"
    ]));
  });

  it("extracts positioning facts from positioned and transformed elements", () => {
    const el = document.createElement("span");
    el.className = "mosaic";
    el.setAttribute("aria-hidden", "true");
    el.style.display = "block";
    el.style.position = "absolute";
    el.style.left = "40px";
    el.style.top = "24px";
    el.style.zIndex = "3";
    el.style.transform = "translateX(10px)";
    mockRect(el, 56, 32);
    document.body.appendChild(el);

    const facts = collectCssFacts(el);

    expect(facts.kind).toBe("overlay");
    expect(facts.base).toEqual(expect.arrayContaining([
      "position: absolute",
      "transform: translateX(10px)",
      "rect-size: 56 x 32"
    ]));
    expect(facts.positioning).toEqual(expect.arrayContaining([
      "top: 24px",
      "left: 40px",
      "z-index: 3",
      "transform: translateX(10px)"
    ]));
    expect(facts.hints).toEqual(expect.arrayContaining([
      "class-hint: mosaic",
      "aria-hidden: true"
    ]));
  });

  it("keeps ordinary block facts short and avoids dumping all computed styles", () => {
    const el = document.createElement("div");
    el.style.display = "block";
    mockRect(el, 100, 50);
    document.body.appendChild(el);

    const facts = collectCssFacts(el);
    const allFacts = [
      ...facts.base,
      ...facts.text,
      ...facts.media,
      ...facts.layout,
      ...facts.positioning,
      ...facts.hints
    ];

    expect(facts.kind).toBe("unknown");
    expect(allFacts.length).toBeLessThanOrEqual(5);
    expect(facts.text).toEqual([]);
    expect(facts.media).toEqual([]);
    expect(facts.layout).toEqual([]);
    expect(facts.positioning).toEqual([]);
  });

  it("is read-only and does not mutate style, class, or attributes", () => {
    const el = document.createElement("p");
    el.className = "note";
    el.setAttribute("data-test", "stable");
    el.textContent = "Read only";
    el.style.cssText = "display:block;font-size:24px;color:rgb(1, 2, 3);";
    mockRect(el, 120, 40);
    document.body.appendChild(el);

    const beforeClass = el.className;
    const beforeAttr = el.getAttribute("data-test");
    const beforeStyle = el.getAttribute("style");

    collectCssFacts(el);

    expect(el.className).toBe(beforeClass);
    expect(el.getAttribute("data-test")).toBe(beforeAttr);
    expect(el.getAttribute("style")).toBe(beforeStyle);
  });
});
