import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { AddressInfo } from "node:net";
import { chromium, expect, test as base, BrowserContext, Page } from "@playwright/test";

type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
  demoPageUrl: string;
  presentationActivePrevUrl: string;
};

const CHROME_UNSAFE_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95,
  101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161,
  179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563,
  587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061,
  6000, 6566, 6665, 6666, 6667, 6668, 6669, 6697, 10080
]);

async function listenOnSafePort(server: ReturnType<typeof createServer>): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as AddressInfo).port;
    if (!CHROME_UNSAFE_PORTS.has(port)) {
      return port;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  throw new Error("Failed to allocate a Chrome-safe local test port");
}

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
      const requestPath = new URL(request.url || "/", "http://127.0.0.1").pathname;
      const fixtureName = requestPath.replace(/^\//, "");

      try {
        if (fixtureName.endsWith(".html")) {
          const html = await readFile(path.join(fixturePath, fixtureName), "utf8");
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(html);
          return;
        }
        if (fixtureName === "test-image.png") {
          const image = await readFile(path.join(fixturePath, "test-image.png"));
          response.writeHead(200, { "content-type": "image/png" });
          response.end(image);
          return;
        }
      } catch {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(404);
      response.end("Not found");
    });

    const port = await listenOnSafePort(server);
    await use(`http://127.0.0.1:${port}/demo-page.html`);
    server.close();
  },
  presentationActivePrevUrl: async ({ demoPageUrl }, use) => {
    await use(demoPageUrl.replace("/demo-page.html", "/presentation-active-prev-fixture.html"));
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

  test("8. Long image export", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const exportBtn = page.locator("[data-action='export-long-image']");
    
    // Mock the capture API via our exposed flag
    await page.evaluate(() => {
      (window as any).__MOCK_CAPTURE_VISIBLE_TAB = true;
    });

    await exportBtn.click();
    
    // The UI should hide (clickdeck-exporting added)
    await expect(page.locator("html")).toHaveClass(/clickdeck-exporting/);
    
    // Eventually the export finishes and UI is restored
    await expect(page.locator("html")).not.toHaveClass(/clickdeck-exporting/, { timeout: 10000 });
  });

  test("9. Presentation mode syncs active/prev fixture state", async ({ page, presentationActivePrevUrl }) => {
    await page.goto(presentationActivePrevUrl);
    await activateExtension(page);

    await page.locator("[data-action='present']").click();
    await expect(page.locator("html")).toHaveClass(/clickdeck-presenting/);
    await expect(page.locator("#ap-slide-1")).toHaveClass(/active/);
    await expect(page.locator(".nav-dot").nth(0)).toHaveClass(/active/);

    await page.keyboard.press("ArrowRight");

    await expect(page.locator("#ap-slide-2")).toHaveClass(/active/);
    await expect(page.locator("#ap-slide-1")).toHaveClass(/prev/);
    await expect(page.locator(".nav-dot").nth(1)).toHaveClass(/active/);
    await expect(page.locator("#currentSlide")).toHaveText("2");
    await expect.poll(async () => {
      return page.locator("#ap-slide-2").evaluate((element) => getComputedStyle(element).opacity);
    }).toBe("1");

    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveClass(/clickdeck-presenting/);
    await expect(page.locator("#clickdeck-root")).toBeVisible();
  });

  test("10. Move intent target box label and dashed styles", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();

    // 1. Initially it should create a marker with label "1"
    await page.locator("[data-action='add-intent']").click();
    
    // Draw an intent region
    const mouse = page.mouse;
    await mouse.move(50, 50);
    await mouse.down();
    await mouse.move(150, 150);
    await mouse.up();

    // Check initial marker text
    const marker = page.locator(".clickdeck-intent-region-marker").first();
    await expect(marker).toBeVisible();
    await expect(marker.locator(".clickdeck-intent-region-badge")).toHaveText("1");
    // Ensure border style is solid initially
    await expect(marker).toHaveCSS("border-style", "solid");

    // 2. Click Move to... to switch to move
    const intentDraft = page.locator(".clickdeck-intent-draft");
    const btnTarget = intentDraft.locator(".clickdeck-intent-draft__target-btn");
    await btnTarget.click();

    // The marker should update its label to "1A"
    await expect(marker.locator(".clickdeck-intent-region-badge")).toHaveText("1A");

    // We should not be in draw mode yet. We need to click "Select target region"
    await expect(page.locator(".clickdeck-intent-overlay")).not.toBeVisible();
    await expect(intentDraft.locator(".clickdeck-intent-draft__ghost-btn")).toBeVisible();
    
    // 3. Draw Target B
    await btnTarget.click();
    
    // We are in draw mode, click and drag
    await mouse.move(10, 10);
    await mouse.down();
    await mouse.move(100, 100);
    await mouse.up();

    // A new target marker should appear, should have label "1B" and dashed border
    const targetMarker = page.locator(".clickdeck-intent-region-marker").nth(1);
    await expect(targetMarker).toBeVisible();
    await expect(targetMarker.locator(".clickdeck-intent-region-badge")).toHaveText("1B");
    await expect(targetMarker).toHaveCSS("border-style", "dashed");
  });

  test("11. Move intent target box dragging", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    await page.locator("[data-action='add-intent']").click();
    
    // Draw an intent region
    const mouse = page.mouse;
    await mouse.move(50, 50);
    await mouse.down();
    await mouse.move(150, 150);
    await mouse.up();

    // Click Move to...
    const intentDraft = page.locator(".clickdeck-intent-draft");
    const btnTarget = intentDraft.locator(".clickdeck-intent-draft__target-btn");
    await btnTarget.click();

    // Click Move target box
    const btnGhost = intentDraft.locator(".clickdeck-intent-draft__ghost-btn");
    await btnGhost.click();

    const ghostPreview = page.locator(".clickdeck-ghost-preview");
    await expect(ghostPreview).toBeVisible();

    const initialBox = await ghostPreview.boundingBox();
    expect(initialBox).toBeTruthy();

    // Drag the ghost preview
    await mouse.move(initialBox!.x + 10, initialBox!.y + 10);
    await mouse.down();
    await mouse.move(initialBox!.x + 100, initialBox!.y + 100);
    await mouse.up();

    const newBox = await ghostPreview.boundingBox();
    expect(newBox).toBeTruthy();
    expect(newBox!.x).toBeGreaterThan(initialBox!.x + 50);
    expect(newBox!.y).toBeGreaterThan(initialBox!.y + 50);

    // Click Use this position
    const btnUsePosition = ghostPreview.locator("button[data-action='confirm']");
    await btnUsePosition.click();

    // Verify 1B marker is created and is dashed
    const targetMarker = page.locator(".clickdeck-intent-region-marker", { hasText: "1B" });
    await expect(targetMarker).toBeVisible();
    await expect(targetMarker.locator(".clickdeck-intent-region-badge")).toHaveText("1B");
    await expect(targetMarker).toHaveCSS("border-style", "dashed");

    // Copy AI prompt
    await page.locator("[data-action='copy-ai-prompt']").click();
    const modal = page.locator(".clickdeck-prompt-modal");
    await expect(modal).toBeVisible();
    const promptText = await modal.locator("textarea").inputValue();
    
    expect(promptText).toContain("type: move");
    expect(promptText).toContain("Target B source: dragged target box");
  });

  test("12. Remove intent marker", async ({ page, demoPageUrl }) => {
    await page.goto(demoPageUrl);
    await activateExtension(page);

    const heading = page.getByRole("heading", { name: "Quarterly Product Review" });
    await heading.click();
    await page.locator("[data-action='add-intent']").click();
    
    // Draw an intent region
    const mouse = page.mouse;
    await mouse.move(50, 50);
    await mouse.down();
    await mouse.move(150, 150);
    await mouse.up();

    // Switch to Remove
    const intentDraft = page.locator(".clickdeck-intent-draft");
    const btnRemove = intentDraft.locator(".clickdeck-intent-draft__remove-btn");
    await btnRemove.click();

    // Check marker is dashed and has "1 Del" or "Del"
    const marker = page.locator(".clickdeck-intent-region-marker").first();
    await expect(marker).toHaveCSS("border-style", "dashed");
    await expect(marker.locator(".clickdeck-intent-region-badge")).toContainText("Del");

    // Save with empty note
    await intentDraft.locator("[data-action='save']").click();
    
    // Panel should show [Mark removal] or similar saved state
    await expect(intentDraft.locator(".clickdeck-intent-draft__saved-action")).toBeVisible();
    
    // DOM element should still be visible
    await expect(heading).toBeVisible();

    // Check Prompt
    await page.locator("[data-action='copy-ai-prompt']").click();
    const modal = page.locator(".clickdeck-prompt-modal");
    await expect(modal).toBeVisible();
    const promptText = await modal.locator("textarea").inputValue();
    
    expect(promptText).toContain("type: remove");
    expect(promptText).toContain("Remove the selected region from the source HTML/CSS");
  });

});
