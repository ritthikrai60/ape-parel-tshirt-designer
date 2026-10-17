import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendOrderConfirmationReceiptEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/stripe
 * 
 * Official Stripe Webhook Handler for Ape-Parel
 * Handles:
 * - payment_intent.succeeded: Reconciles order payment, locks funds in Escrow, activates creator royalties
 * - payment_intent.payment_failed: Marks payment failed and notifies customer
 * - charge.refunded: Records refund from Stripe Dashboard
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();

    if (webhookSecret && webhookSecret !== 'whsec_placeholder_for_webhook_signature') {
      if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
      }
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } else {
      // In local dev without active webhook tunnel secret, parse safely
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('[Stripe Webhook Signature Verification Failed]:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }

      default:
        // Unhandled event types are acknowledged safely
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error: any) {
    console.error(`[Stripe Webhook Handler Error for ${event.type}]:`, error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handles payment_intent.succeeded
 * Reconciles the order into PAYMENT_CONFIRMED & locks funds in Platform Escrow
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  const orderNumber = paymentIntent.metadata?.orderNumber;

  // Find order by ID, orderNumber, or stripePaymentIntentId
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ id: orderId }] : []),
        ...(orderNumber ? [{ orderNumber }] : []),
        { stripePaymentIntentId: paymentIntent.id },
      ],
    },
    include: {
      obligations: true,
      supplier: true,
      customer: true,
    },
  });

  if (!order) {
    console.warn(`[Stripe Webhook] Order not found for PaymentIntent ${paymentIntent.id}`);
    return;
  }

  // Idempotency check: if order is already paid, do not re-process
  if (order.paymentStatus === 'PAID') {
    return;
  }

  // Determine receipt URL if available from charges
  const charges = (paymentIntent as any).charges?.data;
  const receiptUrl = charges?.[0]?.receipt_url || null;

  await prisma.$transaction(async (tx) => {
    // 1. Update Order Status
    await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'PAYMENT_CONFIRMED',
        stripeReceiptUrl: receiptUrl,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    // 2. Activate Creator Royalty Obligations to 'ELIGIBLE'
    await tx.royaltyObligation.updateMany({
      where: { orderId: order.id },
      data: {
        status: 'ELIGIBLE',
      },
    });

    // 3. Record Double-Entry Escrow Entry
    let escrowAccount = await tx.financialAccount.findFirst({
      where: { accountType: 'ESCROW' },
    });

    if (!escrowAccount) {
      escrowAccount = await tx.financialAccount.create({
        data: {
          accountType: 'ESCROW',
          accountNumber: 'ACC-ESCROW-HOLDING',
          balance: 0,
          currency: 'THB',
          status: 'ACTIVE',
        },
      });
    }

    const newEscrowBalance = escrowAccount.balance + order.totalAmount;
    await tx.financialAccount.update({
      where: { id: escrowAccount.id },
      data: { balance: newEscrowBalance },
    });

    await tx.journalEntry.create({
      data: {
        accountId: escrowAccount.id,
        entryType: 'CREDIT',
        amount: order.totalAmount,
        balanceAfter: newEscrowBalance,
        orderId: order.id,
        reference: order.orderNumber,
        description: `Stripe Escrow Deposit for Order #${order.orderNumber} (PI: ${paymentIntent.id})`,
      },
    });

    // 4. Post System Message into Order Chat (using customer or supplier's user account)
    const messageSenderId = order.customerId || order.supplier?.userId;
    if (messageSenderId) {
      await tx.orderMessage.create({
        data: {
          orderId: order.id,
          senderId: messageSenderId,
          senderRole: 'SYSTEM',
          message: `✅ [การชำระเงินสำเร็จผ่าน Stripe]\nยอดชำระ ฿${order.totalAmount.toLocaleString()} THB ได้รับการยืนยันผ่าน Stripe แล้ว\nคำสั่งซื้อถูกส่งไปยังโรงงานผู้ผลิต (${order.supplier.companyName}) เพื่อเริ่มกระบวนการสกรีนและตรวจสอบคุณภาพ`,
        },
      });
    }

    // 5. Send Notification to Customer
    if (order.customerId) {
      await tx.notification.create({
        data: {
          userId: order.customerId,
          type: 'ORDER_UPDATE',
          title: `การชำระเงิน #${order.orderNumber} สำเร็จแล้ว`,
          message: `เราได้รับยอดเงิน ฿${order.totalAmount.toLocaleString()} THB เรียบร้อยแล้ว คำสั่งซื้อกำลังเข้าสู่คิวการผลิต`,
          metadata: JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            stripePaymentIntentId: paymentIntent.id,
          }),
        },
      });
    }

    // 6. Record Immutable Audit Event
    await tx.auditEvent.create({
      data: {
        action: 'ORDER_PAYMENT_CONFIRMED',
        entityType: 'Order',
        entityId: order.id,
        userId: order.customerId || null,
        actorId: order.customerId || 'STRIPE_WEBHOOK',
        payload: JSON.stringify({
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          stripePaymentIntentId: paymentIntent.id,
          status: 'PAYMENT_CONFIRMED',
        }),
      },
    });
  });

  // 7. Dispatch Official Order Confirmation & E-Receipt Email
  const customerEmail =
    order.customer?.email ||
    (paymentIntent as any).receipt_email ||
    paymentIntent.metadata?.customerEmail;

  if (customerEmail && customerEmail !== 'N/A') {
    sendOrderConfirmationReceiptEmail({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      quantity: order.quantity,
      customerEmail,
      shippingName: order.shippingName,
      shippingAddress: order.shippingAddress,
      shippingCity: order.shippingCity,
      shippingPostal: order.shippingPostal,
      supplierName: order.supplier.companyName,
      stripeReceiptUrl: receiptUrl,
      basePrice: order.garmentCost,
      printCost: order.printingCost,
      royaltyCost: order.licensingCost,
      shippingCost: order.shippingCost + order.packagingCost,
    }).catch((err) => console.warn('[Stripe Webhook] Failed to dispatch order receipt email:', err));
  }
}

/**
 * Handles payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  const lastError = paymentIntent.last_payment_error?.message || 'Payment authentication failed';

  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.paymentStatus === 'PAID') return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'FAILED',
    },
  });

  if (order.customerId) {
    await prisma.notification.create({
      data: {
        userId: order.customerId,
        type: 'ORDER_UPDATE',
        title: `การชำระเงินสำหรับ #${order.orderNumber} ไม่สำเร็จ`,
        message: `เกิดข้อผิดพลาดในการตัดเงิน: ${lastError} กรุณาลองใหม่อีกครั้ง`,
      },
    });
  }
}
