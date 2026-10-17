'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  CheckCircle2,
  Package,
  History,
  ExternalLink,
  Sparkles,
  Users,
  Warehouse,
  Search,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Scale,
  ReceiptText,
  Truck,
  ArrowUpRight,
  Layers,
  Check,
  Download,
  FileText,
  Tag,
  Monitor,
  Repeat,
  RotateCcw,
  DollarSign,
  Plus,
  Trash2,
  Clock,
  Pencil,
  MessageSquare,
  Mail,
  BarChart3,
  Boxes,
  ArrowRight,
  Factory,
} from 'lucide-react';
import { AdminChatAuditTab } from '@/components/portal/AdminChatAuditTab';
import { AdminSubscribersTab } from '@/components/portal/AdminSubscribersTab';
import { AdminAnalyticsTab } from '@/components/portal/AdminAnalyticsTab';
import { AnalyticsSummary } from '@/lib/analytics';
import { OrderChatBox } from '@/components/portal/OrderChatBox';
import { AdminWorkflowNav, TabType } from '@/components/portal/AdminWorkflowNav';

export interface OrderItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMode: string;
  totalAmount: number;
  garmentCost: number;
  printingCost: number;
  licensingCost: number;
  packagingCost: number;
  shippingCost: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingPhone: string;
  garmentName: string;
  garmentSku: string;
  garmentColor: string;
  garmentSize: string;
  supplierId: string;
  supplierName: string;
  obligationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkModerationItem {
  id: string;
  title: string;
  description: string | null;
  creatorName: string;
  creatorSlug: string;
  category: string;
  previewUrl: string;
  moderationStatus: string;
  moderationReason: string | null;
  status: string;
  createdAt: string;
  dpi: number;
  dimensions: string;
  colorSpace: string;
  standardLicensePrice: number;
}

export interface GarmentVariantItem {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stock: number;
  priceAdjustment: number;
}

export interface GarmentProductItem {
  id: string;
  sku: string;
  name: string;
  fabric: string;
  weightGsm: number;
  fit: string;
  basePrice: number;
  packagingPrice: number;
  shippingPrice: number;
  variants: GarmentVariantItem[];
}

export interface SupplierItem {
  id: string;
  slug: string;
  companyName: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  leadTimeDays: number;
  verified: boolean;
  printingServices: {
    id: string;
    name: string;
    code: string;
    pricePerSurface: number;
    supportedSurfaces: string;
  }[];
  products: GarmentProductItem[];
}

export interface FinancialAccountItem {
  id: string;
  accountType: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: string;
  ownerName: string;
  recentEntries: {
    id: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    reference: string;
    description: string;
    createdAt: string;
  }[];
}

export interface CommissionRuleItem {
  id: string;
  ruleCode: string;
  description: string;
  platformSharePercent: number;
  creatorSharePercent: number;
  effectiveFrom: any;
  isActive: boolean;
}

export interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  profileTitle: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: string;
  payload: string;
}

export interface PayoutItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorSlug: string;
  grossAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  netAmount: number;
  paymentMethod: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  promptPayId: string | null;
  accountName: string;
  status: string;
  referenceNumber: string;
  certificate50TwiUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string | null;
  badgeText: string | null;
  ctaText: string;
  ctaLink: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface PromoItem {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  sponsoredBy: string;
  createdAt: string;
}

export interface RefundItem {
  id: string;
  orderId: string;
  refundType: string;
  amount: number;
  reason: string;
  restockedUnits: number;
  voidedRoyalty: number;
  createdAt: string;
}

export interface AdminDashboardClientProps {
  initialOrders: OrderItem[];
  initialArtworks: ArtworkModerationItem[];
  initialSuppliers: SupplierItem[];
  initialFinancialAccounts: FinancialAccountItem[];
  initialCommissionRules: CommissionRuleItem[];
  initialUsers: UserItem[];
  initialAuditLogs: AuditLogItem[];
  totalRoyaltyPool: number;
  initialPayouts?: PayoutItem[];
  initialBanners?: BannerItem[];
  initialPromos?: PromoItem[];
  initialRefunds?: RefundItem[];
  initialAnalytics?: AnalyticsSummary | null;
}

