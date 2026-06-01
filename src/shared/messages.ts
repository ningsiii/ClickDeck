export const CLICKDECK_TOGGLE_MESSAGE = "CLICKDECK_TOGGLE" as const;
export const CLICKDECK_CAPTURE_VISIBLE_TAB = "CLICKDECK_CAPTURE_VISIBLE_TAB" as const;

export type ClickDeckToggleMessage = {
  type: typeof CLICKDECK_TOGGLE_MESSAGE;
};

export type ClickDeckCaptureVisibleTabMessage = {
  type: typeof CLICKDECK_CAPTURE_VISIBLE_TAB;
};

export type ClickDeckMessage = ClickDeckToggleMessage | ClickDeckCaptureVisibleTabMessage;

