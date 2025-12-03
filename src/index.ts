import { Settings } from './types';
import { debouncedAutoSave } from './utils';

const nameChangerToggle = document.getElementById(
  'name-changer-toggle'
) as HTMLInputElement;
const nameSection = document.getElementById('name-section') as HTMLDivElement;
const customNameInput = document.getElementById(
  'custom-name'
) as HTMLInputElement;

const pfpChangerToggle = document.getElementById(
  'pfp-changer-toggle'
) as HTMLInputElement;
const pfpChangerSection = document.getElementById(
  'pfp-changer-section'
) as HTMLDivElement;
const pfpFileInput = document.getElementById(
  'pfpFileInput'
) as HTMLInputElement;
const pfpFileName = document.getElementById('pfpFileName') as HTMLSpanElement;
const pfpPreview = document.getElementById('pfpPreview') as HTMLImageElement;
const pfpPlaceholder = document.getElementById('pfpPlaceholder') as HTMLElement;

const fakeMsgCounterToggle = document.getElementById(
  'fake-msg-counter-toggle'
) as HTMLInputElement;
const fakeMsgCounterSection = document.getElementById(
  'fake-msg-counter-section'
) as HTMLDivElement;
const msgCounterValueInput = document.getElementById(
  'msg-counter-value'
) as HTMLInputElement;

const saveButton = document.getElementById(
  'save-settings'
) as HTMLButtonElement;
const resetButton = document.getElementById(
  'reset-settings'
) as HTMLButtonElement;
const statusMessage = document.getElementById(
  'status-message'
) as HTMLDivElement;

let isInitialLoad = true;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await getSettings();

    nameChangerToggle.checked = settings.nameChanger || false;
    if (settings.nameChanger) {
      customNameInput.value = settings.customName || '';
      nameSection.classList.remove('hidden');
    }

    pfpChangerToggle.checked = settings.pfpChanger || false;
    if (settings.pfpChanger) {
      pfpChangerSection.classList.remove('hidden');

      const pfpData = await getProfilePicture();
      if (pfpData) {
        pfpPreview.src = pfpData;
        pfpPreview.classList.remove('hidden');
        pfpPlaceholder.classList.add('hidden');
        pfpFileName.textContent = 'Huidige afbeelding';
      }
    }

    fakeMsgCounterToggle.checked = settings.fakeMsgCounter || false;
    if (settings.fakeMsgCounter) {
      msgCounterValueInput.value = (settings.msgCounterValue || 0).toString();
      fakeMsgCounterSection.classList.remove('hidden');
    }

    console.log('Settings loaded:', settings);

    setupEventListeners();

    setTimeout(() => {
      isInitialLoad = false;
    }, 100);
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error bij het laden van instellingen', 'error');
  }
});

