'use client';

import React, { useState } from 'react';
import {
  X,
  Globe,
  Coins,
  Type,
  Box,
  Layers,
  Bell,
  Volume2,
  ShieldCheck,
  Trash2,
  Check,
  Sparkles,
  Sliders,
  Maximize2,
  RotateCcw,
} from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Locale, Currency, FontStyle, StudioQuality, StudioViewPreset } from '@/lib/i18n/types';
import { CURRENCY_CONFIGS } from '@/lib/i18n/currency';
import { useToast } from '@/components/providers/ToastProvider';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    closeSettingsModal,
    preferences,
    updatePreferences,
    locale,
    currency,
    t,
    playAudioChime,
  } = useSettings();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'studio' | 'notifications' | 'privacy'>('general');
  const [isClearingCache, setIsClearingCache] = useState(false);

  if (!isSettingsModalOpen) return null;

  const handleClearCache = () => {
    setIsClearingCache(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ape_parel_studio_state_v1');
        localStorage.removeItem('ape_parel_pending_studio_action');
      }
      playAudioChime('success');
      toast({
        type: 'success',
        title: t.settings.privacySection.cacheCleared,
        message: preferences.locale === 'th'
          ? 'ล้างข้อมูลแบบร่างและกราฟิกแคชในเบราว์เซอร์เรียบร้อยแล้ว'
          : 'Local design drafts and studio caches have been cleared.',
      });
    } catch (err) {
      console.warn('Failed to clear cache:', err);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleSoundTest = () => {
    playAudioChime('success');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-paper-light border border-borderCol rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Industrial Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-warm via-ink to-warm-dark" />

        {/* Modal Header */}
        <div className="p-5 border-b border-borderCol/70 bg-paper/60 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-ink text-paper">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 id="settings-modal-title" className="font-mono text-base font-bold text-ink uppercase tracking-tight">
                {t.settings.title}
              </h2>
            </div>
            <p className="text-xs text-mutedGray mt-1">
              {t.settings.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={closeSettingsModal}
            className="p-1.5 rounded-lg text-mutedGray hover:text-ink hover:bg-paper-dark transition-colors"
            title={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-borderCol/60 bg-paper/30 px-4 pt-2 overflow-x-auto space-x-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('general');
              playAudioChime('click');
            }}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-ink text-ink bg-paper-light rounded-t-lg shadow-2xs'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t.settings.tabs.general}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('studio');
              playAudioChime('click');
            }}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'studio'
                ? 'border-ink text-ink bg-paper-light rounded-t-lg shadow-2xs'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>{t.settings.tabs.studio}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('notifications');
              playAudioChime('click');
            }}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-ink text-ink bg-paper-light rounded-t-lg shadow-2xs'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{t.settings.tabs.notifications}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('privacy');
              playAudioChime('click');
            }}
            className={`flex items-center space-x-2 px-3 py-2 border-b-2 font-mono text-xs uppercase tracking-wider font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-ink text-ink bg-paper-light rounded-t-lg shadow-2xs'
                : 'border-transparent text-mutedGray hover:text-ink'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.settings.tabs.privacy}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-ink">
          {/* TAB 1: GENERAL (Language, Currency & Typography) */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* Language Selector */}
              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  {t.settings.languageSection.title}
                </label>
                <p className="text-xs text-mutedGray mb-3">
                  {t.settings.languageSection.desc}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { code: 'th', label: 'ภาษาไทย (TH)', sub: 'Bangkok, TH' },
                      { code: 'en', label: 'English (EN)', sub: 'International' },
                      { code: 'ja', label: '日本語 (JA)', sub: 'Tokyo, JP' },
                    ] as const
                  ).map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        updatePreferences({ locale: lang.code });
                        playAudioChime('click');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        locale === lang.code
                          ? 'border-ink bg-paper-dark shadow-xs'
                          : 'border-borderCol hover:border-ink/50 bg-paper/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-xs font-bold text-ink">{lang.label}</span>
                        {locale === lang.code && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      </div>
                      <span className="font-mono text-[10px] text-mutedGray mt-1">{lang.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency Selector */}
              <div className="pt-2 border-t border-borderCol/60">
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  {t.settings.currencySection.title}
                </label>
                <p className="text-xs text-mutedGray mb-3">
                  {t.settings.currencySection.desc}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['THB', 'USD', 'JPY', 'EUR'] as Currency[]).map((currCode) => {
                    const cfg = CURRENCY_CONFIGS[currCode];
                    const isSelected = currency === currCode;
                    return (
                      <button
                        key={currCode}
                        type="button"
                        onClick={() => {
                          updatePreferences({ currency: currCode });
                          playAudioChime('click');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-ink bg-paper-dark font-bold shadow-xs'
                            : 'border-borderCol hover:border-ink/50 bg-paper/40'
                        }`}
                      >
                        <div>
                          <div className="font-mono text-xs text-ink flex items-center space-x-1.5">
                            <span className="font-bold">{cfg.symbol}</span>
                            <span>{cfg.code}</span>
                          </div>
                          <span className="font-mono text-[10px] text-mutedGray truncate block mt-0.5">
                            {cfg.name}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[11px] text-mutedGray mt-2 italic">
                  {t.settings.currencySection.baseNote}
                </p>
              </div>

              {/* Typography Personality Selector */}
              <div className="pt-2 border-t border-borderCol/60">
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  {t.settings.fontSection.title}
                </label>
                <p className="text-xs text-mutedGray mb-3">
                  {t.settings.fontSection.desc}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: 'streetwear',
                      name: 'Streetwear Modern',
                      preview: 'Prompt / Plus Jakarta',
                      desc: 'สมดุล โฉบเฉี่ยว สไตล์สตรีทแวร์ระดับสากล',
                    },
                    {
                      id: 'technical',
                      name: 'Technical Industrial',
                      preview: 'Kanit / Space Grotesk',
                      desc: 'คมชัด เข้ม แข็งแกร่ง อารมณ์ Blueprint สตูดิโอ',
                    },
                    {
                      id: 'minimal',
                      name: 'Clean Minimalist',
                      preview: 'Sarabun / Inter',
                      desc: 'เรียบหรู สบายตา อ่านง่ายทุกขนาดหน้าจอ',
                    },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        updatePreferences({ fontStyle: f.id as FontStyle });
                        playAudioChime('click');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        preferences.fontStyle === f.id
                          ? 'border-ink bg-paper-dark shadow-xs'
                          : 'border-borderCol hover:border-ink/50 bg-paper/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono text-xs font-bold text-ink">{f.name}</span>
                        {preferences.fontStyle === f.id && (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-warm-dark font-semibold mt-1">
                        {f.preview}
                      </span>
                      <span className="text-[10px] text-mutedGray mt-1 line-clamp-2">
                        {f.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D STUDIO & PERFORMANCE */}
          {activeTab === 'studio' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* 3D Render Quality */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-borderCol bg-paper/40">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.studioSection.qualityTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.studioSection.qualityDesc}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 bg-paper-dark p-1 rounded-lg border border-borderCol">
                  <button
                    type="button"
                    onClick={() => {
                      updatePreferences({ studioQuality: 'high' });
                      playAudioChime('click');
                    }}
                    className={`px-3 py-1 text-xs font-mono rounded font-semibold transition-colors ${
                      preferences.studioQuality === 'high'
                        ? 'bg-ink text-paper font-bold shadow-2xs'
                        : 'text-mutedGray hover:text-ink'
                    }`}
                  >
                    High Fidelity
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updatePreferences({ studioQuality: 'performance' });
                      playAudioChime('click');
                    }}
                    className={`px-3 py-1 text-xs font-mono rounded font-semibold transition-colors ${
                      preferences.studioQuality === 'performance'
                        ? 'bg-ink text-paper font-bold shadow-2xs'
                        : 'text-mutedGray hover:text-ink'
                    }`}
                  >
                    Eco / Speed
                  </button>
                </div>
              </div>

              {/* Dynamic Fabric Physics */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-borderCol bg-paper/40">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.studioSection.physicsTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.studioSection.physicsDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updatePreferences({ fabricPhysicsEnabled: !preferences.fabricPhysicsEnabled });
                    playAudioChime('click');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.fabricPhysicsEnabled ? 'bg-ink' : 'bg-borderCol'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-paper transition-transform ${
                      preferences.fabricPhysicsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Default Studio Perspective */}
              <div>
                <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink mb-1">
                  {t.settings.studioSection.viewTitle}
                </label>
                <p className="text-xs text-mutedGray mb-3">
                  {t.settings.studioSection.viewDesc}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'FRONT', label: 'Front Surface', sub: 'มุมมองด้านหน้าตรง' },
                      { id: 'BACK', label: 'Back Surface', sub: 'มุมมองด้านหลังตรง' },
                      { id: 'ISOMETRIC', label: 'Isometric 3D', sub: 'มุมมองไอโซเมตริกสามมิติ' },
                    ] as const
                  ).map((view) => (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => {
                        updatePreferences({ defaultStudioView: view.id as StudioViewPreset });
                        playAudioChime('click');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        preferences.defaultStudioView === view.id
                          ? 'border-ink bg-paper-dark shadow-xs'
                          : 'border-borderCol hover:border-ink/50 bg-paper/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-ink">{view.label}</span>
                        {preferences.defaultStudioView === view.id && (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                      </div>
                      <span className="text-[10px] text-mutedGray mt-1 block">{view.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS & SOUND */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* Toast Popups */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-borderCol bg-paper/40">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.notificationSection.toastTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.notificationSection.toastDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updatePreferences({ toastNotifications: !preferences.toastNotifications });
                    playAudioChime('click');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.toastNotifications ? 'bg-ink' : 'bg-borderCol'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-paper transition-transform ${
                      preferences.toastNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects & Test Chime */}
              <div className="p-3.5 rounded-xl border border-borderCol bg-paper/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                      {t.settings.notificationSection.soundTitle}
                    </div>
                    <p className="text-xs text-mutedGray mt-0.5">
                      {t.settings.notificationSection.soundDesc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updatePreferences({ soundEnabled: !preferences.soundEnabled });
                      if (!preferences.soundEnabled) playAudioChime('success');
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.soundEnabled ? 'bg-ink' : 'bg-borderCol'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-paper transition-transform ${
                        preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {preferences.soundEnabled && (
                  <div className="pt-2 border-t border-borderCol/50 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSoundTest}
                      className="px-2.5 py-1 rounded bg-paper-dark hover:bg-borderCol/60 text-ink font-mono text-[11px] font-semibold flex items-center space-x-1.5 transition-colors border border-borderCol"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-warm-dark" />
                      <span>Test Sound Chime (ทดสอบเสียง)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Order Status Alerts */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-borderCol bg-paper/40">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.notificationSection.alertsTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.notificationSection.alertsDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updatePreferences({ orderAlerts: !preferences.orderAlerts });
                    playAudioChime('click');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.orderAlerts ? 'bg-ink' : 'bg-borderCol'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-paper transition-transform ${
                      preferences.orderAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & DATA */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* PDPA Cookies Manager */}
              <div className="p-4 rounded-xl border border-borderCol bg-paper/40 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.privacySection.cookieTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.privacySection.cookieDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeSettingsModal();
                    // Dispatch custom event to open CookiePreferencesModal
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-ink text-paper hover:bg-ink-light font-mono text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                >
                  {t.settings.privacySection.manageCookies}
                </button>
              </div>

              {/* Local Storage Cache Purge */}
              <div className="p-4 rounded-xl border border-borderCol bg-paper/40 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                    {t.settings.privacySection.cacheTitle}
                  </div>
                  <p className="text-xs text-mutedGray mt-0.5">
                    {t.settings.privacySection.cacheDesc}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-mono text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.settings.privacySection.clearCache}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-borderCol/70 bg-paper/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              updatePreferences({
                locale: 'th',
                currency: 'THB',
                fontStyle: 'streetwear',
                studioQuality: 'high',
                fabricPhysicsEnabled: true,
                defaultStudioView: 'FRONT',
                toastNotifications: true,
                soundEnabled: true,
                orderAlerts: true,
              });
              playAudioChime('click');
            }}
            className="flex items-center space-x-1 font-mono text-xs text-mutedGray hover:text-ink transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.common.reset}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playAudioChime('success');
              closeSettingsModal();
            }}
            className="px-5 py-2 rounded-xl bg-ink text-paper hover:bg-ink-light font-mono text-xs uppercase tracking-wider font-bold transition-colors shadow-sm"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
