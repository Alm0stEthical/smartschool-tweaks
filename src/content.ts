import { Settings } from './types';

let globalSettings: Settings | null = null;
let globalProfilePicture: string = '';
let currentUserPhotoUrl: string = '';
let nameChangeAttempts = 0;

console.log('[smartschool tweaks] content script loaded');

(async function () {
  try {
    globalSettings = await getSettings();
    console.log('[smartschool tweaks] settings loaded:', globalSettings);

    if (globalSettings?.nameChanger && globalSettings.customName) {
      console.log(
        '[smartschool tweaks] name changer enabled, custom name:',
        globalSettings.customName
      );

      applyNameChange(globalSettings.customName);

      setupMutationObserver();
    }

    if (globalSettings?.pfpChanger) {
      applyHidingStyle();

      globalProfilePicture = await getProfilePicture();

      if (globalProfilePicture) {
        setupImageReplacement();
      }
    }

    if (
      globalSettings?.fakeMsgCounter &&
      globalSettings.msgCounterValue !== undefined
    ) {
      console.log(
        '[smartschool tweaks] fake message counter enabled, value:',
        globalSettings.msgCounterValue
      );
      setupMessageCounterModification(globalSettings.msgCounterValue);
    }

    init();
  } catch (error) {
    console.error('[smartschool tweaks] error in early initialization:', error);
  }
})();

function detectCurrentUserPhotoUrl(): string {
  const profileButton = document.querySelector('.topnav__btn--profile img');
  if (profileButton instanceof HTMLImageElement && profileButton.src) {
    const src = profileButton.src;
    if (src.includes('userpicture') || src.includes('hashimage/hash')) {
      console.log('[smartschool tweaks] detected current user photo URL:', src);
      return src;
    }
  }

  const profileImages = document.querySelectorAll(
    'img[src*="userpicture"], img[src*="hashimage/hash"]'
  );
  for (const img of profileImages) {
    if (img instanceof HTMLImageElement) {
      const parent = img.closest(
        '.topnav__btn--profile, .user-profile, .profile-header'
      );
      if (parent) {
        console.log(
          '[smartschool tweaks] detected current user photo URL from profile area:',
          img.src
        );
        return img.src;
      }
    }
  }

  return '';
}

function setupImageReplacement(): void {
  if (!globalProfilePicture) return;

  currentUserPhotoUrl = detectCurrentUserPhotoUrl();

  if (!currentUserPhotoUrl) {
    console.log(
      '[smartschool tweaks] could not detect current user photo URL, will retry...'
    );
    setTimeout(() => {
      currentUserPhotoUrl = detectCurrentUserPhotoUrl();
      if (currentUserPhotoUrl) {
        console.log(
          '[smartschool tweaks] current user photo URL detected on retry'
        );
        requestAnimationFrame(() => {
          replaceAllProfileImages();
          setTimeout(removeHidingStyle, 300);
        });
      }
    }, 500);
  }

  requestAnimationFrame(() => {
    replaceAllProfileImages();
    setupImageObservers();
    setupPeriodicChecker();

    setTimeout(removeHidingStyle, 300);
  });
}

let hidingStyleElement: HTMLStyleElement | null = null;

