import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLICKDECK_TOGGLE_MESSAGE } from "../shared/messages";

type ChromeMock = {
  action: {
    onClicked: { addListener: ReturnType<typeof vi.fn> };
    setBadgeBackgroundColor: ReturnType<typeof vi.fn>;
    setBadgeText: ReturnType<typeof vi.fn>;
    setTitle: ReturnType<typeof vi.fn>;
  };
  runtime: {
    onMessage: { addListener: ReturnType<typeof vi.fn> };
  };
  scripting: {
    executeScript: ReturnType<typeof vi.fn>;
  };
  tabs: {
    captureVisibleTab: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  windows: {
    WINDOW_ID_CURRENT: number;
  };
};

function installChromeMock(): ChromeMock {
  const chromeMock: ChromeMock = {
    action: {
      onClicked: { addListener: vi.fn() },
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
      setTitle: vi.fn().mockResolvedValue(undefined)
    },
    runtime: {
      onMessage: { addListener: vi.fn() }
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([])
    },
    tabs: {
      captureVisibleTab: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined)
    },
    windows: {
      WINDOW_ID_CURRENT: -2
    }
  };

  vi.stubGlobal("chrome", chromeMock);
  return chromeMock;
}

async function loadServiceWorker() {
  vi.resetModules();
  return import("./service-worker");
}

describe("service-worker action activation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("classifies normal, local file, and restricted browser urls", async () => {
    installChromeMock();
    const { classifyActivationUrl } = await loadServiceWorker();

    expect(classifyActivationUrl("https://example.com/page.html")).toBe("injectable");
    expect(classifyActivationUrl("http://localhost:5562/demo.html")).toBe("injectable");
    expect(classifyActivationUrl("file:///C:/demo.html")).toBe("file");
    expect(classifyActivationUrl("chrome://extensions/")).toBe("restricted");
    expect(classifyActivationUrl("https://chromewebstore.google.com/detail/example")).toBe("restricted");
  });

  it("injects packaged content script into old tabs before toggling again", async () => {
    const chromeMock = installChromeMock();
    chromeMock.tabs.sendMessage
      .mockRejectedValueOnce(new Error("Could not establish connection. Receiving end does not exist."))
      .mockResolvedValueOnce(undefined);

    const { handleActionClick } = await loadServiceWorker();

    await handleActionClick({ id: 7, url: "https://example.com/" } as chrome.tabs.Tab);

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ["content.js"]
    });
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(chromeMock.tabs.sendMessage).toHaveBeenLastCalledWith(7, { type: CLICKDECK_TOGGLE_MESSAGE });
    expect(chromeMock.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 7, text: "" });
  });

  it("shows file access instructions when a local html file cannot be injected", async () => {
    const chromeMock = installChromeMock();
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error("Receiving end does not exist."));
    chromeMock.scripting.executeScript.mockRejectedValue(new Error("Cannot access file URL"));

    const { handleActionClick } = await loadServiceWorker();

    await handleActionClick({ id: 9, url: "file:///C:/demo.html" } as chrome.tabs.Tab);

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 9 },
      files: ["content.js"]
    });
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 9, text: "!" });
    expect(chromeMock.action.setTitle).toHaveBeenCalledWith(expect.objectContaining({
      tabId: 9,
      title: expect.stringContaining("Allow access to file URLs")
    }));
    expect(chromeMock.action.setTitle).toHaveBeenCalledWith(expect.objectContaining({
      tabId: 9,
      title: expect.stringContaining("允许访问文件网址")
    }));
  });

  it("does not try to inject into restricted browser pages", async () => {
    const chromeMock = installChromeMock();
    const { handleActionClick } = await loadServiceWorker();

    await handleActionClick({ id: 11, url: "chrome://extensions/" } as chrome.tabs.Tab);

    expect(chromeMock.tabs.sendMessage).not.toHaveBeenCalled();
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({ tabId: 11, text: "!" });
    expect(chromeMock.action.setTitle).toHaveBeenCalledWith(expect.objectContaining({
      tabId: 11,
      title: expect.stringContaining("cannot run")
    }));
  });
});
