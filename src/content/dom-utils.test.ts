// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { canAutoStartTextEditing, createElementLocator, placeCaretFromPoint, isElementVisible } from "./dom-utils";

describe("createElementLocator", () => {
  it("includes a short text snippet for text elements", () => {
    document.body.innerHTML = `
      <main>
        <h1 id="title">Make the final page feel finished.</h1>
      </main>
    `;

    const heading = document.querySelector("h1") as HTMLElement;
    const locator = createElementLocator(heading);

    expect(locator.tagName).toBe("h1");
    expect(locator.textSnippet).toBe("Make the final page feel finished.");
    expect(locator.descriptor).toContain("h1");
    expect(locator.cssPath).toContain("#title");
    expect(locator.nthOfTypePath).toContain("h1:nth-of-type(");
  });

  it("includes an image hint for img elements", () => {
    document.body.innerHTML = `
      <main>
        <img alt="Product screenshot" src="https://example.com/assets/screenshot.png" />
      </main>
    `;

    const image = document.querySelector("img") as HTMLElement;
    const locator = createElementLocator(image);

    expect(locator.tagName).toBe("img");
    expect(locator.imageHint).toBe("Product screenshot");
    expect(locator.descriptor).toContain("img");
    expect(locator.nthOfTypePath).toContain("img:nth-of-type(");
  });

  it("produces different nth-of-type paths for repeated siblings", () => {
    document.body.innerHTML = `
      <main>
        <p>One</p>
        <p>Two</p>
      </main>
    `;

    const paragraphs = Array.from(document.querySelectorAll("p")) as HTMLElement[];
    const locatorA = createElementLocator(paragraphs[0]);
    const locatorB = createElementLocator(paragraphs[1]);

    expect(locatorA.nthOfTypePath).not.toBe(locatorB.nthOfTypePath);
    expect(locatorA.nthOfTypePath).toContain("p:nth-of-type(1)");
    expect(locatorB.nthOfTypePath).toContain("p:nth-of-type(2)");
  });

  it("avoids treating hash-like classes as stable hints", () => {
    document.body.innerHTML = `
      <main>
        <div class="a9f0c1d2e3f4b5c6d7e8f9a0 some-class">Card</div>
      </main>
    `;

    const div = document.querySelector("div") as HTMLElement;
    const locator = createElementLocator(div);

    expect(locator.classHint).toBe(".some-class");
  });

  it("extracts backgroundImageHint", () => {
    document.body.innerHTML = `
      <div id="bg" style="background-image: url('test.png')"></div>
    `;
    const div = document.getElementById("bg") as HTMLElement;
    
    // jsdom doesn't fully support getComputedStyle on inline styles for backgroundImage perfectly
    // but we can mock window.getComputedStyle temporarily
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = () => ({
      getPropertyValue: (prop: string) => prop === "background-image" ? "url('test.png')" : ""
    }) as any;

    const locator = createElementLocator(div);
    expect(locator.backgroundImageHint).toBe("url('test.png')");

    window.getComputedStyle = originalGetComputedStyle;
  });

  it("infers semanticRole based on tags and classes", () => {
    document.body.innerHTML = `
      <h2 id="heading">Title</h2>
      <button id="btn">Click</button>
      <div id="card" class="product-card"></div>
    `;
    const h2 = document.getElementById("heading") as HTMLElement;
    const btn = document.getElementById("btn") as HTMLElement;
    const card = document.getElementById("card") as HTMLElement;

    expect(createElementLocator(h2).semanticRole).toBe("heading");
    expect(createElementLocator(btn).semanticRole).toBe("button");
    expect(createElementLocator(card).semanticRole).toBe("cardLike");
  });

  it("extracts semanticAncestor and sibling descriptors", () => {
    document.body.innerHTML = `
      <section class="section" aria-label="Features">
        <h2 id="title">Features Title</h2>
        <p id="p1">P1</p>
        <p id="p2">P2</p>
        <p id="p3">P3</p>
      </section>
    `;
    const p2 = document.getElementById("p2") as HTMLElement;
    const locator = createElementLocator(p2);

    expect(locator.semanticAncestor).toContain("sectionLike");
    expect(locator.semanticAncestor).toContain("Features Title");
    expect(locator.previousSiblingDescriptor).toBe("p#p1");
    expect(locator.nextSiblingDescriptor).toBe("p#p3");
  });

  it("assesses selector stability", () => {
    document.body.innerHTML = `
      <div id="stable-id"></div>
      <div>Just some text here</div>
      <div><span><i></i></span></div>
    `;
    const idEl = document.getElementById("stable-id") as HTMLElement;
    const mediumEl = document.querySelectorAll("div")[1] as HTMLElement;
    const badEl = document.querySelector("i") as HTMLElement;

    expect(createElementLocator(idEl).selectorStability).toBe("high");
    expect(createElementLocator(mediumEl).selectorStability).toBe("medium");
    expect(createElementLocator(badEl).selectorStability).toBe("low");
  });
});

