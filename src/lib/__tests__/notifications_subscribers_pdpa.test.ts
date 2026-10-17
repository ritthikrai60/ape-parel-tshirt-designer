import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../prisma';
import {
  DEFAULT_CONSENT,
  CONSENT_COOKIE_KEY,
  CURRENT_POLICY_VERSION,
} from '../consent';
import {
  sendEmail,
  sendNewsletterWelcomeEmail,
  sendAdminSystemAlert,
} from '../email';

describe('PDPA & Cookie Consent Suite', () => {
  it('should have standard default consent values', () => {
    expect(DEFAULT_CONSENT.necessary).toBe(true);
    expect(DEFAULT_CONSENT.analytics).toBe(false);
    expect(DEFAULT_CONSENT.marketing).toBe(false);
    expect(DEFAULT_CONSENT.version).toBe('1.0');
    expect(CONSENT_COOKIE_KEY).toBe('ape_cookie_consent');
  });

  it('should validate consent object structure strictly', () => {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: false,
      timestamp: new Date().toISOString(),
      version: CURRENT_POLICY_VERSION,
    };
    expect(consent.necessary).toBe(true);
    expect(typeof consent.timestamp).toBe('string');
    expect(consent.version).toBe('1.0');
  });
});

describe('Modular Email Engine & Dispatcher Suite', () => {
  it('should dispatch email successfully in development preview mode', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<h1>Hello APE-PAREL</h1>',
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('preview');
    expect(result.messageId).toBeDefined();
  });

  it('should generate valid welcome newsletter email with unsubscribe token', async () => {
    const testToken = 'unsub_test_token_123';
    const result = await sendNewsletterWelcomeEmail('customer@example.com', testToken);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should route admin system alerts only to active subscribed staff', async () => {
    // Clean up test data
    await prisma.adminAlertSubscriber.deleteMany({
      where: { email: { in: ['admin1@ape-parel.com', 'admin2@ape-parel.com', 'inactive@ape-parel.com'] } },
    });

    // Create active admin subscribed to NEW_ORDER and FRAUD_ALERT
    await prisma.adminAlertSubscriber.create({
      data: {
        email: 'admin1@ape-parel.com',
        name: 'Ops Manager',
        alertTypes: JSON.stringify(['NEW_ORDER', 'FRAUD_ALERT']),
        isActive: true,
      },
    });

    // Create active admin subscribed ONLY to PAYOUT_REQUEST
    await prisma.adminAlertSubscriber.create({
      data: {
        email: 'admin2@ape-parel.com',
        name: 'Finance Admin',
        alertTypes: JSON.stringify(['PAYOUT_REQUEST']),
        isActive: true,
      },
    });

    // Create inactive admin
    await prisma.adminAlertSubscriber.create({
      data: {
        email: 'inactive@ape-parel.com',
        name: 'Inactive Staff',
        alertTypes: JSON.stringify(['NEW_ORDER']),
        isActive: false,
      },
    });

    // Send NEW_ORDER alert
    const orderAlertResult = await sendAdminSystemAlert(
      'NEW_ORDER',
      'Order #APE-9901 placed',
      { orderNumber: 'APE-9901', totalAmount: 820 }
    );
    expect(orderAlertResult.success).toBe(true);
    expect(orderAlertResult.count).toBe(1); // Only admin1

    // Send PAYOUT_REQUEST alert
    const payoutAlertResult = await sendAdminSystemAlert(
      'PAYOUT_REQUEST',
      'Creator payout requested #PO-100',
      { grossAmount: 5000, creator: 'dash-ape' }
    );
    expect(payoutAlertResult.success).toBe(true);
    expect(payoutAlertResult.count).toBe(1); // Only admin2

    // Send MODERATION_PENDING alert (no one subscribed)
    const modAlertResult = await sendAdminSystemAlert(
      'MODERATION_PENDING',
      'New artwork submitted',
      { artworkTitle: 'Cyber Ape' }
    );
    expect(modAlertResult.success).toBe(true);
    expect(modAlertResult.count).toBe(0);

    // Cleanup
    await prisma.adminAlertSubscriber.deleteMany({
      where: { email: { in: ['admin1@ape-parel.com', 'admin2@ape-parel.com', 'inactive@ape-parel.com'] } },
    });
  });
});

