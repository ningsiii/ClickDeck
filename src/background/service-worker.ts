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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "CLICKDECK_CAPTURE_VISIBLE_TAB") {
    return false;
  }

  chrome.tabs.captureVisibleTab(
    sender.tab?.windowId || chrome.windows.WINDOW_ID_CURRENT,
    { format: "png" }
  ).then((dataUrl) => {
    sendResponse({ dataUrl });
  }).catch((error) => {
    console.warn("[ClickDeck] captureVisibleTab failed", error);
    sendResponse({ error: error instanceof Error ? error.message : String(error) });
  });

  return true;
});
