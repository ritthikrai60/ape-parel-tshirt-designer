/**
 * Ape-Parel Order Chat & Anti-Fraud Security Engine
 *
 * Provides:
 * 1. Off-platform transaction and contact detection (Fraud & Dispute Prevention)
 * 2. 7-Day Time-To-Live (TTL) image lifecycle calculation and sanitization
 * 3. Client-side canvas image compression and server-side validation
 */

export const CHAT_IMAGE_TTL_DAYS = 7;
export const CHAT_IMAGE_TTL_MS = CHAT_IMAGE_TTL_DAYS * 24 * 60 * 60 * 1000;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CHAT_IMAGE_BYTES = 1024 * 1024; // 1MB raw size threshold
export const MAX_CHAT_IMAGE_BASE64_LENGTH = 1_500_000; // Base64 encoding threshold

export type FraudRiskLevel = 'NONE' | 'MEDIUM' | 'HIGH';

export interface FraudDetectionResult {
  isFlagged: boolean;
  riskLevel: FraudRiskLevel;
  flagReason: string | null;
  detectedMatches: string[];
}

/**
 * Regular expressions for detecting off-platform contacts and payment bypass attempts
 */
const FRAUD_PATTERNS = {
  // Thai mobile numbers (10 digits starting with 06, 08, 09 with optional dashes/spaces)
  thaiMobile: /(?:(?:\+?66|0)[689](?:[\s.-]?\d){8})\b/g,

  // Thai landlines (9 digits starting with 02, 03, 04, 05, 07 with optional dashes/spaces)
  thaiLandline: /(?:(?:\+?66|0)[2-7](?:[\s.-]?\d){7})\b/g,

  // Phone context keywords followed by phone-like digit sequences
  phoneContext: /(?:เบอร์โทร|เบอร์ติดต่อ|โทรมาที่|ติดต่อได้ที่|โทรตรง|tel|call)[\s:]*([0-9\s.-]{9,13})/gi,

  // LINE references & handles
  lineExplicit: /(?:(?:แอดไลน์|ไอดีไลน์|ติดต่อทางไลน์|คุยในไลน์|ขอไลน์|ทักไลน์|แอดมาที่|add\s*line|line\s*id|line\s*:|line\.me\/ti\/p\/)[^\n]{0,30})/gi,
  lineHandle: /(?:(?:line|ไลน์)[\s:]+@?[a-zA-Z0-9._-]{3,25})\b/gi,

  // Other social/external apps
  externalMessengers: /(?:whatsapp|วอทแอป|telegram|เทเลแกรม|inbox\s*เฟส|ทักเฟส|fb\.com|m\.me)/gi,

  // PromptPay & Direct Bank Transfers
  promptPay: /(?:พร้อมเพย์|prompt\s*pay|ppay)/gi,
  bankContext: /(?:เลขบัญชี|เลขบช|บัญชีกสิกร|บัญชีไทยพาณิชย์|บัญชีกรุงเทพ|บัญชีกรุงไทย|ธนาคารกสิกร|ธนาคารกรุงเทพ|ธนาคารไทยพาณิชย์|kbank|scb|bbl|ktb|ttb|bay)[\s:]*(\d[\d\s-]{8,15}\d)/gi,
  bankAccountFormatted: /\b\d{3}[-\s]?\d{1}[-\s]?\d{5}[-\s]?\d{1}\b/g,

  // Direct off-platform negotiation phrases
  offPlatformDeal: /(?:ดีลนอก|นอกระบบ|ลดให้ข้างนอก|คุยนอกรอบ|สั่งตรงไม่ผ่านแอป|ไม่ผ่านระบบ|ไม่ต้องสั่งในระบบ|โอนเข้าบัญชีโดยตรง|จ่ายสดไม่ผ่านระบบ|โอนตรงไม่หัก%|คุยนอกแอป)/gi,
};

/**
 * Analyzes message text for off-platform negotiation, contact sharing, or payment evasion.
 */