function setupEventListeners(): void {
  nameChangerToggle.addEventListener('change', () => {
    if (nameChangerToggle.checked) {
      nameSection.classList.remove('hidden');
    } else {
      nameSection.classList.add('hidden');
    }
    if (!isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  pfpChangerToggle.addEventListener('change', () => {
    if (pfpChangerToggle.checked) {
      pfpChangerSection.classList.remove('hidden');
    } else {
      pfpChangerSection.classList.add('hidden');
    }
    if (!isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  fakeMsgCounterToggle.addEventListener('change', () => {
    if (fakeMsgCounterToggle.checked) {
      fakeMsgCounterSection.classList.remove('hidden');
    } else {
      fakeMsgCounterSection.classList.add('hidden');
    }
    if (!isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  customNameInput.addEventListener('blur', () => {
    if (!isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  customNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  msgCounterValueInput.addEventListener('blur', () => {
    if (!isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  msgCounterValueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isInitialLoad) {
      debouncedAutoSave(() => saveAllSettings(true));
    }
  });

  pfpFileInput.addEventListener('change', handleProfilePictureChange);

  setupDragAndDrop();

  msgCounterValueInput.addEventListener('input', () => {
    let value = msgCounterValueInput.value;

    value = value.replace(/[^0-9]/g, '');

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      msgCounterValueInput.value = numValue.toString();
    } else {
      msgCounterValueInput.value = '0';
    }
  });

  saveButton.addEventListener('click', () => saveAllSettings(false));
  resetButton.addEventListener('click', handleResetSettings);
}

function setupDragAndDrop(): void {
  const dropZone = pfpChangerSection;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  dropZone.addEventListener('drop', handleDrop, false);

  function preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(): void {
    dropZone.classList.add('bg-slate-100');
    dropZone.classList.remove('bg-slate-50');
    dropZone.classList.remove('border-slate-200');
    dropZone.classList.add('border-primary');
  }

  function unhighlight(): void {
    dropZone.classList.remove('bg-slate-100');
    dropZone.classList.add('bg-slate-50');
    dropZone.classList.remove('border-primary');
    dropZone.classList.add('border-slate-200');
  }

  function handleDrop(e: DragEvent): void {
    if (!e.dataTransfer) return;

    const dt = e.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processProfilePicture(file);
      } else {
        showStatus('Alleen afbeeldingen zijn toegestaan', 'error');
      }
    }
  }
}

function handleProfilePictureChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    processProfilePicture(file);
  } else {
    pfpFileName.textContent = 'Geen bestand gekozen';
    pfpPreview.classList.add('hidden');
    pfpPlaceholder.classList.remove('hidden');
  }
}

async function processProfilePicture(file: File): Promise<void> {
  pfpFileName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const result = e.target?.result as string;
    if (result) {
      pfpPreview.src = result;
      pfpPreview.classList.remove('hidden');
      pfpPlaceholder.classList.add('hidden');

      if (pfpChangerToggle.checked) {
        try {
          await saveProfilePicture(result);

          const currentSettings = await getSettings();
          if (!currentSettings.pfpChanger) {
            await saveSettings({
              ...currentSettings,
              pfpChanger: true,
            });
          }

          showStatus('Profielfoto automatisch opgeslagen!', 'success');

          updateActiveTab();
        } catch (error) {
          console.error('failed to save profile picture:', error);
          showStatus('Kon profielfoto niet opslaan', 'error');
        }
      }
    }
  };
  reader.readAsDataURL(file);
}

async function saveAllSettings(isAutoSave = false): Promise<void> {
  try {
    const msgCounterValue = parseInt(msgCounterValueInput.value, 10);

    const settings: Settings = {
      nameChanger: nameChangerToggle.checked,
      customName: customNameInput.value,
      pfpChanger: pfpChangerToggle.checked,
      fakeMsgCounter: fakeMsgCounterToggle.checked,
      msgCounterValue: isNaN(msgCounterValue) ? 0 : msgCounterValue,
    };

    await saveSettings(settings);

    if (isAutoSave) {
      showAutoSaveStatus();
      refreshSmartschoolTab();
    } else {
      showStatus('Instellingen succesvol opgeslagen!', 'success');
    }

    updateActiveTab();
  } catch (error) {
    console.error('failed to save settings:', error);
    showStatus('error bij het opslaan van instellingen', 'error');
  }
}

function updateActiveTab(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (chrome.runtime.lastError) {
      console.error('failed to query tabs:', chrome.runtime.lastError);
      return;
    }
    const activeTab = tabs[0];
    if (activeTab?.url?.includes('smartschool.be')) {
      try {
        const settings = await getSettings();
        chrome.tabs.sendMessage(
          activeTab.id as number,
          {
            action: 'applySettings',
            settings,
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
      } catch (error) {
        console.error('failed to get settings for tab update:', error);
      }
    }
  });
}

function refreshSmartschoolTab(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error(
        'failed to query tabs for refresh:',
        chrome.runtime.lastError
      );
      return;
    }
    const activeTab = tabs[0];
    if (activeTab?.url?.includes('smartschool.be') && activeTab.id) {
      chrome.tabs.reload(activeTab.id, () => {
        if (chrome.runtime.lastError) {
          console.error('failed to refresh tab:', chrome.runtime.lastError);
        }
      });
    }
  });
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

async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('failed to save settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
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

async function saveProfilePicture(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ profilePicture: dataUrl }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          'failed to save profile picture:',
          chrome.runtime.lastError
        );
        reject(chrome.runtime.lastError);
        return;
      }
      resolve();
    });
  });
}

function showStatus(message: string, type: 'success' | 'error'): void {
  statusMessage.textContent = message;
  statusMessage.classList.remove('hidden', 'success', 'error');

  if (type === 'success') {
    statusMessage.classList.add('success');
  } else {
    statusMessage.classList.add('error');
  }

  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

function showAutoSaveStatus(): void {
  showStatus('automatisch opgeslagen', 'success');
}

async function handleResetSettings(): Promise<void> {
  const confirmed = confirm(
    'weet je zeker dat je alle instellingen wilt resetten? dit kan niet ongedaan worden gemaakt.'
  );

  if (!confirmed) {
    return;
  }

  try {
    const defaultSettings: Settings = {
      nameChanger: false,
      customName: '',
      pfpChanger: false,
      fakeMsgCounter: false,
      msgCounterValue: 0,
    };

    await saveSettings(defaultSettings);

    await chrome.storage.local.remove('profilePicture');

    nameChangerToggle.checked = false;
    nameSection.classList.add('hidden');
    customNameInput.value = '';

    pfpChangerToggle.checked = false;
    pfpChangerSection.classList.add('hidden');
    pfpPreview.classList.add('hidden');
    pfpPlaceholder.classList.remove('hidden');
    pfpFileName.textContent = 'geen bestand gekozen';

    fakeMsgCounterToggle.checked = false;
    fakeMsgCounterSection.classList.add('hidden');
    msgCounterValueInput.value = '0';

    showStatus('alle instellingen zijn gereset naar standaard', 'success');

    reloadAllSmartschoolTabs();
  } catch (error) {
    console.error('failed to reset settings:', error);
    showStatus('error bij het resetten van instellingen', 'error');
  }
}

function reloadAllSmartschoolTabs(): void {
  chrome.tabs.query({ url: '*://*.smartschool.be/*' }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error(
        'failed to query all Smartschool tabs:',
        chrome.runtime.lastError
      );
      return;
    }
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.reload(tab.id, () => {
          if (chrome.runtime.lastError) {
            console.error('failed to reload tab:', chrome.runtime.lastError);
          }
        });
      }
    });
  });
}
