// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { canAutoStartTextEditing, createElementLocator } from "./dom-utils";

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