export function detectFraudRisk(content: string): FraudDetectionResult {
  if (!content || typeof content !== 'string') {
    return { isFlagged: false, riskLevel: 'NONE', flagReason: null, detectedMatches: [] };
  }

  const normalized = content.trim();
  const reasons: string[] = [];
  const matches: string[] = [];

  // 1. Off-Platform Deals / Bypass phrases (High Risk)
  const offPlatformMatches = normalized.match(FRAUD_PATTERNS.offPlatformDeal);
  if (offPlatformMatches && offPlatformMatches.length > 0) {
    reasons.push('ตรวจพบเจตนาทำธุรกรรมนอกระบบ (Off-platform deal)');
    matches.push(...offPlatformMatches);
  }

  // 2. Direct Bank / PromptPay Transfer (High Risk)
  const promptPayMatches = normalized.match(FRAUD_PATTERNS.promptPay);
  if (promptPayMatches && promptPayMatches.length > 0) {
    reasons.push('ตรวจพบการอ้างอิง PromptPay / โอนเงินตรง');
    matches.push(...promptPayMatches);
  }

  const bankContextMatches = normalized.match(FRAUD_PATTERNS.bankContext);
  if (bankContextMatches && bankContextMatches.length > 0) {
    reasons.push('ตรวจพบการระบุบัญชีธนาคาร');
    matches.push(...bankContextMatches);
  }

  const formattedBankMatches = normalized.match(FRAUD_PATTERNS.bankAccountFormatted);
  if (formattedBankMatches && formattedBankMatches.length > 0) {
    // Only flag formatted bank account numbers if combined with banking/transfer context
    const hasBankWord = /(?:บช|บัญชี|โอน|กสิกร|ไทยพาณิชย์|กรุงเทพ|กรุงไทย|kbank|scb|bbl|ktb)/i.test(normalized);
    if (hasBankWord) {
      reasons.push('ตรวจพบรูปแบบเลขบัญชีธนาคาร 10 หลัก');
      matches.push(...formattedBankMatches);
    }
  }

  // 3. Contact information: LINE / Phone numbers (Medium-High Risk)
  const lineMatches = normalized.match(FRAUD_PATTERNS.lineExplicit);
  if (lineMatches && lineMatches.length > 0) {
    reasons.push('ตรวจพบการขอหรือแชร์ LINE ID / ลิงก์ติดต่อภายนอก');
    matches.push(...lineMatches);
  }

  const lineHandleMatches = normalized.match(FRAUD_PATTERNS.lineHandle);
  if (lineHandleMatches && lineHandleMatches.length > 0) {
    reasons.push('ตรวจพบไอดี LINE สำหรับการติดต่อภายนอก');
    matches.push(...lineHandleMatches);
  }

  const messengerMatches = normalized.match(FRAUD_PATTERNS.externalMessengers);
  if (messengerMatches && messengerMatches.length > 0) {
    reasons.push('ตรวจพบการชักชวนสนทนาผ่านแอปภายนอก (WhatsApp/Telegram/Facebook)');
    matches.push(...messengerMatches);
  }

  const phoneMatches = normalized.match(FRAUD_PATTERNS.thaiMobile);
  if (phoneMatches && phoneMatches.length > 0) {
    reasons.push('ตรวจพบหมายเลขโทรศัพท์มือถือ');
    matches.push(...phoneMatches);
  }

  const landlineMatches = normalized.match(FRAUD_PATTERNS.thaiLandline);
  if (landlineMatches && landlineMatches.length > 0) {
    reasons.push('ตรวจพบหมายเลขโทรศัพท์');
    matches.push(...landlineMatches);
  }

  const phoneContextMatches = normalized.match(FRAUD_PATTERNS.phoneContext);
  if (phoneContextMatches && phoneContextMatches.length > 0) {
    reasons.push('ตรวจพบข้อความเชิญชวนติดต่อทางโทรศัพท์');
    matches.push(...phoneContextMatches);
  }

  const isFlagged = reasons.length > 0;
  const uniqueMatches = Array.from(new Set(matches.map((m) => m.trim())));
  const riskLevel: FraudRiskLevel = !isFlagged
    ? 'NONE'
    : (reasons.some((r) => r.includes('นอกระบบ') || r.includes('บัญชีธนาคาร') || r.includes('PromptPay')) ? 'HIGH' : 'MEDIUM');

  return {
    isFlagged,
    riskLevel,
    flagReason: isFlagged ? reasons.join('; ') : null,
    detectedMatches: uniqueMatches,
  };
}

/**
 * Calculates the exact 7-day expiration timestamp for an attached chat image.
 */
export function calculateImageExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CHAT_IMAGE_TTL_MS);
}

/**
 * Checks whether an image has exceeded its 7-day TTL expiration window.
 */
export function isImageExpired(
  expiresAt: Date | string | null | undefined,
  isAlreadyExpired?: boolean
): boolean {
  if (isAlreadyExpired) return true;
  if (!expiresAt) return false;

  const expiryTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return Date.now() >= expiryTime;
}

/**
 * Sanitizes a message entity to ensure expired images are stripped out of payloads.
 */
export function sanitizeMessageForTTL<
  T extends {
    imageUrl?: string | null;
    imageExpiresAt?: Date | string | null;
    isImageExpired?: boolean;
  }
>(message: T): T {
  if (!message.imageUrl && !message.imageExpiresAt) {
    return message;
  }

  const expired = isImageExpired(message.imageExpiresAt, message.isImageExpired);

  if (expired) {
    return {
      ...message,
      imageUrl: null,
      isImageExpired: true,
    };
  }

  return message;
}

/**
 * Generates human-friendly remaining time text for an unexpired image.
 */
export function formatImageRemainingTime(expiresAt: Date | string | null | undefined): string {
  if (!expiresAt) return '';

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  const diffMs = expiry - Date.now();

  if (diffMs <= 0) {
    return 'รูปภาพหมดอายุแล้ว (ระยะเวลาจัดเก็บ 7 วัน)';
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    const remainingHours = diffHours % 24;
    return `คงเหลือ ${diffDays} วัน ${remainingHours > 0 ? `${remainingHours} ชม.` : ''}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffHours >= 1) {
    return `คงเหลือ ${diffHours} ชั่วโมง`;
  }

  return `คงเหลือ ${Math.max(1, diffMinutes)} นาที`;
}

/**
 * Validates chat image payload format and size limits.
 */
export function validateChatImagePayload(dataUrl: string): { valid: boolean; error?: string } {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, error: 'ไม่พบข้อมูลรูปภาพ' };
  }

  if (dataUrl.length > MAX_CHAT_IMAGE_BASE64_LENGTH) {
    return { valid: false, error: 'ขนาดรูปภาพเกินกำหนด (โปรดบีบอัดรูปภาพให้ไม่เกิน 1MB)' };
  }

  if (!dataUrl.startsWith('data:image/')) {
    return { valid: false, error: 'รูปแบบรูปภาพไม่ถูกต้อง (รองรับ JPG, PNG, WEBP)' };
  }

  return { valid: true };
}

/**
 * Compresses an image in the browser using HTML5 Canvas before uploading.
 * Max dimension 1200px, JPEG quality 0.82 to produce lightweight <200KB transfers.
 */
export async function compressImageInBrowser(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        // Draw white background for transparent PNG converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Str = dataUrl.split(',')[1] || '';
        const sizeBytes = Math.round((base64Str.length * 3) / 4);

        resolve({ dataUrl, sizeBytes });
      };

      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
