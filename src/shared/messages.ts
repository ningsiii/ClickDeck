export const CLICKDECK_TOGGLE_MESSAGE = "CLICKDECK_TOGGLE" as const;

export type ClickDeckToggleMessage = {
  type: typeof CLICKDECK_TOGGLE_MESSAGE;
};

export type ClickDeckMessage = ClickDeckToggleMessage;

