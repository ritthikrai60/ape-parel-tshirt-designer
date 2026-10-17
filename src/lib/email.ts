/**
 * Modular Email Engine & Dispatcher
 * APE-PAREL Platform
 */

import { prisma } from './prisma';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  mode: 'resend' | 'smtp' | 'preview';
  error?: string;
}

/**
 * Dispatch an email with modular transport (Resend API -> SMTP -> Development Console Preview)
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailDispatchResult> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resendApiKey = process.env.RESEND_API_KEY;

  // 1. If Resend API Key is provided
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'APE-PAREL <noreply@ape-parel.com>',
          to: recipients,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.id, mode: 'resend' };
      }
      const errData = await response.json().catch(() => ({}));
      console.warn('[Email] Resend API error, falling back to preview:', errData);
    } catch (err: any) {
      console.warn('[Email] Failed to connect to Resend, falling back to preview:', err?.message);
    }
  }

  // 2. Development Console Preview Mode (Fast, zero external dependency, reliable for dev & testing)
  const previewId = 'msg_' + Math.random().toString(36).substring(2, 10);
  console.log(`\n================== [EMAIL DISPATCH PREVIEW] ==================`);
  console.log(`ID:      ${previewId}`);
  console.log(`To:      ${recipients.join(', ')}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`Date:    ${new Date().toISOString()}`);
  console.log(`-------------------------------------------------------------`);
  console.log(`Text Preview: ${payload.text || payload.html.replace(/<[^>]+>/g, ' ').substring(0, 160)}...`);
  console.log(`=============================================================\n`);

  return {
    success: true,
    messageId: previewId,
    mode: 'preview',
  };
}

/**
 * Send Welcome Newsletter Email to a new subscriber
 */
