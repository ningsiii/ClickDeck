type PdfImage = {
  data: Uint8Array;
  pixelWidth: number;
  pixelHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfPage = {
  width: number;
  height: number;
  images: PdfImage[];
};

const encoder = new TextEncoder();

function ascii(value: string): Uint8Array {
  return encoder.encode(value);
}

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid image data URL");
  }
  const header = dataUrl.slice(0, commaIndex).toLowerCase();
  if (!header.startsWith("data:image/jpeg") && !header.startsWith("data:image/jpg")) {
    throw new Error("Only JPEG image data URLs can be embedded into ClickDeck PDF");
  }

  const payload = dataUrl.slice(commaIndex + 1);
  const binary = header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizeSize(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}

function pdfNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.parseFloat(value.toFixed(3)).toString();
}

export class SimpleImagePdf {
  private pages: PdfPage[] = [];

  addPage(width: number, height: number): number {
    this.pages.push({
      width: normalizeSize(width),
      height: normalizeSize(height),
      images: []
    });
    return this.pages.length - 1;
  }

  addJpegImage(pageIndex: number, dataUrl: string, options: {
    pixelWidth: number;
    pixelHeight: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    const page = this.pages[pageIndex];
    if (!page) {
      throw new Error("PDF page does not exist");
    }

    page.images.push({
      data: dataUrlToBytes(dataUrl),
      pixelWidth: normalizeSize(options.pixelWidth),
      pixelHeight: normalizeSize(options.pixelHeight),
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height
    });
  }

  toBlob(): Blob {
    if (this.pages.length === 0) {
      throw new Error("Cannot save an empty PDF");
    }

    const objects: Uint8Array[] = [];
    const catalogId = 1;
    const pagesId = 2;
    let nextObjectId = 3;
    const pageObjectIds: number[] = [];
    const pageData = this.pages.map((page) => {
      const pageId = nextObjectId++;
      const contentId = nextObjectId++;
      const imageIds = page.images.map(() => nextObjectId++);
      pageObjectIds.push(pageId);
      return { page, pageId, contentId, imageIds };
    });

    objects[catalogId] = ascii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId] = ascii(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);

    for (const data of pageData) {
      const xObjectEntries = data.imageIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
      objects[data.pageId] = ascii([
        "<<",
        "/Type /Page",
        `/Parent ${pagesId} 0 R`,
        `/MediaBox [0 0 ${pdfNumber(data.page.width)} ${pdfNumber(data.page.height)}]`,
        `/Resources << /XObject << ${xObjectEntries} >> >>`,
        `/Contents ${data.contentId} 0 R`,
        ">>"
      ].join(" "));

      const commands = data.page.images.map((image, index) => {
        const drawY = data.page.height - image.y - image.height;
        return [
          "q",
          `${pdfNumber(image.width)} 0 0 ${pdfNumber(image.height)} ${pdfNumber(image.x)} ${pdfNumber(drawY)} cm`,
          `/Im${index + 1} Do`,
          "Q"
        ].join("\n");
      }).join("\n");
      const content = ascii(commands);
      objects[data.contentId] = concatChunks([
        ascii(`<< /Length ${content.length} >>\nstream\n`),
        content,
        ascii("\nendstream")
      ]);

      data.page.images.forEach((image, index) => {
        const imageId = data.imageIds[index];
        objects[imageId] = concatChunks([
          ascii([
            "<<",
            "/Type /XObject",
            "/Subtype /Image",
            `/Width ${image.pixelWidth}`,
            `/Height ${image.pixelHeight}`,
            "/ColorSpace /DeviceRGB",
            "/BitsPerComponent 8",
            "/Filter /DCTDecode",
            `/Length ${image.data.length}`,
            ">>",
            "stream\n"
          ].join(" ")),
          image.data,
          ascii("\nendstream")
        ]);
      });
    }

    const chunks: Uint8Array[] = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets: number[] = [0];
    let offset = chunks[0].length;

    for (let id = 1; id < objects.length; id++) {
      const objectBody = objects[id];
      if (!objectBody) {
        continue;
      }
      offsets[id] = offset;
      const objectChunk = concatChunks([
        ascii(`${id} 0 obj\n`),
        objectBody,
        ascii("\nendobj\n")
      ]);
      chunks.push(objectChunk);
      offset += objectChunk.length;
    }

    const xrefOffset = offset;
    const xrefRows = ["xref", `0 ${objects.length}`, "0000000000 65535 f "];
    for (let id = 1; id < objects.length; id++) {
      xrefRows.push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n `);
    }
    chunks.push(ascii(`${xrefRows.join("\n")}\n`));
    chunks.push(ascii([
      "trailer",
      `<< /Size ${objects.length} /Root ${catalogId} 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF"
    ].join("\n")));

    const pdfBytes = concatChunks(chunks);
    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
    return new Blob([pdfBuffer], { type: "application/pdf" });
  }
}

export function imageElementToJpegDataUrl(img: HTMLImageElement, quality = 0.9): { dataUrl: string; pixelWidth: number; pixelHeight: number } {
  const pixelWidth = normalizeSize(img.naturalWidth || img.width);
  const pixelHeight = normalizeSize(img.naturalHeight || img.height);
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context for PDF image conversion");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  canvas.width = 0;
  canvas.height = 0;
  return { dataUrl, pixelWidth, pixelHeight };
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.dataset.clickdeck = "true";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
