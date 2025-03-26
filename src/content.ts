import { Settings } from "./types";

let globalSettings: Settings | null = null;
let globalProfilePicture: string = "";
let profileImageURLCache: Set<string> = new Set();
let nameChangeAttempts = 0;
const MAX_NAME_CHANGE_ATTEMPTS = 10;

console.log("[SmartSchool Tweaks] Content script loaded");

(async function () {
  try {
    globalSettings = await getSettings();
    console.log("[SmartSchool Tweaks] Settings loaded:", globalSettings);

    if (globalSettings?.pfpChanger) {
      globalProfilePicture = await getProfilePicture();

      if (globalProfilePicture) {
        setupImageReplacement();
      }
    }

    if (globalSettings?.nameChanger && globalSettings.customName) {
      console.log(
        "[SmartSchool Tweaks] Name changer enabled, custom name:",
        globalSettings.customName
      );
      setupMutationObserver();

      applyNameChange(globalSettings.customName);

      const intervalDelay = 500;
      let attemptsRemaining = 5;

      const nameInterval = setInterval(() => {
        if (attemptsRemaining <= 0) {
          clearInterval(nameInterval);
          return;
        }

        console.log(
          `[SmartSchool Tweaks] Applying name change (attempt ${
            6 - attemptsRemaining
          })`
        );
        applyNameChange(globalSettings?.customName || "");
        attemptsRemaining--;
      }, intervalDelay);

      if (document.readyState !== "complete") {
        window.addEventListener("DOMContentLoaded", () => {
          console.log(
            "[SmartSchool Tweaks] DOM content loaded - applying name change"
          );
          applyNameChange(globalSettings?.customName || "");
        });

        window.addEventListener("load", () => {
          console.log(
            "[SmartSchool Tweaks] Window loaded - applying name change"
          );
          applyNameChange(globalSettings?.customName || "");
        });
      }
    }

    init();
  } catch (error) {
    console.error("[SmartSchool Tweaks] Error in early initialization:", error);
  }
})();

function setupImageReplacement(): void {
  if (!globalProfilePicture) return;

  requestAnimationFrame(() => {
    replaceAllProfileImages();

    setupImageObservers();

    setupPeriodicChecker();
  });
}

function setupImageObservers(): void {
  const domObserver = new MutationObserver((mutations) => {
    let elementsChanged = false;

    requestAnimationFrame(() => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              if (replaceProfileImagesInElement(node)) {
                elementsChanged = true;
              }

              if (replaceBackgroundImages(node)) {
                elementsChanged = true;
              }
            }
          });
        }

        if (mutation.type === "attributes") {
          const target = mutation.target;

          if (target instanceof HTMLElement) {
            if (
              mutation.attributeName === "src" &&
              target instanceof HTMLImageElement
            ) {
              if (shouldReplaceImage(target)) {
                replaceImage(target);
                elementsChanged = true;
              }
            }

            if (mutation.attributeName === "style") {
              if (replaceBackgroundImages(target)) {
                elementsChanged = true;
              }
            }

            if (mutation.attributeName === "class") {
              if (replaceBackgroundImages(target)) {
                elementsChanged = true;
              }
            }
          }
        }
      });
    });
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "style", "class"],
  });
}

function setupPeriodicChecker(): void {
  requestAnimationFrame(() => replaceAllProfileImages());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      requestAnimationFrame(replaceAllProfileImages)
    );
  } else {
    requestAnimationFrame(replaceAllProfileImages);
  }

  window.addEventListener("load", () =>
    requestAnimationFrame(replaceAllProfileImages)
  );

  let checksRemaining = 5;
  const interval = setInterval(() => {
    requestAnimationFrame(replaceAllProfileImages);
    checksRemaining--;
    if (checksRemaining <= 0) {
      clearInterval(interval);
    }
  }, 400);
}

function replaceAllProfileImages(): void {
  replaceProfileImagesInElement(document.documentElement);

  replaceBackgroundImages(document.documentElement);
}

function shouldReplaceImage(img: HTMLImageElement): boolean {
  if (img.hasAttribute("data-pfp-replaced")) return false;

  const src = img.src || "";

  if (src.includes("userpicture") || src.includes("hashimage/hash")) {
    profileImageURLCache.add(src);
    return true;
  }

  for (const cachedURL of profileImageURLCache) {
    if (src.includes(cachedURL)) return true;
  }

  return false;
}

function replaceImage(img: HTMLImageElement): void {
  if (!globalProfilePicture) return;

  img.setAttribute("data-original-src", img.src);
  img.setAttribute("data-pfp-replaced", "true");

  img.src = globalProfilePicture;
}

function replaceProfileImagesInElement(element: HTMLElement): boolean {
  if (!globalProfilePicture) return false;

  let foundImages = false;

  const images = element.querySelectorAll("img");
  images.forEach((img) => {
    if (shouldReplaceImage(img)) {
      replaceImage(img);
      foundImages = true;
    }
  });

  return foundImages;
}