describe("canAutoStartTextEditing", () => {
  it("returns true for text-like elements with text content", () => {
    document.body.innerHTML = `<main><p>Hello</p></main>`;
    const paragraph = document.querySelector("p") as HTMLElement;
    expect(canAutoStartTextEditing(paragraph)).toBe(true);
  });

  it("returns false for non-text elements like img/button/input", () => {
    document.body.innerHTML = `
      <main>
        <img alt="x" src="https://example.com/x.png" />
        <button>OK</button>
        <input value="hi" />
      </main>
    `;
    const img = document.querySelector("img") as HTMLElement;
    const button = document.querySelector("button") as HTMLElement;
    const input = document.querySelector("input") as HTMLElement;
    expect(canAutoStartTextEditing(img)).toBe(false);
    expect(canAutoStartTextEditing(button)).toBe(false);
    expect(canAutoStartTextEditing(input)).toBe(false);
  });
});

describe("placeCaretFromPoint", () => {
  it("places caret using caretPositionFromPoint if available and valid", () => {
    document.body.innerHTML = `<main><p id="test-p">Hello World</p></main>`;
    const p = document.getElementById("test-p") as HTMLElement;
    const textNode = p.firstChild as Text;

    // Mock getSelection
    const mockSelection = {
      removeAllRanges: vi.fn(),
      addRange: vi.fn()
    };
    window.getSelection = () => mockSelection as any;

    // Mock Range
    const mockRange = {
      setStart: vi.fn(),
      collapse: vi.fn(),
      selectNodeContents: vi.fn()
    };
    document.createRange = () => mockRange as any;

    // Mock caretPositionFromPoint
    (document as any).caretPositionFromPoint = (_x: number, _y: number) => {
      return { offsetNode: textNode, offset: 5 };
    };

    const result = placeCaretFromPoint(p, 100, 100);

    expect(result).toBe(true);
    expect(mockSelection.removeAllRanges).toHaveBeenCalled();
    expect(mockRange.setStart).toHaveBeenCalledWith(textNode, 5);
    expect(mockRange.collapse).toHaveBeenCalledWith(true);
    expect(mockSelection.addRange).toHaveBeenCalled();

    delete (document as any).caretPositionFromPoint;
  });

  it("falls back to end of target if point is outside target", () => {
    document.body.innerHTML = `<main><p id="test-p">Hello</p><p id="other-p">World</p></main>`;
    const p = document.getElementById("test-p") as HTMLElement;
    const otherP = document.getElementById("other-p") as HTMLElement;
    const otherTextNode = otherP.firstChild as Text;

    const mockSelection = {
      removeAllRanges: vi.fn(),
      addRange: vi.fn()
    };
    window.getSelection = () => mockSelection as any;

    const mockRange = {
      setStart: vi.fn(),
      collapse: vi.fn(),
      selectNodeContents: vi.fn()
    };
    document.createRange = () => mockRange as any;

    (document as any).caretPositionFromPoint = (_x: number, _y: number) => {
      return { offsetNode: otherTextNode, offset: 2 };
    };

    const result = placeCaretFromPoint(p, 100, 100);

    expect(result).toBe(false);
    expect(mockRange.selectNodeContents).toHaveBeenCalledWith(p);
    expect(mockRange.collapse).toHaveBeenCalledWith(false);

    delete (document as any).caretPositionFromPoint;
  });

  it("falls back if API is missing", () => {
    document.body.innerHTML = `<main><p id="test-p">Hello</p></main>`;
    const p = document.getElementById("test-p") as HTMLElement;

    const mockSelection = {
      removeAllRanges: vi.fn(),
      addRange: vi.fn()
    };
    window.getSelection = () => mockSelection as any;

    const mockRange = {
      setStart: vi.fn(),
      collapse: vi.fn(),
      selectNodeContents: vi.fn()
    };
    document.createRange = () => mockRange as any;

    (document as any).caretRangeFromPoint = undefined;
    (document as any).caretPositionFromPoint = undefined;

    const result = placeCaretFromPoint(p, 100, 100);

    expect(result).toBe(false);
    expect(mockRange.selectNodeContents).toHaveBeenCalledWith(p);
    expect(mockRange.collapse).toHaveBeenCalledWith(false);
  });
});
