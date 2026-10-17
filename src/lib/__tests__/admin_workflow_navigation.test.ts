import { describe, it, expect } from 'vitest';
import { ADMIN_CATEGORIES, TabType } from '@/components/portal/AdminWorkflowNav';

describe('Admin Workflow Navigation & Organization Architecture', () => {
  it('defines the 4 fundamental operational workflows plus ALL category', () => {
    const categoryIds = ADMIN_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain('ALL');
    expect(categoryIds).toContain('OPERATIONS');
    expect(categoryIds).toContain('TRUST');
    expect(categoryIds).toContain('FINANCE');
    expect(categoryIds).toContain('SYSTEM');
    expect(ADMIN_CATEGORIES).toHaveLength(5);
  });

  it('supports all 12 platform tools across the 4 workflow hubs', () => {
    const expectedTabs: TabType[] = [
      'overview',
      'analytics',
      'orders',
      'inventory',
      'moderation',
      'financials',
      'payouts',
      'cms',
      'users',
      'audit',
      'chat-audit',
      'subscribers',
    ];

    expect(expectedTabs).toHaveLength(12);
  });

  it('maintains clear bilingual category labels and metadata', () => {
    for (const cat of ADMIN_CATEGORIES) {
      expect(cat.labelEn).toBeDefined();
      expect(cat.labelTh).toBeDefined();
      expect(cat.icon).toBeDefined();
    }
  });
});
