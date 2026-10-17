/**
 * src/lib/version.ts
 * Single source of truth for platform versioning, release metadata, and system changelog.
 */

export interface ChangelogItem {
  type: 'feat' | 'fix' | 'security' | 'ui' | 'perf';
  text: string;
  details?: string;
}

export interface ReleaseMilestone {
  version: string;
  date: string;
  codename: string;
  summary: string;
  isLatest?: boolean;
  highlightBadge?: string;
  changes: ChangelogItem[];
}

export const APP_VERSION = 'v2.4.0';
export const APP_BUILD_DATE = '2026-10-18';
export const APP_CODENAME = 'Primate Protocol // Dual IP Engine';
export const APP_CORE_STACK = [
  { name: 'Framework', value: 'Next.js 14 App Router' },
  { name: '3D Graphics', value: 'Three.js WebGL & Canvas' },
  { name: 'Database', value: 'SQLite / Prisma Double-Entry' },
  { name: 'Payments', value: 'Stripe (Cards & PromptPay)' },
  { name: 'Governance', value: 'Thai PDPA & Escrow Protection' },
];

export const CHANGELOG_DATA: ReleaseMilestone[] = [
  {
    version: 'v2.4.0',
    date: '2026-10-18',
    codename: 'Dual IP Engine & Transparent Checkout',
    summary: 'Introduced flexible Dual-Scope Licensing (Per-Garment vs Lifetime Buyout), interactive checkout scope selector, and zero-royalty repeat order vault issuance.',
    isLatest: true,
    highlightBadge: 'Current Stable',
    changes: [
      {
        type: 'feat',
        text: 'Dual-Scope Artwork Licensing (Per-Garment vs Lifetime Buyout)',
        details: 'Shoppers can now choose between paying per piece (฿120/garment) or acquiring a permanent UNLIMITED license (฿1,200 flat) during design selection.',
      },
      {
        type: 'ui',
        text: 'Interactive Artwork Drawer & Layer Inspector Buttons',
        details: 'Direct "🏷️ รายชิ้น" and "👑 ซื้อขาดตลอดชีพ" action buttons right in the artwork catalog drawer, plus scope selector dropdown in layer controls.',
      },
      {
        type: 'feat',
        text: 'Authoritative Checkout Licensing Breakdown',
        details: 'Review license types directly in the 3D Studio Checkout modal with dynamic quantity calculation and instantaneous total updates.',
      },
      {
        type: 'security',
        text: 'Atomic IP Vault Minting & Zero-Royalty Reorders',
        details: 'Purchased UNLIMITED licenses are recorded in the customer design vault and automatically applied at ฿0 forever on subsequent reorders.',
      },
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-10-17',
    codename: 'Supplier KYB & Audit Verification',
    summary: 'Enterprise supplier onboarding with 13-digit Thai tax verification, multi-document proof uploads, and an admin document lightbox review suite.',
    changes: [
      {
        type: 'security',
        text: 'Supplier KYB Onboarding Workflow',
        details: 'Rigorous onboarding requesting DBD Company Registration (หนังสือรับรองนิติบุคคล), PP.20 VAT Certificate (ภ.พ.20), Bank Passbook, and factory proofs.',
      },
      {
        type: 'ui',
        text: 'Admin Document Review Lightbox & Rejection Feedback',
        details: 'High-resolution zoom/pan modal for admin document inspection with granular approve/reject reason dispatch to supplier dashboards.',
      },
      {
        type: 'feat',
        text: 'Automated Supplier Status State Machine',
        details: 'Gated production access ensuring suppliers only accept customer jobs once verified by platform administrators.',
      },
    ],
  },
  {
    version: 'v2.2.0',
    date: '2026-10-14',
    codename: '3D Studio Customizer & Physics Engine',
    summary: 'Full Three.js WebGL 3D customizer with real-time fabric displacement, orthographic multi-angle snapshots, and multi-variant stock matrix.',
    changes: [
      {
        type: 'ui',
        text: 'Interactive 3D Three.js Streetwear Studio',
        details: 'Real-time 3D orbit controls, front/back/isometric camera views, and dynamic artwork placement on apparel surfaces.',
      },
      {
        type: 'perf',
        text: 'Client-side Offscreen Canvas Multi-Angle Snapshots',
        details: 'Instantaneous multi-perspective thumbnail rendering without server round-trips for blazingly fast checkout and blueprint generation.',
      },
      {
        type: 'feat',
        text: 'Fabric GSM & Multi-Variant Stock Management',
        details: 'Dynamic calculation of fabric weights (Heavyweight 240 GSM, Standard 200 GSM) and supplier inventory locks.',
      },
    ],
  },
  {
    version: 'v2.1.0',
    date: '2026-10-11',
    codename: 'Permanent IP Vault & Escrow Governance',
    summary: 'Immutable design vault with SHA-256 digital certificate generation and 14-day creator royalty protection hold.',
    changes: [
      {
        type: 'security',
        text: 'Cryptographic SHA-256 IP Certificates',
        details: 'Tamper-evident certificate hashes generated for every design and license issuance for legal provenance.',
      },
      {
        type: 'security',
        text: 'Creator Escrow Protection & Double-Entry Accounting',
        details: 'Royalties held safely in escrow until customer inspection window passes, backed by double-entry ledger journals.',
      },
      {
        type: 'ui',
        text: 'Customer & Creator Design Vault Portals',
        details: 'Personal archive allowing customers to reorder customized garments in one click and creators to monitor active licenses.',
      },
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-10-10',
    codename: 'Universal Payment Gateway & Production Blueprints',
    summary: 'Integrated Stripe payments with PromptPay QR and credit cards, automated vector production sheets, and real-time order chat.',
    changes: [
      {
        type: 'feat',
        text: 'Stripe Gateway (PromptPay QR & Credit/Debit Cards)',
        details: 'Native Thai PromptPay QR code generation and global credit card processing with automated webhook reconciliation.',
      },
      {
        type: 'feat',
        text: 'High-Resolution Vector Production Blueprint Sheet',
        details: 'Automated generation of production-ready print packets including DPI targets, hex color codes, and printable dimensions for DTG operators.',
      },
      {
        type: 'ui',
        text: 'Real-Time Order & Support Messaging',
        details: 'Direct synchronized communication channel between customer, supplier, and platform support per order ID.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-10-08',
    codename: 'Genesis Launch',
    summary: 'The inaugural release of APE-PAREL: open marketplace, vetted DTG supplier routing, and streetwear design engine.',
    changes: [
      {
        type: 'feat',
        text: 'Initial Marketplace & Creator Hub Launch',
        details: 'Platform foundation enabling independent artists to monetize graphic assets and customers to order on-demand streetwear.',
      },
      {
        type: 'security',
        text: 'Role-Based Access Control (RBAC)',
        details: 'Isolated security contexts for Customers, Creators, Suppliers, and System Administrators.',
      },
    ],
  },
];
