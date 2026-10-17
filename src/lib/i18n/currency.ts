/**
 * src/lib/i18n/currency.ts
 * Multi-Currency Configuration, Exchange Rate Engine & Formatting
 */
import { Currency, CurrencyConfig, Locale } from './types';

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  THB: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht (บาท)',
    rateFromTHB: 1.0,
    decimals: 0,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar (USD)',
    rateFromTHB: 0.028,
    decimals: 2,
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen (円)',
    rateFromTHB: 4.25,
    decimals: 0,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro (EUR)',
    rateFromTHB: 0.026,
    decimals: 2,
  },
};

/**
 * Converts an amount from base currency (THB) to the target display currency.
 */
export function convertFromTHB(amountInTHB: number, targetCurrency: Currency): number {
  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.THB;
  const converted = amountInTHB * config.rateFromTHB;
  if (config.decimals === 0) {
    return Math.round(converted);
  }
  return Number(converted.toFixed(config.decimals));
}

/**
 * Formats a given THB price into the user's selected currency and locale.
 * Example:
 * formatPrice(590, 'THB', 'th') => '฿590'
 * formatPrice(590, 'USD', 'en') => '$16.52'
 * formatPrice(590, 'JPY', 'ja') => '¥2,508'
 * formatPrice(590, 'EUR', 'en') => '€15.34'
 */
export function formatPrice(
  amountInTHB: number,
  targetCurrency: Currency = 'THB',
  locale: Locale = 'th'
): string {
  const config = CURRENCY_CONFIGS[targetCurrency] || CURRENCY_CONFIGS.THB;
  const value = convertFromTHB(amountInTHB, targetCurrency);

  const localeCode = locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'th-TH';

  const formattedNum = value.toLocaleString(localeCode, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return `${config.symbol}${formattedNum}`;
}
