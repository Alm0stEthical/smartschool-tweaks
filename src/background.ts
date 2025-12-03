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
  disableProfilePictureBlocking();
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
