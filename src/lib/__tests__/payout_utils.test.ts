import { describe, it, expect } from 'vitest';
import {
  cleanDigits,
  formatThaiPhone,
  formatThaiCitizenId,
  formatBankAccount,
  parsePayoutDetails,
  buildCanonicalPayoutDetails,
  validatePayoutInput,
} from '@/lib/payoutUtils';

describe('payoutUtils - Thai Financial & PromptPay Parsing', () => {
  it('cleans digits correctly', () => {
    expect(cleanDigits('081-234-5678')).toBe('0812345678');
    expect(cleanDigits('PromptPay: 1-1002-00334-55-1')).toBe('1100200334551');
  });

  it('formats Thai mobile phone cleanly', () => {
    expect(formatThaiPhone('0812345678')).toBe('081-234-5678');
    expect(formatThaiPhone('0998887766')).toBe('099-888-7766');
  });

  it('formats Thai citizen ID cleanly', () => {
    expect(formatThaiCitizenId('1100200334551')).toBe('1-1002-00334-55-1');
  });

  it('formats Thai bank account cleanly', () => {
    expect(formatBankAccount('0123456789')).toBe('012-3-45678-9');
  });

  it('parses existing raw strings into structured fields', () => {
    const p1 = parsePayoutDetails('PromptPay: 081-234-5678');
    expect(p1.method).toBe('PROMPTPAY');
    expect(p1.promptPayType).toBe('PHONE');
    expect(p1.promptPayNumber).toBe('0812345678');

    const p2 = parsePayoutDetails('KBANK: 012-3-45678-9 (Somchai Jaidee)');
    expect(p2.method).toBe('BANK_TRANSFER');
    expect(p2.bankCode).toBe('KBANK');
    expect(p2.bankAccountNumber).toBe('0123456789');
    expect(p2.accountName).toBe('Somchai Jaidee');
  });

  it('builds canonical strings ready for QR generation and settlement', () => {
    const s1 = buildCanonicalPayoutDetails({
      method: 'PROMPTPAY',
      promptPayType: 'PHONE',
      promptPayNumber: '0812345678',
    });
    expect(s1).toBe('PromptPay: 081-234-5678');

    const s2 = buildCanonicalPayoutDetails({
      method: 'BANK_TRANSFER',
      bankCode: 'SCB',
      bankAccountNumber: '1234567890',
      accountName: 'Artist Studio',
    });
    expect(s2).toBe('SCB: 123-4-56789-0 (Artist Studio)');
  });

  it('validates PromptPay and Bank inputs with accurate user error messages', () => {
    expect(
      validatePayoutInput({
        method: 'PROMPTPAY',
        promptPayType: 'PHONE',
        promptPayNumber: '081', // Too short
      })
    ).toContain('10 หลัก');

    expect(
      validatePayoutInput({
        method: 'PROMPTPAY',
        promptPayType: 'PHONE',
        promptPayNumber: '0812345678', // Valid
      })
    ).toBeNull();

    expect(
      validatePayoutInput({
        method: 'PROMPTPAY',
        promptPayType: 'CITIZEN_ID',
        promptPayNumber: '1100200334551', // Valid 13 digits
      })
    ).toBeNull();

    expect(
      validatePayoutInput({
        method: 'BANK_TRANSFER',
        bankAccountNumber: '0123456789',
        accountName: '', // Missing name
      })
    ).toContain('ชื่อ-นามสกุล');
  });
});
