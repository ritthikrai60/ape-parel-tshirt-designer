import { PrismaClient } from '@prisma/client';
import { createOrderAtomic } from '../../../src/lib/orders.js';

const prisma = new PrismaClient();

async function verifyTxAcid() {
  console.log('--- TESTING REAL ACID TRANSACTION WITH DATABASE WRITES & ROLLBACK ---');

  const garment = await prisma.garmentProduct.findUnique({
    where: { sku: 'APX-HVY-001' },
  });

  const art1 = await prisma.artwork.findFirst({
    where: { title: { contains: 'Dash Ape Classic' } },
    include: { licenseOptions: true },
  });

  const lic1 = art1.licenseOptions.find((l) => l.price === 40);

  const initialOrders = await prisma.order.count();
  const initialDesigns = await prisma.designDocument.count();
  const initialObligations = await prisma.royaltyObligation.count();
  const initialLedgers = await prisma.royaltyLedgerEntry.count();

  console.log('Baseline counts:', {
    initialOrders,
    initialDesigns,
    initialObligations,
    initialLedgers,
  });

  // 1. Test genuine commit
  console.log('1. Executing genuine createOrderAtomic commit...');
  const orderResult = await createOrderAtomic({
    garmentProductId: garment.id,
    quantity: 1,
    frontArtworkLicenses: [
      { artworkId: art1.id, licenseOptionId: lic1.id },
    ],
    shippingName: 'Forensic Auditor Test',
    shippingAddress: 'Audit Trail St 1',
    shippingCity: 'Bangkok',
    shippingPostal: '10110',
  });

  console.log('Created order:', orderResult.orderNumber, 'Total:', orderResult.totalAmount);

  const postCommitOrders = await prisma.order.count();
  const postCommitDesigns = await prisma.designDocument.count();
  const postCommitObligations = await prisma.royaltyObligation.count();
  const postCommitLedgers = await prisma.royaltyLedgerEntry.count();

  console.log('Post-commit counts:', {
    orders: postCommitOrders,
    designs: postCommitDesigns,
    obligations: postCommitObligations,
    ledgers: postCommitLedgers,
  });

  if (
    postCommitOrders !== initialOrders + 1 ||
    postCommitDesigns !== initialDesigns + 1 ||
    postCommitObligations !== initialObligations + 1 ||
    postCommitLedgers !== initialLedgers + 1
  ) {
    throw new Error('Real DB write verification FAILED: record counts did not increment correctly.');
  }

  // 2. Test genuine rollback
  console.log('2. Executing simulated failure to verify genuine rollback...');
  let threw = false;
  try {
    await createOrderAtomic({
      garmentProductId: garment.id,
      quantity: 1,
      frontArtworkLicenses: [
        { artworkId: art1.id, licenseOptionId: lic1.id },
      ],
      shippingName: 'Rollback Auditor Test',
      shippingAddress: 'Fail St 2',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      _simulateFailureAtStep: 'ledger',
    });
  } catch (err) {
    threw = true;
    console.log('Caught expected simulated error:', err.message);
  }

  if (!threw) {
    throw new Error('Rollback verification FAILED: createOrderAtomic did not throw on simulated failure.');
  }

  const postRollbackOrders = await prisma.order.count();
  const postRollbackDesigns = await prisma.designDocument.count();
  const postRollbackObligations = await prisma.royaltyObligation.count();
  const postRollbackLedgers = await prisma.royaltyLedgerEntry.count();

  console.log('Post-rollback counts:', {
    orders: postRollbackOrders,
    designs: postRollbackDesigns,
    obligations: postRollbackObligations,
    ledgers: postRollbackLedgers,
  });

  if (
    postRollbackOrders !== postCommitOrders ||
    postRollbackDesigns !== postCommitDesigns ||
    postRollbackObligations !== postCommitObligations ||
    postRollbackLedgers !== postCommitLedgers
  ) {
    throw new Error('ACID Rollback verification FAILED: orphan records remained after transaction rollback.');
  }

  // 3. Cleanup created test records
  console.log('3. Cleaning up test order...');
  await prisma.royaltyLedgerEntry.deleteMany({
    where: { reference: orderResult.orderNumber },
  });
  await prisma.royaltyObligation.deleteMany({
    where: { orderId: orderResult.orderId },
  });
  await prisma.order.delete({
    where: { id: orderResult.orderId },
  });
  await prisma.designDocument.delete({
    where: { id: orderResult.designId },
  });

  const finalOrders = await prisma.order.count();
  console.log('Final orders count:', finalOrders);
  if (finalOrders !== initialOrders) {
    throw new Error('Cleanup failed: order count does not match initial.');
  }

  console.log('>>> REAL ACID DATABASE TRANSACTION EMPIRICALLY CONFIRMED PASS! <<<');
}

verifyTxAcid()
  .catch((e) => {
    console.error('ACID verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
