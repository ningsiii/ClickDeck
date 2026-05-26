import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AddressInfo } from "node:net";
import { chromium, expect, test as base, BrowserContext, Page } from "@playwright/test";

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  demoPageUrl: string;
};

const test = base.extend<ExtensionFixtures>({
  page: async ({}, use) => {
    const projectRoot = process.cwd();
    const extensionPath = path.join(projectRoot, "dist");
    const context = await chromium.launchPersistentContext("", {
      channel: "msedge",
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    
    // A persistent context has one page by default
    const page = context.pages()[0] || await context.newPage();
    await use(page);
    await context.close();
  },
  demoPageUrl: async ({}, use) => {
    const projectRoot = process.cwd();
    const fixturePath = path.join(projectRoot, "fixtures");
    const server = createServer(async (request, response) => {
      if (request.url === "/demo-page.html") {
        const html = await readFile(path.join(fixturePath, "demo-page.html"), "utf8");
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(html);
      } else if (request.url === "/test-image.png") {
        const image = await readFile(path.join(fixturePath, "test-image.png"));
        response.writeHead(200, { "content-type": "image/png" });
        response.end(image);
      } else {
        response.writeHead(404);
        response.end("Not found");
      }
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    await use(`http://127.0.0.1:${port}/demo-page.html`);
    server.close();
  }
});

// Helper to activate extension on a page
async function activateExtension(page: Page) {
  await page.keyboard.press("Alt+Shift+C");
  await expect(page.locator("#clickdeck-root")).toBeVisible();
}

test.describe("ClickDeck core editing workflows", () => {
  test("loads the extension and applies a style change on a page element", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    const initialFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);

    await heading.click();
    await page.locator("[data-action='font-larger']").click();

    const updatedFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    expect(parseFloat(updatedFontSize)).toBeGreaterThan(parseFloat(initialFontSize));

    const initialFontWeight = await heading.evaluate((element) => getComputedStyle(element).fontWeight);
    await page.locator("[data-action='weight-increase']").click();
    const updatedFontWeight = await heading.evaluate((element) => getComputedStyle(element).fontWeight);
    
    // font-weight should be greater or bolder
    const fwCurrent = initialFontWeight === "normal" ? 400 : (initialFontWeight === "bold" ? 700 : parseInt(initialFontWeight));
    const fwNext = updatedFontWeight === "normal" ? 400 : (updatedFontWeight === "bold" ? 700 : parseInt(updatedFontWeight));
    expect(fwNext).toBeGreaterThan(fwCurrent);

    await page.locator("[data-action='undo']").click();
    const undoneFontWeight = await heading.evaluate((element) => getComputedStyle(element).fontWeight);
    expect(undoneFontWeight).toBe(initialFontWeight);

    await page.locator("[data-action='undo']").click();
    const undoneFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    expect(undoneFontSize).toBe(initialFontSize);
  });

  test("1. Esc cancels selection", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    
    // Outline should be visible around the heading
    const root = page.locator("#clickdeck-root");
    const outline = root.locator(".clickdeck-outline");
    await expect(outline).toBeVisible();
    
    // Press Esc
    await page.keyboard.press("Escape");
    await page.mouse.move(0, 0); // Move mouse away so hover outline doesn't stay
    
    // Outline should be hidden
    await expect(outline).toBeHidden();
    
    // The panel shouldn't even show typography controls when nothing is selected (Task 29 logic)
    const fontLargerBtn = page.locator("[data-action='font-larger']");
    await expect(fontLargerBtn).toBeHidden();
  });

  test("2. Tab/Shift+Tab switches selection", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    // Select the first span inside the article
    const span = page.locator("article span").first();
    await span.click();
    
    const panelHint = page.locator(".clickdeck-panel__hint");
    await expect(panelHint).toContainText("span");
    
    // Press tab to select parent
    await page.keyboard.press("Tab");
    
    // Should now select the article
    await expect(panelHint).toContainText("article");
    
    // Press Shift+Tab to go back to the first child (strong)
    await page.keyboard.press("Shift+Tab");
    // Just expect it to change from article (to strong or whatever first child is)
    await expect(panelHint).not.toContainText("article");
  });

  test("3. Prompt generation includes locators", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    await page.locator("[data-action='font-larger']").click();

    await page.locator("[data-action='copy-ai-prompt']").click();
    
    const modal = page.locator(".clickdeck-prompt-modal");
    await expect(modal).toBeVisible();
    
    const textarea = modal.locator("textarea");
    const promptText = await textarea.inputValue();
    
    expect(promptText).toContain("Quarterly Product Review"); // locator context
    expect(promptText).toContain("fontSize");
  });

  test("4. Prompt does not include undone changes", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    await page.locator("[data-action='font-larger']").click();
    
    const p = page.locator("p").first();
    await p.click();
    await page.locator("[data-action='font-smaller']").click();
    
    // Undo the second change
    await page.locator("[data-action='undo']").click();
    
    // Open prompt
    await page.locator("[data-action='copy-ai-prompt']").click();
    const modal = page.locator(".clickdeck-prompt-modal");
    await expect(modal).toBeVisible();

    const promptText = await modal.locator("textarea").inputValue();
    
    // Should contain the first change (font-size on heading)
    expect(promptText).toContain("Quarterly Product Review");
    // Should NOT contain the second change (on the p element)
    expect(promptText).not.toContain("This page is a stable local fixture");
  });

  test("5. Image replace with undo/redo", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const img = page.locator("#test-image");
    await img.click();
    
    // Initial src
    const initialSrc = await img.evaluate((element: HTMLImageElement) => element.src);
    
    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator("[data-action='replace-image']").click();
    const fileChooser = await fileChooserPromise;
    
    // Point to the same test image just as a file payload to simulate upload
    const projectRoot = process.cwd();
    await fileChooser.setFiles(path.join(projectRoot, "fixtures", "test-image.png"));
    
    // Wait for the src to update to data URI
    await expect(img).not.toHaveAttribute("src", initialSrc);
    const dataUrlSrc = await img.evaluate((element: HTMLImageElement) => element.src);
    expect(dataUrlSrc).toContain("data:image/");
    
    // Undo
    await page.locator("[data-action='undo']").click();
    await expect(img).toHaveJSProperty("src", initialSrc);
    
    // Redo
    await page.locator("[data-action='redo']").click();
    await expect(img).toHaveJSProperty("src", dataUrlSrc);
  });

  test("6. Save/Restore persistence", async ({ page, demoPageUrl }) => {
    // Clear storage first
    await page.goto(demoPageUrl);
    await page.evaluate(() => {
      // Clear chrome storage if accessible, or just rely on the controller logic
      if ((window as any).chrome?.storage?.local) {
        (window as any).chrome.storage.local.clear();
      }
    });

    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    const initialFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    
    await heading.click();
    await page.locator("[data-action='font-larger']").click();
    
    const updatedFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    
    // Reload page
    await page.reload();
    
    // Heading should be back to initial state before clickdeck is activated
    const resetFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    expect(resetFontSize).toBe(initialFontSize);
    
    // Activate extension again, it should detect saved edits and show notice
    await activateExtension(page);
    
    const notice = page.locator(".clickdeck-notice");
    await expect(notice).toBeVisible();
    
    // Click Restore
    await page.locator("[data-notice-action='restore']").click();
    
    // Heading should have the updated font size applied
    const restoredFontSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
    expect(restoredFontSize).toBe(updatedFontSize);
    
    // Notice should be gone
    await expect(notice).toBeHidden();
  });

  test("7. Panel collapse and transparency", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const root = page.locator("#clickdeck-root");
    const panel = root.locator(".clickdeck-panel");
    const content = panel.locator(".clickdeck-panel__content-wrapper");
    const floatBtn = panel.locator(".clickdeck-panel__floating-button");

    // Initially, content is visible, float btn is hidden
    await expect(content).toBeVisible();
    await expect(floatBtn).toBeHidden();
    await expect(panel).not.toHaveClass(/clickdeck-panel--collapsed/);

    // Click transparency twice
    const transBtn = panel.locator("[data-internal-action='transparency']");
    await transBtn.click();
    await expect(panel).toHaveClass(/clickdeck-panel--opacity-70/);
    await transBtn.click();
    await expect(panel).toHaveClass(/clickdeck-panel--opacity-40/);
    await transBtn.click();
    await expect(panel).not.toHaveClass(/clickdeck-panel--opacity-70/);
    await expect(panel).not.toHaveClass(/clickdeck-panel--opacity-40/);

    // Click collapse
    await panel.locator("[data-internal-action='collapse']").click();
    await expect(panel).toHaveClass(/clickdeck-panel--collapsed/);
    // Use evaluate to check display:none because playwright's toBeHidden might check bounding box, but floatBtn is visible inside it.
    await expect(content).not.toBeVisible();
    await expect(floatBtn).toBeVisible();

    // Verify keyboard tools still work while collapsed
    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    
    // Select and press Esc
    await page.keyboard.press("Escape");
    await page.mouse.move(0, 0); // Move mouse away
    const outline = root.locator(".clickdeck-outline");
    await expect(outline).toBeHidden(); // Esc works!

    // Click floating button to restore
    await floatBtn.click();
    await expect(panel).not.toHaveClass(/clickdeck-panel--collapsed/);
    await expect(content).toBeVisible();
    await expect(floatBtn).toBeHidden();
  });
});