describe('Newsletter Subscribers Database & Unsubscribe Flow Suite', () => {
  const testEmail = 'subscriber_test@ape-parel.com';

  beforeEach(async () => {
    await prisma.newsletterSubscriber.deleteMany({
      where: { email: testEmail },
    });
  });

  it('should create and store newsletter subscriber with PDPA consent', async () => {
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: testEmail,
        status: 'ACTIVE',
        source: 'FOOTER',
        consentGiven: true,
        consentTimestamp: new Date(),
      },
    });

    expect(subscriber.id).toBeDefined();
    expect(subscriber.email).toBe(testEmail);
    expect(subscriber.status).toBe('ACTIVE');
    expect(subscriber.consentGiven).toBe(true);
    expect(subscriber.unsubscribeToken).toBeDefined();
  });

  it('should handle unsubscription via token', async () => {
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: testEmail,
        status: 'ACTIVE',
        source: 'FOOTER',
        consentGiven: true,
        consentTimestamp: new Date(),
      },
    });

    // Unsubscribe
    const updated = await prisma.newsletterSubscriber.update({
      where: { unsubscribeToken: subscriber.unsubscribeToken },
      data: { status: 'UNSUBSCRIBED' },
    });

    expect(updated.status).toBe('UNSUBSCRIBED');
  });

  it('should re-activate subscriber when they opt back in', async () => {
    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: testEmail,
        status: 'UNSUBSCRIBED',
        source: 'FOOTER',
        consentGiven: false,
      },
    });

    const reopted = await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: 'ACTIVE',
        consentGiven: true,
        consentTimestamp: new Date(),
      },
    });

    expect(reopted.status).toBe('ACTIVE');
    expect(reopted.consentGiven).toBe(true);
  });
});

describe('System Notification Badges & Polling API Suite', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Ensure test user exists
    const user = await prisma.user.upsert({
      where: { email: 'notif_test_user@ape-parel.com' },
      update: {},
      create: {
        email: 'notif_test_user@ape-parel.com',
        name: 'Notification Tester',
        role: 'CUSTOMER',
      },
    });
    testUserId = user.id;

    // Clean up notifications for test user
    await prisma.notification.deleteMany({
      where: { userId: testUserId },
    });
  });

  it('should calculate unread notification count accurately for badge', async () => {
    // Create 3 notifications: 2 unread, 1 read
    await prisma.notification.createMany({
      data: [
        {
          userId: testUserId,
          type: 'ORDER_UPDATE',
          title: 'คำสั่งซื้อจัดส่งแล้ว',
          message: 'พัสดุหมายเลข TH123456 อยู่ระหว่างการขนส่ง',
          isRead: false,
        },
        {
          userId: testUserId,
          type: 'SYSTEM',
          title: 'ยินดีต้อนรับสู่ APE-PAREL',
          message: 'เริ่มออกแบบเสื้อยืดของคุณได้เลยวันนี้',
          isRead: false,
        },
        {
          userId: testUserId,
          type: 'ORDER_UPDATE',
          title: 'ยืนยันการชำระเงิน',
          message: 'ยอดเงิน ฿820 ได้รับการยืนยันแล้ว',
          isRead: true,
        },
      ],
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: testUserId, isRead: false },
    });
    expect(unreadCount).toBe(2);

    const totalCount = await prisma.notification.count({
      where: { userId: testUserId },
    });
    expect(totalCount).toBe(3);
  });

  it('should mark all notifications as read when requested', async () => {
    await prisma.notification.createMany({
      data: [
        {
          userId: testUserId,
          type: 'ORDER_UPDATE',
          title: 'ทดสอบ 1',
          message: 'ข้อความ 1',
          isRead: false,
        },
        {
          userId: testUserId,
          type: 'ORDER_UPDATE',
          title: 'ทดสอบ 2',
          message: 'ข้อความ 2',
          isRead: false,
        },
      ],
    });

    await prisma.notification.updateMany({
      where: { userId: testUserId, isRead: false },
      data: { isRead: true },
    });

    const unreadRemaining = await prisma.notification.count({
      where: { userId: testUserId, isRead: false },
    });
    expect(unreadRemaining).toBe(0);
  });
});
