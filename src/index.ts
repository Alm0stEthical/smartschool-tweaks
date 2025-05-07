import { Settings } from "./types";

const nameChangerToggle = document.getElementById(
  "name-changer-toggle"
) as HTMLInputElement;
const nameSection = document.getElementById("name-section") as HTMLDivElement;
const customNameInput = document.getElementById(
  "custom-name"
) as HTMLInputElement;

const pfpChangerToggle = document.getElementById(
  "pfp-changer-toggle"
) as HTMLInputElement;
const pfpChangerSection = document.getElementById(
  "pfp-changer-section"
) as HTMLDivElement;
const pfpFileInput = document.getElementById(
  "pfpFileInput"
) as HTMLInputElement;
const pfpFileName = document.getElementById("pfpFileName") as HTMLSpanElement;
const pfpPreview = document.getElementById("pfpPreview") as HTMLImageElement;
const pfpPlaceholder = document.getElementById("pfpPlaceholder") as HTMLElement;

const fakeMsgCounterToggle = document.getElementById(
  "fake-msg-counter-toggle"
) as HTMLInputElement;
const fakeMsgCounterSection = document.getElementById(
  "fake-msg-counter-section"
) as HTMLDivElement;
const msgCounterValueInput = document.getElementById(
  "msg-counter-value"
) as HTMLInputElement;

const saveButton = document.getElementById(
  "save-settings"
) as HTMLButtonElement;
const statusMessage = document.getElementById(
  "status-message"
) as HTMLDivElement;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const settings = await getSettings();

    nameChangerToggle.checked = settings.nameChanger || false;
    if (settings.nameChanger) {
      customNameInput.value = settings.customName || "";
      nameSection.classList.remove("hidden");
    }

    pfpChangerToggle.checked = settings.pfpChanger || false;
    if (settings.pfpChanger) {
      pfpChangerSection.classList.remove("hidden");

      const pfpData = await getProfilePicture();
      if (pfpData) {
        pfpPreview.src = pfpData;
        pfpPreview.classList.remove("hidden");
        pfpPlaceholder.classList.add("hidden");
        pfpFileName.textContent = "Huidige afbeelding";
      }
    }

    fakeMsgCounterToggle.checked = settings.fakeMsgCounter || false;
    if (settings.fakeMsgCounter) {
      msgCounterValueInput.value = (settings.msgCounterValue || 0).toString();
      fakeMsgCounterSection.classList.remove("hidden");
    }

    console.log("Settings loaded:", settings);

    setupEventListeners();
  } catch (error) {
    console.error("Error loading settings:", error);
    showStatus("Error bij het laden van instellingen", "error");
  }
});

function setupEventListeners(): void {
  nameChangerToggle.addEventListener("change", () => {
    if (nameChangerToggle.checked) {
      nameSection.classList.remove("hidden");
    } else {
      nameSection.classList.add("hidden");
    }
  });

  pfpChangerToggle.addEventListener("change", () => {
    if (pfpChangerToggle.checked) {
      pfpChangerSection.classList.remove("hidden");
    } else {
      pfpChangerSection.classList.add("hidden");
    }
  });

  fakeMsgCounterToggle.addEventListener("change", () => {
    if (fakeMsgCounterToggle.checked) {
      fakeMsgCounterSection.classList.remove("hidden");
    } else {
      fakeMsgCounterSection.classList.add("hidden");
    }
  });

  pfpFileInput.addEventListener("change", handleProfilePictureChange);

  // setup drag and drop for profile picture
  setupDragAndDrop();

  msgCounterValueInput.addEventListener("input", () => {
    let value = msgCounterValueInput.value;

    value = value.replace(/[^0-9]/g, "");

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      msgCounterValueInput.value = numValue.toString();
    } else {
      msgCounterValueInput.value = "0";
    }
  });

  saveButton.addEventListener("click", saveAllSettings);
}

