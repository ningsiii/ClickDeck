chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "CLICKDECK_TOGGLE" });
  } catch (error) {
    console.warn("[ClickDeck] Unable to toggle content script", error);
  }
});

// Handle print request from content script.
// Content scripts run in an isolated world and cannot call window.print() reliably.
// Dynamic <script> injection is blocked by CSP on most sites.
// Using scripting.executeScript with world: "MAIN" is the correct MV3 approach.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "CLICKDECK_PRINT") {
    return;
  }
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.warn("[ClickDeck] CLICKDECK_PRINT received but sender tab id is missing");
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: () => {
      window.addEventListener("afterprint", () => {
        const el = document.getElementById("clickdeck-pdf-style");
        if (el) el.remove();
      }, { once: true });
      window.print();
    },
  }).catch((err) => {
    console.warn("[ClickDeck] executeScript for print failed", err);
  });
});
