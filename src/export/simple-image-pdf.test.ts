/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { downloadPdfBlob, SimpleImagePdf } from "./simple-image-pdf";

describe("SimpleImagePdf", () => {
  it("writes a local image-only PDF without external script helpers", async () => {
    const pdf = new SimpleImagePdf();
    const firstPage = pdf.addPage(100, 200);
    const secondPage = pdf.addPage(300, 150);

    pdf.addJpegImage(firstPage, "data:image/jpeg;base64,/9j/", {
      pixelWidth: 10,
      pixelHeight: 20,
      x: 0,
      y: 0,
      width: 100,
      height: 200
    });
    pdf.addJpegImage(secondPage, "data:image/jpeg;base64,/9j/", {
      pixelWidth: 30,
      pixelHeight: 15,
      x: 5,
      y: 10,
      width: 90,
      height: 45
    });

    const text = await pdf.toBlob().text();

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("/Subtype /Image");
    expect(text).toContain("/Filter /DCTDecode");
    expect(text).not.toContain("data:text/javascript");
    expect(text).not.toContain("eval(");
    expect(text).not.toContain("new Function");
  });

  it("downloads the PDF through a local blob URL", () => {
    URL.createObjectURL = vi.fn(() => "blob:clickdeck-pdf");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();

    downloadPdfBlob(new Blob(["pdf"], { type: "application/pdf" }), "clickdeck.pdf");

    const anchor = document.querySelector<HTMLAnchorElement>("a[data-clickdeck='true']");
    expect(anchor).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });
});
