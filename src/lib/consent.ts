/**
 * Cookie Consent & PDPA Compliance Utility
 * APE-PAREL Platform
 */

export interface CookieConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
}

export const CONSENT_COOKIE_KEY = 'ape_cookie_consent';
export const CURRENT_POLICY_VERSION = '1.0';

export const DEFAULT_CONSENT: CookieConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  timestamp: '',
  version: CURRENT_POLICY_VERSION,
};

export function getStoredConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CONSENT_COOKIE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.necessary === 'boolean') {
      return parsed as CookieConsentPreferences;
    }
  } catch {
    // fallback
  }

  return null;
}

export function saveStoredConsent(prefs: Partial<CookieConsentPreferences>): CookieConsentPreferences {
  const completePrefs: CookieConsentPreferences = {
    necessary: true, // Always required
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    timestamp: new Date().toISOString(),
    version: CURRENT_POLICY_VERSION,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_COOKIE_KEY, JSON.stringify(completePrefs));
      // Also set a browser cookie with 1 year expiration
      document.cookie = `${CONSENT_COOKIE_KEY}=${encodeURIComponent(
        JSON.stringify(completePrefs)
      )}; path=/; max-age=31536000; SameSite=Lax`;

      // Dispatch global window event so any listeners can adapt
      window.dispatchEvent(
        new CustomEvent('cookie_consent_updated', { detail: completePrefs })
      );
    } catch (e) {
      console.error('[Consent] Failed to write consent cookie:', e);
    }
  }

  return completePrefs;
}

export function resetConsent(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CONSENT_COOKIE_KEY);
      document.cookie = `${CONSENT_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('cookie_consent_reset'));
    } catch {}
  }
}
