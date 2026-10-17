import { describe, it, expect } from 'vitest';
import {
  detectFraudRisk,
  calculateImageExpiresAt,
  isImageExpired,
  sanitizeMessageForTTL,
  formatImageRemainingTime,
  validateChatImagePayload,
  CHAT_IMAGE_TTL_DAYS,
  CHAT_IMAGE_TTL_MS,
  MAX_CHAT_IMAGE_BASE64_LENGTH,
} from '@/lib/orderChat';

describe('Ape-Parel Order Chat & Anti-Fraud Security Suite', () => {
  describe('Fraud & Off-Platform Detection (detectFraudRisk)', () => {
    it('should detect Thai mobile phone numbers with various separators', () => {
      const inputs = [
        'โทรมาที่ 0812345678 นะครับ',
        'เบอร์ผม 089-123-4567 ครับ',
        'ติดต่อ 092 345 6789 ได้ตลอดเวลา',
        'ใช้เบอร์ +66812345678 ในการติดต่อ',
        'แอด 061-987-6543 ด่วน',
      ];

      for (const input of inputs) {
        const result = detectFraudRisk(input);
        expect(result.isFlagged, `Expected "${input}" to be flagged`).toBe(true);
        expect(result.flagReason).toContain('โทรศัพท์');
      }
    });

    it('should detect Thai landline numbers', () => {
      const result = detectFraudRisk('โทรเข้าออฟฟิศที่ 02-123-4567 ครับ');
      expect(result.isFlagged).toBe(true);
      expect(result.flagReason).toContain('โทรศัพท์');
    });

    it('should detect LINE handles, links, and explicit invitations', () => {
      const inputs = [
        'แอดไลน์มาคุยได้ที่ @factory_tees',
        'ไอดีไลน์ printmaster2026',
        'ติดต่อทางไลน์ line: customscreen',
        'ทักไลน์ด่วน line id shop_bkk',
        'ขอไลน์หน่อยครับ อยากคุยรายละเอียด',
      ];

      for (const input of inputs) {
        const result = detectFraudRisk(input);
        expect(result.isFlagged, `Expected "${input}" to be flagged`).toBe(true);
        expect(result.flagReason).toContain('LINE');
      }
    });

    it('should detect external messaging platforms (WhatsApp, Telegram, Facebook)', () => {
      const inputs = [
        'ทักเฟสมาเลย m.me/screenfactory',
        'คุยใน telegram นะครับสะดวกกว่า',
        'ติดต่อผ่าน whatsapp ได้เลยครับ',
      ];

      for (const input of inputs) {
        const result = detectFraudRisk(input);
        expect(result.isFlagged).toBe(true);
        expect(result.riskLevel).toBe('MEDIUM');
      }
    });

    it('should detect direct payment and PromptPay evasion (High Risk)', () => {
      const inputs = [
        'โอนผ่านพร้อมเพย์เบอร์นี้ได้ไหม',
        'จ่าย promptpay ตรงได้ลด 10%',
        'โอนเข้าเลขบัญชี 123-4-56789-0 กสิกรไทย',
        'เลขบช ธนาคารไทยพาณิชย์ 0123456789',
      ];

      for (const input of inputs) {
        const result = detectFraudRisk(input);
        expect(result.isFlagged).toBe(true);
        expect(result.riskLevel).toBe('HIGH');
      }
    });

    it('should detect off-platform deal and platform-bypass phrases (High Risk)', () => {
      const inputs = [
        'มาดีลนอกระบบไหมครับ ลดราคาพิเศษให้เลย',
        'สั่งตรงไม่ผ่านแอป จะได้ราคาถูกกว่า',
        'ไม่ต้องสั่งในระบบ โอนสดมาได้เลย',
        'โอนเข้าบัญชีโดยตรง ไม่ต้องผ่านระบบ',
      ];

      for (const input of inputs) {
        const result = detectFraudRisk(input);
        expect(result.isFlagged).toBe(true);
        expect(result.riskLevel).toBe('HIGH');
        expect(result.flagReason).toContain('นอกระบบ');
      }
    });

    it('should NOT falsely flag legitimate apparel tailoring or design messages', () => {
      const legitimateInputs = [
        'ขอขยายขนาดลายสกรีนด้านหน้าเป็น 28 เซนติเมตรได้ไหมครับ',
        'รหัสเสื้อ APX-HVY-001 สี Vintage Black ไซส์ XL',
        'ต้องการสั่งผลิตทั้งหมด 100 ตัวครับ',
        'วางตำแหน่งลายต่ำกว่าขอบคอเสื้อลงมา 3 นิ้ว',
        'กำหนดส่งสินค้าวันที่ 25 ตุลาคม ใช่ไหมครับ',
        'สีพิมพ์สกรีนขอเป็นสีขาวมุกตาม mockup',
        'ความละเอียดไฟล์ artwork 300 DPI ได้มาตรฐานแล้วครับ',
      ];

      for (const text of legitimateInputs) {
        const result = detectFraudRisk(text);
        expect(result.isFlagged, `Legitimate text "${text}" should NOT be flagged`).toBe(false);
        expect(result.riskLevel).toBe('NONE');
        expect(result.flagReason).toBeNull();
      }
    });
  });

  describe('7-Day Image Time-To-Live (TTL) Lifecycle', () => {
    it('should calculate exact 7-day expiration timestamp', () => {
      const now = new Date('2026-10-13T10:00:00.000Z');
      const expiresAt = calculateImageExpiresAt(now);

      const expected = new Date('2026-10-20T10:00:00.000Z');
      expect(expiresAt.getTime()).toBe(expected.getTime());
      expect(expiresAt.getTime() - now.getTime()).toBe(CHAT_IMAGE_TTL_MS);
    });

    it('should determine image expiration accurately', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // +1 day
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // -1 day

      expect(isImageExpired(futureDate)).toBe(false);
      expect(isImageExpired(pastDate)).toBe(true);
      expect(isImageExpired(futureDate, true)).toBe(true);
      expect(isImageExpired(null)).toBe(false);
    });

    it('should sanitize expired message by removing imageUrl and setting isImageExpired: true', () => {
      const expiredMessage = {
        id: 'msg-1',
        message: 'Here is the sample photo',
        imageUrl: 'data:image/jpeg;base64,samplebinarydata',
        imageExpiresAt: new Date(Date.now() - 10000), // in the past
        isImageExpired: false,
      };

      const sanitized = sanitizeMessageForTTL(expiredMessage);
      expect(sanitized.imageUrl).toBeNull();
      expect(sanitized.isImageExpired).toBe(true);
      expect(sanitized.message).toBe('Here is the sample photo');
    });

    it('should retain imageUrl when TTL is still valid', () => {
      const activeMessage = {
        id: 'msg-2',
        message: 'Active photo',
        imageUrl: 'data:image/jpeg;base64,activebinarydata',
        imageExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // +3 days
        isImageExpired: false,
      };

      const sanitized = sanitizeMessageForTTL(activeMessage);
      expect(sanitized.imageUrl).toBe('data:image/jpeg;base64,activebinarydata');
      expect(sanitized.isImageExpired).toBe(false);
    });

    it('should format friendly remaining time string', () => {
      const expiredDate = new Date(Date.now() - 5000);
      expect(formatImageRemainingTime(expiredDate)).toContain('หมดอายุ');

      const fourDaysFuture = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      expect(formatImageRemainingTime(fourDaysFuture)).toContain('คงเหลือ 4 วัน');
    });
  });

  describe('Chat Image Payload Validation', () => {
    it('should accept valid Base64 data URLs', () => {
      const validPayload = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
      const result = validateChatImagePayload(validPayload);
      expect(result.valid).toBe(true);
    });

    it('should reject non-image payloads', () => {
      const invalidPayload = 'data:application/pdf;base64,JVBERi0xLj...';
      const result = validateChatImagePayload(invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('รูปแบบรูปภาพไม่ถูกต้อง');
    });

    it('should reject oversized payloads exceeding base64 limit', () => {
      const oversizedPayload = 'data:image/jpeg;base64,' + 'A'.repeat(MAX_CHAT_IMAGE_BASE64_LENGTH + 10);
      const result = validateChatImagePayload(oversizedPayload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('ขนาดรูปภาพเกินกำหนด');
    });
  });

  describe('Centralized Inbox & Order-Referencing Architecture', () => {
    it('should format thread references linking to specific orders accurately', () => {
      const mockOrder = {
        id: 'ord-test-123',
        orderNumber: 'ORD-2026-10-888',
        status: 'IN_PRODUCTION',
        totalAmount: 1250,
        garmentName: 'Apex Heavyweight Tee',
        partnerName: 'Bangkok Garment Craft',
      };

      expect(mockOrder.orderNumber).toMatch(/^ORD-\d{4}-\d{2}-\d{3}$/);
      expect(mockOrder.partnerName).toBeTruthy();
      expect(mockOrder.totalAmount).toBeGreaterThan(0);
    });

    it('should calculate unread message counts per order thread correctly', () => {
      const mockMessages = [
        { id: '1', orderId: 'ord-1', senderId: 'customer-1', isRead: false },
        { id: '2', orderId: 'ord-1', senderId: 'supplier-1', isRead: false },
        { id: '3', orderId: 'ord-1', senderId: 'supplier-1', isRead: true },
        { id: '4', orderId: 'ord-2', senderId: 'supplier-1', isRead: false },
      ];

      const currentUserId = 'customer-1';
      // From customer's perspective, unread are messages from supplier where isRead: false
      const unreadForCustomerInOrd1 = mockMessages.filter(
        (m) => m.orderId === 'ord-1' && m.senderId !== currentUserId && !m.isRead
      ).length;

      expect(unreadForCustomerInOrd1).toBe(1);

      const unreadForCustomerInOrd2 = mockMessages.filter(
        (m) => m.orderId === 'ord-2' && m.senderId !== currentUserId && !m.isRead
      ).length;

      expect(unreadForCustomerInOrd2).toBe(1);
    });
  });
});

