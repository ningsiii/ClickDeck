/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectHtmlContext, startDebugSession } from "./debug-session";

describe("collectHtmlContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("collects report complexity counts for tables, canvases, cards, and fixed elements", () => {
    document.head.innerHTML = `
      <link rel="stylesheet" href="https://cdn.example.com/report.css">
      <script src="https://cdn.example.com/chart.js"></script>
      <style>@media print { body { color: black; } }</style>
    `;
    document.body.innerHTML = `
      <section>
        <table><tbody><tr><td>Freight</td></tr></tbody></table>
        <canvas width="1000" height="700"></canvas>
        <img src="local.png" alt="">
        <div class="card">Card</div>
        <div class="panel" style="position: fixed">Panel</div>
        <div data-card style="position: sticky">Data card</div>
      </section>
    `;

    const context = collectHtmlContext(document);

    expect(context.domNodeCount).toBeGreaterThan(0);
    expect(context.tableCount).toBe(1);
    expect(context.canvasCount).toBe(1);
    expect(context.largeCanvasCount).toBe(1);
    expect(context.imageCount).toBe(1);
    expect(context.sectionCount).toBe(1);
    expect(context.cardLikeCount).toBe(3);
    expect(context.fixedElementCount).toBe(1);
    expect(context.stickyElementCount).toBe(1);
    expect(context.externalStylesheetCount).toBe(1);
    expect(context.externalScriptCount).toBe(1);
    expect(context.hasPrintCss).toBe(true);
  });

  it("does not fail when stylesheet rules cannot be read", () => {
    Object.defineProperty(document, "styleSheets", {
      configurable: true,
      value: [
        {
          get cssRules() {
            throw new DOMException("Stylesheet is cross-origin", "SecurityError");
          },
        },
      ],
    });

    const context = collectHtmlContext(document);

    expect(context.unreadableStyleSheetCount).toBe(1);
    expect(context.hasPrintCss).toBe("unknown");
  });
});

describe("startDebugSession", () => {
  it("keeps export mode, print strategy, manual test guidance, and success caveat in the report", () => {
    const session = startDebugSession("a4");
    session.setPrintStrategy({
      printIframeSize: { width: "794px", height: "1123px" },
      scriptRemovedCount: 2,
      clickDeckUiRemovedCount: 1,
      printCssLength: 123,
      bodyBgColor: "rgb(255, 255, 255)",
      backgroundPolicy: "strip-background-images",
      pageSizePolicy: "a4",
    });
    session.finalize("SUCCESS");

    const report = session.build();

    expect(report.exportMode).toBe("a4");
    expect(report.printStrategy).toMatchObject({
      printIframeSize: { width: "794px", height: "1123px" },
      scriptRemovedCount: 2,
      clickDeckUiRemovedCount: 1,
      pageSizePolicy: "a4",
    });
    expect(report.manualTestGuidance.pdfFileNamePattern).toContain("<fixture-name>");
    expect(report.manualTestGuidance.allowedResults).toContain("color-lost");
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VISUAL_RESULT_UNVERIFIED" }),
      ])
    );
  });
});