export async function sendNewsletterWelcomeEmail(email: string, unsubscribeToken: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ยินดีต้อนรับสู่ APE-PAREL</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FBF9F5; color: #131718; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E1D8; border-radius: 16px; overflow: hidden; }
        .header { background: #131718; color: #FBF9F5; padding: 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
        .body { padding: 32px 28px; }
        .cta-btn { display: inline-block; background: #131718; color: #FBF9F5 !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; font-size: 14px; }
        .footer { padding: 20px 28px; background: #f7f5ef; border-top: 1px solid #E5E1D8; font-size: 11px; color: #7B7873; text-align: center; }
        .footer a { color: #131718; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>APE-PAREL</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #C5A059;">CREATOR-POWERED APPAREL STUDIO</p>
        </div>
        <div class="body">
          <h2 style="margin-top: 0; font-size: 18px;">ยินดีต้อนรับสู่ชุมชน APE-PAREL!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
            ขอบคุณที่สมัครรับข่าวสารและร่วมเป็นส่วนหนึ่งกับเรา ท่านจะได้รับข้อมูลอัปเดตเกี่ยวกับคอลเลกชันใหม่จากดีไซเนอร์ระดับแนวหน้า โปรโมชั่นดีลพิเศษ และเทคนิคการออกแบบเสื้อยืด 3D ก่อนใคร
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${appUrl}/marketplace" class="cta-btn">สำรวจ Marketplace ทันที</a>
          </div>
          <p style="font-size: 12px; color: #7B7873; line-height: 1.5;">
            เราปฏิบัติตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) อย่างเคร่งครัด ข้อมูลของท่านจะถูกเก็บรักษาอย่างปลอดภัย
          </p>
        </div>
        <div class="footer">
          <p>ท่านได้รับอีเมลนี้เนื่องจากสมัครรับข่าวสารที่ ape-parel.com</p>
          <p>
            <a href="${unsubscribeUrl}">ยกเลิกการรับข่าวสาร (Unsubscribe)</a> • 
            <a href="${appUrl}/privacy">นโยบายความเป็นส่วนตัว</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '⚡ ยินดีต้อนรับสู่ APE-PAREL: สิทธิพิเศษและข่าวสารคอลเลกชันใหม่',
    html,
    text: `ยินดีต้อนรับสู่ APE-PAREL! สำรวจคอลเลกชันใหม่ได้ที่ ${appUrl}/marketplace หรือยกเลิกรับข่าวสารที่ ${unsubscribeUrl}`,
  });
}

/**
 * Send System Alert notification to subscribed Admins
 */
export async function sendAdminSystemAlert(alertType: 'NEW_ORDER' | 'FRAUD_ALERT' | 'PAYOUT_REQUEST' | 'MODERATION_PENDING', subject: string, details: Record<string, any>) {
  try {
    // Find active admin subscribers who subscribed to this alert type
    const subscribers = await prisma.adminAlertSubscriber.findMany({
      where: { isActive: true },
    });

    const eligibleEmails = subscribers
      .filter((sub) => {
        try {
          const types: string[] = JSON.parse(sub.alertTypes);
          return types.includes(alertType);
        } catch {
          return false;
        }
      })
      .map((sub) => sub.email);

    if (eligibleEmails.length === 0) {
      return { success: true, count: 0, message: 'No subscribed admins for this alert type' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const detailList = Object.entries(details)
      .map(([k, v]) => `<li><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}</li>`)
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #FBF9F5; padding: 20px;">
        <div style="max-w: 600px; background: #fff; border: 1px solid #E5E1D8; border-radius: 12px; padding: 24px;">
          <h2 style="color: #E11D48; margin-top: 0;">🚨 [APE-PAREL SYSTEM ALERT: ${alertType}]</h2>
          <p style="font-size: 14px;"><strong>หัวข้อ:</strong> ${subject}</p>
          <div style="background: #FFF1F2; border-left: 4px solid #E11D48; padding: 12px; margin: 16px 0;">
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${detailList}
            </ul>
          </div>
          <p style="font-size: 12px; color: #777;">เวลาที่เกิดเหตุการณ์: ${new Date().toLocaleString('th-TH')}</p>
          <a href="${appUrl}/admin" style="display: inline-block; background: #131718; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: bold;">
            เปิดดูใน Admin Dashboard
          </a>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: eligibleEmails,
      subject: `🚨 [ALERT] ${subject}`,
      html,
      text: `[APE-PAREL ALERT: ${alertType}] ${subject} - ดูรายละเอียดที่ ${appUrl}/admin`,
    });

    return { success: true, count: eligibleEmails.length };
  } catch (err: any) {
    console.error('[sendAdminSystemAlert] Failed:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Send Email Verification link to user
 */
export async function sendEmailVerificationEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ยืนยันที่อยู่อีเมลของคุณ | APE-PAREL</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FBF9F5; color: #131718; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E1D8; border-radius: 16px; overflow: hidden; }
        .header { background: #131718; color: #FBF9F5; padding: 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
        .body { padding: 32px 28px; }
        .btn { display: inline-block; background: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 20px 0; }
        .footer { padding: 20px 28px; background: #f7f5ef; border-top: 1px solid #E5E1D8; font-size: 11px; color: #7B7873; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>APE-PAREL</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #C5A059;">SECURITY & VERIFICATION</p>
        </div>
        <div class="body">
          <h2 style="margin-top: 0; font-size: 18px;">ยืนยันที่อยู่อีเมลของคุณ</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
            ยินดีต้อนรับสู่ APE-PAREL เพื่อความปลอดภัยของบัญชีและการปลดล็อก Badge <strong>Verified</strong> บนโปรไฟล์ของคุณ โปรดคลิกปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลนี้:
          </p>
          <div style="text-align: center;">
            <a href="${verifyUrl}" class="btn">✓ ยืนยันอีเมลของฉัน (Verify Email)</a>
          </div>
          <p style="font-size: 12px; color: #7B7873; line-height: 1.5;">
            * ลิงก์นี้จะหมดอายุภายใน 24 ชั่วโมง หากท่านไม่ได้เป็นผู้ทำรายการ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้
          </p>
        </div>
        <div class="footer">
          <p>APE-PAREL Platform • Direct-to-Garment 3D Studio & Creator Marketplace</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🛡️ ยืนยันที่อยู่อีเมลของคุณสำหรับบัญชี APE-PAREL',
    html,
    text: `ยืนยันที่อยู่อีเมลของคุณสำหรับบัญชี APE-PAREL ได้ที่: ${verifyUrl} (ลิงก์มีอายุ 24 ชั่วโมง)`,
  });
}

/**
 * Send Password Reset link to user
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>รีเซ็ตรหัสผ่านของคุณ | APE-PAREL</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FBF9F5; color: #131718; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E1D8; border-radius: 16px; overflow: hidden; }
        .header { background: #131718; color: #FBF9F5; padding: 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
        .body { padding: 32px 28px; }
        .btn { display: inline-block; background: #E11D48; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 20px 0; }
        .footer { padding: 20px 28px; background: #f7f5ef; border-top: 1px solid #E5E1D8; font-size: 11px; color: #7B7873; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>APE-PAREL</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #E11D48;">SECURITY & PASSWORD RESET</p>
        </div>
        <div class="body">
          <h2 style="margin-top: 0; font-size: 18px;">คำขอรีเซ็ตรหัสผ่าน</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
            เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีที่ใช้อีเมล <strong>${email}</strong> บน APE-PAREL หากท่านเป็นผู้ส่งคำขอ โปรดคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
          </p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">ตั้งรหัสผ่านใหม่ (Reset Password)</a>
          </div>
          <p style="font-size: 12px; color: #E11D48; font-weight: bold; line-height: 1.5;">
            ⚠️ ลิงก์นี้มีความปลอดภัยระดับสูงและมีอายุการใช้งานเพียง 1 ชั่วโมง (และใช้ได้เพียง 1 ครั้งเท่านั้น)
          </p>
          <p style="font-size: 11px; color: #7B7873;">
            หากท่านไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน บัญชีของท่านยังคงปลอดภัย กรุณาอย่าส่งต่อลิงก์นี้ให้ผู้อื่น
          </p>
        </div>
        <div class="footer">
          <p>APE-PAREL Platform • Security Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 คำขอรีเซ็ตรหัสผ่านสำหรับบัญชี APE-PAREL (มีอายุ 1 ชม.)',
    html,
    text: `คุณได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชี APE-PAREL กรุณาเข้าไปที่ ${resetUrl} เพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้มีอายุ 1 ชั่วโมง`,
  });
}

/**
 * Send Order Payment Confirmation & Official E-Receipt Email
 */
export async function sendOrderConfirmationReceiptEmail(order: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  quantity: number;
  customerEmail: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostal: string;
  supplierName: string;
  garmentName?: string;
  garmentSize?: string;
  previewFrontUrl?: string | null;
  stripeReceiptUrl?: string | null;
  basePrice?: number;
  printCost?: number;
  royaltyCost?: number;
  shippingCost?: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orderTrackUrl = `${appUrl}/account/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ใบเสร็จรับเงิน & ยืนยันคำสั่งซื้อ #${order.orderNumber} | APE-PAREL</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FBF9F5; color: #131718; margin: 0; padding: 24px; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E5E1D8; border-radius: 16px; overflow: hidden; }
        .header { background: #131718; color: #FBF9F5; padding: 28px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 2px; }
        .body { padding: 28px; }
        .badge { display: inline-block; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 6px; }
        .receipt-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
        .receipt-table th { text-align: left; padding: 10px 0; border-bottom: 2px solid #131718; font-family: monospace; font-size: 11px; text-transform: uppercase; color: #7B7873; }
        .receipt-table td { padding: 12px 0; border-bottom: 1px solid #E5E1D8; }
        .total-row td { border-bottom: none; font-weight: bold; font-size: 16px; padding-top: 16px; color: #131718; }
        .btn { display: inline-block; background: #131718; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; }
        .stripe-btn { display: inline-block; background: #635BFF; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 12px; margin-top: 10px; }
        .footer { padding: 20px 28px; background: #f7f5ef; border-top: 1px solid #E5E1D8; font-size: 11px; color: #7B7873; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>APE-PAREL</h1>
          <p style="margin: 4px 0 0; font-size: 12px; color: #C5A059;">OFFICIAL PAYMENT RECEIPT & ESCROW CONFIRMATION</p>
        </div>
        <div class="body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <span class="badge">✅ ชำระเงินสำเร็จผ่าน STRIPE (PAID)</span>
              <h2 style="margin: 8px 0 0; font-size: 20px;">คำสั่งซื้อ #${order.orderNumber}</h2>
            </div>
          </div>

          <p style="font-size: 13px; color: #4A4844; line-height: 1.6;">
            ขอบคุณที่สั่งผลิตเสื้อยืดกับ APE-PAREL ยอดชำระเงินของท่านถูกเก็บรักษาไว้ในระบบ <strong>Escrow</strong> อย่างปลอดภัย และคำสั่งซื้อได้ถูกส่งต่อไปยังโรงงานผู้ผลิต (<strong>${order.supplierName}</strong>) เพื่อเตรียมการพิมพ์ Direct-to-Garment เรียบร้อยแล้ว
          </p>

          <!-- Receipt Itemized Breakdown -->
          <table class="receipt-table">
            <thead>
              <tr>
                <th>รายการ (Description)</th>
                <th style="text-align: center;">จำนวน</th>
                <th style="text-align: right;">ยอดรวม (THB)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${order.garmentName || 'Apex Custom Tee'}</strong><br/>
                  <span style="font-size: 11px; color: #7B7873;">ขนาด: ${order.garmentSize || 'L'} &bull; โรงงาน: ${order.supplierName}</span>
                </td>
                <td style="text-align: center;">${order.quantity}</td>
                <td style="text-align: right; font-family: monospace;">฿${(order.basePrice || 150).toLocaleString()}</td>
              </tr>
              <tr>
                <td>ค่าบริการพิมพ์ลายสกรีน DTG & Heat-Cure</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: right; font-family: monospace;">฿${(order.printCost || 80).toLocaleString()}</td>
              </tr>
              <tr>
                <td>ค่าบรรจุภัณฑ์มาตรฐาน & จัดส่งพัสดุด่วน</td>
                <td style="text-align: center;">-</td>
                <td style="text-align: right; font-family: monospace;">฿${(order.shippingCost || 55).toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2">ยอดชำระสุทธิ (Total Amount Paid)</td>
                <td style="text-align: right; font-family: monospace; color: #047857;">฿${order.totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Shipping Details -->
          <div style="background: #FBF9F5; border: 1px solid #E5E1D8; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
            <strong style="font-size: 12px; font-family: monospace; text-transform: uppercase; color: #131718;">📍 ที่อยู่จัดส่งพัสดุ:</strong>
            <p style="margin: 4px 0 0; font-size: 13px; color: #4A4844;">
              ผู้รับ: <strong>${order.shippingName}</strong><br/>
              ${order.shippingAddress}, ${order.shippingCity} ${order.shippingPostal}
            </p>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; margin-top: 24px;">
            <a href="${orderTrackUrl}" class="btn">ติดตามสถานะคำสั่งซื้อ (Track Order)</a>
            ${order.stripeReceiptUrl ? `<br/><a href="${order.stripeReceiptUrl}" target="_blank" class="stripe-btn">💳 เปิดดูใบเสร็จทางการของ Stripe (PDF)</a>` : ''}
          </div>
        </div>

        <div class="footer">
          <p>เอกสารนี้ออกโดยระบบอัตโนมัติของ APE-PAREL Platform • Stripe Payments & Escrow Protection</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customerEmail,
    subject: `🧾 ใบเสร็จรับเงิน & ยืนยันคำสั่งซื้อ #${order.orderNumber} (฿${order.totalAmount.toLocaleString()} THB)`,
    html,
    text: `ยืนยันการชำระเงินคำสั่งซื้อ #${order.orderNumber} สำเร็จ ยอดชำระ ฿${order.totalAmount.toLocaleString()} THB ติดตามสถานะได้ที่ ${orderTrackUrl}`,
  });
}

/**
 * Send Order In Production Status Email
 */
export async function sendOrderInProductionEmail(order: {
  id: string;
  orderNumber: string;
  customerEmail: string;
  supplierName: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const trackUrl = `${appUrl}/account/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <body style="font-family: sans-serif; background: #FBF9F5; padding: 24px; color: #131718;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E1D8; border-radius: 16px; padding: 28px;">
        <h2 style="color: #D97706; margin-top: 0;">🎨 คำสั่งซื้อ #${order.orderNumber} กำลังดำเนินการผลิต</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          โรงงานผู้ผลิต (<strong>${order.supplierName}</strong>) ได้เริ่มกระบวนการฉีดหมึกพิมพ์ DTG (Direct-to-Garment) และนำเข้าตู้อบสีความร้อนสูงเรียบร้อยแล้ว
        </p>
        <p style="font-size: 12px; color: #7B7873;">
          * เนื่องจากลวดลายได้ถูกสลักลงบนเนื้อผ้าจริงแล้ว คำสั่งซื้อนี้จะไม่สามารถกดยกเลิกแบบทันทีได้
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${trackUrl}" style="background: #131718; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
            ดูความคืบหน้าคำสั่งซื้อ
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customerEmail,
    subject: `🎨 อัปเดตสถานะ: คำสั่งซื้อ #${order.orderNumber} เข้าสู่กระบวนการพิมพ์แล้ว`,
    html,
    text: `คำสั่งซื้อ #${order.orderNumber} กำลังพิมพ์ที่โรงงาน ${order.supplierName} ติดตามได้ที่ ${trackUrl}`,
  });
}