function applyHidingStyle(): void {
  if (hidingStyleElement) return;

  hidingStyleElement = document.createElement('style');
  hidingStyleElement.setAttribute('data-smartschool-tweaks', 'hiding');
  hidingStyleElement.textContent = `
    .topnav__btn--profile img[src*="userpicture"],
    .topnav__btn--profile img[src*="hashimage/hash"],
    .topnav__menuitem--img img[src*="userpicture"],
    .topnav__menuitem--img img[src*="hashimage/hash"] {
      opacity: 0 !important;
      transition: none !important;
    }
  `;

  if (document.head) {
    document.head.appendChild(hidingStyleElement);
  } else {
    const observer = new MutationObserver(() => {
      if (document.head && hidingStyleElement) {
        document.head.appendChild(hidingStyleElement);
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

function removeHidingStyle(): void {
  if (hidingStyleElement) {
    hidingStyleElement.remove();
    hidingStyleElement = null;
  }
}

function setupImageObservers(): void {
  const domObserver = new MutationObserver((mutations) => {
    let elementsChanged = false;

    requestAnimationFrame(() => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
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

        if (mutation.type === 'attributes') {
          const target = mutation.target;

          if (target instanceof HTMLElement) {
            if (
              mutation.attributeName === 'src' &&
              target instanceof HTMLImageElement
            ) {
              if (shouldReplaceImage(target)) {
                replaceImage(target);
                elementsChanged = true;
              }
            }

            if (mutation.attributeName === 'style') {
              if (replaceBackgroundImages(target)) {
                elementsChanged = true;
              }
            }

            if (mutation.attributeName === 'class') {
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
    attributeFilter: ['src', 'style', 'class'],
  });
}

function setupPeriodicChecker(): void {
  requestAnimationFrame(() => replaceAllProfileImages());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      requestAnimationFrame(replaceAllProfileImages)
    );
  } else {
    requestAnimationFrame(replaceAllProfileImages);
  }

  window.addEventListener('load', () =>
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
  if (img.hasAttribute('data-pfp-replaced')) return false;

  const src = img.src || '';

  if (!currentUserPhotoUrl) {
    return false;
  }

  if (src === currentUserPhotoUrl) {
    return true;
  }

  try {
    const currentUserPhotoUrlObj = new URL(currentUserPhotoUrl);
    const srcUrlObj = new URL(src);

    if (currentUserPhotoUrlObj.pathname === srcUrlObj.pathname) {
      return true;
    }
  } catch (error) {
    console.error('[smartschool tweaks] error comparing URLs:', error);
  }

  return false;
}

function replaceImage(img: HTMLImageElement): void {
  if (!globalProfilePicture) return;

  img.setAttribute('data-original-src', img.src);
  img.setAttribute('data-pfp-replaced', 'true');

  img.src = globalProfilePicture;

  img.style.opacity = '1';
}

function replaceProfileImagesInElement(element: HTMLElement): boolean {
  if (!globalProfilePicture) return false;

  let foundImages = false;

  const images = element.querySelectorAll('img');
  images.forEach((img) => {
    if (shouldReplaceImage(img)) {
      replaceImage(img);
      foundImages = true;
    }
  });

  return foundImages;
}

function replaceBackgroundImages(element: HTMLElement): boolean {
  if (!globalProfilePicture || !currentUserPhotoUrl) return false;

  let foundBackgroundImages = false;

  try {
    const currentUserPhotoUrlObj = new URL(currentUserPhotoUrl);
    const currentUserPhotoPath = currentUserPhotoUrlObj.pathname;

    const processElement = (el: HTMLElement) => {
      if (el.hasAttribute('data-bg-replaced')) return false;

      const style = el.getAttribute('style');
      if (
        style &&
        (style.includes('userpicture') || style.includes('hashimage/hash'))
      ) {
        if (
          style.includes(currentUserPhotoPath) ||
          style.includes(currentUserPhotoUrl)
        ) {
          el.setAttribute('data-original-style', style);

          const escapedUrl = currentUserPhotoUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          );
          const escapedPath = currentUserPhotoPath.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          );

          let newStyle = style.replace(
            new RegExp(
              `(background-image:\\s*url\\(['"]?)${escapedUrl}(['"]?\\))`,
              'gi'
            ),
            `$1${globalProfilePicture}$2`
          );

          newStyle = newStyle.replace(
            new RegExp(
              `(background-image:\\s*url\\(['"]?)[^'"')]*${escapedPath}([^'"')]*['"]?\\))`,
              'gi'
            ),
            `$1${globalProfilePicture}$2`
          );

          el.setAttribute('style', newStyle);
          el.setAttribute('data-bg-replaced', 'true');

          return true;
        }
      }
      return false;
    };

    if (processElement(element)) {
      foundBackgroundImages = true;
    }

    const elementsWithBg = element.querySelectorAll('[style*=background]');
    elementsWithBg.forEach((bgEl) => {
      if (bgEl instanceof HTMLElement) {
        if (processElement(bgEl)) {
          foundBackgroundImages = true;
        }
      }
    });
  } catch (error) {
    console.error(
      '[smartschool tweaks] error replacing background images:',
      error
    );
  }

  return foundBackgroundImages;
}

function setupMutationObserver(): void {
  if (!globalSettings) return;
  console.log(
    '[smartschool tweaks] setting up mutation observer for name changes'
  );

  const textObserver = new MutationObserver((mutations) => {
    if (!globalSettings?.nameChanger || !globalSettings.customName) return;

    let needsNameChange = false;
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'childList' &&
        mutation.target instanceof HTMLElement
      ) {
        if (!globalSettings) return;

        const customName = globalSettings.customName || '';
        if (
          isNameElement(mutation.target) &&
          mutation.target.textContent !== customName &&
          !isAlreadyHandled(mutation.target)
        ) {
          console.log(
            '[smartschool tweaks] found name element in mutation:',
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
              '[smartschool tweaks] found name element in added node:',
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
          '[smartschool tweaks] applying name change from mutation observer'
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
  console.log('[smartschool tweaks] setting up periodic name checker');

  const customName = globalSettings.customName;

  const checkNames = () => {
    requestAnimationFrame(() => {
      if (
        document.title.includes('Smartschool') &&
        !document.title.includes(customName)
      ) {
        const originalTitle = document.title;
        document.title = originalTitle.replace(
          /Smartschool \| [^|]+/,
          `Smartschool | ${customName}`
        );
        console.log(
          '[smartschool tweaks] updated document title:',
          document.title
        );
      }

      let nameElementsFound = false;
      document.querySelectorAll('.username, .user-fullname').forEach((el) => {
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
          '.authentication__welcome, .welcome-message, .login-welcome'
        )
        .forEach((el) => {
          if (
            el instanceof HTMLElement &&
            el.textContent &&
            el.textContent.includes('Welkom') &&
            !el.textContent.includes(customName) &&
            !isAlreadyHandled(el)
          ) {
            nameElementsFound = true;
          }
        });

      document.querySelectorAll('.topnav__btn--profile').forEach((btn) => {
        if (btn instanceof HTMLElement) {
          const nameEl = btn.querySelector('.hlp-vert-box > span:first-child');
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
          '[smartschool tweaks] found name elements in periodic check'
        );
        applyNameChange(customName);
      }
    });
  };

  checkNames();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkNames);
  }

  window.addEventListener('load', checkNames);

  let checksRemaining = 10;
  const interval = setInterval(() => {
    checkNames();
    checksRemaining--;
    if (checksRemaining <= 0) {
      clearInterval(interval);
      console.log('[smartschool tweaks] finished periodic name checks');
    }
  }, 700);
}

function isNameElement(element: HTMLElement): boolean {
  const nameClasses = [
    'username',
    'user-fullname',
    'user-name',
    'profile-name',
    'account-name',
  ];

  const isProfileButtonSpan =
    element.closest('.topnav__btn--profile') !== null &&
    element.tagName === 'SPAN' &&
    (element.parentElement?.classList.contains('hlp-vert-box') ?? false);

  return (
    nameClasses.some((className) => element.classList.contains(className)) ||
    element.id.toLowerCase().includes('username') ||
    element.id.toLowerCase().includes('name') ||
    isProfileButtonSpan
  );
}

function isAlreadyHandled(element: HTMLElement): boolean {
  return element.hasAttribute('data-name-changed');
}

function markAsHandled(element: HTMLElement): void {
  element.setAttribute('data-name-changed', 'true');
}

function applyNameChange(customName: string): void {
  if (!customName) return;

  console.log(`[smartschool tweaks] applying name change: "${customName}"`);

  let changesCount = 0;

  const nameSelectors = [
    '.username',
    '.user-fullname',
    '.user-name',
    '.profile-name',
    '.account-name',
    '.top-username',
    '.navbar-username',
    '.authentication__welcome',
    '.topnav__btn--profile > .hlp-vert-box > span:first-child',
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

  document.querySelectorAll('.topnav__btn--profile').forEach((btn) => {
    if (btn instanceof HTMLElement) {
      const container = btn.querySelector('.hlp-vert-box');
      if (container) {
        const spans = container.querySelectorAll('span');

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

  if (document.title.includes('Smartschool')) {
    const newTitle = document.title.replace(
      /Smartschool \| [^|]+/,
      `Smartschool | ${customName}`
    );
    if (document.title !== newTitle) {
      document.title = newTitle;
      changesCount++;
    }
  }

  console.log(`[smartschool tweaks] applied ${changesCount} name changes`);
}

function setupMessageCounterModification(counterValue: number): void {
  const updateMessageCounter = () => {
    try {
      let messagesCounterKey = null;
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('MessagesCounter')) {
          messagesCounterKey = key;
          break;
        }
      }

      if (messagesCounterKey) {
        const currentData = sessionStorage.getItem(messagesCounterKey);
        if (currentData) {
          try {
            const parsedData = JSON.parse(currentData);
            if (
              parsedData &&
              typeof parsedData === 'object' &&
              'module' in parsedData &&
              parsedData.module === 'Messages'
            ) {
              parsedData.counter = counterValue;
              sessionStorage.setItem(
                messagesCounterKey,
                JSON.stringify(parsedData)
              );
              console.log(
                '[smartschool tweaks] updated message counter to:',
                counterValue
              );
            }
          } catch (e) {
            console.error(
              '[smartschool tweaks] error parsing message counter data:',
              e
            );
          }
        }
      }
    } catch (e) {
      console.error('[smartschool tweaks] error updating message counter:', e);
    }
  };

  updateMessageCounter();

  setInterval(updateMessageCounter, 5000);

  window.addEventListener('load', updateMessageCounter);
  window.addEventListener('popstate', updateMessageCounter);
}

async function init(): Promise<void> {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'applySettings' && message.settings) {
        console.log(
          '[smartschool tweaks] received new settings:',
          message.settings
        );
        globalSettings = message.settings;
        applySettings(message.settings);
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    console.error('[smartschool tweaks] error in initialization:', error);
  }
}

function applyChanges(): void {
  const customName = globalSettings?.customName;
  const nameChangerEnabled = globalSettings?.nameChanger === true;
  const pfpChangerEnabled = globalSettings?.pfpChanger === true;

  if (pfpChangerEnabled && globalProfilePicture) {
    console.log('[smartschool tweaks] applying profile picture changes');
    setupImageReplacement();
  }

  if (nameChangerEnabled && customName) {
    console.log(
      '[smartschool tweaks] applying name changes from settings update'
    );
    applyNameChange(customName);
    setupMutationObserver();
  }
}

function applySettings(settings: Settings): void {
  globalSettings = settings;
  applyChanges();

  if (settings.fakeMsgCounter && settings.msgCounterValue !== undefined) {
    setupMessageCounterModification(settings.msgCounterValue);
  }

  location.reload();
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get('settings', (result) => {
      if (chrome.runtime.lastError) {
        console.error('failed to get settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(
        (result.settings as Settings) ||
          ({
            nameChanger: false,
            customName: '',
            pfpChanger: false,
            fakeMsgCounter: false,
            msgCounterValue: 0,
          } as Settings)
      );
    });
  });
}

async function getProfilePicture(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('profilePicture', (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          'failed to get profile picture:',
          chrome.runtime.lastError
        );
        reject(chrome.runtime.lastError);
        return;
      }
      resolve((result.profilePicture as string) || '');
    });
  });
}
