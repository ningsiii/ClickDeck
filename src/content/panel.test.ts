// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createPanel } from "./panel";

describe("createPanel selection context", () => {
  it("enables image tools for image context", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("image");
    panel.setReplaceMediaAvailability(true, "image");

    const imageSection = panel.element.querySelector<HTMLElement>("[data-section='image-basic']");
    const replaceButton = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-image']");
    expect(imageSection?.hidden).toBe(false);
    expect(replaceButton?.disabled).toBe(false);

    panel.destroy();
  });

  it("disables image replace for text context", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("text");
    panel.setReplaceMediaAvailability(true, "image");

    const imageSection = panel.element.querySelector<HTMLElement>("[data-section='image-basic']");
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

  it("places intent before AI prompt and output sections", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    const sections = Array.from(panel.element.querySelectorAll<HTMLElement>("[data-section]")).map(
      (section) => section.dataset.section
    );

    expect(sections.indexOf("intent")).toBeLessThan(sections.indexOf("ai-prompt"));
    expect(sections.indexOf("ai-prompt")).toBeLessThan(sections.indexOf("finish"));

    panel.destroy();
  });

  it("uses widened media source buttons and compact +/- size controls", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    const replaceImage = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-image']");
    const replaceVideo = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-video']");
    const smaller = panel.element.querySelector<HTMLButtonElement>("[data-action='image-width-smaller']");
    const larger = panel.element.querySelector<HTMLButtonElement>("[data-action='image-width-larger']");
    const sourceGroup = panel.element.querySelector<HTMLElement>(".clickdeck-panel__group--media-replace");
    const sizeGroup = panel.element.querySelector<HTMLElement>(".clickdeck-panel__group--media-size");

    expect(replaceImage?.textContent).toBe("Replace image");
    expect(replaceVideo?.textContent).toBe("Replace video");
    expect(replaceImage?.classList.contains("clickdeck-button--media-source")).toBe(true);
    expect(replaceVideo?.classList.contains("clickdeck-button--media-source")).toBe(true);
    expect(smaller?.textContent).toBe("-");
    expect(larger?.textContent).toBe("+");
    expect(smaller?.classList.contains("clickdeck-button--media-size")).toBe(true);
    expect(larger?.classList.contains("clickdeck-button--media-size")).toBe(true);
    expect(sourceGroup).not.toBeNull();
    expect(sizeGroup).not.toBeNull();

    panel.destroy();
  });

  it("shows complex element notice and only safe whole-block controls for SVG", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("svg");
    panel.setReplaceMediaAvailability(false, "none");

    const notice = panel.element.querySelector<HTMLElement>(".clickdeck-panel__complex-notice");
    const complexSize = panel.element.querySelector<HTMLElement>("[data-section='complex-basic']");
    const typography = panel.element.querySelector<HTMLElement>("[data-section='typography']");
    const imageBasic = panel.element.querySelector<HTMLElement>("[data-section='image-basic']");
    const imageAdvanced = panel.element.querySelector<HTMLElement>("[data-section='image-advanced']");
    const spacing = panel.element.querySelector<HTMLElement>("[data-section='spacing']");
    const undo = panel.element.querySelector<HTMLButtonElement>("[data-action='undo']");

    expect(notice?.hidden).toBe(false);
    expect(notice?.textContent).toContain("Selected: svg");
    expect(complexSize?.hidden).toBe(false);
    expect(typography?.hidden).toBe(true);
    expect(imageBasic?.hidden).toBe(true);
    expect(imageAdvanced?.hidden).toBe(true);
    expect(spacing?.hidden).toBe(false);
    expect(undo?.disabled).toBe(true);

    panel.destroy();
  });

  it("shows formula and iframe limitation notices", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("formula");
    expect(panel.element.querySelector(".clickdeck-panel__complex-notice")?.textContent).toContain("Selected: formula");
    expect(panel.element.querySelector(".clickdeck-panel__complex-notice")?.textContent).toContain("source formula");

    panel.setSelectionContext("iframe");
    expect(panel.element.querySelector(".clickdeck-panel__complex-notice")?.textContent).toContain("Selected: iframe");
    expect(panel.element.querySelector(".clickdeck-panel__complex-notice")?.textContent).toContain("Embedded iframe");

    panel.destroy();
  });

  it("keeps canvas in safe whole-block mode without text or media replacement controls", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("canvas");
    panel.setReplaceMediaAvailability(true, "image");

    const notice = panel.element.querySelector<HTMLElement>(".clickdeck-panel__complex-notice");
    const typography = panel.element.querySelector<HTMLElement>("[data-section='typography']");
    const imageBasic = panel.element.querySelector<HTMLElement>("[data-section='image-basic']");
    const replaceImage = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-image']");
    const replaceVideo = panel.element.querySelector<HTMLButtonElement>("[data-action='replace-video']");

    expect(notice?.textContent).toContain("Selected: canvas");
    expect(typography?.hidden).toBe(true);
    expect(imageBasic?.hidden).toBe(true);
    expect(replaceImage?.style.display).toBe("none");
    expect(replaceVideo?.style.display).toBe("none");

    panel.destroy();
  });
});

