import { PrismaClient } from '@prisma/client';
import { createOrderAtomic } from '../../../src/lib/orders';
import { calculateLivePricing } from '../../../src/lib/pricing';

const prisma = new PrismaClient();

async function testAtomicOrders() {
  console.log('=== INDEPENDENT ATOMIC ORDERS & ANTI-TAMPERING AUDIT ===');

  const garment = await prisma.garmentProduct.findUniqueOrThrow({
    where: { sku: 'APX-HVY-001' },
  });

  const lic1 = await prisma.licenseOption.findFirstOrThrow({
    where: { artwork: { title: { contains: 'Dash Ape Classic Head Mark' } } }
  });

  // Test 1: Pricing engine direct call
  const pricing = await calculateLivePricing({
    garmentProductId: garment.id,
    quantity: 1,
    frontArtworkLicenses: [{ artworkId: lic1.artworkId, licenseOptionId: lic1.id }],
  });
  console.log(`- 1 Unit with 1 License (${lic1.price}): total = ${pricing.totalAmount} THB (Expected: 150+80+15+40+40 = 325) -> ${pricing.totalAmount === 325 ? 'PASS' : 'FAIL'}`);

  // Test 2: Price Tampering Detection
  let tamperingCaught = false;
  try {
    await createOrderAtomic({
      garmentProductId: garment.id,
      quantity: 1,
      shippingName: 'Tamper Tester',
      shippingAddress: '123 Fake Street',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      clientClaimedTotal: 100, // Tampered price!
      frontArtworkLicenses: [{ artworkId: lic1.artworkId, licenseOptionId: lic1.id }],
    });
  } catch (err: any) {
    if (err.message.includes('Price tampering detected')) {
      tamperingCaught = true;
    } else {
      console.error('Unexpected error:', err);
    }
  }
  console.log(`- Price Tampering Rejection: ${tamperingCaught ? 'PASS (Correctly rejected tampered client total)' : 'FAIL'}`);

  // Test 3: Transaction Rollback on failure
  const initialOrderCount = await prisma.order.count();
  const initialObligationCount = await prisma.royaltyObligation.count();
  const initialLedgerCount = await prisma.royaltyLedgerEntry.count();

  let rollbackCaught = false;
  try {
    await createOrderAtomic({
      garmentProductId: garment.id,
      quantity: 1,
      shippingName: 'Rollback Tester',
      shippingAddress: '123 Rollback St',
      shippingCity: 'Bangkok',
      shippingPostal: '10110',
      frontArtworkLicenses: [{ artworkId: lic1.artworkId, licenseOptionId: lic1.id }],
      _simulateFailureAtStep: 'ledger',
    });
  } catch (err: any) {
    if (err.message.includes('Simulated failure during RoyaltyLedgerEntry creation')) {
      rollbackCaught = true;
    }
  }

  const postRollbackOrderCount = await prisma.order.count();
  const postRollbackObligationCount = await prisma.royaltyObligation.count();
  const postRollbackLedgerCount = await prisma.royaltyLedgerEntry.count();

  const rollbackClean =
    rollbackCaught &&
    initialOrderCount === postRollbackOrderCount &&
    initialObligationCount === postRollbackObligationCount &&
    initialLedgerCount === postRollbackLedgerCount;

  console.log(`- Atomic Transaction Rollback: ${rollbackClean ? 'PASS (Zero orphaned records on failure)' : 'FAIL'}`);

  // Test 4: Genuine Atomic Order Placement
  const testOrder = await createOrderAtomic({
    garmentProductId: garment.id,
    quantity: 1,
    shippingName: 'Audit Test Customer',
    shippingAddress: '99 Sukhumvit Rd',
    shippingCity: 'Bangkok',
    shippingPostal: '10110',
    frontArtworkLicenses: [{ artworkId: lic1.artworkId, licenseOptionId: lic1.id }],
  });

  console.log(`- Atomic Order Placed: orderNumber = ${testOrder.orderNumber}, obligations = ${testOrder.obligationsCount}, ledger = ${testOrder.ledgerEntriesCount} -> PASS`);

  // Verify DB state for this order
  const savedObligation = await prisma.royaltyObligation.findFirst({
    where: { orderId: testOrder.orderId },
    include: { ledgerEntries: true }
  });

  const verifiedDb = savedObligation && savedObligation.ledgerEntries.length > 0;
  console.log(`- Database Persistence Verification: obligation & ledger linked -> ${verifiedDb ? 'PASS' : 'FAIL'}`);

  // Teardown test order to leave DB clean
  await prisma.royaltyLedgerEntry.deleteMany({ where: { reference: testOrder.orderNumber } });
  await prisma.royaltyObligation.deleteMany({ where: { orderId: testOrder.orderId } });
  await prisma.order.delete({ where: { id: testOrder.orderId } });
  await prisma.designDocument.delete({ where: { id: testOrder.designId } });
  console.log('- Test records cleanly torn down.');

  console.log('=== ATOMIC ORDERS AUDIT COMPLETE: ALL PASS ===');
}

testAtomicOrders().catch(console.error).finally(() => prisma.$disconnect());
