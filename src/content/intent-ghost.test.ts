// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { computeActiveGuides } from "./intent-ghost";
import type { GuideCandidate } from "./region-context";

const box = { left: 100, top: 100, width: 80, height: 40, right: 180, bottom: 140 };

function rect(left: number, top: number, width: number, height: number) {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

describe("intent ghost guides", () => {
  it("returns only guides active for the final rect", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 140,
        sourceEdge: "centerX",
        unitSummary: "Old passed guide",
        unitKind: "textLine",
        sourceRect: rect(100, 100, 80, 40)
      },
      {
        axis: "y",
        position: 120,
        sourceEdge: "centerY",
        unitSummary: "Title",
        unitKind: "textLine",
        sourceRect: rect(260, 105, 120, 30)
      }
    ];

    const finalBox = { ...box, left: 200, right: 280 };
    const activeGuides = computeActiveGuides(finalBox, candidates);

    expect(activeGuides.some(guide => guide.unitSummary === "Old passed guide")).toBe(false);
    expect(activeGuides).toEqual([
      {
        axis: "y",
        position: 120,
        targetEdge: "centerY",
        sourceEdge: "centerY",
        unitSummary: "Title",
        deltaPx: 0
      }
    ]);
  });

  it("records which target edge aligned with which source edge", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 180,
        sourceEdge: "right",
        unitSummary: "Reference card",
        unitKind: "block",
        sourceRect: rect(140, 100, 40, 40)
      }
    ];

    const activeGuides = computeActiveGuides(box, candidates);

    expect(activeGuides).toEqual([
      {
        axis: "x",
        position: 180,
        targetEdge: "right",
        sourceEdge: "right",
        unitSummary: "Reference card",
        deltaPx: 0
      }
    ]);
  });

  it("ignores guides from elements far away in the orthogonal direction", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 180,
        sourceEdge: "right",
        unitSummary: "Far paragraph",
        unitKind: "textLine",
        sourceRect: rect(140, 800, 40, 40)
      }
    ];

    expect(computeActiveGuides(box, candidates)).toEqual([]);
  });

  it("allows horizontal guide alignment with a nearby left label", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "y",
        position: 120,
        sourceEdge: "centerY",
        unitSummary: "适用场景与人群",
        unitKind: "textLine",
        sourceRect: rect(0, 105, 80, 30)
      }
    ];

    expect(computeActiveGuides(box, candidates)).toEqual([
      {
        axis: "y",
        position: 120,
        targetEdge: "centerY",
        sourceEdge: "centerY",
        unitSummary: "适用场景与人群",
        deltaPx: 0
      }
    ]);
  });
});