describe("createPanel saved edits notice", () => {
  it("shows Restore/Clear buttons and handles callbacks", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    let restoreCalled = false;
    let clearCalled = false;

    panel.showSavedEditsNotice({
      count: 5,
      onRestore: () => { restoreCalled = true; },
      onClear: () => { clearCalled = true; }
    });

    const notice = panel.element.querySelector<HTMLElement>(".clickdeck-notice");
    expect(notice).not.toBeNull();
    expect(notice?.textContent).toContain("5"); // count

    const restoreBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='restore']");
    const dismissBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='dismiss']");
    const clearBtn = notice?.querySelector<HTMLButtonElement>("[data-notice-action='clear']");

    expect(restoreBtn).not.toBeNull();
    expect(dismissBtn).toBeNull();
    expect(clearBtn).not.toBeNull();

    restoreBtn?.click();
    expect(restoreCalled).toBe(true);

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
      onClear: () => {}
    });

    expect(panel.element.querySelector(".clickdeck-notice")).not.toBeNull();

    panel.hideSavedEditsNotice();
    expect(panel.element.querySelector(".clickdeck-notice")).toBeNull();

    panel.destroy();
  });
});

describe("createPanel export controls", () => {
  it("hides legacy PDF export buttons by default but keeps HTML export", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    expect(panel.element.querySelector("[data-action='export-html']")).not.toBeNull();
    expect(panel.element.querySelector("[data-action='export-pdf-long']")).toBeNull();
    expect(panel.element.querySelector("[data-action='export-pdf-a4']")).toBeNull();
    expect(panel.element.querySelector("[data-action='export-pdf-slides']")).toBeNull();

    panel.destroy();
  });

  it("enables export actions initially when currentContext is none", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("none");

    const exportHtml = panel.element.querySelector<HTMLButtonElement>("[data-action='export-html']");
    const exportLongImage = panel.element.querySelector<HTMLButtonElement>("[data-action='export-long-image']");
    const exportPdfLong = panel.element.querySelector<HTMLButtonElement>("[data-action='export-image-pdf-long']");
    const exportPdfA4 = panel.element.querySelector<HTMLButtonElement>("[data-action='export-image-pdf-a4']");
    const exportPdfSlides = panel.element.querySelector<HTMLButtonElement>("[data-action='export-image-pdf-slides']");
    const addIntent = panel.element.querySelector<HTMLButtonElement>("[data-action='add-intent']");
    const alignLeft = panel.element.querySelector<HTMLButtonElement>("[data-action='align-left']");

    expect(exportHtml?.disabled).toBe(false);
    expect(exportLongImage?.disabled).toBe(false);
    expect(exportPdfLong?.disabled).toBe(false);
    expect(exportPdfA4?.disabled).toBe(false);
    expect(exportPdfSlides?.disabled).toBe(false);
    expect(addIntent?.disabled).toBe(false);
    expect(alignLeft?.disabled).toBe(true);

    panel.destroy();
  });
});

