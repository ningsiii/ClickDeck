// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  collectVisualUnits,
  rectsOverlap,
  calculateOverlap,
  isCenterInBox
} from "./visual-units";

describe("Visual Units Core Calculations", () => {
  it("rectsOverlap should accurately detect intersection", () => {
    const a = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };
    const b = { left: 50, top: 50, width: 100, height: 100, right: 150, bottom: 150 };
    const c = { left: 200, top: 200, width: 10, height: 10, right: 210, bottom: 210 };

    expect(rectsOverlap(a, b)).toBe(true);
    expect(rectsOverlap(a, c)).toBe(false);
  });

  it("calculateOverlap should compute area and ratio correctly", () => {
    const a = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 };
    const b = { left: 50, top: 0, width: 100, height: 100, right: 150, bottom: 100 };

    const { overlapArea, overlapRatio } = calculateOverlap(a, b);
    expect(overlapArea).toBe(5000); // 50 * 100
    expect(overlapRatio).toBe(0.5); // 5000 / 10000
  });

  it("isCenterInBox should detect if center point falls inside box", () => {
    const a = { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; // center 50,50
    const box1 = { left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 };
    const box2 = { left: 60, top: 60, width: 100, height: 100, right: 160, bottom: 160 };

    expect(isCenterInBox(a, box1)).toBe(true);
    expect(isCenterInBox(a, box2)).toBe(false);
  });
});

describe("DOM collection and filtering", () => {
  it("collectVisualUnits should identify elements correctly", () => {
    document.body.innerHTML = `
      <div id="container" style="display: block; width: 200px; height: 200px;">
        <p id="text-block" style="display: block; width: 100px; height: 20px;">Hello World</p>
        <button id="btn" style="display: inline-block; width: 50px; height: 20px;">Click me</button>
        <img id="img" style="display: inline-block; width: 10px; height: 10px;" src="test.png" />
        <video id="video" style="display: inline-block; width: 20px; height: 10px;"></video>
      </div>
      <div id="hidden" style="display: none; width: 100px; height: 100px;"></div>
      <div id="clickdeck-ui" data-clickdeck="true" style="display: block; width: 100px; height: 100px;">
        <span style="display: block; width: 10px; height: 10px;">Should be ignored</span>
      </div>
    `;

    // Mock getBoundingClientRect for JSDOM
    document.querySelectorAll('*').forEach(el => {
      const w = parseInt((el as HTMLElement).style.width || "0", 10);
      const h = parseInt((el as HTMLElement).style.height || "0", 10);
      (el as any).getBoundingClientRect = () => ({
        left: 0, top: 0, width: w, height: h, right: w, bottom: h
      });
    });

    // Mock Range for JSDOM
    document.createRange = () => {
      const range = new Range();
      range.getClientRects = () => {
        return [{ left: 0, top: 0, width: 100, height: 20, right: 100, bottom: 20 }] as unknown as DOMRectList;
      };
      return range;
    };

    const units = collectVisualUnits(document.body);
    
    // We expect:
    // - div#container (block)
    // - p#text-block (textBlock)
    // - textLine inside p
    // - button#btn (interactive)
    // - textLine inside button
    // - img#img (image)
    // - video#video (video)
    //
    // Total 6 units.
    
    // Check that we don't have clickdeck ui or hidden items
    expect(units.find(u => u.element.id === "hidden")).toBeUndefined();
    expect(units.find(u => u.element.id === "clickdeck-ui")).toBeUndefined();
    expect(units.find(u => u.element.textContent === "Should be ignored")).toBeUndefined();

    // The container block
    const container = units.find(u => u.element.id === "container" && u.kind === "block");
    expect(container).toBeDefined();

    // The text block
    const p = units.find(u => u.element.id === "text-block" && u.kind === "textBlock");
    expect(p).toBeDefined();

    // The interactive
    const btn = units.find(u => u.element.id === "btn" && u.kind === "interactive");
    expect(btn).toBeDefined();

    // The image
    const img = units.find(u => u.element.id === "img" && u.kind === "image");
    expect(img).toBeDefined();

    const video = units.find(u => u.element.id === "video" && u.kind === "video");
    expect(video).toBeDefined();
  });

  it("collectVisualUnits should extract textSnippet from form inputs and table cells", () => {
    document.body.innerHTML = `
      <div id="form-container" style="display: block; width: 500px; height: 500px;">
        <input type="text" id="text-input" value="Hello Input" style="display: block; width: 100px; height: 20px;" />
        <input type="number" id="num-input" value="42" style="display: block; width: 100px; height: 20px;" />
        <input type="password" id="pass-input" value="secret" style="display: block; width: 100px; height: 20px;" />
        <textarea id="textarea" style="display: block; width: 100px; height: 50px;">Text area content</textarea>
        
        <select id="select-single" style="display: block; width: 100px; height: 20px;">
          <option value="1">Option 1</option>
          <option value="2" selected>Option 2</option>
        </select>
        
        <select id="select-multi" multiple style="display: block; width: 100px; height: 50px;">
          <option value="A" selected>Apple</option>
          <option value="B" selected>Banana</option>
          <option value="C">Cherry</option>
        </select>

        <table style="display: block; width: 200px; height: 100px;">
          <tr>
            <td id="table-cell" style="display: table-cell; width: 100px; height: 50px;">Cell <span style="display:inline-block;width:10px;height:10px;">Data</span></td>
          </tr>
        </table>
      </div>
    `;

    document.querySelectorAll('*').forEach(el => {
      const w = parseInt((el as HTMLElement).style.width || "0", 10);
      const h = parseInt((el as HTMLElement).style.height || "0", 10);
      (el as any).getBoundingClientRect = () => ({
        left: 0, top: 0, width: w, height: h, right: w, bottom: h
      });
    });

    const units = collectVisualUnits(document.body);

    const textInput = units.find(u => u.element.id === "text-input");
    expect(textInput?.kind).toBe("interactive");
    expect(textInput?.textSnippet).toBe("Hello Input");

    const numInput = units.find(u => u.element.id === "num-input");
    expect(numInput?.kind).toBe("interactive");
    expect(numInput?.textSnippet).toBe("42");

    const passInput = units.find(u => u.element.id === "pass-input");
    expect(passInput?.kind).toBe("interactive");
    expect(passInput?.textSnippet).toBeUndefined();

    const textarea = units.find(u => u.element.id === "textarea");
    expect(textarea?.kind).toBe("interactive");
    expect(textarea?.textSnippet).toBe("Text area content");

    const selectSingle = units.find(u => u.element.id === "select-single");
    expect(selectSingle?.kind).toBe("interactive");
    expect(selectSingle?.textSnippet).toBe("Option 2");

    const selectMulti = units.find(u => u.element.id === "select-multi");
    expect(selectMulti?.kind).toBe("interactive");
    expect(selectMulti?.textSnippet).toBe("Apple, Banana");

    const td = units.find(u => u.element.id === "table-cell" && u.kind === "textBlock");
    expect(td).toBeDefined();
    expect(td?.textSnippet).toBe("Cell Data");
  });
});
