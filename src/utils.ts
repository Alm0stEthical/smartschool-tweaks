import { STORAGE_KEYS } from "./constants";
import type { Settings } from "./types";

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  return debounced as T;
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

export function getSettings(): Promise<Settings> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(STORAGE_KEYS.SETTINGS, (result) => {
      if (chrome.runtime.lastError) {
        console.error("failed to get settings:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(
        (result.settings as Settings) || {
          nameChanger: false,
          customName: "",
          pfpChanger: false,
          fakeMsgCounter: false,
          msgCounterValue: 0,
        }
      );
    });
  });
}

export function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error("failed to save settings:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

export function getProfilePicture(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS.PROFILE_PICTURE, (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "failed to get profile picture:",
          chrome.runtime.lastError
        );
        reject(chrome.runtime.lastError);
        return;
      }
      resolve((result.profilePicture as string) || "");
    });
  });
}

export function saveProfilePicture(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEYS.PROFILE_PICTURE]: dataUrl },
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "failed to save profile picture:",
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

export function sendMessageToActiveTab(message: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("failed to query tabs:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new Error("no active tab found"));
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, message, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "failed to send message to tab:",
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

export function isSmartschoolTab(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("failed to query tabs:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }

      const activeTab = tabs[0];
      resolve(activeTab?.url?.includes("smartschool.be") ?? false);
    });
  });
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
      for (const fn of cleanupFunctions) {
        try {
          fn();
        } catch (error) {
          console.error("error during cleanup:", error);
        }
      }

      for (const interval of intervals) {
        clearInterval(interval);
      }
      for (const observer of observers) {
        observer.disconnect();
      }

      cleanupFunctions.length = 0;
      intervals.length = 0;
      observers.length = 0;
    },
  };
}

export function validateImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isValidNumber(value: string): boolean {
  const num = Number.parseInt(value, 10);
  return !Number.isNaN(num) && num >= 0;
}

export const debouncedAutoSave = debounce(
  async (saveFunction: () => Promise<void>) => {
    try {
      await saveFunction();
    } catch (error) {
      console.error("auto-save failed:", error);
    }
  },
  3000
);
