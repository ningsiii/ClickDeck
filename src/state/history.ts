import type { EditorPatch } from "./editor-state";

export type EditHistory = {
  undoStack: EditorPatch[];
  redoStack: EditorPatch[];
};

export function createEditHistory(): EditHistory {
  return {
    undoStack: [],
    redoStack: []
  };
}
