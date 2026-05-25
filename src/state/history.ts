import type { StylePatch } from "./editor-state";

export type EditHistory = {
  undoStack: StylePatch[];
  redoStack: StylePatch[];
};

export function createEditHistory(): EditHistory {
  return {
    undoStack: [],
    redoStack: []
  };
}