function replaceBackgroundImages(element: HTMLElement): boolean {
  if (!globalProfilePicture) return false;

  let foundBackgroundImages = false;

  const processElement = (el: HTMLElement) => {
    if (el.hasAttribute("data-bg-replaced")) return false;

    const style = el.getAttribute("style");
    if (
      style &&
      (style.includes("userpicture") || style.includes("hashimage/hash"))
    ) {
      el.setAttribute("data-original-style", style);

      const newStyle = style.replace(
        /(background-image:\s*url\(['"]?)(https:\/\/userpicture[^'"')]+|[^'"')]*hashimage\/hash[^'"')]+)(['"]?\))/gi,
        `$1${globalProfilePicture}$3`
      );

      el.setAttribute("style", newStyle);
      el.setAttribute("data-bg-replaced", "true");

      return true;
    }
    return false;
  };

  if (processElement(element)) {
    foundBackgroundImages = true;
  }

  const elementsWithBg = element.querySelectorAll("[style*=background]");
  elementsWithBg.forEach((bgEl) => {
    if (bgEl instanceof HTMLElement) {
      if (processElement(bgEl)) {
        foundBackgroundImages = true;
      }
    }
  });

  return foundBackgroundImages;
}

function setupMutationObserver(): void {
  if (!globalSettings) return;
  console.log(
    "[SmartSchool Tweaks] Setting up mutation observer for name changes"
  );

  const textObserver = new MutationObserver((mutations) => {
    if (!globalSettings?.nameChanger || !globalSettings.customName) return;

    let needsNameChange = false;
    mutations.forEach((mutation) => {
      if (
        mutation.type === "childList" &&
        mutation.target instanceof HTMLElement
      ) {
        if (!globalSettings) return;

        const customName = globalSettings.customName || "";
        if (
          isNameElement(mutation.target) &&
          mutation.target.textContent !== customName &&
          !isAlreadyHandled(mutation.target)
        ) {
          console.log(
            "[SmartSchool Tweaks] Found name element in mutation:",
            mutation.target
          );
          needsNameChange = true;
        }

        mutation.addedNodes.forEach((node) => {
          if (
            node instanceof HTMLElement &&
            isNameElement(node) &&
            !isAlreadyHandled(node)
          ) {
            console.log(
              "[SmartSchool Tweaks] Found name element in added node:",
              node
            );
            needsNameChange = true;
          }
        });
      }
    });

    if (needsNameChange && globalSettings?.customName) {
      const customName = globalSettings.customName;
      requestAnimationFrame(() => {
        console.log(
          "[SmartSchool Tweaks] Applying name change from mutation observer"
        );
        applyNameChange(customName);
      });
    }
  });

  textObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  setupPeriodicNameChecker();
}

function setupPeriodicNameChecker(): void {
  if (!globalSettings?.nameChanger || !globalSettings?.customName) return;
  console.log("[SmartSchool Tweaks] Setting up periodic name checker");

  const customName = globalSettings.customName;

  const checkNames = () => {
    requestAnimationFrame(() => {
      if (
        document.title.includes("Smartschool") &&
        !document.title.includes(customName)
      ) {
        const originalTitle = document.title;
        document.title = originalTitle.replace(
          /Smartschool \| [^|]+/,
          `Smartschool | ${customName}`
        );
        console.log(
          "[SmartSchool Tweaks] Updated document title:",
          document.title
        );
      }

      let nameElementsFound = false;
      document.querySelectorAll(".username, .user-fullname").forEach((el) => {
        if (
          el instanceof HTMLElement &&
          el.textContent !== customName &&
          !isAlreadyHandled(el)
        ) {
          nameElementsFound = true;
        }
      });

      document
        .querySelectorAll(
          ".authentication__welcome, .welcome-message, .login-welcome"
        )
        .forEach((el) => {
          if (
            el instanceof HTMLElement &&
            el.textContent &&
            el.textContent.includes("Welkom") &&
            !el.textContent.includes(customName) &&
            !isAlreadyHandled(el)
          ) {
            nameElementsFound = true;
          }
        });

      document.querySelectorAll(".topnav__btn--profile").forEach((btn) => {
        if (btn instanceof HTMLElement) {
          const nameEl = btn.querySelector(".hlp-vert-box > span:first-child");
          if (
            nameEl instanceof HTMLElement &&
            nameEl.textContent !== customName &&
            !isAlreadyHandled(nameEl)
          ) {
            nameElementsFound = true;
          }
        }
      });

      if (nameElementsFound && customName) {
        console.log(
          "[SmartSchool Tweaks] Found name elements in periodic check"
        );
        applyNameChange(customName);
      }
    });
  };

  checkNames();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkNames);
  }

  window.addEventListener("load", checkNames);

  let checksRemaining = 10;
  const interval = setInterval(() => {
    checkNames();
    checksRemaining--;
    if (checksRemaining <= 0) {
      clearInterval(interval);
      console.log("[SmartSchool Tweaks] Finished periodic name checks");
    }
  }, 700);
}

