// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { findComplexElementFromTarget, getComplexElementKind, getComplexElementPromptNotes } from "./complex-elements";

describe("complex element detection", () => {
  it("resolves SVG children to the outer svg", () => {
    document.body.innerHTML = `
      <svg id="chart"><g><path id="bar" d="M0 0L10 10"></path></g></svg>
    `;

    const svg = document.getElementById("chart");
    const path = document.getElementById("bar");

    expect(getComplexElementKind(svg)).toBe("svg");
    expect(findComplexElementFromTarget(path)).toBe(svg);
  });

  it("detects canvas, iframe, MathML, KaTeX, and MathJax", () => {
    document.body.innerHTML = `
      <canvas id="c"></canvas>
      <iframe id="f" srcdoc="<p>Hello</p>"></iframe>
      <math id="m"><mn>1</mn></math>
      <span id="k" class="katex"><span>1/2</span></span>
      <mjx-container id="mjx"></mjx-container>
    `;

    expect(getComplexElementKind(document.getElementById("c"))).toBe("canvas");
    expect(getComplexElementKind(document.getElementById("f"))).toBe("iframe");
    expect(getComplexElementKind(document.getElementById("m"))).toBe("formula");
    expect(getComplexElementKind(document.getElementById("k"))).toBe("formula");
    expect(getComplexElementKind(document.getElementById("mjx"))).toBe("formula");
  });

  it("describes iframe without dumping srcdoc", () => {
    document.body.innerHTML = `<iframe id="f" srcdoc="<main><p>Secret full content</p></main>"></iframe>`;
    const iframe = document.getElementById("f") as HTMLIFrameElement;

    const notes = getComplexElementPromptNotes(iframe, false).join("\n");

    expect(notes).toContain("iframe / srcdoc");
    expect(notes).toContain("has srcdoc");
    expect(notes).not.toContain("Secret full content");
  });
});
