export type Rect = { left: number; top: number; width: number; height: number; right: number; bottom: number };

export type IntentOverlay = {
  root: HTMLDivElement;
  destroy: () => void;
};

export function createIntentOverlay(
  rootId: string,
  onComplete: (rect: Rect) => void,
  onCancel: () => void,
  hintText: string
): IntentOverlay {
  const root = document.createElement("div");
  root.id = rootId;
  root.dataset.clickdeck = "true";

  // Styles for the overlay
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    backgroundColor: "rgba(0, 0, 0, 0.1)", // Light dim
    userSelect: "none"
  });

  const hint = document.createElement("div");
  Object.assign(hint.style, {
    position: "absolute",
    left: "50%",
    top: "16px",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    fontFamily: "sans-serif",
    pointerEvents: "none"
  });
  hint.textContent = hintText;
  root.appendChild(hint);

  const outline = document.createElement("div");
  Object.assign(outline.style, {
    position: "absolute",
    border: "2px dashed #3b82f6", // Blue dashed
    backgroundColor: "rgba(59, 130, 246, 0.1)", // Light blue fill
    display: "none",
    pointerEvents: "none"
  });
  root.appendChild(outline);

  let startX = 0;
  let startY = 0;
  let isDrawing = false;

  const onMouseDown = (e: MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    outline.style.display = "block";
    outline.style.left = `${startX}px`;
    outline.style.top = `${startY}px`;
    outline.style.width = "0px";
    outline.style.height = "0px";
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDrawing) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    outline.style.left = `${left}px`;
    outline.style.top = `${top}px`;
    outline.style.width = `${width}px`;
    outline.style.height = `${height}px`;
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!isDrawing) return;
    isDrawing = false;
    
    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width > 10 && height > 10) {
      onComplete({ left, top, width, height, right: left + width, bottom: top + height });
    } else {
      // Too small, count as cancel
      onCancel();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  root.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);

  document.documentElement.appendChild(root);

  return {
    root,
    destroy: () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    }
  };
}