describe("createPanel Ask Gemini section", () => {
  it("renders Ask Gemini section with three buttons", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    const group = panel.element.querySelector<HTMLDivElement>(".clickdeck-panel__group--ask-gemini");
    expect(group).not.toBeNull();

    const btnFlow = group?.querySelector("[data-action='ask-gemini-flow']");
    const btnFocus = group?.querySelector("[data-action='ask-gemini-focus']");
    const btnInteraction = group?.querySelector("[data-action='ask-gemini-interaction']");

    expect(btnFlow).not.toBeNull();
    expect(btnFocus).not.toBeNull();
    expect(btnInteraction).not.toBeNull();

    expect(btnFlow?.getAttribute("title")).toBeTruthy();
    expect(btnFlow?.getAttribute("aria-label")).toBeTruthy();

    const panelHtml = panel.element.innerHTML;
    expect(panelHtml).not.toContain("Paste into Chrome Ask Gemini");
    expect(panelHtml).not.toContain("优先粘贴到");
    expect(panelHtml).toContain("Use with an AI that can see the current page"); // English hint by default in tests (navigator language fallback)

    panel.destroy();
  });
});

describe("createPanel prompt preview language roles", () => {
  it("shows English as the primary execution view and Chinese as reference", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.showPromptPreview({
      promptEn: "English prompt body",
      promptZh: "中文参考说明\n\nChinese prompt body",
      hasMediaReplacement: false,
      onCopy: () => undefined
    });

    const overlay = panel.element.querySelector<HTMLElement>(".clickdeck-prompt-overlay");
    expect(overlay?.textContent).toContain("English is the primary execution prompt");
    expect(overlay?.textContent).toContain("Chinese ref");

    const zhButton = overlay?.querySelector<HTMLButtonElement>("[data-lang='zh']");
    zhButton?.click();

    expect(overlay?.textContent).toContain("Chinese is a review-only reference");
    expect((overlay?.querySelector("textarea") as HTMLTextAreaElement).value).toContain("中文参考说明");

    panel.destroy();
  });
});

describe("createPanel SVG text editor", () => {
  it("enables SVG text edit entry only for editable SVG state", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("svg");
    panel.setSvgTextEditorState({ mode: "none", message: "No editable SVG text." });

    const button = panel.element.querySelector<HTMLButtonElement>("[data-action='edit-svg-text']");
    const status = panel.element.querySelector<HTMLElement>(".clickdeck-panel__svg-text-status");
    expect(button?.disabled).toBe(true);
    expect(status?.textContent).toContain("No editable SVG text");

    panel.setSvgTextEditorState({ mode: "editable", message: "Editable SVG text detected." });
    expect(button?.disabled).toBe(false);
    expect(status?.textContent).toContain("Editable SVG text detected");

    panel.destroy();
  });

  it("keeps SVG text edit entry disabled for complex SVG text structures", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    panel.setSelectionContext("svg");
    panel.setSvgTextEditorState({ mode: "complex", message: "Detected SVG text, but the structure is too complex." });

    const button = panel.element.querySelector<HTMLButtonElement>("[data-action='edit-svg-text']");
    const status = panel.element.querySelector<HTMLElement>(".clickdeck-panel__svg-text-status");
    expect(button?.disabled).toBe(true);
    expect(status?.textContent).toContain("too complex");

    panel.destroy();
  });

  it("renders SVG text editor modal and applies edited values", () => {
    const panel = createPanel(() => undefined);
    document.body.appendChild(panel.element);

    let applied: { id: string; label: string; value: string }[] | null = null;
    panel.showSvgTextEditor({
      items: [
        { id: "text-1", label: "Text 1", value: "Hello" },
        { id: "text-2", label: "Text 2", value: "World" }
      ],
      warning: "Longer text may overflow.",
      onApply: (updates) => {
        applied = updates;
      }
    });

    const overlay = panel.element.querySelector<HTMLElement>(".clickdeck-svg-text-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain("Longer text may overflow");

    const inputs = overlay?.querySelectorAll<HTMLInputElement>(".clickdeck-svg-text-modal__input") ?? [];
    expect(inputs).toHaveLength(2);
    inputs[0].value = "Changed";
    inputs[1].value = "Again";

    overlay?.querySelector<HTMLButtonElement>("[data-svg-text-action='apply']")?.click();

    expect(applied).toEqual([
      { id: "text-1", label: "Text 1", value: "Changed" },
      { id: "text-2", label: "Text 2", value: "Again" }
    ]);
    expect(panel.element.querySelector(".clickdeck-svg-text-overlay")).toBeNull();

    panel.destroy();
  });
});
