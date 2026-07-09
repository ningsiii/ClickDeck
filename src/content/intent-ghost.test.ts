// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { computeActiveGuides, snapRectToGuides } from "./intent-ghost";
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
        deltaPx: 0,
        confidence: "high"
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
        deltaPx: 0,
        confidence: "high"
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
        deltaPx: 0,
        confidence: "high"
      }
    ]);
  });

  it("snaps to the nearest x-axis guide when within threshold", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 103,
        sourceEdge: "left",
        unitSummary: "Left rail",
        unitKind: "block",
        sourceRect: rect(103, 100, 20, 40)
      }
    ];

    const result = snapRectToGuides(box, candidates);

    expect(result.rect.left).toBe(103);
    expect(result.rect.right).toBe(183);
    expect(result.guides).toEqual([
      {
        axis: "x",
        position: 103,
        targetEdge: "left",
        sourceEdge: "left",
        unitSummary: "Left rail",
        deltaPx: 0,
        confidence: "high"
      }
    ]);
  });

  it("snaps x and y axes independently at the same time", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 103,
        sourceEdge: "left",
        unitSummary: "Left rail",
        unitKind: "block",
        sourceRect: rect(103, 100, 20, 40)
      },
      {
        axis: "y",
        position: 143,
        sourceEdge: "bottom",
        unitSummary: "Bottom guide",
        unitKind: "block",
        sourceRect: rect(100, 103, 80, 40)
      }
    ];

    const result = snapRectToGuides(box, candidates);

    expect(result.rect.left).toBe(103);
    expect(result.rect.top).toBe(103);
    expect(result.rect.right).toBe(183);
    expect(result.rect.bottom).toBe(143);
    expect(result.guides).toEqual([
      {
        axis: "x",
        position: 103,
        targetEdge: "left",
        sourceEdge: "left",
        unitSummary: "Left rail",
        deltaPx: 0,
        confidence: "high"
      },
      {
        axis: "y",
        position: 143,
        targetEdge: "bottom",
        sourceEdge: "bottom",
        unitSummary: "Bottom guide",
        deltaPx: 0,
        confidence: "high"
      }
    ]);
  });

  it("prefers the smallest delta when multiple guides on the same axis are close", () => {
    const candidates: GuideCandidate[] = [
      {
        axis: "x",
        position: 106,
        sourceEdge: "left",
        unitSummary: "Wider miss",
        unitKind: "block",
        sourceRect: rect(106, 100, 20, 40)
      },
      {
        axis: "x",
        position: 102,
        sourceEdge: "left",
        unitSummary: "Best match",
        unitKind: "block",
        sourceRect: rect(102, 100, 20, 40)
      }
    ];

    const result = snapRectToGuides(box, candidates);

    expect(result.rect.left).toBe(102);
    expect(result.guides[0]?.unitSummary).toBe("Best match");
  });
});
