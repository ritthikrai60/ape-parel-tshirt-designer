/**
 * Thai Financial & PromptPay Parsing and Formatting Utilities
 * Standardized across Creator & Supplier portals.
 */

export type PayoutMethodType = 'PROMPTPAY' | 'BANK_TRANSFER';
export type PromptPayIdType = 'PHONE' | 'CITIZEN_ID';

export interface ThaiBankInfo {
  code: string;
  nameTh: string;
  nameEn: string;
}

export const THAI_BANKS: ThaiBankInfo[] = [
  { code: 'KBANK', nameTh: 'กสิกรไทย (KBANK)', nameEn: 'Kasikornbank' },
  { code: 'SCB', nameTh: 'ไทยพาณิชย์ (SCB)', nameEn: 'Siam Commercial Bank' },
  { code: 'BBL', nameTh: 'กรุงเทพ (BBL)', nameEn: 'Bangkok Bank' },
  { code: 'KTB', nameTh: 'กรุงไทย (KTB)', nameEn: 'Krungthai Bank' },
  { code: 'TTB', nameTh: 'ทหารไทยธนชาต (ttb)', nameEn: 'TMBThanachart' },
  { code: 'BAY', nameTh: 'กรุงศรีอยุธยา (BAY)', nameEn: 'Bank of Ayudhya' },
  { code: 'GSB', nameTh: 'ออมสิน (GSB)', nameEn: 'Government Savings Bank' },
  { code: 'BAAC', nameTh: 'ธ.ก.ส. (BAAC)', nameEn: 'BAAC' },
  { code: 'CIMB', nameTh: 'ซีไอเอ็มบี ไทย (CIMB)', nameEn: 'CIMB Thai' },
  { code: 'UOB', nameTh: 'ยูโอบี (UOB)', nameEn: 'United Overseas Bank' },
];

export interface ParsedPayoutDetails {
  method: PayoutMethodType;
  promptPayType?: PromptPayIdType;
  promptPayNumber?: string; // Digits only
  bankCode?: string;
  bankAccountNumber?: string; // Digits only
  accountName?: string;
  rawString: string;
}

/**
 * Strips non-digits from string
 */
export function cleanDigits(val: string): string {
  return (val || '').replace(/\D/g, '');
}

/**
 * Formats Thai Phone (10 digits) -> 081-234-5678 or 02-xxx-xxxx
 */
export function formatThaiPhone(digits: string): string {
  const d = cleanDigits(digits);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/**
 * Formats Thai Citizen ID (13 digits) -> 1-2345-67890-12-3
 */
export function formatThaiCitizenId(digits: string): string {
  const d = cleanDigits(digits);
  if (d.length <= 1) return d;
  if (d.length <= 5) return `${d.slice(0, 1)}-${d.slice(1)}`;
  if (d.length <= 10) return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10)}`;
  return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d.slice(12, 13)}`;
}

/**
 * Formats Thai Bank Account (10-12 digits) -> 123-4-56789-0
 */
