const DEFAULT_ACTION_TITLE = "Toggle ClickDeck";
const CLICKDECK_TOGGLE_MESSAGE = "CLICKDECK_TOGGLE";
const CLICKDECK_CAPTURE_VISIBLE_TAB = "CLICKDECK_CAPTURE_VISIBLE_TAB";
const FILE_ACCESS_HELP = "ClickDeck needs file access for local HTML. Open chrome://extensions, find ClickDeck, click Details, then enable \"Allow access to file URLs\" / \"允许访问文件网址\" and reload the file.";
const RESTRICTED_PAGE_HELP = "ClickDeck cannot run on this browser page. Open a normal website page, localhost page, or local HTML file with file access enabled.";

export type ActivationTargetKind = "injectable" | "file" | "restricted";

export function classifyActivationUrl(url?: string): ActivationTargetKind {
  if (!url) {
    return "restricted";
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "restricted";
  }

  if (parsed.protocol === "file:") {
    return "file";
  }

  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    if (
      parsed.hostname === "chromewebstore.google.com" ||
      (parsed.hostname === "chrome.google.com" && parsed.pathname.startsWith("/webstore"))
    ) {
      return "restricted";
    }
    return "injectable";
  }

  return "restricted";
}

function getActivationFailureMessage(kind: ActivationTargetKind): string {
  if (kind === "file") {
    return FILE_ACCESS_HELP;
  }
  return RESTRICTED_PAGE_HELP;
}

async function sendToggleMessage(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { type: CLICKDECK_TOGGLE_MESSAGE });
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

async function clearActionFeedback(tabId: number): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: "" });
  await chrome.action.setTitle({ tabId, title: DEFAULT_ACTION_TITLE });
}

async function showActionFailure(tabId: number, kind: ActivationTargetKind): Promise<void> {
  const title = getActivationFailureMessage(kind);
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#d97706" });
  await chrome.action.setBadgeText({ tabId, text: "!" });
  await chrome.action.setTitle({ tabId, title });
}

export async function handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    return;
  }

  const tabId = tab.id;
  const kind = classifyActivationUrl(tab.url);

  if (kind === "restricted") {
    await showActionFailure(tabId, kind);
    return;
  }

  try {
    await sendToggleMessage(tabId);
    await clearActionFeedback(tabId);
    return;
  } catch (firstError) {
    try {
      await injectContentScript(tabId);
      await sendToggleMessage(tabId);
      await clearActionFeedback(tabId);
    } catch (secondError) {
      console.warn("[ClickDeck] Unable to toggle content script", {
        firstError,
        secondError,
        url: tab.url
      });
      await showActionFailure(tabId, kind);
    }
  }
}

chrome.action.onClicked.addListener((tab) => {
  handleActionClick(tab).catch((error) => {
    console.warn("[ClickDeck] Unable to handle action click", error);
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== CLICKDECK_CAPTURE_VISIBLE_TAB) {
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
