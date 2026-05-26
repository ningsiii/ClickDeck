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
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.warn("[ClickDeck] print message received but sender tab id is missing");
    return;
  }

  // Legacy: print the current tab's own window (kept for compatibility)
  if (msg.type === "CLICKDECK_PRINT") {
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => window.print(),
    }).catch((err) => {
      console.warn("[ClickDeck] executeScript for print failed", err);
    });
  }

  // Primary path: print via a specific iframe (fresh iframe = no print-pipeline state).
  // Called from the content script after the print iframe's load event fires.
  // Must run in MAIN world — calling iframe.contentWindow.print() from the Isolated
  // World (content script) is unreliable in Chrome and produces 0 MB PDFs.
  if (msg.type === "CLICKDECK_PRINT_IFRAME" && msg.iframeId) {
    const iframeId: string = msg.iframeId;
    chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [iframeId],
      func: (id: string) => {
        const iframe = document.getElementById(id) as HTMLIFrameElement | null;
        if (iframe?.contentWindow) {
          iframe.contentWindow.print();
        } else {
          console.warn("[ClickDeck] print iframe not found:", id);
        }
      },
    }).catch((err) => {
      console.warn("[ClickDeck] executeScript for iframe print failed", err);
    });
  }
});
