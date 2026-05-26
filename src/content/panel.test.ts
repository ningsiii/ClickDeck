// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createPanel } from "./panel";

describe("createPanel selection context", () => {
  it("enables image tools for image context", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("image");
    panel.setReplaceImageAvailability(true);

    const imageSection = panel.element.querySelector<HTMLElement>("[data-section='image']");
    const replaceButton = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-image']");
    expect(imageSection?.hidden).toBe(false);
    expect(replaceButton?.disabled).toBe(false);

    panel.destroy();
  });

  it("disables image replace for text context", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("text");
    panel.setReplaceImageAvailability(true);

    const imageSection = panel.element.querySelector<HTMLElement>("[data-section='image']");
    const replaceButton = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-image']");
    expect(imageSection?.hidden).toBe(true);
    expect(replaceButton?.disabled).toBe(true);

    panel.destroy();
  });

  it("keeps finish and diagnostics visible when no selection", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("none");

    const finishSection = panel.element.querySelector<HTMLElement>("[data-section='finish']");
    const diagnosticsSection = panel.element.querySelector<HTMLElement>("[data-section='diagnostics']");
    const typographySection = panel.element.querySelector<HTMLElement>("[data-section='typography']");

    expect(finishSection?.hidden).toBe(false);
    expect(diagnosticsSection?.hidden).toBe(false);
    expect(typographySection?.hidden).toBe(true);

    panel.destroy();
  });
});

describe("createPanel saved edits notice", () => {
  it("shows Restore/Dismiss/Clear buttons and handles callbacks", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    let restoreCalled = false;
    let dismissCalled = false;
    let clearCalled = false;

    panel.showSavedEditsNotice({
      count: 5,
      onRestore: () => { restoreCalled = true; },
      onDismiss: () => { dismissCalled = true; },
      onClear: () => { clearCalled = true; }
    });

    const notice = panel.element.querySelector<HTMLElement>(".clickdeck-notice");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain("5"); // count

    const restoreBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='restore']");
    const dismissBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='dismiss']");
    const clearBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='clear']");

    expect(restoreBtn).not.toBeNull();
    expect(dismissBtn).not.toBeNull();
    expect(clearBtn).not.toBeNull();

    restoreBtn?.click();
    expect(restoreCalled).toBe(true);

    dismissBtn?.click();
    expect(dismissCalled).toBe(true);

    clearBtn?.click();
    expect(clearCalled).toBe(true);

    panel.destroy();
  });

  it("hides saved edits notice", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.showSavedEditsNotice({
      count: 1,
      onRestore: () => {},
      onDismiss: () => {},
      onClear: () => {}
    });

    expect(panel.element.querySelector(".clickdeck-notice")).not.toBeNull();

    panel.hideSavedEditsNotice();
    expect(panel.element.querySelector(".clickdeck-notice")).toBeNull();

    panel.destroy();
  });
});

