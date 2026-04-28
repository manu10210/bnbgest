const SETTINGS_PREFIX = 'bnbgest:settings:';

export function loadClientSetting<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(`${SETTINGS_PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveClientSetting<T>(key: string, value: T): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(`${SETTINGS_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota / parse errors silently for UX stability
  }
}