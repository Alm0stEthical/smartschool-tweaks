export const CONFIG = {
  MAX_NAME_CHANGE_ATTEMPTS: 10,
  PERIODIC_CHECK_INTERVAL: 700,
  IMAGE_CHECK_INTERVAL: 400,
  MESSAGE_COUNTER_INTERVAL: 5000,
  NAME_INTERVAL_DELAY: 500,
  NAME_RETRY_ATTEMPTS: 5,
  IMAGE_RETRY_ATTEMPTS: 5,
  STATUS_MESSAGE_TIMEOUT: 3000,
} as const;

export const SELECTORS = {
  NAME_ELEMENTS: [
    '.username',
    '.user-fullname',
    '.user-name',
    '.profile-name',
    '.account-name',
    '.top-username',
    '.navbar-username',
    '.authentication__welcome',
    '.topnav__btn--profile > .hlp-vert-box > span:first-child',
  ],
  WELCOME_ELEMENTS: [
    '.authentication__welcome',
    '.welcome-message',
    '.login-welcome',
  ],
  PROFILE_BUTTON: '.topnav__btn--profile',
  PROFILE_CONTAINER: '.hlp-vert-box',
  USERNAME_IDS: "[id*='username'],[id*='user_name'],[id*='fullname']",
} as const;

export const IMAGE_PATTERNS = {
  USER_PICTURE: 'userpicture',
  HASH_IMAGE: 'hashimage/hash',
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  PROFILE_PICTURE: 'profilePicture',
  MESSAGES_COUNTER: 'MessagesCounter',
} as const;

export const ATTRIBUTES = {
  PFP_REPLACED: 'data-pfp-replaced',
  BG_REPLACED: 'data-bg-replaced',
  NAME_CHANGED: 'data-name-changed',
  ORIGINAL_SRC: 'data-original-src',
  ORIGINAL_STYLE: 'data-original-style',
} as const;

export const NETWORK_RULES = {
  PROFILE_PICTURE_BLOCK_ID: 1,
  HASH_IMAGE_BLOCK_ID: 2,
  PRIORITY: 1,
} as const;