export function AdminDashboardClient({
  initialOrders,
  initialArtworks,
  initialSuppliers,
  initialFinancialAccounts,
  initialCommissionRules,
  initialUsers,
  initialAuditLogs,
  totalRoyaltyPool,
  initialPayouts = [],
  initialBanners = [],
  initialPromos = [],
  initialRefunds = [],
  initialAnalytics = null,
}: AdminDashboardClientProps) {
  // Primary State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [artworks, setArtworks] = useState<ArtworkModerationItem[]>(initialArtworks);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers);
  const [financialAccounts] = useState<FinancialAccountItem[]>(initialFinancialAccounts);
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(initialAuditLogs);
  const [payouts, setPayouts] = useState<PayoutItem[]>(initialPayouts);
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);
  const [promos, setPromos] = useState<PromoItem[]>(initialPromos);

  // Status & Flash Messages
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [artworkStatusFilter, setArtworkStatusFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Stock edit buffer
  const [stockDrafts, setStockDrafts] = useState<{ [variantId: string]: number }>({});

  // --- Modals ---
  // Pillar A Modals
  const [rerouteOrder, setRerouteOrder] = useState<OrderItem | null>(null);
  const [targetSupplierId, setTargetSupplierId] = useState<string>('');
  const [rerouteReason, setRerouteReason] = useState<string>('Factory machine maintenance re-allocation');

  const [reprintOrder, setReprintOrder] = useState<OrderItem | null>(null);
  const [reprintDefectReason, setReprintDefectReason] = useState<string>('Print misalignment during DTG cure process');

  const [refundOrder, setRefundOrder] = useState<OrderItem | null>(null);
  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState<string>('Customer order cancellation request');
  const [refundRestock, setRefundRestock] = useState<boolean>(true);
  const [refundVoidRoyalty, setRefundVoidRoyalty] = useState<boolean>(true);

  // Chat Super-Visibility Inspection Modal
  const [adminChatOrder, setAdminChatOrder] = useState<OrderItem | null>(null);

  // Moderation Rejection Modal
  const [rejectionModalArtwork, setRejectionModalArtwork] = useState<ArtworkModerationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pillar B 50-Twi Viewer Modal
  const [selectedTwiPayout, setSelectedTwiPayout] = useState<PayoutItem | null>(null);

  // Pillar C Creation Modals
  const [showCreateBannerModal, setShowCreateBannerModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerBadge, setNewBannerBadge] = useState('SEASONAL DROP');
  const [newBannerCtaText, setNewBannerCtaText] = useState('Explore Collection');

  // Pillar C Edit Banner Modal
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [editBannerTitle, setEditBannerTitle] = useState('');
  const [editBannerSubtitle, setEditBannerSubtitle] = useState('');
  const [editBannerBadge, setEditBannerBadge] = useState('');
  const [editBannerCtaText, setEditBannerCtaText] = useState('');
  const [editBannerCtaLink, setEditBannerCtaLink] = useState('');
  const [editBannerBgColor, setEditBannerBgColor] = useState('#111111');
  const [editBannerTextColor, setEditBannerTextColor] = useState('#ffffff');
  const [editBannerPriority, setEditBannerPriority] = useState(1);
  const [editBannerIsActive, setEditBannerIsActive] = useState(true);

  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [newPromoValue, setNewPromoValue] = useState(50);
  const [newPromoMinOrder, setNewPromoMinOrder] = useState(300);

  // Reconciliation Report Banner State
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(null), 6000);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // --- Handlers: Pillar A ---

  // Order Status update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoadingAction(`order-${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order status');

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showFeedback(`Order status updated to ${newStatus}`);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // Factory Re-routing
  const handleConfirmReroute = async () => {
    if (!rerouteOrder || !targetSupplierId) return;
    setLoadingAction(`reroute-${rerouteOrder.id}`);
    try {
      const res = await fetch(`/api/admin/orders/${rerouteOrder.id}/re-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newSupplierId: targetSupplierId,
          reason: rerouteReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to re-route order');

      const targetSup = suppliers.find((s) => s.id === targetSupplierId);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === rerouteOrder.id
            ? { ...o, supplierId: targetSupplierId, supplierName: targetSup?.companyName || o.supplierName }
            : o
        )
      );
      showFeedback(data.message || 'Order transferred to new factory successfully');
      setRerouteOrder(null);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // QA Defect Free Reprint
  const handleConfirmReprint = async () => {
    if (!reprintOrder) return;
    setLoadingAction(`reprint-${reprintOrder.id}`);
    try {
      const res = await fetch(`/api/admin/orders/${reprintOrder.id}/reprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defectReason: reprintDefectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch reprint');

      setOrders((prev) =>
        prev.map((o) => (o.id === reprintOrder.id ? { ...o, status: 'IN_PRODUCTION' } : o))
      );
      showFeedback(data.message || 'Free replacement garment dispatched to production queue');
      setReprintOrder(null);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // Dispute & Refund Resolution
  const handleConfirmRefund = async () => {
    if (!refundOrder) return;
    setLoadingAction(`refund-${refundOrder.id}`);
    try {
      const res = await fetch(`/api/admin/orders/${refundOrder.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundType,
          amount: refundAmount || refundOrder.totalAmount,
          reason: refundReason,
          restockGarment: refundRestock,
          voidRoyalty: refundVoidRoyalty,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process refund');

      if (refundType === 'FULL') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === refundOrder.id ? { ...o, status: 'CANCELLED', paymentStatus: 'REFUNDED' } : o
          )
        );
      }
      showFeedback(data.message || 'Refund successfully processed');
      setRefundOrder(null);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Handlers: Pillar B (Financials & Payouts) ---

  const handleUpdatePayoutStatus = async (
    payoutId: string,
    action: 'APPROVE' | 'MARK_PAID' | 'REJECT'
  ) => {
    setLoadingAction(`payout-${payoutId}`);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update payout');

      setPayouts((prev) =>
        prev.map((p) =>
          p.id === payoutId
            ? {
                ...p,
                status: action === 'MARK_PAID' ? 'PAID' : action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                paidAt: action === 'MARK_PAID' ? new Date().toISOString() : p.paidAt,
                certificate50TwiUrl:
                  action === 'MARK_PAID' ? `50TWI-202610-${p.referenceNumber}` : p.certificate50TwiUrl,
              }
            : p
        )
      );
      showFeedback(data.message || `Payout request status changed to ${action}`);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRunReconciliationAudit = async () => {
    setLoadingAction('audit-run');
    try {
      const res = await fetch('/api/admin/reconciliation/audit', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reconciliation audit failed');
      setReconciliationResult(data);
      showFeedback(
        data.balanced
          ? `Zero-Sum Audit Verified! Total Debits ฿${data.totalDebits} == Credits ฿${data.totalCredits}`
          : 'Discrepancy detected in ledger accounts'
      );
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Handlers: Pillar C (CMS & Promos) ---

  const handleCreateBanner = async () => {
    if (!newBannerTitle.trim()) return;
    setLoadingAction('create-banner');
    try {
      const res = await fetch('/api/admin/cms/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBannerTitle,
          subtitle: newBannerSubtitle,
          badgeText: newBannerBadge,
          ctaText: newBannerCtaText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create banner');

      setBanners((prev) => [data.banner, ...prev]);
      showFeedback(`Hero Banner "${newBannerTitle}" published live to Marketplace`);
      setShowCreateBannerModal(false);
      setNewBannerTitle('');
      setNewBannerSubtitle('');
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleOpenEditBannerModal = (b: BannerItem) => {
    setEditingBanner(b);
    setEditBannerTitle(b.title);
    setEditBannerSubtitle(b.subtitle || '');
    setEditBannerBadge(b.badgeText || '');
    setEditBannerCtaText(b.ctaText);
    setEditBannerCtaLink(b.ctaLink);
    setEditBannerBgColor(b.bgColor || '#111111');
    setEditBannerTextColor(b.textColor || '#ffffff');
    setEditBannerPriority(b.priority);
    setEditBannerIsActive(b.isActive);
  };

  const handleSaveEditedBanner = async () => {
    if (!editingBanner || !editBannerTitle.trim()) return;
    setLoadingAction(`edit-banner-${editingBanner.id}`);
    try {
      const res = await fetch(`/api/admin/cms/banners/${editingBanner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editBannerTitle,
          subtitle: editBannerSubtitle,
          badgeText: editBannerBadge,
          ctaText: editBannerCtaText,
          ctaLink: editBannerCtaLink,
          bgColor: editBannerBgColor,
          textColor: editBannerTextColor,
          priority: Number(editBannerPriority),
          isActive: editBannerIsActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update banner');

      setBanners((prev) =>
        prev.map((b) => (b.id === editingBanner.id ? data.banner : b))
      );
      showFeedback(`Banner "${editBannerTitle}" updated successfully`);
      setEditingBanner(null);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleBanner = async (bannerId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/cms/banners/${bannerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setBanners((prev) =>
          prev.map((b) => (b.id === bannerId ? { ...b, isActive: !currentActive } : b))
        );
        showFeedback(`Banner status toggled to ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`);
      }
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    try {
      const res = await fetch(`/api/admin/cms/banners/${bannerId}`, { method: 'DELETE' });
      if (res.ok) {
        setBanners((prev) => prev.filter((b) => b.id !== bannerId));
        showFeedback('Banner removed from database');
      }
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromoCode.trim()) return;
    setLoadingAction('create-promo');
    try {
      const res = await fetch('/api/admin/cms/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newPromoCode,
          discountType: newPromoType,
          discountValue: Number(newPromoValue),
          minOrderAmount: Number(newPromoMinOrder),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create promo code');

      setPromos((prev) => [data.promo, ...prev]);
      showFeedback(`Promo code "${newPromoCode.toUpperCase()}" active now`);
      setShowCreatePromoModal(false);
      setNewPromoCode('');
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTogglePromo = async (promoId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/cms/promos/${promoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setPromos((prev) =>
          prev.map((p) => (p.id === promoId ? { ...p, isActive: !currentActive } : p))
        );
        showFeedback(`Promo status toggled to ${!currentActive ? 'ACTIVE' : 'DISABLED'}`);
      }
    } catch (err: any) {
      showFeedback(err.message, true);
    }
  };

  // --- Handlers: Inventory, Moderation & Users ---

  const handleSaveStock = async (variantId: string) => {
    const newStock = stockDrafts[variantId];
    if (newStock === undefined) return;
    setLoadingAction(`stock-${variantId}`);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          stock: newStock,
          reason: 'Manual stock override via Admin Control Center',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update inventory');

      setSuppliers((prev) =>
        prev.map((sup) => ({
          ...sup,
          products: sup.products.map((p) => ({
            ...p,
            variants: p.variants.map((v) =>
              v.id === variantId ? { ...v, stock: newStock } : v
            ),
          })),
        }))
      );
      setStockDrafts((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
      showFeedback(`Variant stock updated to ${newStock} units`);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleModerateArtwork = async (
    artworkId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string
  ) => {
    setLoadingAction(`art-${artworkId}`);
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Moderation action failed');

      setArtworks((prev) =>
        prev.map((a) =>
          a.id === artworkId
            ? {
                ...a,
                moderationStatus: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                status: action === 'APPROVE' ? 'PUBLISHED' : 'DRAFT',
                moderationReason: reason || null,
              }
            : a
        )
      );
      showFeedback(action === 'APPROVE' ? 'Artwork approved and published live' : 'Artwork rejected with notification');
      setRejectionModalArtwork(null);
      setRejectionReason('');
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setLoadingAction(`user-${userId}`);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user role');

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showFeedback(`User role changed to ${newRole}`);
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- Computed Metrics ---
  const totalGMV = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);
  const activeOrdersCount = useMemo(
    () => orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
    [orders]
  );
  const pendingModerationCount = useMemo(
    () => artworks.filter((a) => a.moderationStatus === 'PENDING').length,
    [artworks]
  );
  const pendingPayoutCount = useMemo(
    () => payouts.filter((p) => p.status === 'PENDING').length,
    [payouts]
  );

  const totalVariantStats = useMemo(() => {
    let inStock = 0;
    let outOfStock = 0;
    let lowStock = 0;
    suppliers.forEach((s) => {
      s.products.forEach((p) => {
        p.variants.forEach((v) => {
          if (v.stock <= 0) outOfStock++;
          else if (v.stock <= 10) lowStock++;
          else inStock++;
        });
      });
    });
    return { inStock, outOfStock, lowStock, total: inStock + outOfStock + lowStock };
  }, [suppliers]);

  // SLA Calculator helper: returns status badge
  const getSlaBadge = (createdAtStr: string, status: string) => {
    if (['DELIVERED', 'CANCELLED'].includes(status)) return null;
    const diffHours = (Date.now() - new Date(createdAtStr).getTime()) / (1000 * 60 * 60);
    if (diffHours > 72) {
      return (
        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
          SLA RISK ({Math.round(diffHours)}h)
        </span>
      );
    }
    return (
      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
        ON TRACK ({Math.round(diffHours)}h)
      </span>
    );
  };

  // Filtered lists
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(orderSearch.toLowerCase());
      const matchesStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredArtworks = useMemo(() => {
    return artworks.filter((a) => {
      return artworkStatusFilter === 'ALL' || a.moderationStatus === artworkStatusFilter;
    });
  }, [artworks, artworkStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(userSearch.toLowerCase()));
      const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      return (
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.entityType.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.payload.toLowerCase().includes(auditSearch.toLowerCase())
      );
    });
  }, [auditLogs, auditSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Toast Feedback */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-mono rounded flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-mono rounded flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button onClick={() => setActionErrorMsg(null)} className="text-red-700 hover:text-red-900">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-borderCol pb-6">
        <div>
          <div className="flex items-center space-x-2 font-mono text-xs uppercase tracking-widest text-mutedGray mb-1">
            <ShieldAlert className="w-4 h-4 text-warm" />
            <span>APE-PAREL // ENTERPRISE CONTROL CENTER</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-600 font-bold">ALL PILLARS ACTIVE</span>
          </div>
          <h1 className="text-3xl font-black font-sans tracking-tight text-ink">
            Administrator Operations
          </h1>
          <p className="text-xs text-mutedGray font-mono mt-1">
            Full-spectrum governance: Advanced Order Re-routing, Free QA Reprints, Creator Payouts (3% WHT), Marketplace CMS Banners & Promos.
          </p>
        </div>

        {/* Global Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('payouts')}
            className="px-3 py-1.5 bg-paper-light hover:bg-paper-dark border border-borderCol rounded font-mono text-xs text-ink flex items-center space-x-1.5 transition-colors relative"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payouts</span>
            {pendingPayoutCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cms')}
            className="px-3 py-1.5 bg-paper-light hover:bg-paper-dark border border-borderCol rounded font-mono text-xs text-ink flex items-center space-x-1.5 transition-colors"
          >
            <Monitor className="w-3.5 h-3.5 text-warm" />
            <span>CMS Banners</span>
          </button>
          <Link
            href="/marketplace"
            target="_blank"
            className="px-3 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold flex items-center space-x-1 hover:bg-ink/90 transition-colors"
          >
            <span>Marketplace</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary Workflow Navigation & Categorized Tools */}
      <AdminWorkflowNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        stats={{
          ordersCount: orders.length,
          pendingPayoutCount,
          bannersCount: banners.length,
          variantsCount: totalVariantStats.total,
          pendingModerationCount,
          usersCount: users.length,
          auditLogsCount: auditLogs.length,
        }}
      />

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
                Gross Merchandise Value
              </span>
              <span className="text-2xl font-mono font-bold text-ink">
                ฿{totalGMV.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-emerald-600 block mt-1">
                ✓ Reconciled Zero-Sum
              </span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
                Active Royalty Pool
              </span>
              <span className="text-2xl font-mono font-bold text-warm-dark">
                ฿{totalRoyaltyPool.toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-mutedGray block mt-1">
                Escrow holdings for creators
              </span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
                Pending Creator Payouts
              </span>
              <span className="text-2xl font-mono font-bold text-emerald-700">
                {pendingPayoutCount} <span className="text-xs font-normal text-mutedGray">requests</span>
              </span>
              <span className="text-[10px] font-mono text-mutedGray block mt-1">
                Subject to 3% Withholding Tax
              </span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
              <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
                Active Storefront Banners
              </span>
              <span className="text-2xl font-mono font-bold text-ink">
                {banners.filter((b) => b.isActive).length} <span className="text-xs font-normal text-mutedGray">active</span>
              </span>
              <span className="text-[10px] font-mono text-warm block mt-1">
                Live on /marketplace
              </span>
            </div>
          </div>

          {/* 4 Core Operational Workflow Hubs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-ink flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-warm" />
                <span>4 Core Operational Workflows (ศูนย์ปฏิบัติการหลัก 4 เวิร์กโฟลว์)</span>
              </h2>
              <span className="text-[11px] font-mono text-mutedGray">
                คลิกที่การ์ดหรือปุ่มเพื่อเข้าสู่เวิร์กโฟลว์
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Workflow 1: Fulfillment & Operations */}
              <div className="bg-paper-light border border-borderCol rounded-xl p-4 shadow-2xs hover:border-blue-600 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold uppercase">
                      {orders.length} ออเดอร์
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">1. Fulfillment & Operations</h3>
                    <p className="text-[11px] text-mutedGray mt-0.5 font-sans leading-relaxed">
                      การจัดการออเดอร์ จัดสรรโรงงานผลิต ตรวจสอบ SLA พิมพ์ซ้ำ QA และสต็อกเสื้อเปล่า
                    </p>
                  </div>
                  <div className="bg-paper p-2 rounded-lg border border-borderCol/60 text-[10px] font-mono text-mutedGray space-y-1">
                    <div className="text-ink font-bold">Standard SOP:</div>
                    <div className="flex items-center space-x-1">
                      <span>รับคำสั่งซื้อ</span>
                      <span>&rarr;</span>
                      <span>ส่งโรงงาน</span>
                      <span>&rarr;</span>
                      <span>ติดตาม SLA</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-borderCol/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>จัดการคำสั่งซื้อ (Orders & SLA)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('inventory')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>คลังสต็อกเสื้อ (Inventory)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href="/admin/suppliers"
                    className="w-full py-1.5 px-2.5 bg-warm/20 hover:bg-ink hover:text-paper text-ink border border-warm/60 rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center space-x-1.5">
                      <Factory className="w-3.5 h-3.5" />
                      <span>คิวตรวจโรงงาน (Supplier KYB)</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Workflow 2: Trust, Safety & Community */}
              <div className="bg-paper-light border border-borderCol rounded-xl p-4 shadow-2xs hover:border-purple-600 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    {pendingModerationCount > 0 ? (
                      <span className="text-[9px] font-mono bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                        {pendingModerationCount} รอตรวจ
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold uppercase">
                        ปลอดภัย 100%
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">2. Trust & Community</h3>
                    <p className="text-[11px] text-mutedGray mt-0.5 font-sans leading-relaxed">
                      ตรวจสอบความละเอียดลายพิมพ์ ลิขสิทธิ์ ดักจับแชตดีลนอกระบบ แบนเนอร์ และสมาชิก
                    </p>
                  </div>
                  <div className="bg-paper p-2 rounded-lg border border-borderCol/60 text-[10px] font-mono text-mutedGray space-y-1">
                    <div className="text-ink font-bold">Standard SOP:</div>
                    <div className="flex items-center space-x-1">
                      <span>ตรวจไฟล์ DPI</span>
                      <span>&rarr;</span>
                      <span>อนุมัติขึ้นมาร์เก็ต</span>
                      <span>&rarr;</span>
                      <span>ดักจับโกง</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-borderCol/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('moderation')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>ตรวจลายพิมพ์ (IP Moderation)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat-audit')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>ดักจับแชตโกง (Anti-Fraud)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Workflow 3: Finance, Tax & Settlements */}
              <div className="bg-paper-light border border-borderCol rounded-xl p-4 shadow-2xs hover:border-emerald-600 transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    {pendingPayoutCount > 0 ? (
                      <span className="text-[9px] font-mono bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                        {pendingPayoutCount} รออนุมัติ
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
                        เรียบร้อย
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">3. Finance & Compliance</h3>
                    <p className="text-[11px] text-mutedGray mt-0.5 font-sans leading-relaxed">
                      อนุมัติการเบิกจ่ายครีเอเตอร์ หักภาษี ณ ที่จ่าย 3% สรุปรายการบัญชี และบันทึกแยกประเภทคู่
                    </p>
                  </div>
                  <div className="bg-paper p-2 rounded-lg border border-borderCol/60 text-[10px] font-mono text-mutedGray space-y-1">
                    <div className="text-ink font-bold">Standard SOP:</div>
                    <div className="flex items-center space-x-1">
                      <span>ขอถอนเงิน</span>
                      <span>&rarr;</span>
                      <span>หักภาษี 3%</span>
                      <span>&rarr;</span>
                      <span>สรุปยอดภาษี</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-borderCol/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('payouts')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>เบิกจ่าย & รายการหักภาษี (Payouts)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('financials')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>บัญชีแยกประเภท (Ledger)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Workflow 4: System, IAM & Intelligence */}
              <div className="bg-paper-light border border-borderCol rounded-xl p-4 shadow-2xs hover:border-warm transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-warm/20 text-warm-dark flex items-center justify-center font-bold">
                      <BarChart3 className="w-4 h-4 text-warm" />
                    </div>
                    <span className="text-[9px] font-mono bg-warm/20 text-warm-dark px-2 py-0.5 rounded-full font-bold uppercase">
                      Live Pulse
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-sm">4. System & Governance</h3>
                    <p className="text-[11px] text-mutedGray mt-0.5 font-sans leading-relaxed">
                      วิเคราะห์สถิติผู้เข้าชมแบบเรียลไทม์ จัดการสิทธิ์ IAM ผู้ใช้งาน และบันทึกประวัติ Audit Trail
                    </p>
                  </div>
                  <div className="bg-paper p-2 rounded-lg border border-borderCol/60 text-[10px] font-mono text-mutedGray space-y-1">
                    <div className="text-ink font-bold">Standard SOP:</div>
                    <div className="flex items-center space-x-1">
                      <span>วิเคราะห์สถิติ</span>
                      <span>&rarr;</span>
                      <span>ควบคุมสิทธิ์ RBAC</span>
                      <span>&rarr;</span>
                      <span>ตรวจสอบ Audit</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-borderCol/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('analytics')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>สถิติผู้เข้าชม (Analytics)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="w-full py-1.5 px-2.5 bg-paper hover:bg-ink hover:text-paper text-ink border border-borderCol rounded font-mono text-xs font-semibold flex items-center justify-between transition-colors"
                  >
                    <span>จัดการผู้ใช้ (Users & IAM)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ORDERS MANAGEMENT & PILLAR A ACTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-paper-light p-3 border border-borderCol rounded-lg">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-mutedGray" />
              <input
                type="text"
                placeholder="Search order #, customer, or supplier..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-paper border border-borderCol rounded px-3 py-1.5 text-xs font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-mutedGray uppercase">Filter Status:</span>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-paper border border-borderCol rounded px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none"
              >
                <option value="ALL">All Statuses ({orders.length})</option>
                <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                <option value="QA">QA</option>
                <option value="QA_PASSED">QA_PASSED</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderCol text-left font-sans">
                <thead className="bg-paper-dark font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Garment & Specs</th>
                    <th className="px-4 py-3">Assigned Supplier</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Production & SLA</th>
                    <th className="px-4 py-3 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol text-xs font-sans">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-mutedGray font-mono text-xs">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-paper-dark/30 transition-colors">
                        <td className="px-4 py-3 font-mono">
                          <Link
                            href={`/account/orders/${o.orderNumber}`}
                            className="font-bold text-ink hover:underline flex items-center space-x-1"
                          >
                            <span>{o.orderNumber}</span>
                            <ExternalLink className="w-3 h-3 text-mutedGray" />
                          </Link>
                          <span className="text-[10px] text-mutedGray block">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{o.customerName}</div>
                          <div className="text-mutedGray font-mono text-[10px]">{o.customerEmail}</div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{o.garmentName}</div>
                          <div className="flex items-center space-x-2 text-[10px] font-mono text-mutedGray mt-0.5">
                            <span
                              className="w-3 h-3 rounded-full border border-borderCol shrink-0"
                              style={{ backgroundColor: o.garmentColor }}
                            />
                            <span>Size: <strong>{o.garmentSize}</strong></span>
                            <span>Qty: <strong>{o.quantity}</strong></span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs text-ink">
                          <div className="font-medium">{o.supplierName}</div>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <div className="text-ink font-bold text-sm">
                            ฿{o.totalAmount.toLocaleString()}
                          </div>
                          <div className="text-[9px] text-mutedGray">
                            G:฿{o.garmentCost} P:฿{o.printingCost} L:฿{o.licensingCost}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono space-y-1">
                          <div>
                            <span
                              className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold border ${
                                o.status === 'DELIVERED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : o.status === 'CANCELLED'
                                  ? 'bg-red-50 text-red-700 border-red-300'
                                  : 'bg-warm/20 text-warm-dark border-warm/40'
                              }`}
                            >
                              {o.status}
                            </span>
                          </div>
                          <div>{getSlaBadge(o.createdAt, o.status)}</div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                            {/* Status Selector */}
                            {o.status !== 'CANCELLED' && (
                              <select
                                value={o.status}
                                disabled={loadingAction === `order-${o.id}`}
                                onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                                className="font-mono text-[10px] bg-paper border border-borderCol rounded px-2 py-1 text-ink focus:outline-none"
                              >
                                <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                                <option value="IN_PRODUCTION">IN_PRODUCTION</option>
                                <option value="QA">QA</option>
                                <option value="QA_PASSED">QA_PASSED</option>
                                <option value="SHIPPED">SHIPPED</option>
                                <option value="DELIVERED">DELIVERED</option>
                              </select>
                            )}

                            {/* Re-route Factory Button */}
                            {['PAYMENT_CONFIRMED', 'IN_PRODUCTION'].includes(o.status) && (
                              <button
                                onClick={() => {
                                  setRerouteOrder(o);
                                  const other = suppliers.find((s) => s.id !== o.supplierId);
                                  setTargetSupplierId(other ? other.id : '');
                                }}
                                title="Re-route to another factory"
                                className="p-1 text-ink hover:bg-paper-dark rounded border border-borderCol transition-colors"
                              >
                                <Repeat className="w-3.5 h-3.5 text-warm-dark" />
                              </button>
                            )}

                            {/* QA Reprint Button */}
                            {['IN_PRODUCTION', 'QA', 'QA_PASSED'].includes(o.status) && (
                              <button
                                onClick={() => setReprintOrder(o)}
                                title="Trigger Free QA Reprint"
                                className="p-1 text-ink hover:bg-paper-dark rounded border border-borderCol transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                            )}

                            {/* Super-visibility Chat Inspection Button */}
                            <button
                              onClick={() => setAdminChatOrder(o)}
                              title="ตรวจสอบแชทคำสั่งซื้อ (Super-visibility Order Chat)"
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded border border-amber-200 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            </button>

                            {/* Refund Button */}
                            {o.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  setRefundOrder(o);
                                  setRefundAmount(o.totalAmount);
                                }}
                                title="Dispute & Refund Resolution"
                                className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PILLAR B - CREATOR PAYOUTS & ROYALTY TAX SETTLEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Payout Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-paper-light border border-borderCol p-4 rounded-lg">
              <span className="text-[10px] font-mono uppercase text-mutedGray block mb-1">
                Pending Requests
              </span>
              <span className="text-2xl font-mono font-bold text-ink">{pendingPayoutCount}</span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg">
              <span className="text-[10px] font-mono uppercase text-mutedGray block mb-1">
                Pending Net Disbursement
              </span>
              <span className="text-2xl font-mono font-bold text-warm-dark">
                ฿{payouts.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + p.netAmount, 0).toLocaleString()}
              </span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg">
              <span className="text-[10px] font-mono uppercase text-mutedGray block mb-1">
                Total 3% WHT Withheld
              </span>
              <span className="text-2xl font-mono font-bold text-ink">
                ฿{payouts.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.withholdingTaxAmount, 0).toLocaleString()}
              </span>
              <span className="text-[10px] font-mono text-mutedGray block mt-0.5">
                Thai Revenue Code 40(3)
              </span>
            </div>

            <div className="bg-paper-light border border-borderCol p-4 rounded-lg flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-mutedGray block mb-1">
                  Batch Bank Actions
                </span>
                <span className="text-xs font-mono text-ink font-bold">PromptPay / Corporate CSV</span>
              </div>
              <a
                href="/api/admin/payouts/batch-export"
                download
                className="mt-2 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/90 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Batch (.csv)</span>
              </a>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="bg-paper-dark px-4 py-3 border-b border-borderCol flex items-center justify-between">
              <h2 className="text-sm font-bold font-sans text-ink">Creator Royalty Payout Queue</h2>
              <span className="text-xs font-mono text-mutedGray">{payouts.length} Total Requests</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderCol text-left font-mono text-xs">
                <thead className="bg-paper-light text-[10px] uppercase text-mutedGray tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Reference #</th>
                    <th className="px-4 py-3">Creator</th>
                    <th className="px-4 py-3">Disbursement Account</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">3% WHT</th>
                    <th className="px-4 py-3">Net Payout</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Settlement Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-mutedGray text-xs">
                        No creator payout requests recorded.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-paper-dark/30 transition-colors">
                        <td className="px-4 py-3 font-bold text-ink">
                          <span>{p.referenceNumber}</span>
                          <span className="text-[10px] text-mutedGray block font-normal">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-sans">
                          <div className="font-bold text-ink">{p.creatorName}</div>
                          <div className="text-[10px] font-mono text-mutedGray">@{p.creatorSlug}</div>
                        </td>

                        <td className="px-4 py-3 text-[11px]">
                          <div className="text-ink font-semibold">{p.accountName}</div>
                          <div className="text-mutedGray text-[10px]">
                            {p.promptPayId ? `PromptPay: ${p.promptPayId}` : `${p.bankName} - ${p.bankAccountNumber}`}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-bold text-ink">฿{p.grossAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-700 font-semibold">-฿{p.withholdingTaxAmount}</td>
                        <td className="px-4 py-3 font-bold text-emerald-800 text-sm">
                          ฿{p.netAmount.toLocaleString()}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : p.status === 'APPROVED'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : p.status === 'REJECTED'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {p.status === 'PENDING' && (
                              <button
                                disabled={loadingAction === `payout-${p.id}`}
                                onClick={() => handleUpdatePayoutStatus(p.id, 'APPROVE')}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px]"
                              >
                                Approve
                              </button>
                            )}

                            {['PENDING', 'APPROVED'].includes(p.status) && (
                              <button
                                disabled={loadingAction === `payout-${p.id}`}
                                onClick={() => handleUpdatePayoutStatus(p.id, 'MARK_PAID')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                              >
                                Mark Paid &amp; Statement
                              </button>
                            )}

                            {p.status === 'PAID' && (
                              <button
                                onClick={() => setSelectedTwiPayout(p)}
                                className="px-2 py-1 bg-paper border border-borderCol text-ink hover:bg-paper-dark rounded text-[10px] font-bold flex items-center space-x-1"
                              >
                                <FileText className="w-3 h-3 text-warm" />
                                <span>View Statement</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PILLAR C - MARKETPLACE CMS & PROMOS */}
      {/* ========================================================================= */}
      {activeTab === 'cms' && (
        <div className="space-y-6">
          {/* Banners Section */}
          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="bg-paper-dark px-4 py-3 border-b border-borderCol flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-sans text-ink">Storefront Hero Campaign Banners</h2>
                <p className="text-[10px] font-mono text-mutedGray">
                  Active banners dynamically render on the top of /marketplace in real-time.
                </p>
              </div>
              <button
                onClick={() => setShowCreateBannerModal(true)}
                className="px-3 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold flex items-center space-x-1.5 hover:bg-ink/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Banner</span>
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="p-4 bg-paper border border-borderCol rounded-lg flex flex-col justify-between"
                  style={{ backgroundColor: b.bgColor, color: b.textColor }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-warm/20 text-warm font-bold border border-warm/40">
                        {b.badgeText || 'CAMPAIGN'}
                      </span>
                      <span
                        className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          b.isActive ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-200'
                        }`}
                      >
                        {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <h3 className="font-black font-sans text-lg leading-tight mb-1">{b.title}</h3>
                    {b.subtitle && <p className="text-xs opacity-80 font-sans mb-3">{b.subtitle}</p>}
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-mono opacity-70">
                      CTA: {b.ctaText} &rarr; {b.ctaLink}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEditBannerModal(b)}
                        className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 transition-colors flex items-center space-x-1"
                        title="Edit Banner"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleToggleBanner(b.id, b.isActive)}
                        className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {b.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(b.id)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Codes Section */}
          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="bg-paper-dark px-4 py-3 border-b border-borderCol flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-sans text-ink">Promotional Coupon Codes</h2>
                <p className="text-[10px] font-mono text-mutedGray">
                  Discount codes applicable at checkout with minimum order threshold and maximum usage caps.
                </p>
              </div>
              <button
                onClick={() => setShowCreatePromoModal(true)}
                className="px-3 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold flex items-center space-x-1.5 hover:bg-ink/90 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Promo Code</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderCol text-left font-mono text-xs">
                <thead className="bg-paper-light text-[10px] uppercase text-mutedGray tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Min Order</th>
                    <th className="px-4 py-3">Usage</th>
                    <th className="px-4 py-3">Sponsor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol">
                  {promos.map((p) => (
                    <tr key={p.id} className="hover:bg-paper-dark/30">
                      <td className="px-4 py-3 font-bold text-ink">
                        <span className="px-2 py-0.5 bg-paper rounded border border-borderCol">
                          {p.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-800">
                        {p.discountType === 'FIXED' ? `฿${p.discountValue}` : `${p.discountValue}% OFF`}
                      </td>
                      <td className="px-4 py-3 text-mutedGray">฿{p.minOrderAmount}</td>
                      <td className="px-4 py-3 text-mutedGray">
                        {p.usedCount} / {p.maxUses}
                      </td>
                      <td className="px-4 py-3 text-[10px]">{p.sponsoredBy}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {p.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleTogglePromo(p.id, p.isActive)}
                          className="px-2 py-1 bg-paper border border-borderCol rounded text-[10px] font-bold hover:bg-paper-dark"
                        >
                          {p.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INVENTORY MATRIX & EMERGENCY OVERRIDE */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-paper-light p-3 border border-borderCol rounded-lg">
            <div className="flex items-center space-x-3">
              <Warehouse className="w-4 h-4 text-warm shrink-0" />
              <span className="text-xs font-mono font-bold text-ink uppercase">Select Supplier:</span>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="bg-paper border border-borderCol rounded px-3 py-1.5 text-xs font-mono text-ink focus:outline-none"
              >
                <option value="ALL">All Suppliers ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono text-mutedGray">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>In Stock (&gt;10)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Low Stock (&le;10)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Out of Stock (0)</span>
              </div>
            </div>
          </div>

          {suppliers
            .filter((s) => selectedSupplierId === 'ALL' || s.id === selectedSupplierId)
            .map((sup) => (
              <div key={sup.id} className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
                <div className="bg-paper-dark px-4 py-3 border-b border-borderCol flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold font-sans text-ink">{sup.companyName}</h2>
                    <span className="text-[10px] font-mono text-mutedGray">
                      {sup.location} • Lead Time: {sup.leadTimeDays} days • {sup.contactEmail}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-mutedGray">
                    {sup.products.length} Products Catalogued
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  {sup.products.map((prod) => (
                    <div key={prod.id} className="border border-borderCol rounded-lg overflow-hidden bg-paper">
                      <div className="p-3 bg-paper-dark/40 border-b border-borderCol flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-ink font-sans">{prod.name}</span>
                          <span className="text-[10px] font-mono text-mutedGray ml-2">
                            SKU: {prod.sku} • {prod.fabric} ({prod.weightGsm} GSM) • Fit: {prod.fit}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold text-ink">Base: ฿{prod.basePrice}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-borderCol text-left font-mono text-xs">
                          <thead className="bg-paper-light text-[10px] uppercase text-mutedGray tracking-wider">
                            <tr>
                              <th className="px-4 py-2">Color</th>
                              <th className="px-4 py-2">Size</th>
                              <th className="px-4 py-2">Variant SKU</th>
                              <th className="px-4 py-2">Price Adj.</th>
                              <th className="px-4 py-2">Current Stock</th>
                              <th className="px-4 py-2 text-right">Emergency Override</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-borderCol">
                            {prod.variants.map((v) => {
                              const draftVal = stockDrafts[v.id] !== undefined ? stockDrafts[v.id] : v.stock;
                              const isChanged = draftVal !== v.stock;
                              const isUpdating = loadingAction === `stock-${v.id}`;

                              return (
                                <tr key={v.id} className="hover:bg-paper-light/50">
                                  <td className="px-4 py-2 flex items-center space-x-2">
                                    <span
                                      className="w-3.5 h-3.5 rounded-full border border-borderCol shrink-0 shadow-xs"
                                      style={{ backgroundColor: v.colorHex }}
                                    />
                                    <span className="font-sans font-medium text-ink">{v.colorName}</span>
                                  </td>
                                  <td className="px-4 py-2 font-bold text-ink">{v.size}</td>
                                  <td className="px-4 py-2 text-mutedGray text-[11px]">{v.sku}</td>
                                  <td className="px-4 py-2 text-mutedGray">
                                    {v.priceAdjustment > 0 ? `+฿${v.priceAdjustment}` : '฿0'}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                        v.stock === 0
                                          ? 'bg-red-100 text-red-800 border border-red-300'
                                          : v.stock <= 10
                                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      }`}
                                    >
                                      {v.stock} units
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                      <input
                                        type="number"
                                        min={0}
                                        value={draftVal}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          setStockDrafts((prev) => ({
                                            ...prev,
                                            [v.id]: isNaN(val) ? 0 : val,
                                          }));
                                        }}
                                        className="w-20 bg-paper border border-borderCol rounded px-2 py-1 text-right text-xs font-mono text-ink focus:outline-none"
                                      />
                                      <button
                                        disabled={!isChanged || isUpdating}
                                        onClick={() => handleSaveStock(v.id)}
                                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                                          isChanged
                                            ? 'bg-ink text-paper hover:bg-ink/80'
                                            : 'bg-paper-dark text-mutedGray opacity-50 cursor-not-allowed'
                                        }`}
                                      >
                                        {isUpdating ? 'Saving...' : 'Set Stock'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: IP MODERATION */}
      {/* ========================================================================= */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-paper-light p-3 border border-borderCol rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-mutedGray uppercase">Filter Queue:</span>
              <select
                value={artworkStatusFilter}
                onChange={(e) => setArtworkStatusFilter(e.target.value)}
                className="bg-paper border border-borderCol rounded px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none"
              >
                <option value="ALL">All Submissions ({artworks.length})</option>
                <option value="PENDING">PENDING APPROVAL ({pendingModerationCount})</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <span className="text-xs font-mono text-mutedGray">{filteredArtworks.length} Designs Displayed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtworks.map((art) => (
              <div
                key={art.id}
                className="bg-paper-light border border-borderCol rounded-lg overflow-hidden p-4 flex flex-col justify-between shadow-sm hover:border-ink/40 transition-all"
              >
                <div>
                  <div className="aspect-square bg-paper-dark rounded flex items-center justify-center p-4 mb-3 relative overflow-hidden group">
                    <img
                      src={art.previewUrl}
                      alt={art.title}
                      className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 font-mono text-[9px] bg-paper/90 border border-borderCol px-1.5 py-0.5 rounded">
                      {art.dpi} DPI • {art.colorSpace}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] uppercase text-mutedGray tracking-wider">
                      {art.category}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        art.moderationStatus === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : art.moderationStatus === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}
                    >
                      {art.moderationStatus}
                    </span>
                  </div>

                  <h3 className="font-bold text-ink text-base line-clamp-1">{art.title}</h3>
                  <p className="text-xs text-mutedGray font-mono">
                    By <span className="text-ink font-semibold">{art.creatorName}</span> (@{art.creatorSlug})
                  </p>
                  <div className="text-[10px] font-mono text-mutedGray mt-2">
                    Dimensions: {art.dimensions} • Standard License: ฿{art.standardLicensePrice}
                  </div>

                  {art.moderationReason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[11px] font-mono text-red-800">
                      <strong>Reason:</strong> {art.moderationReason}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-borderCol flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-mutedGray">
                    {new Date(art.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {art.moderationStatus !== 'APPROVED' && (
                      <button
                        disabled={loadingAction === `art-${art.id}`}
                        onClick={() => handleModerateArtwork(art.id, 'APPROVE')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-mono text-xs font-bold transition-colors flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {art.moderationStatus !== 'REJECTED' && (
                      <button
                        disabled={loadingAction === `art-${art.id}`}
                        onClick={() => setRejectionModalArtwork(art)}
                        className="px-2.5 py-1 bg-paper border border-red-300 text-red-700 hover:bg-red-50 rounded font-mono text-xs font-bold transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: FINANCIAL LEDGER & RECONCILIATION */}
      {/* ========================================================================= */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="bg-paper-light border border-borderCol rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-warm" />
                <h3 className="text-sm font-bold font-sans text-ink">Zero-Sum Ledger Reconciliation Engine</h3>
              </div>
              <p className="text-xs text-mutedGray font-mono mt-1">
                Verifies mathematical equilibrium where sum(Debits) == sum(Credits) across all master financial accounts.
              </p>
            </div>
            <button
              onClick={handleRunReconciliationAudit}
              disabled={loadingAction === 'audit-run'}
              className="px-4 py-2 bg-ink text-paper rounded font-mono text-xs font-bold flex items-center space-x-2 hover:bg-ink/90 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === 'audit-run' ? 'animate-spin' : ''}`} />
              <span>Run Zero-Sum Balance Audit</span>
            </button>
          </div>

          {reconciliationResult && (
            <div
              className={`p-4 rounded-lg border font-mono text-xs ${
                reconciliationResult.balanced
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="font-bold text-sm mb-1">
                {reconciliationResult.balanced ? '✓ LEDGER FULLY BALANCED' : '⚠ DISCREPANCY DETECTED'}
              </div>
              <div>Total Debits: ฿{reconciliationResult.totalDebits?.toLocaleString()}</div>
              <div>Total Credits: ฿{reconciliationResult.totalCredits?.toLocaleString()}</div>
              <div>Total Entries Reconciled: {reconciliationResult.totalEntriesChecked}</div>
            </div>
          )}

          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="bg-paper-dark px-4 py-3 border-b border-borderCol flex items-center justify-between">
              <h2 className="text-sm font-bold font-sans text-ink">Master Financial Accounts</h2>
              <span className="text-xs font-mono text-mutedGray">{financialAccounts.length} Master Accounts</span>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {financialAccounts.map((acc) => (
                <div key={acc.id} className="p-4 bg-paper border border-borderCol rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-mutedGray mb-1">
                      <span>{acc.accountType}</span>
                      <span className="font-bold text-ink">{acc.accountNumber}</span>
                    </div>
                    <h3 className="font-bold text-ink text-sm">{acc.ownerName}</h3>
                    <div className="text-xl font-mono font-bold text-ink mt-2">
                      ฿{acc.balance.toLocaleString()} {acc.currency}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-borderCol text-[10px] font-mono text-mutedGray">
                    <span>Recent Journal Activity: {acc.recentEntries.length} entries</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: USERS & IAM */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-paper-light p-3 border border-borderCol rounded-lg">
            <div className="flex items-center space-x-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-mutedGray" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-paper border border-borderCol rounded px-3 py-1.5 text-xs font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-mutedGray uppercase">Role:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-paper border border-borderCol rounded px-2.5 py-1.5 text-xs font-mono text-ink focus:outline-none"
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPPLIER">SUPPLIER</option>
                <option value="CREATOR">CREATOR</option>
                <option value="CUSTOMER">CUSTOMER</option>
              </select>
            </div>
          </div>

          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-borderCol text-left font-sans text-xs">
                <thead className="bg-paper-dark font-mono text-[11px] uppercase tracking-wider text-mutedGray">
                  <tr>
                    <th className="px-4 py-3">User & Email</th>
                    <th className="px-4 py-3">Profile Title</th>
                    <th className="px-4 py-3">Joined Date</th>
                    <th className="px-4 py-3">Current Role</th>
                    <th className="px-4 py-3 text-right">Role Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-paper-dark/30 transition-colors">
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-ink">{u.name || 'Anonymous User'}</div>
                        <div className="text-[11px] text-mutedGray">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {u.profileTitle ? (
                          <span className="font-medium text-ink">{u.profileTitle}</span>
                        ) : (
                          <span className="text-mutedGray font-mono text-[10px]">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-mutedGray text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'ADMIN'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : u.role === 'CREATOR'
                              ? 'bg-purple-50 text-purple-800 border-purple-300'
                              : u.role === 'SUPPLIER'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <select
                          value={u.role}
                          disabled={loadingAction === `user-${u.id}`}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="bg-paper border border-borderCol rounded px-2 py-1 text-xs text-ink focus:outline-none"
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="CREATOR">CREATOR</option>
                          <option value="SUPPLIER">SUPPLIER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-paper-light p-3 border border-borderCol rounded-lg">
            <Search className="w-4 h-4 text-mutedGray" />
            <input
              type="text"
              placeholder="Search audit trail by action or payload keyword..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full bg-paper border border-borderCol rounded px-3 py-1.5 text-xs font-mono text-ink focus:outline-none"
            />
          </div>

          <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden p-4">
            <div className="space-y-3">
              {filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-paper border border-borderCol rounded font-mono text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-ink/30 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-ink px-1.5 py-0.5 bg-paper-dark rounded text-[11px]">
                        {log.action}
                      </span>
                      <span className="text-mutedGray text-[10px]">
                        {log.entityType} ({log.entityId})
                      </span>
                    </div>
                    <div className="text-[11px] text-mutedGray break-all font-mono bg-paper-dark/30 p-2 rounded max-w-2xl">
                      {log.payload}
                    </div>
                  </div>
                  <div className="text-[10px] text-mutedGray shrink-0 sm:text-right">
                    <div>{new Date(log.createdAt).toLocaleString()}</div>
                    <div className="mt-0.5">Actor: {log.actorId}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: CHAT AUDIT & ANTI-FRAUD CONTROL CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'chat-audit' && (
        <AdminChatAuditTab />
      )}

      {/* ========================================================================= */}
      {/* TAB 11: SUBSCRIBERS & SYSTEM ALERT ROUTING */}
      {/* ========================================================================= */}
      {activeTab === 'subscribers' && (
        <AdminSubscribersTab />
      )}

      {/* ========================================================================= */}
      {/* TAB 12: VISITOR ANALYTICS & TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <AdminAnalyticsTab initialSummary={initialAnalytics} />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FACTORY RE-ROUTING (Pillar A) */}
      {/* ========================================================================= */}
      {rerouteOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-warm" />
                <span>Emergency Factory Re-routing</span>
              </h3>
              <button onClick={() => setRerouteOrder(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-mutedGray font-mono">
              Transferring Order <strong>#{rerouteOrder.orderNumber}</strong> ({rerouteOrder.garmentName},{' '}
              {rerouteOrder.garmentSize}, Qty: {rerouteOrder.quantity})
            </p>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Current Assigned Supplier:
              </label>
              <div className="text-xs font-bold text-ink bg-paper-dark p-2 rounded">
                {rerouteOrder.supplierName}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Select Target Supplier:
              </label>
              <select
                value={targetSupplierId}
                onChange={(e) => setTargetSupplierId(e.target.value)}
                className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
              >
                <option value="">-- Choose Target Factory --</option>
                {suppliers
                  .filter((s) => s.id !== rerouteOrder.supplierId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName} ({s.location}) • Lead Time {s.leadTimeDays}d
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Re-routing Justification:
              </label>
              <input
                type="text"
                value={rerouteReason}
                onChange={(e) => setRerouteReason(e.target.value)}
                className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRerouteOrder(null)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Abort
              </button>
              <button
                disabled={!targetSupplierId || loadingAction === `reroute-${rerouteOrder.id}`}
                onClick={handleConfirmReroute}
                className="px-4 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/80 transition-colors disabled:opacity-50"
              >
                {loadingAction === `reroute-${rerouteOrder.id}` ? 'Transferring...' : 'Execute Re-route'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QA DEFECT FREE REPRINT (Pillar A) */}
      {/* ========================================================================= */}
      {reprintOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <span>Dispatch QA Defect Free Reprint</span>
              </h3>
              <button onClick={() => setReprintOrder(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink">
              Issuing a replacement garment for Order <strong>#{reprintOrder.orderNumber}</strong>:
            </p>
            <ul className="text-xs font-mono text-mutedGray space-y-1 list-disc list-inside">
              <li>Customer is <strong>NOT</strong> billed again (฿0 surcharge).</li>
              <li>No duplicate creator royalty obligations generated.</li>
              <li>Decrements 1 blank garment from {reprintOrder.supplierName}&apos;s inventory.</li>
              <li>Resets status to <code>IN_PRODUCTION</code> with audit record.</li>
            </ul>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Defect Diagnosis / QA Failure Reason:
              </label>
              <textarea
                rows={3}
                value={reprintDefectReason}
                onChange={(e) => setReprintDefectReason(e.target.value)}
                className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setReprintOrder(null)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!reprintDefectReason.trim() || loadingAction === `reprint-${reprintOrder.id}`}
                onClick={handleConfirmReprint}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loadingAction === `reprint-${reprintOrder.id}` ? 'Dispatching...' : 'Confirm Free Reprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DISPUTE & REFUND RESOLUTION (Pillar A) */}
      {/* ========================================================================= */}
      {refundOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-red-700 text-sm flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Dispute &amp; Refund Resolution #{refundOrder.orderNumber}</span>
              </h3>
              <button onClick={() => setRefundOrder(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setRefundType('FULL');
                  setRefundAmount(refundOrder.totalAmount);
                }}
                className={`p-2 rounded border font-bold text-center ${
                  refundType === 'FULL'
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-borderCol bg-paper text-mutedGray'
                }`}
              >
                Full Refund (฿{refundOrder.totalAmount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setRefundType('PARTIAL');
                  setRefundAmount(refundOrder.shippingCost || 40);
                }}
                className={`p-2 rounded border font-bold text-center ${
                  refundType === 'PARTIAL'
                    ? 'border-red-600 bg-red-50 text-red-800'
                    : 'border-borderCol bg-paper text-mutedGray'
                }`}
              >
                Partial Compensation
              </button>
            </div>

            {refundType === 'PARTIAL' && (
              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                  Custom Refund Amount (฿):
                </label>
                <input
                  type="number"
                  min={1}
                  max={refundOrder.totalAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Refund Reason:
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="space-y-2 text-xs font-mono text-ink">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={refundRestock}
                  onChange={(e) => setRefundRestock(e.target.checked)}
                  className="rounded text-ink"
                />
                <span>Restock {refundOrder.quantity} blank unit(s) to supplier</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={refundVoidRoyalty}
                  onChange={(e) => setRefundVoidRoyalty(e.target.checked)}
                  className="rounded text-ink"
                />
                <span>Void unremitted creator royalty obligation</span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRefundOrder(null)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Abort
              </button>
              <button
                disabled={loadingAction === `refund-${refundOrder.id}`}
                onClick={handleConfirmRefund}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-mono text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loadingAction === `refund-${refundOrder.id}` ? 'Processing...' : 'Execute Refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ROYALTY SETTLEMENT STATEMENT VIEWER (Pillar B) */}
      {/* ========================================================================= */}
      {selectedTwiPayout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-warm" />
                <span className="font-bold text-ink text-sm">
                  ใบสรุปยอดการจ่ายเงินค่าลิขสิทธิ์และรายการหักภาษี (Royalty Settlement Statement)
                </span>
              </div>
              <button onClick={() => setSelectedTwiPayout(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-paper-light border border-borderCol rounded space-y-3">
              <div className="flex justify-between border-b border-borderCol/60 pb-2 text-[10px] text-mutedGray">
                <span>บันทึกการจ่ายค่าลิขสิทธิ์ // APE-PAREL Settlement</span>
                <span>เลขที่อ้างอิง: {selectedTwiPayout.certificate50TwiUrl || `REF-PAYOUT-${selectedTwiPayout.referenceNumber}`}</span>
              </div>

              <div>
                <span className="text-[10px] text-mutedGray uppercase block">ผู้ดำเนินการจ่ายเงิน (Platform Disbursing Agent):</span>
                <span className="font-bold text-ink">APE-PAREL Platform Settlement Services</span>
                <span className="text-[10px] text-mutedGray block">ระบบตัวกลางเชื่อมต่อธุรกรรมและบัญชีค่าลิขสิทธิ์</span>
              </div>

              <div>
                <span className="text-[10px] text-mutedGray uppercase block">ผู้ถูกหักภาษี ณ ที่จ่าย (ครีเอเตอร์):</span>
                <span className="font-bold text-ink">{selectedTwiPayout.accountName}</span>
                <span className="text-[10px] text-mutedGray block">
                  PromptPay / เลขบัญชี: {selectedTwiPayout.promptPayId || selectedTwiPayout.bankAccountNumber || 'N/A'}
                </span>
              </div>

              <div className="pt-2 border-t border-borderCol/60">
                <table className="min-w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-mutedGray text-[9px] uppercase">
                      <th>ประเภทเงินได้พึงประเมิน</th>
                      <th>วันจ่ายเงิน</th>
                      <th>จำนวนเงินที่จ่าย</th>
                      <th>ภาษีที่หัก (3%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold text-ink">
                      <td>ค่าแห่งลิขสิทธิ์ (ม.40 (3))</td>
                      <td>{selectedTwiPayout.paidAt ? new Date(selectedTwiPayout.paidAt).toLocaleDateString() : 'N/A'}</td>
                      <td>฿{selectedTwiPayout.grossAmount.toLocaleString()}</td>
                      <td className="text-red-700">฿{selectedTwiPayout.withholdingTaxAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold flex justify-between">
                <span>ยอดจ่ายสุทธิ (Net Disbursed):</span>
                <span>฿{selectedTwiPayout.netAmount.toLocaleString()} บาท</span>
              </div>

              <p className="text-[10px] text-mutedGray italic pt-2 border-t border-borderCol/60">
                * เอกสารนี้เป็นบันทึกสรุปการจ่ายเงินค่าลิขสิทธิ์และยอดหักภาษี 3% ของแพลตฟอร์ม หนังสือรับรองภาษีหัก ณ ที่จ่ายอย่างเป็นทางการจะออกตามรอบบัญชีจริงเมื่อผู้รับเงินยืนยันข้อมูลนิติบุคคล/บุคคลธรรมดาครบถ้วน
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setSelectedTwiPayout(null)}
                className="px-4 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/90 transition-colors"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREATE HERO BANNER (Pillar C) */}
      {/* ========================================================================= */}
      {showCreateBannerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center space-x-2">
                <Monitor className="w-4 h-4 text-warm" />
                <span>Create Storefront Hero Banner</span>
              </h3>
              <button onClick={() => setShowCreateBannerModal(false)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Badge Text:</label>
              <input
                type="text"
                value={newBannerBadge}
                onChange={(e) => setNewBannerBadge(e.target.value)}
                placeholder="e.g. EXCLUSIVE COLLAB"
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Headline Title:</label>
              <input
                type="text"
                value={newBannerTitle}
                onChange={(e) => setNewBannerTitle(e.target.value)}
                placeholder="e.g. TOKYO STREETWEAR // 2026 DROP"
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Subtitle / Copy:</label>
              <textarea
                rows={2}
                value={newBannerSubtitle}
                onChange={(e) => setNewBannerSubtitle(e.target.value)}
                placeholder="e.g. Limited heavyweight tees licensed directly from Japanese street artists."
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">CTA Button Text:</label>
              <input
                type="text"
                value={newBannerCtaText}
                onChange={(e) => setNewBannerCtaText(e.target.value)}
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateBannerModal(false)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!newBannerTitle.trim() || loadingAction === 'create-banner'}
                onClick={handleCreateBanner}
                className="px-4 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {loadingAction === 'create-banner' ? 'Publishing...' : 'Publish to Marketplace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5B: EDIT HERO BANNER (Pillar C) */}
      {/* ========================================================================= */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center space-x-2">
                <Pencil className="w-4 h-4 text-warm" />
                <span>Edit Storefront Hero Banner</span>
              </h3>
              <button onClick={() => setEditingBanner(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Live Interactive WYSIWYG Preview */}
            <div>
              <span className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Live Storefront Preview:
              </span>
              <div
                className="p-4 rounded-lg border border-borderCol shadow-inner transition-colors duration-200"
                style={{ backgroundColor: editBannerBgColor, color: editBannerTextColor }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-warm/20 text-warm font-bold border border-warm/40">
                    {editBannerBadge || 'CAMPAIGN'}
                  </span>
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      editBannerIsActive ? 'bg-emerald-500 text-white' : 'bg-gray-600 text-gray-200'
                    }`}
                  >
                    {editBannerIsActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <h4 className="font-black font-sans text-base leading-tight mb-1">
                  {editBannerTitle || 'Headline Title'}
                </h4>
                {editBannerSubtitle && (
                  <p className="text-[11px] opacity-80 font-sans mb-3">{editBannerSubtitle}</p>
                )}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-warm text-paper shadow-xs">
                    {editBannerCtaText || 'Button'} &rarr;
                  </span>
                  <span className="text-[9px] font-mono opacity-70">
                    Priority: #{editBannerPriority}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Badge Text:</label>
              <input
                type="text"
                value={editBannerBadge}
                onChange={(e) => setEditBannerBadge(e.target.value)}
                placeholder="e.g. EXCLUSIVE COLLAB"
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Headline Title: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editBannerTitle}
                onChange={(e) => setEditBannerTitle(e.target.value)}
                placeholder="e.g. TOKYO STREETWEAR // 2026 DROP"
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Subtitle / Copy:</label>
              <textarea
                rows={2}
                value={editBannerSubtitle}
                onChange={(e) => setEditBannerSubtitle(e.target.value)}
                placeholder="e.g. Limited heavyweight tees licensed directly from Japanese street artists."
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">CTA Button Text:</label>
                <input
                  type="text"
                  value={editBannerCtaText}
                  onChange={(e) => setEditBannerCtaText(e.target.value)}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">CTA Destination Link:</label>
                <input
                  type="text"
                  value={editBannerCtaLink}
                  onChange={(e) => setEditBannerCtaLink(e.target.value)}
                  placeholder="/marketplace"
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                />
              </div>
            </div>

            {/* Theme Colors with Presets */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-paper-light rounded border border-borderCol">
              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Background Color:</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="color"
                    value={editBannerBgColor}
                    onChange={(e) => setEditBannerBgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-borderCol cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editBannerBgColor}
                    onChange={(e) => setEditBannerBgColor(e.target.value)}
                    className="flex-1 bg-paper border border-borderCol rounded px-2 py-1 font-mono text-[11px] text-ink"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  {['#111111', '#1c1917', '#042f2e', '#1e1b4b', '#3b0764', '#b45309'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditBannerBgColor(c)}
                      className={`w-4 h-4 rounded-full border ${editBannerBgColor === c ? 'border-warm ring-1 ring-warm' : 'border-borderCol'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Text Color:</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="color"
                    value={editBannerTextColor}
                    onChange={(e) => setEditBannerTextColor(e.target.value)}
                    className="w-7 h-7 rounded border border-borderCol cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editBannerTextColor}
                    onChange={(e) => setEditBannerTextColor(e.target.value)}
                    className="flex-1 bg-paper border border-borderCol rounded px-2 py-1 font-mono text-[11px] text-ink"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  {['#ffffff', '#fef08a', '#fdba74', '#67e8f9', '#a7f3d0'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditBannerTextColor(c)}
                      className={`w-4 h-4 rounded-full border ${editBannerTextColor === c ? 'border-warm ring-1 ring-warm' : 'border-borderCol'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Priority / Sort Order:</label>
                <input
                  type="number"
                  min={1}
                  value={editBannerPriority}
                  onChange={(e) => setEditBannerPriority(Number(e.target.value))}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Visibility Status:</label>
                <select
                  value={editBannerIsActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setEditBannerIsActive(e.target.value === 'ACTIVE')}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Displayed on Marketplace)</option>
                  <option value="INACTIVE">INACTIVE (Hidden)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-borderCol">
              <button
                onClick={() => setEditingBanner(null)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!editBannerTitle.trim() || loadingAction === `edit-banner-${editingBanner.id}`}
                onClick={handleSaveEditedBanner}
                className="px-4 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {loadingAction === `edit-banner-${editingBanner.id}` ? 'Saving Changes...' : 'Save & Update Storefront'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE PROMO CODE (Pillar C) */}
      {/* ========================================================================= */}
      {showCreatePromoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm flex items-center space-x-2">
                <Tag className="w-4 h-4 text-warm" />
                <span>Create Promotional Coupon Code</span>
              </h3>
              <button onClick={() => setShowCreatePromoModal(false)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Code Name:</label>
              <input
                type="text"
                value={newPromoCode}
                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER100"
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink uppercase focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Type:</label>
                <select
                  value={newPromoType}
                  onChange={(e) => setNewPromoType(e.target.value as any)}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                >
                  <option value="FIXED">Fixed Amount (฿)</option>
                  <option value="PERCENT">Percentage (%)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">Discount Value:</label>
                <input
                  type="number"
                  min={1}
                  value={newPromoValue}
                  onChange={(e) => setNewPromoValue(Number(e.target.value))}
                  className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-mutedGray uppercase block mb-1">
                Minimum Order Amount (฿):
              </label>
              <input
                type="number"
                min={0}
                value={newPromoMinOrder}
                onChange={(e) => setNewPromoMinOrder(Number(e.target.value))}
                className="w-full bg-paper-light border border-borderCol rounded p-2 font-mono text-ink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreatePromoModal(false)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!newPromoCode.trim() || loadingAction === 'create-promo'}
                onClick={handleCreatePromo}
                className="px-4 py-1.5 bg-ink text-paper rounded font-mono text-xs font-bold hover:bg-ink/90 transition-colors disabled:opacity-50"
              >
                {loadingAction === 'create-promo' ? 'Creating...' : 'Create Promo Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ARTWORK REJECTION REASON */}
      {/* ========================================================================= */}
      {rejectionModalArtwork && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-paper border border-borderCol rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="font-bold text-ink text-sm">Reject Artwork: {rejectionModalArtwork.title}</h3>
              <button onClick={() => setRejectionModalArtwork(null)} className="text-mutedGray hover:text-ink">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-mutedGray font-mono">
              Provide a clear reason for the creator (e.g. Copyright infringement or low DPI).
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Design does not meet the minimum print DPI requirement or contains trademarked assets."
              className="w-full bg-paper-light border border-borderCol rounded p-2 text-xs font-mono text-ink focus:outline-none"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectionModalArtwork(null)}
                className="px-3 py-1.5 bg-paper-dark text-mutedGray hover:text-ink rounded font-mono text-xs"
              >
                Cancel
              </button>
              <button
                disabled={!rejectionReason.trim() || loadingAction === `art-${rejectionModalArtwork.id}`}
                onClick={() => handleModerateArtwork(rejectionModalArtwork.id, 'REJECT', rejectionReason)}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-mono text-xs font-bold transition-colors disabled:opacity-50"
              >
                {loadingAction === `art-${rejectionModalArtwork.id}` ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super-visibility Order Chat Modal */}
      {adminChatOrder && (
        <OrderChatBox
          orderId={adminChatOrder.id}
          orderNumber={adminChatOrder.orderNumber}
          partnerName={`${adminChatOrder.customerName} ↔ ${adminChatOrder.supplierName}`}
          orderStatus={adminChatOrder.status}
          currentUserRole="ADMIN"
          isOpen={true}
          onClose={() => setAdminChatOrder(null)}
        />
      )}
    </div>
  );
}