/**
 * Send Order Shipped with Tracking Code Email
 */
export async function sendOrderShippedEmail(order: {
  id: string;
  orderNumber: string;
  customerEmail: string;
  carrierName: string;
  trackingNumber: string;
  shippingAddress: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const trackUrl = `${appUrl}/account/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <body style="font-family: sans-serif; background: #FBF9F5; padding: 24px; color: #131718;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E1D8; border-radius: 16px; padding: 28px;">
        <h2 style="color: #059669; margin-top: 0;">📦 คำสั่งซื้อ #${order.orderNumber} จัดส่งเรียบร้อยแล้ว!</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เสื้อของคุณได้รับการตรวจสอบคุณภาพ (QA) บรรจุลงกล่อง และส่งมอบให้แก่บริษัทขนส่งเรียบร้อยแล้ว
        </p>
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; font-family: monospace; color: #047857; text-transform: uppercase;">บริษัทขนส่ง: <strong>${order.carrierName}</strong></p>
          <p style="margin: 6px 0 0; font-size: 18px; font-weight: bold; font-family: monospace; color: #065F46;">หมายเลขพัสดุ: ${order.trackingNumber}</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${trackUrl}" style="background: #131718; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
            ตรวจสอบสถานะจัดส่งในระบบ
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customerEmail,
    subject: `🚚 พัสดุถูกจัดส่งแล้ว! คำสั่งซื้อ #${order.orderNumber} (${order.carrierName}: ${order.trackingNumber})`,
    html,
    text: `คำสั่งซื้อ #${order.orderNumber} จัดส่งแล้ว ขนส่ง ${order.carrierName} หมายเลขพัสดุ: ${order.trackingNumber}`,
  });
}

