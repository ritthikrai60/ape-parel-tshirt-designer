/**
 * src/lib/__tests__/i18n_currency_settings.test.ts
 * Comprehensive Test Suite for i18n, Multi-Currency, and User Preferences Settings Architecture
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { th } from '../i18n/dictionaries/th';
import { en } from '../i18n/dictionaries/en';
import { ja } from '../i18n/dictionaries/ja';
import { formatPrice, convertFromTHB, CURRENCY_CONFIGS } from '../i18n/currency';
import { UserPreferences, Locale, Currency } from '../i18n/types';
import { prisma } from '@/lib/prisma';
import { GET, PATCH } from '@/app/api/user/preferences/route';

// Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';

describe('i18n Multi-Language Translation Dictionaries Suite', () => {
  it('contains non-empty keys across all namespaces for TH, EN, and JA', () => {
    const dicts = [
      { name: 'Thai', dict: th },
      { name: 'English', dict: en },
      { name: 'Japanese', dict: ja },
    ];

    for (const { name, dict } of dicts) {
      expect(dict.common.appName, `${name} appName`).toBeTruthy();
      expect(dict.common.engineStatus, `${name} engineStatus`).toContain('THB');
      expect(dict.nav.studio, `${name} nav.studio`).toBeTruthy();
      expect(dict.nav.marketplace, `${name} nav.marketplace`).toBeTruthy();
      expect(dict.nav.myOrders, `${name} nav.myOrders`).toBeTruthy();
      expect(dict.nav.vault, `${name} nav.vault`).toBeTruthy();
      expect(dict.nav.settings, `${name} nav.settings`).toBeTruthy();
      expect(dict.settings.title, `${name} settings.title`).toBeTruthy();
      expect(dict.settings.tabs.general, `${name} settings.tabs.general`).toBeTruthy();
      expect(dict.settings.tabs.studio, `${name} settings.tabs.studio`).toBeTruthy();
      expect(dict.settings.tabs.notifications, `${name} settings.tabs.notifications`).toBeTruthy();
      expect(dict.settings.tabs.privacy, `${name} settings.tabs.privacy`).toBeTruthy();
      expect(dict.marketplace.title, `${name} marketplace.title`).toBeTruthy();
      expect(dict.studio.customizerTitle, `${name} studio.customizerTitle`).toBeTruthy();
      expect(dict.home.heroTitle, `${name} home.heroTitle`).toBeTruthy();
      expect(dict.livePricing.title, `${name} livePricing.title`).toBeTruthy();
      expect(dict.orders.title, `${name} orders.title`).toBeTruthy();
      expect(dict.footer.settingsLink, `${name} footer.settingsLink`).toBeTruthy();
    }
  });

  it('maintains strict key parity between Thai, English, and Japanese dictionaries', () => {
    const getDeepKeys = (obj: Record<string, any>, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const k of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof obj[k] === 'object' && obj[k] !== null) {
          keys = keys.concat(getDeepKeys(obj[k], fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys.sort();
    };

    const thKeys = getDeepKeys(th);
    const enKeys = getDeepKeys(en);
    const jaKeys = getDeepKeys(ja);

    expect(thKeys).toEqual(enKeys);
    expect(thKeys).toEqual(jaKeys);
  });
});

describe('Multi-Currency Engine & Conversion Suite', () => {
  it('correctly configures all 4 supported currencies with appropriate symbols and decimals', () => {
    expect(CURRENCY_CONFIGS.THB.symbol).toBe('฿');
    expect(CURRENCY_CONFIGS.THB.decimals).toBe(0);
    expect(CURRENCY_CONFIGS.THB.rateFromTHB).toBe(1.0);

    expect(CURRENCY_CONFIGS.USD.symbol).toBe('$');
    expect(CURRENCY_CONFIGS.USD.decimals).toBe(2);
    expect(CURRENCY_CONFIGS.USD.rateFromTHB).toBeGreaterThan(0);

    expect(CURRENCY_CONFIGS.JPY.symbol).toBe('¥');
    expect(CURRENCY_CONFIGS.JPY.decimals).toBe(0);
    expect(CURRENCY_CONFIGS.JPY.rateFromTHB).toBeGreaterThan(1);

    expect(CURRENCY_CONFIGS.EUR.symbol).toBe('€');
    expect(CURRENCY_CONFIGS.EUR.decimals).toBe(2);
    expect(CURRENCY_CONFIGS.EUR.rateFromTHB).toBeGreaterThan(0);
  });

  it('accurately converts base THB to other currencies without precision loss', () => {
    const baseTHB = 1000;
    const usd = convertFromTHB(baseTHB, 'USD');
    const jpy = convertFromTHB(baseTHB, 'JPY');
    const eur = convertFromTHB(baseTHB, 'EUR');

    expect(usd).toBe(28); // 1000 * 0.028 = 28.00
    expect(jpy).toBe(4250); // 1000 * 4.25 = 4250
    expect(eur).toBe(26); // 1000 * 0.026 = 26.00
  });

  it('formats prices with correct currency symbols, commas, and decimal rules', () => {
    // 590 THB garment
    const formattedTHB = formatPrice(590, 'THB', 'th');
    expect(formattedTHB).toBe('฿590');

    // USD format
    const formattedUSD = formatPrice(590, 'USD', 'en');
    expect(formattedUSD).toContain('$');
    expect(formattedUSD).toContain('16.52');

    // JPY format (no decimals, rounded)
    const formattedJPY = formatPrice(590, 'JPY', 'ja');
    expect(formattedJPY).toContain('¥');
    expect(formattedJPY).toContain('2,508');

    // EUR format
    const formattedEUR = formatPrice(590, 'EUR', 'en');
    expect(formattedEUR).toContain('€');
    expect(formattedEUR).toContain('15.34');
  });
});

describe('User Preferences API & Database Sync Suite', () => {
  const mockUser = {
    id: 'user-pref-test-01',
    email: 'tester@ape-parel.com',
    role: 'CUSTOMER',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated GET requests with 401 Unauthorized', async () => {
    (auth as any).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated PATCH requests with 401 Unauthorized', async () => {
    (auth as any).mockResolvedValue(null);

    const req = new Request('http://localhost:3000/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'en', currency: 'USD' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('saves and updates preferences in database for authenticated user', async () => {
    (auth as any).mockResolvedValue({ user: mockUser });

    // Mock prisma user findUnique and update
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: mockUser.id,
      preferences: JSON.stringify({ locale: 'th', currency: 'THB' }),
    } as any);

    const updateSpy = vi.spyOn(prisma.user, 'update').mockResolvedValue({
      id: mockUser.id,
      preferences: JSON.stringify({
        locale: 'en',
        currency: 'USD',
        fontStyle: 'technical',
        studioQuality: 'high',
      }),
    } as any);

    const req = new Request('http://localhost:3000/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locale: 'en',
        currency: 'USD',
        fontStyle: 'technical',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.preferences.locale).toBe('en');
    expect(data.preferences.currency).toBe('USD');
    expect(data.preferences.fontStyle).toBe('technical');

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockUser.id },
      })
    );
  });
});
