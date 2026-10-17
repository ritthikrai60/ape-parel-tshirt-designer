import { describe, it, expect } from 'vitest';
import { th } from '@/lib/i18n/dictionaries/th';
import { en } from '@/lib/i18n/dictionaries/en';
import { ja } from '@/lib/i18n/dictionaries/ja';

describe('Platform Neutrality & Governance System Suite', () => {
  it('ensures all language dictionaries contain complete platform governance and dispute keys', () => {
    const dicts = [th, en, ja];
    for (const dict of dicts) {
      expect(dict.footer.verifiedNetwork).toBeDefined();
      expect(dict.footer.escrowProtection).toBeDefined();
      expect(dict.footer.creatorProtection).toBeDefined();
      expect(dict.footer.ipTakedown).toBeDefined();
      expect(dict.footer.disputeCenter).toBeDefined();
      expect(dict.footer.supplierCodeOfConduct).toBeDefined();
      expect(dict.footer.marketplaceDisclaimer).toBeDefined();

      expect(dict.footer.platformGovernance).toBeDefined();
      expect(dict.footer.ecosystemPortals).toBeDefined();
      expect(dict.footer.customerUtilities).toBeDefined();
    }
  });

  it('ensures studio dictionaries have contextual supplier policy and tolerance keys', () => {
    const dicts = [th, en, ja];
    for (const dict of dicts) {
      expect(dict.studio.supplierPolicyBtn).toBeDefined();
      expect(dict.studio.supplierPolicyTitle).toBeDefined();
      expect(dict.studio.leadTime).toBeDefined();
      expect(dict.studio.claimPolicy).toBeDefined();
      expect(dict.studio.printTolerance).toBeDefined();
    }
  });

  it('guarantees home marketing copy is platform-neutral rather than monolithic single-vendor', () => {
    expect(th.home.featureSpeedTitle).toContain('เครือข่าย');
    expect(th.home.featureRoyaltyTitle).toBe('เศรษฐกิจครีเอเตอร์ที่โปร่งใส');
    expect(en.home.featureSpeedTitle).toBe('Verified Manufacturing Network');
    expect(en.home.featureRoyaltyTitle).toBe('Empowering Creator Royalties');
    expect(ja.home.featureSpeedTitle).toBe('認定製造ネットワーク');
  });

  it('verifies live pricing labels use generic digital DTG printing rather than single machine brand', () => {
    expect(th.livePricing.printFee).not.toContain('Kornit');
    expect(en.livePricing.printFee).not.toContain('Kornit');
    expect(ja.livePricing.printFee).not.toContain('Kornit');
  });
});
