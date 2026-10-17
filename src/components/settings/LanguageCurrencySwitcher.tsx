'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Sliders, Check, ChevronDown } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Locale, Currency } from '@/lib/i18n/types';
import { CURRENCY_CONFIGS } from '@/lib/i18n/currency';

export const LanguageCurrencySwitcher: React.FC = () => {
  const { locale, currency, setLocale, setCurrency, openSettingsModal, playAudioChime, t, isHydrated } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // When SSR hydrating, use default fallback ('TH' & '฿') so server HTML matches client mount identically
  const currencySymbol = isHydrated ? (CURRENCY_CONFIGS[currency]?.symbol || '฿') : '฿';
  const localeUpper = isHydrated ? locale.toUpperCase() : 'TH';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Quick Switcher Button */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => {
          setIsOpen(!isOpen);
          playAudioChime('click');
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center space-x-1 sm:space-x-1.5 py-1 px-1.5 sm:px-2.5 rounded-xl border border-borderCol hover:border-ink/50 bg-paper/90 hover:bg-paper-dark transition-all text-ink focus:outline-none focus:ring-1 focus:ring-ink"
        title="สลับภาษาและค่าเงิน (Language & Currency)"
      >
        <Globe className="w-3.5 h-3.5 text-mutedGray shrink-0" />
        <span
          suppressHydrationWarning
          className="font-mono text-[11px] font-bold whitespace-nowrap"
        >
          {localeUpper} <span className="text-mutedGray font-normal">/</span> {currencySymbol}
        </span>
        <ChevronDown
          className={`hidden sm:inline-block w-3 h-3 text-mutedGray transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Quick Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-paper-light border border-borderCol shadow-2xl z-50 overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-100">
          <div className="h-1 bg-gradient-to-r from-warm via-ink to-warm-dark" />

          {/* Quick Language Section */}
          <div className="p-3 border-b border-borderCol/60">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray font-bold block mb-2">
              Language (ภาษา)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { code: 'th', label: 'TH', full: 'ไทย' },
                  { code: 'en', label: 'EN', full: 'Eng' },
                  { code: 'ja', label: 'JA', full: '日本語' },
                ] as const
              ).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLocale(l.code);
                    playAudioChime('click');
                  }}
                  className={`py-1.5 px-2 rounded-lg font-mono text-xs text-center border transition-all ${
                    locale === l.code
                      ? 'border-ink bg-paper-dark font-bold text-ink shadow-2xs'
                      : 'border-borderCol/60 hover:border-ink/40 text-mutedGray hover:text-ink'
                  }`}
                >
                  <div className="font-bold">{l.label}</div>
                  <div className="text-[9px] text-mutedGray truncate">{l.full}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Currency Section */}
          <div className="p-3 border-b border-borderCol/60">
            <span className="font-mono text-[10px] uppercase tracking-wider text-mutedGray font-bold block mb-2">
              Currency (สกุลเงิน)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['THB', 'USD', 'JPY', 'EUR'] as Currency[]).map((c) => {
                const cfg = CURRENCY_CONFIGS[c];
                const isSelected = currency === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCurrency(c);
                      playAudioChime('click');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg font-mono text-xs border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-ink bg-paper-dark font-bold text-ink shadow-2xs'
                        : 'border-borderCol/60 hover:border-ink/40 text-mutedGray hover:text-ink'
                    }`}
                  >
                    <span>{cfg.symbol} {cfg.code}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* More Settings Footer Action */}
          <div className="p-2 bg-paper/40">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openSettingsModal();
                playAudioChime('click');
              }}
              className="w-full py-2 px-3 rounded-xl bg-warm/25 hover:bg-warm/40 border border-warm/50 text-ink font-mono text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs"
            >
              <div className="flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-warm-dark" />
                <span>{t.settings.title}</span>
              </div>
              <span className="font-mono text-[10px] text-mutedGray uppercase">&gt;</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
