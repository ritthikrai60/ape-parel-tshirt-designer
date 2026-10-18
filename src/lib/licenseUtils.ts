/**
 * Helper to get clean, unambiguous Thai UI labels and descriptions for license options.
 * Prevents duplicate generic labels (e.g. "รายชิ้น ฿50" vs "รายชิ้น ฿100") by inspecting
 * the actual license name and terms.
 */

export interface LicenseDisplayBadge {
  title: string;
  badge: string;
  priceFormatted: string;
  description: string;
  isUnlimited: boolean;
}

export function getLicenseDisplayInfo(
  opt: {
    id?: string;
    name?: string;
    price: number;
    scope?: string;
    terms?: string | null;
  },
  quantity: number = 1
): LicenseDisplayBadge {
  const name = opt.name || '';
  const isUnlimited =
    opt.scope === 'UNLIMITED' || /buyout|vault|lifetime|permanent|unlimited/i.test(name);

  if (isUnlimited) {
    return {
      title: 'ซื้อขาดตลอดชีพ',
      badge: 'ตลอดชีพ',
      priceFormatted: `฿${opt.price}`,
      description: 'ซื้อขาดถาวร + เข้า Vault (สกรีนฟรีตลอดไป)',
      isUnlimited: true,
    };
  }

  // Check if it's a commercial batch or limited run license
  const isLimitedRun =
    /limited|batch|commercial run|small batch|เชิงพาณิชย์/i.test(name) ||
    /50 units|batch|commercial/i.test(opt.terms || '');

  if (isLimitedRun) {
    return {
      title: 'เชิงพาณิชย์ (Limited Run)',
      badge: 'เชิงพาณิชย์',
      priceFormatted: `฿${opt.price}/ตัว`,
      description: `ล็อตพาณิชย์ รวม ฿${opt.price * quantity} (${quantity} ตัว)`,
      isUnlimited: false,
    };
  }

  // Standard per garment print license
  return {
    title: 'รายชิ้น (Standard)',
    badge: 'รายชิ้น',
    priceFormatted: `฿${opt.price}/ตัว`,
    description: `คิดตามจำนวนตัว รวม ฿${opt.price * quantity} (${quantity} ตัว)`,
    isUnlimited: false,
  };
}
