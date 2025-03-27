import { Settings } from "./types";

chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettings: Settings = {
    nameChanger: false,
    customName: "",
    pfpChanger: false,
    fakeMsgCounter: false,
    msgCounterValue: 0,
  };

  chrome.storage.sync.get("settings", (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaultSettings });
    }
  });

  setupNetworkBlocking();
});

function setupNetworkBlocking(): void {
  chrome.storage.sync.get("settings", (result) => {
    const settings = result.settings as Settings | undefined;

    if (settings?.pfpChanger) {
      enableProfilePictureBlocking();
    } else {
      disableProfilePictureBlocking();
    }
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      const newSettings = changes.settings.newValue as Settings | undefined;

      if (newSettings?.pfpChanger) {
        enableProfilePictureBlocking();
      } else {
        disableProfilePictureBlocking();
      }
    }
  });
}

function enableProfilePictureBlocking(): void {
  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: 1,
      priority: 1,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: "userpicture",
        domains: ["smartschool.be"],
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
    },
    {
      id: 2,
      priority: 1,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: "hashimage/hash",
        domains: ["smartschool.be"],
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
    },
  ];

  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2],
      addRules: rules,
    })
    .catch((error) => {
      console.error("Error setting blocking rules:", error);
    });
}

function disableProfilePictureBlocking(): void {
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2],
      addRules: [],
    })
    .catch((error) => {
      console.error("Error removing blocking rules:", error);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveSettings") {
    chrome.storage.sync.set({ settings: message.settings }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "applySettings",
            settings: message.settings,
          });
        }
      });

      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "saveProfilePicture") {
    chrome.storage.local.set({ profilePicture: message.dataUrl }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "applySettings",
            settings: message.settings,
          });
        }
      });

      sendResponse({ success: true });
    });
    return true;
  }
});
