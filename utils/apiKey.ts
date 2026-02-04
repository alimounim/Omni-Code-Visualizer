
export const STORAGE_KEY = 'omni_code_gemini_key';

export const getApiKey = (): string | undefined => {
  // 1. Check Local Storage (User provided key)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  // 2. Check Environment Variable (Developer key)
  // We check strictly for undefined to allow empty strings if necessary, though usually valid key is required
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
  }

  return undefined;
};

export const hasApiKey = (): boolean => {
  return !!getApiKey();
};

export const setStoredApiKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY, key);
};

export const removeStoredApiKey = () => {
  localStorage.removeItem(STORAGE_KEY);
};
