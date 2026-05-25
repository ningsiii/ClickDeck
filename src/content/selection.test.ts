// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { getTabSwitchTarget } from "./selection";

describe("getTabSwitchTarget", () => {
  it("Tab prefers parent when available", () => {
    document.body.innerHTML = `
      <main>
        <div id="parent">
          <span id="child">Hello</span>
        </div>
      </main>
    `;

    const child = document.getElementById("child") as HTMLElement;
    const parent = document.getElementById("parent") as HTMLElement;
    expect(getTabSwitchTarget(child, "forward")).toBe(parent);
  });

  it("Shift+Tab prefers first descendant when available", () => {
    document.body.innerHTML = `
      <main>
        <div id="parent">
          <span id="child">Hello</span>
        </div>
      </main>
    `;

    const parent = document.getElementById("parent") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;
    expect(getTabSwitchTarget(parent, "backward")).toBe(child);
  });

  it("falls back to descendant when parent is not selectable (body/html)", () => {
    document.body.innerHTML = `
      <div id="root">
        <span id="child">Hello</span>
      </div>
    `;

    const root = document.getElementById("root") as HTMLElement;
    const child = document.getElementById("child") as HTMLElement;

    // root's parent is body (not selectable), so Tab uses first descendant.
    expect(getTabSwitchTarget(root, "forward")).toBe(child);
  });
});

