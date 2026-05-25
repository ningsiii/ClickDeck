import { describe, expect, it, vi } from "vitest";
import { getPanelLabels } from "./i18n";

describe("getPanelLabels", () => {
  it("uses Chinese labels for zh UI languages", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getUILanguage: () => "zh-CN"
      }
    });

    expect(getPanelLabels().selectHint).toBe("选择页面中的元素。");

    vi.unstubAllGlobals();
  });

  it("defaults to English labels for non-Chinese UI languages", () => {
    vi.stubGlobal("chrome", {
      i18n: {
        getUILanguage: () => "en-US"
      }
    });

    expect(getPanelLabels().selectHint).toBe("Select an element on the page.");

    vi.unstubAllGlobals();
  });
});
