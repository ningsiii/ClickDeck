// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { findComplexElementFromTarget, getComplexElementKind, getComplexElementPromptNotes, getSvgTextEditState } from "./complex-elements";

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

  it("detects simple editable svg text and tspan content", () => {
    document.body.innerHTML = `
      <svg id="chart">
        <text id="plain-text">Hello</text>
        <text id="tspan-text"><tspan id="leaf-tspan">World</tspan></text>
      </svg>
    `;

    const svg = document.querySelector("svg#chart") as SVGSVGElement | null;
    const state = getSvgTextEditState(svg);

    expect(state?.mode).toBe("editable");
    if (state?.mode !== "editable") {
      return;
    }
    expect(state.items).toHaveLength(2);
    expect(state.items.map((item) => item.value)).toEqual(["Hello", "World"]);
    expect(state.items[0].target.id).toBe("plain-text");
    expect(state.items[1].target.id).toBe("leaf-tspan");
  });

  it("marks unsupported svg text structures as complex", () => {
    document.body.innerHTML = `
      <svg id="chart">
        <text><textPath href="#curve">Curved</textPath></text>
      </svg>
    `;

    const svg = document.querySelector("svg#chart") as SVGSVGElement | null;
    const state = getSvgTextEditState(svg);

    expect(state?.mode).toBe("complex");
  });

  it("describes svg text node edits as inline SVG changes", () => {
    document.body.innerHTML = `
      <svg id="chart">
        <text><tspan id="leaf-tspan">World</tspan></text>
      </svg>
    `;

    const tspan = document.querySelector("tspan#leaf-tspan") as SVGTSpanElement | null;
    expect(tspan).not.toBeNull();
    if (!tspan) {
      return;
    }
    const notes = getComplexElementPromptNotes(tspan, false).join("\n");

    expect(notes).toContain("inline SVG");
    expect(notes).toContain("Only detected simple SVG text content is changed");
  });
});
