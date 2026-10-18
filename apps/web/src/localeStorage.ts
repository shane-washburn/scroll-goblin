/** The current Hedgeling provider reads localStorage without a guard. */
export function canReadLocaleStorage(): boolean {
  try {
    window.localStorage.getItem('hedgeling.locale');
    return true;
  } catch {
    return false;
  }
}
