import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AddressInfo } from "node:net";
import { chromium, expect, test } from "@playwright/test";

test("loads the extension and applies a style change on a page element", async () => {
  const projectRoot = process.cwd();
  const extensionPath = path.join(projectRoot, "dist");
  const fixturePath = path.join(projectRoot, "fixtures", "demo-page.html");
  const server = await serveFile(fixturePath);
  const port = (server.address() as AddressInfo).port;

  const context = await chromium.launchPersistentContext("", {
    channel: "msedge",
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/demo-page.html`);

    await page.keyboard.press("Alt+Shift+C");
    await expect(page.locator("#clickdeck-root")).toBeVisible();

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    const initialFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);

    await heading.click();
    await page.getByRole("button", { name: "A+" }).click();

    const updatedFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);

    expect(parseFloat(updatedFontSize)).toBeGreaterThan(parseFloat(initialFontSize));
  } finally {
    await context.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

async function serveFile(filePath: string): Promise<Server> {
  const html = await readFile(filePath, "utf8");
  const server = createServer((request, response) => {
    if (request.url !== "/demo-page.html") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  return server;
}
