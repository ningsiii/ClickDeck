import type { IntentAction } from "./intent-region";

export type IntentDraftVisualItem = {
  id: string;
  action: IntentAction;
  color: string;
  hasTarget?: boolean;
};

export type IntentDraftVisualPlan = {
  id: string;
  color: string;
  sourceLabel: string;
  targetLabel?: string;
};

export function pickNextIntentColor(usedColors: string[], palette: string[]): string {
  if (palette.length === 0) {
    return "#3b82f6";
  }

  for (const color of palette) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }

  return palette[usedColors.length % palette.length] ?? palette[0];
}

export function buildIntentDraftVisualPlan(
  drafts: IntentDraftVisualItem[],
  removeBadgeLabel: string
): IntentDraftVisualPlan[] {
  return drafts.map((draft, index) => {
    const order = index + 1;
    if (draft.action === "move") {
      return {
        id: draft.id,
        color: draft.color,
        sourceLabel: `${order}A`,
        targetLabel: draft.hasTarget ? `${order}B` : undefined
      };
    }

    if (draft.action === "remove") {
      return {
        id: draft.id,
        color: draft.color,
        sourceLabel: `${order} ${removeBadgeLabel}`
      };
    }

    return {
      id: draft.id,
      color: draft.color,
      sourceLabel: `${order}`
    };
  });
}