function isNameElement(element: HTMLElement): boolean {
  const nameClasses = [
    "username",
    "user-fullname",
    "user-name",
    "profile-name",
    "account-name",
  ];

  const isProfileButtonSpan =
    element.closest(".topnav__btn--profile") !== null &&
    element.tagName === "SPAN" &&
    (element.parentElement?.classList.contains("hlp-vert-box") ?? false);

  return (
    nameClasses.some((className) => element.classList.contains(className)) ||
    element.id.toLowerCase().includes("username") ||
    element.id.toLowerCase().includes("name") ||
    isProfileButtonSpan
  );
}

function isAlreadyHandled(element: HTMLElement): boolean {
  return element.hasAttribute("data-name-changed");
}

function markAsHandled(element: HTMLElement): void {
  element.setAttribute("data-name-changed", "true");
}

function applyNameChange(customName: string): void {
  if (!customName) return;

  nameChangeAttempts++;
  console.log(
    `[SmartSchool Tweaks] Applying name change (attempt ${nameChangeAttempts}/${MAX_NAME_CHANGE_ATTEMPTS}): "${customName}"`
  );

  if (nameChangeAttempts > MAX_NAME_CHANGE_ATTEMPTS) {
    console.log(
      "[SmartSchool Tweaks] Maximum name change attempts reached, stopping"
    );
    return;
  }

  let changesCount = 0;

  const nameSelectors = [
    ".username",
    ".user-fullname",
    ".user-name",
    ".profile-name",
    ".account-name",
    ".top-username",
    ".navbar-username",
    ".authentication__welcome",
    ".topnav__btn--profile > .hlp-vert-box > span:first-child",
  ];

  nameSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      if (el instanceof HTMLElement && !isAlreadyHandled(el)) {
        if (el.textContent !== customName) {
          el.textContent = customName;
          markAsHandled(el);
          changesCount++;
        }
      }
    });
  });

  document.querySelectorAll(".topnav__btn--profile").forEach((btn) => {
    if (btn instanceof HTMLElement) {
      const container = btn.querySelector(".hlp-vert-box");
      if (container) {
        const spans = container.querySelectorAll("span");

        if (
          spans.length > 0 &&
          spans[0] instanceof HTMLElement &&
          !isAlreadyHandled(spans[0])
        ) {
          if (spans[0].textContent !== customName) {
            spans[0].textContent = customName;
            markAsHandled(spans[0]);
            changesCount++;
          }
        }
      }
    }
  });

  document
    .querySelectorAll("[id*='username'],[id*='user_name'],[id*='fullname']")
    .forEach((el) => {
      if (el instanceof HTMLElement && !isAlreadyHandled(el)) {
        if (el.textContent !== customName) {
          el.textContent = customName;
          markAsHandled(el);
          changesCount++;
        }
      }
    });

  if (document.title.includes("Smartschool")) {
    const newTitle = document.title.replace(
      /Smartschool \| [^|]+/,
      `Smartschool | ${customName}`
    );
    if (document.title !== newTitle) {
      document.title = newTitle;
      changesCount++;
    }
  }

  console.log(`[SmartSchool Tweaks] Applied ${changesCount} name changes`);
}

async function init(): Promise<void> {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "applySettings" && message.settings) {
        console.log(
          "[SmartSchool Tweaks] Received new settings:",
          message.settings
        );
        globalSettings = message.settings;
        applySettings(message.settings);
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    console.error("[SmartSchool Tweaks] Error in initialization:", error);
  }
}

function applyChanges(): void {
  const customName = globalSettings?.customName;
  const nameChangerEnabled = globalSettings?.nameChanger === true;
  const pfpChangerEnabled = globalSettings?.pfpChanger === true;

  if (pfpChangerEnabled && globalProfilePicture) {
    console.log("[SmartSchool Tweaks] Applying profile picture changes");
    setupImageReplacement();
  }

  if (nameChangerEnabled && customName) {
    console.log(
      "[SmartSchool Tweaks] Applying name changes from settings update"
    );
    applyNameChange(customName);
    setupMutationObserver();
  }
}

function applySettings(settings: Settings): void {
  globalSettings = settings;
  applyChanges();
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("settings", (result) => {
      resolve(
        result.settings || {
          nameChanger: false,
          customName: "",
          pfpChanger: false,
        }
      );
    });
  });
}

async function getProfilePicture(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get("profilePicture", (result) => {
      resolve(result.profilePicture || "");
    });
  });
}
