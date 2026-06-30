import { describe, expect, it } from "vitest";
import { buildIntentDraftVisualPlan, pickNextIntentColor } from "./intent-draft-state";

describe("intent draft state helpers", () => {
  it("prefers the first unused color instead of reusing the last visible color", () => {
    const palette = ["#e85d75", "#16a085", "#d97706"];
    const used = ["#e85d75", "#d97706"];

    expect(pickNextIntentColor(used, palette)).toBe("#16a085");
  });

  it("reindexes source and target labels after a middle draft is removed", () => {
    const plan = buildIntentDraftVisualPlan(
      [
        { id: "op-1", action: "move", color: "#e85d75", hasTarget: true },
        { id: "op-3", action: "intent", color: "#d97706" }
      ],
      "DEL"
    );

    expect(plan).toEqual([
      { id: "op-1", color: "#e85d75", sourceLabel: "1A", targetLabel: "1B" },
      { id: "op-3", color: "#d97706", sourceLabel: "2" }
    ]);
  });

  it("falls back to palette cycling only after all colors are already occupied", () => {
    const palette = ["#e85d75", "#16a085"];
    const used = ["#e85d75", "#16a085"];

    expect(pickNextIntentColor(used, palette)).toBe("#e85d75");
  });
});
