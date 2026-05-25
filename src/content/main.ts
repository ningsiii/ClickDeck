import { createLogger } from "../diagnostics/logger";
import { createController } from "./controller";
import { CLICKDECK_TOGGLE_MESSAGE, type ClickDeckMessage } from "../shared/messages";

const logger = createLogger("selection");
const rootId = "clickdeck-root";

const controller = createController(logger, rootId);

chrome.runtime.onMessage.addListener((message: ClickDeckMessage) => {
  if (message.type === CLICKDECK_TOGGLE_MESSAGE) {
    controller.toggle();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.altKey && event.shiftKey && event.code === "KeyC") {
    event.preventDefault();
    event.stopPropagation();
    controller.toggle();
  }
}, true);
