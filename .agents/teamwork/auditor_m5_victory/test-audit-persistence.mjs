import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing AuditEvent persistence in dev.db...');
  
  // 1. Create a verification audit event
  const testEvent = await prisma.auditEvent.create({
    data: {
      action: 'FORENSIC_VERIFICATION_CHECK',
      entityType: 'SystemAudit',
      entityId: 'victory_audit_m5',
      payload: JSON.stringify({
        timestamp: new Date().toISOString(),
        auditor: 'teamwork_preview_auditor',
        status: 'VERIFYING_REAL_SQLITE_PERSISTENCE',
      }),
    },
  });

  console.log('Created AuditEvent:', testEvent.id);

  // 2. Query count and verify it exists
  const count = await prisma.auditEvent.count();
  console.log('Current AuditEvent count in dev.db:', count);

  const retrieved = await prisma.auditEvent.findUnique({
    where: { id: testEvent.id },
  });

  if (!retrieved) {
    throw new Error('AuditEvent not persisted in SQLite!');
  }

  console.log('Retrieved AuditEvent:', JSON.stringify(retrieved, null, 2));

  // 3. Also test PATCH order status flow on sample order to test the full application logic
  const sampleOrder = await prisma.order.findFirst();
  if (sampleOrder) {
    console.log('\nTesting application order status update audit trail for order:', sampleOrder.orderNumber);
    
    // Simulate PATCH /api/orders/[id] transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: sampleOrder.id },
        data: { status: 'IN_PRODUCTION' },
      });

      const audit = await tx.auditEvent.create({
        data: {
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'Order',
          entityId: order.id,
          payload: JSON.stringify({
            previousStatus: sampleOrder.status,
            newStatus: 'IN_PRODUCTION',
            notes: 'Forensic integrity verification of status transition audit trail',
            updatedAt: new Date().toISOString(),
          }),
        },
      });

      return { order, audit };
    });

    console.log('Order status updated to:', updatedOrder.order.status);
    console.log('Order status audit event ID:', updatedOrder.audit.id);

    // Reset status back to PAYMENT_CONFIRMED for clean state
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: sampleOrder.id },
        data: { status: 'PAYMENT_CONFIRMED' },
      });
      await tx.auditEvent.create({
        data: {
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'Order',
          entityId: sampleOrder.id,
          payload: JSON.stringify({
            previousStatus: 'IN_PRODUCTION',
            newStatus: 'PAYMENT_CONFIRMED',
            notes: 'Restored status post-audit verification',
            updatedAt: new Date().toISOString(),
          }),
        },
      });
    });
  }

  const finalCounts = {
    garments: await prisma.garmentProduct.count(),
    creators: await prisma.creatorProfile.count(),
    artworks: await prisma.artwork.count(),
    orders: await prisma.order.count(),
    obligations: await prisma.royaltyObligation.count(),
    ledgerEntries: await prisma.royaltyLedgerEntry.count(),
    auditEvents: await prisma.auditEvent.count(),
  };

  console.log('\nFinal DB Counts with real records in dev.db:');
  console.log(JSON.stringify(finalCounts, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
