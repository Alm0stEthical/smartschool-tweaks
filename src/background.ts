import { Settings } from './types';

chrome.runtime.onInstalled.addListener(async () => {
  const defaultSettings: Settings = {
    nameChanger: false,
    customName: '',
    pfpChanger: false,
    fakeMsgCounter: false,
    msgCounterValue: 0,
  };

  chrome.storage.sync.get('settings', (result) => {
    if (chrome.runtime.lastError) {
      console.error('storage error:', chrome.runtime.lastError);
      return;
    }
    if (!result.settings) {
      chrome.storage.sync.set({ settings: defaultSettings }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            'failed to set default settings:',
            chrome.runtime.lastError
          );
        }
      });
    }
  });

  setupNetworkBlocking();
});

function setupNetworkBlocking(): void {
  chrome.storage.sync.get('settings', (result) => {
    if (chrome.runtime.lastError) {
      console.error(
        'storage error in network blocking setup:',
        chrome.runtime.lastError
      );
      return;
    }
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
      priority: 100,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: '*userpicture*',
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
    },
    {
      id: 2,
      priority: 100,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: '*hashimage/hash*',
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
    },
    {
      id: 3,
      priority: 100,
      action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
      condition: {
        urlFilter: '*User/Userimage*',
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.IMAGE,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
    },
  ];

  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2, 3],
      addRules: rules,
    })
    .catch((error) => {
      console.error('error setting blocking rules:', error);
    });
}

function disableProfilePictureBlocking(): void {
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1, 2, 3],
      addRules: [],
    })
    .catch((error) => {
      console.error('error removing blocking rules:', error);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveSettings') {
    chrome.storage.sync.set({ settings: message.settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('failed to save settings:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('failed to query tabs:', chrome.runtime.lastError);
          return;
        }
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: 'applySettings',
              settings: message.settings,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  'failed to send message to tab:',
                  chrome.runtime.lastError
                );
              }
            }
          );
        }
      });

      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'saveProfilePicture') {
    chrome.storage.local.set({ profilePicture: message.dataUrl }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          'failed to save profile picture:',
          chrome.runtime.lastError
        );
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('failed to query tabs:', chrome.runtime.lastError);
          return;
        }
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: 'applySettings',
              settings: message.settings,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  'failed to send message to tab:',
                  chrome.runtime.lastError
                );
              }
            }
          );
        }
      });

      sendResponse({ success: true });
    });
    return true;
  }
});
