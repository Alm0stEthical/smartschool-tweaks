import { Settings } from './types';
import { STORAGE_KEYS } from './constants';

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function waitForElement(
  selector: string,
  timeout = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

export class StorageService {
  static async getSettings(): Promise<Settings> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
        if (chrome.runtime.lastError) {
          console.error('failed to get settings:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(
          result.settings || {
            nameChanger: false,
            customName: '',
            pfpChanger: false,
            fakeMsgCounter: false,
            msgCounterValue: 0,
          }
        );
      });
    });
  }

  static async saveSettings(settings: Settings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        if (chrome.runtime.lastError) {
          console.error('failed to save settings:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static async getProfilePicture(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(STORAGE_KEYS.PROFILE_PICTURE, (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            'failed to get profile picture:',
            chrome.runtime.lastError
          );
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(result.profilePicture || '');
      });
    });
  }

  static async saveProfilePicture(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(
        { [STORAGE_KEYS.PROFILE_PICTURE]: dataUrl },
        () => {
          if (chrome.runtime.lastError) {
            console.error(
              'failed to save profile picture:',
              chrome.runtime.lastError
            );
            reject(chrome.runtime.lastError);
            return;
          }
          resolve();
        }
      );
    });
  }
}

export class TabService {
  static async sendMessageToActiveTab(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('failed to query tabs:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const activeTab = tabs[0];
        if (!activeTab?.id) {
          reject(new Error('no active tab found'));
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              'failed to send message to tab:',
              chrome.runtime.lastError
            );
            reject(chrome.runtime.lastError);
            return;
          }
          resolve();
        });
      });
    });
  }

  static async isSmartschoolTab(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('failed to query tabs:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const activeTab = tabs[0];
        resolve(activeTab?.url?.includes('smartschool.be') || false);
      });
    });
  }
}

export function createCleanupManager() {
  const cleanupFunctions: (() => void)[] = [];
  const intervals: NodeJS.Timeout[] = [];
  const observers: MutationObserver[] = [];

  return {
    addCleanup(fn: () => void) {
      cleanupFunctions.push(fn);
    },

    addInterval(interval: NodeJS.Timeout) {
      intervals.push(interval);
    },

    addObserver(observer: MutationObserver) {
      observers.push(observer);
    },

    cleanup() {
      cleanupFunctions.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          console.error('error during cleanup:', error);
        }
      });

      intervals.forEach((interval) => clearInterval(interval));
      observers.forEach((observer) => observer.disconnect());

      cleanupFunctions.length = 0;
      intervals.length = 0;
      observers.length = 0;
    },
  };
}

export function validateImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isValidNumber(value: string): boolean {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= 0;
}

export const debouncedAutoSave = debounce(
  async (saveFunction: () => Promise<void>) => {
    try {
      await saveFunction();
    } catch (error) {
      console.error('auto-save failed:', error);
    }
  },
  500
);
