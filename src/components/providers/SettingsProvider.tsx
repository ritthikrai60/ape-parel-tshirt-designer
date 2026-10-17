'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Locale, Currency, FontStyle, UserPreferences, TranslationDictionary } from '@/lib/i18n/types';
import { formatPrice as formatCurrencyPrice } from '@/lib/i18n/currency';
import { th } from '@/lib/i18n/dictionaries/th';
import { en } from '@/lib/i18n/dictionaries/en';
import { ja } from '@/lib/i18n/dictionaries/ja';

const DICTIONARIES: Record<Locale, TranslationDictionary> = { th, en, ja };

const DEFAULT_PREFERENCES: UserPreferences = {
  locale: 'th',
  currency: 'THB',
  fontStyle: 'streetwear',
  studioQuality: 'high',
  fabricPhysicsEnabled: true,
  defaultStudioView: 'FRONT',
  toastNotifications: true,
  soundEnabled: true,
  orderAlerts: true,
};

interface SettingsContextValue {
  preferences: UserPreferences;
  locale: Locale;
  currency: Currency;
  t: TranslationDictionary;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  formatPrice: (amountInTHB: number) => string;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  playAudioChime: (type?: 'click' | 'success' | 'alert') => void;
  isHydrated: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

const STORAGE_KEY = 'ape_parel_user_preferences';

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Safely read client storage after hydration mount to prevent SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({ ...prev, ...parsed }));
      } else {
        const cookieLocale = getCookie('NEXT_LOCALE') as Locale;
        const cookieCurrency = getCookie('NEXT_CURRENCY') as Currency;
        if (cookieLocale || cookieCurrency) {
          setPreferences((prev) => ({
            ...prev,
            ...(cookieLocale && { locale: cookieLocale }),
            ...(cookieCurrency && { currency: cookieCurrency }),
          }));
        }
      }
    } catch (err) {
      console.warn('[SettingsProvider] Failed to read initial storage:', err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Sync with DB preferences on login
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetch('/api/user/preferences')
        .then((res) => (res.ok ? res.json() : null))
        .then((dbPrefs) => {
          if (dbPrefs && typeof dbPrefs === 'object') {
            setPreferences((prev) => {
              const merged = { ...prev, ...dbPrefs };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              setCookie('NEXT_LOCALE', merged.locale);
              setCookie('NEXT_CURRENCY', merged.currency);
              return merged;
            });
          }
        })
        .catch((err) => console.warn('[SettingsProvider] Failed to fetch DB preferences:', err));
    }
  }, [status, session?.user]);

  // Update HTML document attributes & root classes on locale or font change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = preferences.locale;
      // Set dataset for custom CSS targeting if needed
      document.documentElement.dataset.locale = preferences.locale;
      document.documentElement.dataset.fontStyle = preferences.fontStyle;
    }
  }, [preferences.locale, preferences.fontStyle]);

  // Audio Chime synthesizer using Web Audio API (Zero external assets needed)
  const playAudioChime = useCallback(
    (type: 'click' | 'success' | 'alert' = 'click') => {
      if (!preferences.soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'click') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (type === 'success') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        } else if (type === 'alert') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(880, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.start(now);
          osc.stop(now + 0.18);
        }
      } catch (e) {
        // AudioContext play may be blocked prior to user interaction
      }
    },
    [preferences.soundEnabled]
  );

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const next = { ...preferences, ...updates };
      setPreferences(next);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          setCookie('NEXT_LOCALE', next.locale);
          setCookie('NEXT_CURRENCY', next.currency);
          setCookie('NEXT_SETTINGS', JSON.stringify(next));
        } catch (err) {
          console.warn('[SettingsProvider] Failed to save to localStorage:', err);
        }
      }

      // If user is authenticated, sync to database asynchronously
      if (status === 'authenticated') {
        try {
          await fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
          });
        } catch (err) {
          console.warn('[SettingsProvider] Failed to sync preferences to DB:', err);
        }
      }

      // Revalidate Server Components in the background
      try {
        router.refresh();
      } catch {
        // Ignored in non-browser/test environments
      }
    },
    [preferences, status, router]
  );

  const setLocale = useCallback(
    (loc: Locale) => {
      updatePreferences({ locale: loc });
    },
    [updatePreferences]
  );

  const setCurrency = useCallback(
    (curr: Currency) => {
      updatePreferences({ currency: curr });
    },
    [updatePreferences]
  );

  const formatPrice = useCallback(
    (amountInTHB: number) => {
      return formatCurrencyPrice(amountInTHB, preferences.currency, preferences.locale);
    },
    [preferences.currency, preferences.locale]
  );

  const t = DICTIONARIES[preferences.locale] || DICTIONARIES.th;

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        locale: preferences.locale,
        currency: preferences.currency,
        t,
        setLocale,
        setCurrency,
        updatePreferences,
        formatPrice,
        isSettingsModalOpen,
        openSettingsModal: () => setIsSettingsModalOpen(true),
        closeSettingsModal: () => setIsSettingsModalOpen(false),
        playAudioChime,
        isHydrated,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