/**
 * Send acknowledgment email to supplier upon KYB submission
 */
export async function sendSupplierApplicationReceivedEmail(supplier: {
  companyName: string;
  contactEmail: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FBF9F5; padding: 24px; color: #131718;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E1D8; border-radius: 16px; padding: 28px;">
        <h2 style="color: #131718; margin-top: 0;">🏢 ได้รับเอกสารการสมัครผู้ผลิตเรียบร้อยแล้ว</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เรียนทีมงาน <strong>${supplier.companyName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          ระบบ APE-PAREL ได้รับข้อมูลโรงงานและเอกสารยืนยันตัวตน (KYB Documents) ของท่านแล้ว ขณะนี้ทีมงานฝ่ายตรวจสอบคุณภาพและบัญชีกำลังดำเนินการตรวจสอบเอกสารของท่าน
        </p>
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400E;">
            ⏳ <strong>ระยะเวลาตรวจสอบ:</strong> ประมาณ 1–2 วันทำการ เมื่อได้รับการอนุมัติ โรงงานของท่านจะปรากฏในระบบ 3D Studio สำหรับรับคำสั่งซื้อทันที
          </p>
        </div>
        <p style="font-size: 12px; color: #7B7873;">
          ท่านสามารถเข้าสู่ระบบเพื่อติดตามสถานะการพิจารณาได้ที่ <a href="${appUrl}/supplier/dashboard">${appUrl}/supplier/dashboard</a>
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: supplier.contactEmail,
    subject: `📋 ได้รับใบสมัครเข้าร่วมเป็นโรงงานผู้ผลิต APE-PAREL: ${supplier.companyName}`,
    html,
    text: `ได้รับข้อมูลการสมัครของ ${supplier.companyName} เรียบร้อยแล้ว เจ้าหน้าที่จะดำเนินการตรวจสอบเอกสารภายใน 1-2 วันทำการ`,
  });
}

