// The admin token /sandbox was opened with (SandboxGate), kept per tab so
// closing the tab forgets it. The sandbox reuses it to load content packs.
const STORAGE_KEY = "sandboxAdminToken";

export const readStoredToken = (): string => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

export const storeToken = (token: string) => {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Best-effort; the host just re-enters it next time.
  }
};
