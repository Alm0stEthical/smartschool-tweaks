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

  pfpFileInput.addEventListener("change", handleProfilePictureChange);

  saveButton.addEventListener("click", saveAllSettings);
}

function handleProfilePictureChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    pfpFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        pfpPreview.src = result;
        pfpPreview.classList.remove("hidden");
        pfpPlaceholder.classList.add("hidden");
      }
    };
    reader.readAsDataURL(file);
  } else {
    pfpFileName.textContent = "Geen bestand gekozen";
    pfpPreview.classList.add("hidden");
    pfpPlaceholder.classList.remove("hidden");
  }
}

async function saveAllSettings(): Promise<void> {
  try {
    const settings: Settings = {
      nameChanger: nameChangerToggle.checked,
      customName: customNameInput.value,
      pfpChanger: pfpChangerToggle.checked,

      autoLogin: false,
      username: "",
      password: "",
      school: "",
    };

    await saveSettings(settings);

    if (
      settings.pfpChanger &&
      pfpPreview.src &&
      !pfpPreview.classList.contains("hidden")
    ) {
      await saveProfilePicture(pfpPreview.src);
    }

    showStatus("Instellingen succesvol opgeslagen!", "success");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url?.includes("smartschool.be")) {
        chrome.tabs.sendMessage(activeTab.id as number, {
          action: "applySettings",
          settings,
        });
      }
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Error bij het opslaan van instellingen", "error");
  }
}

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get("settings", (result) => {
      resolve(
        result.settings || {
          nameChanger: false,
          customName: "",
          pfpChanger: false,

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
  statusMessage.classList.remove("hidden", "text-green-600", "text-red-600");

  if (type === "success") {
    statusMessage.classList.add("text-green-600");
  } else {
    statusMessage.classList.add("text-red-600");
  }

  statusMessage.classList.remove("hidden");

  setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, 3000);
}