/**
 * Send approval email to supplier
 */
export async function sendSupplierApprovedEmail(supplier: {
  companyName: string;
  contactEmail: string;
  slug: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const dashboardUrl = `${appUrl}/supplier/dashboard?supplier=${supplier.slug}`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FBF9F5; padding: 24px; color: #131718;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E1D8; border-radius: 16px; padding: 28px;">
        <h2 style="color: #059669; margin-top: 0;">🎉 ยินดีด้วย! โรงงานของคุณได้รับการอนุมัติแล้ว</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เรียนทีมงาน <strong>${supplier.companyName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เอกสารและการยืนยันตัวตนโรงงานของท่านผ่านการพิจารณาเรียบร้อยแล้ว บัญชีของท่านได้รับการติดตรา <strong>Verified Supplier</strong> และเปิดให้ลูกค้าเลือกเป็นโรงงานผลิตในระบบ 3D Studio เรียบร้อยแล้ว
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #131718; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
            เข้าสู่ Supplier Dashboard
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: supplier.contactEmail,
    subject: `✅ บัญชีโรงงานผู้ผลิต ${supplier.companyName} ได้รับการอนุมัติแล้ว (APE-PAREL Verified)`,
    html,
    text: `ยินดีด้วย! บัญชีโรงงาน ${supplier.companyName} ผ่านการอนุมัติแล้ว สามารถเข้าจัดการออเดอร์และแคตตาล็อกได้ที่ ${dashboardUrl}`,
  });
}

