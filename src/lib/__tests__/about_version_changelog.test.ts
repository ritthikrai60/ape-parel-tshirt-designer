import { describe, it, expect } from 'vitest';
import { APP_VERSION, APP_BUILD_DATE, APP_CODENAME, CHANGELOG_DATA } from '@/lib/version';
import { th } from '@/lib/i18n/dictionaries/th';
import { en } from '@/lib/i18n/dictionaries/en';
import { ja } from '@/lib/i18n/dictionaries/ja';

describe('About, Version & Changelog Integrity Suite', () => {
  it('should define valid APP_VERSION, APP_BUILD_DATE, and APP_CODENAME', () => {
    expect(APP_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(APP_BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(APP_CODENAME).toBeTruthy();
  });

  it('should have latest release marked in CHANGELOG_DATA matching APP_VERSION', () => {
    expect(CHANGELOG_DATA.length).toBeGreaterThanOrEqual(1);
    const latest = CHANGELOG_DATA.find((m) => m.isLatest);
    expect(latest).toBeDefined();
    expect(latest?.version).toBe(APP_VERSION);
  });

  it('should ensure all changelog milestones have valid structure', () => {
    for (const milestone of CHANGELOG_DATA) {
      expect(milestone.version).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(milestone.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(milestone.summary.length).toBeGreaterThan(10);
      expect(milestone.changes.length).toBeGreaterThan(0);

      for (const change of milestone.changes) {
        expect(['feat', 'fix', 'security', 'ui', 'perf']).toContain(change.type);
        expect(change.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('should have about and changelog translations in all supported locales', () => {
    // Thai
    expect(th.nav.about).toBeTruthy();
    expect(th.nav.changelog).toBeTruthy();
    expect(th.footer.about).toBeTruthy();
    expect(th.footer.changelog).toBeTruthy();
    expect(th.footer.version).toBeTruthy();

    // English
    expect(en.nav.about).toBeTruthy();
    expect(en.nav.changelog).toBeTruthy();
    expect(en.footer.about).toBeTruthy();
    expect(en.footer.changelog).toBeTruthy();
    expect(en.footer.version).toBeTruthy();

    // Japanese
    expect(ja.nav.about).toBeTruthy();
    expect(ja.nav.changelog).toBeTruthy();
    expect(ja.footer.about).toBeTruthy();
    expect(ja.footer.changelog).toBeTruthy();
    expect(ja.footer.version).toBeTruthy();
  });
});