export function formatBankAccount(digits: string): string {
  const d = cleanDigits(digits);
  if (d.length <= 3) return d;
  if (d.length <= 4) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4, 9)}-${d.slice(9, 12)}`;
}

/**
 * Parses existing unstructured payoutDetails string into structured parts
 */
export function parsePayoutDetails(raw: string | null | undefined): ParsedPayoutDetails {
  const str = (raw || '').trim();
  if (!str) {
    return { method: 'PROMPTPAY', promptPayType: 'PHONE', rawString: '' };
  }

  // Check if it's PromptPay
  if (/promptpay/i.test(str)) {
    const digits = cleanDigits(str);
    if (digits.length === 13) {
      return {
        method: 'PROMPTPAY',
        promptPayType: 'CITIZEN_ID',
        promptPayNumber: digits,
        rawString: str,
      };
    }
    return {
      method: 'PROMPTPAY',
      promptPayType: 'PHONE',
      promptPayNumber: digits,
      rawString: str,
    };
  }

  // Check if matched known banks
  const matchedBank = THAI_BANKS.find(
    (b) => new RegExp(`\\b${b.code}\\b`, 'i').test(str) || str.includes(b.nameTh)
  );

  if (matchedBank || /bank|ธนาคาร/i.test(str)) {
    const digits = cleanDigits(str);
    // Extract account name inside parentheses if any e.g. "(สมชาย ใจดี)"
    const nameMatch = str.match(/\((.*?)\)/);
    return {
      method: 'BANK_TRANSFER',
      bankCode: matchedBank ? matchedBank.code : 'KBANK',
      bankAccountNumber: digits,
      accountName: nameMatch ? nameMatch[1].trim() : undefined,
      rawString: str,
    };
  }

  // Fallback: check digits length
  const fallbackDigits = cleanDigits(str);
  if (fallbackDigits.length === 13) {
    return {
      method: 'PROMPTPAY',
      promptPayType: 'CITIZEN_ID',
      promptPayNumber: fallbackDigits,
      rawString: str,
    };
  }

  if (fallbackDigits.length === 10 && (fallbackDigits.startsWith('08') || fallbackDigits.startsWith('09') || fallbackDigits.startsWith('06'))) {
    return {
      method: 'PROMPTPAY',
      promptPayType: 'PHONE',
      promptPayNumber: fallbackDigits,
      rawString: str,
    };
  }

  return {
    method: 'PROMPTPAY',
    promptPayType: 'PHONE',
    promptPayNumber: fallbackDigits,
    rawString: str,
  };
}

/**
 * Builds canonical standard payoutDetails string
 */
export function buildCanonicalPayoutDetails(params: {
  method: PayoutMethodType;
  promptPayType?: PromptPayIdType;
  promptPayNumber?: string;
  bankCode?: string;
  bankAccountNumber?: string;
  accountName?: string;
}): string {
  if (params.method === 'PROMPTPAY') {
    const d = cleanDigits(params.promptPayNumber || '');
    if (params.promptPayType === 'CITIZEN_ID') {
      return `PromptPay: ${formatThaiCitizenId(d)}`;
    }
    return `PromptPay: ${formatThaiPhone(d)}`;
  }

  const d = cleanDigits(params.bankAccountNumber || '');
  const bankCode = params.bankCode || 'KBANK';
  const namePart = params.accountName?.trim() ? ` (${params.accountName.trim()})` : '';
  return `${bankCode}: ${formatBankAccount(d)}${namePart}`;
}

/**
 * Validates payout configuration input and returns validation errors
 */
export function validatePayoutInput(params: {
  method: PayoutMethodType;
  promptPayType?: PromptPayIdType;
  promptPayNumber?: string;
  bankCode?: string;
  bankAccountNumber?: string;
  accountName?: string;
}): string | null {
  if (params.method === 'PROMPTPAY') {
    const d = cleanDigits(params.promptPayNumber || '');
    if (!d) return 'กรุณาระบุหมายเลขพร้อมเพย์';
    if (params.promptPayType === 'CITIZEN_ID') {
      if (d.length !== 13) {
        return 'หมายเลขบัตรประชาชนสำหรับพร้อมเพย์ต้องมี 13 หลักพอดี';
      }
    } else {
      if (d.length !== 10) {
        return 'หมายเลขโทรศัพท์มือถือสำหรับพร้อมเพย์ต้องมี 10 หลัก (เช่น 081-234-5678)';
      }
      if (!/^0[689]/.test(d)) {
        return 'เบอร์มือถือพร้อมเพย์ต้องขึ้นต้นด้วย 06, 08 หรือ 09';
      }
    }
    return null;
  }

  // Bank Transfer
  const d = cleanDigits(params.bankAccountNumber || '');
  if (!d) return 'กรุณาระบุเลขที่บัญชีธนาคาร';
  if (d.length < 10 || d.length > 12) {
    return 'เลขที่บัญชีธนาคารต้องมี 10 ถึง 12 หลัก';
  }
  if (!params.accountName || params.accountName.trim().length < 2) {
    return 'กรุณาระบุชื่อ-นามสกุลเจ้าของบัญชี (Account Name) ให้ตรงกับสมุดบัญชี';
  }
  return null;
}