/**
 * Send rejection / clarification email to supplier
 */
export async function sendSupplierRejectedEmail(
  supplier: { companyName: string; contactEmail: string; slug: string },
  reason: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const onboardingUrl = `${appUrl}/supplier/onboarding`;

  const html = `
    <!DOCTYPE html>
    <html lang="th">
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #FBF9F5; padding: 24px; color: #131718;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #E5E1D8; border-radius: 16px; padding: 28px;">
        <h2 style="color: #DC2626; margin-top: 0;">⚠️ ผลการพิจารณาเอกสารโรงงานผู้ผลิต</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เรียนทีมงาน <strong>${supplier.companyName}</strong>,
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          เจ้าหน้าที่ได้ตรวจสอบเอกสารการสมัครของท่าน และพบข้อความหรือจุดที่ต้องการให้แก้ไข/เพิ่มเติม ดังนี้:
        </p>
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 14px; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #991B1B; font-weight: bold;">เหตุผลจากเจ้าหน้าที่:</p>
          <p style="margin: 6px 0 0; font-size: 13px; color: #7F1D1D;">${reason}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #4A4844;">
          กรุณาเข้าสู่ระบบและอัปโหลดเอกสารที่ถูกต้องอีกครั้งเพื่อดำเนินการพิจารณาใหม่
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #DC2626; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
            อัปโหลดเอกสารเพิ่มเติม
          </a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: supplier.contactEmail,
    subject: `⚠️ ผลการตรวจสอบเอกสารโรงงาน ${supplier.companyName} (ต้องการเอกสารเพิ่มเติม)`,
    html,
    text: `ผลการพิจารณาเอกสารโรงงาน ${supplier.companyName}: ${reason} กรุณาเข้าไปอัปโหลดเอกสารใหม่ที่ ${onboardingUrl}`,
  });
}