function setupDragAndDrop(): void {
  const dropZone = pfpChangerSection;

  // prevent default drag behaviors to allow our custom drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  // highlight drop area on hover
  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  // handle the actual drop
  dropZone.addEventListener("drop", handleDrop, false);

  function preventDefaults(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight(): void {
    // highlight the drop zone when dragging over it
    dropZone.classList.add('bg-slate-100');
    dropZone.classList.remove('bg-slate-50');
    dropZone.classList.remove('border-slate-200');
    dropZone.classList.add('border-primary');
  }
  
  function unhighlight(): void {
    // reset the drop zone styling when drag leaves
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
      if (file.type.startsWith("image/")) {
        processProfilePicture(file);
      } else {
        showStatus("Alleen afbeeldingen zijn toegestaan", "error");
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
    pfpFileName.textContent = "Geen bestand gekozen";
    pfpPreview.classList.add("hidden");
    pfpPlaceholder.classList.remove("hidden");
  }
}

async function processProfilePicture(file: File): Promise<void> {
  pfpFileName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const result = e.target?.result as string;
    if (result) {
      pfpPreview.src = result;
      pfpPreview.classList.remove("hidden");
      pfpPlaceholder.classList.add("hidden");

      // auto-save the profile picture
      if (pfpChangerToggle.checked) {
        try {
          await saveProfilePicture(result);

          // update settings to ensure pfpChanger is enabled
          const currentSettings = await getSettings();
          if (!currentSettings.pfpChanger) {
            await saveSettings({
              ...currentSettings,
              pfpChanger: true,
            });
          }

          showStatus("Profielfoto automatisch opgeslagen!", "success");

          // update active tab if on smartschool
          updateActiveTab();
        } catch (error) {
          console.error("fuck, failed to save profile pic", error);
          showStatus("Kon profielfoto niet opslaan", "error");
        }
      }
    }
  };
  reader.readAsDataURL(file);
}

async function saveAllSettings(): Promise<void> {
  try {
    const msgCounterValue = parseInt(msgCounterValueInput.value, 10);

    const settings: Settings = {
      nameChanger: nameChangerToggle.checked,
      customName: customNameInput.value,
      pfpChanger: pfpChangerToggle.checked,
      fakeMsgCounter: fakeMsgCounterToggle.checked,
      msgCounterValue: isNaN(msgCounterValue) ? 0 : msgCounterValue,

      autoLogin: false,
      username: "",
      password: "",
      school: "",
    };

    await saveSettings(settings);

    // profile picture is already auto-saved when changed, no need to save again here

    showStatus("Instellingen succesvol opgeslagen!", "success");

    updateActiveTab();
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Error bij het opslaan van instellingen", "error");
  }
}

function updateActiveTab(): void {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const activeTab = tabs[0];
    if (activeTab?.url?.includes("smartschool.be")) {
      const settings = await getSettings();
      chrome.tabs.sendMessage(activeTab.id as number, {
        action: "applySettings",
        settings,
      });
    }
  });
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("settings", (result) => {
      resolve(
        result.settings || {
          nameChanger: false,
          customName: "",
          pfpChanger: false,
          fakeMsgCounter: false,
          msgCounterValue: 0,

          autoLogin: false,
          username: "",
          password: "",
          school: "",
        }
      );
    });
  });
}

async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, resolve);
  });
}

async function getProfilePicture(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get("profilePicture", (result) => {
      resolve(result.profilePicture || "");
    });
  });
}

async function saveProfilePicture(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ profilePicture: dataUrl }, resolve);
  });
}

function showStatus(message: string, type: "success" | "error"): void {
  statusMessage.textContent = message;
  statusMessage.classList.remove("hidden", "text-green-600", "text-red-500");

  if (type === "success") {
    statusMessage.classList.add("text-green-600");
  } else {
    statusMessage.classList.add("text-red-500");
  }

  setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, 3000);
}
