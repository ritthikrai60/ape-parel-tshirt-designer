'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Search,
  RefreshCw,
  Clock,
  Eye,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Filter,
  User,
  Store,
  FileWarning,
} from 'lucide-react';
import { OrderChatBox } from './OrderChatBox';
import { formatImageRemainingTime } from '@/lib/orderChat';

interface AuditMessageItem {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: string;
  message: string;
  imageUrl?: string | null;
  imageExpiresAt?: string | null;
  isImageExpired?: boolean;
  isFlagged: boolean;
  flagReason?: string | null;
  isHighRisk?: boolean;
  createdAt: string;
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    customer?: { id: string; name: string | null; email: string | null } | null;
    supplier?: { id: string; companyName: string } | null;
  };
  sender?: {
    id: string;
    name: string | null;
    role: string;
    email: string | null;
  };
}

interface AuditStats {
  totalMessages: number;
  flaggedCount: number;
  highRiskCount: number;
  flaggedOrdersCount: number;
}

export const AdminChatAuditTab: React.FC = () => {
  const [messages, setMessages] = useState<AuditMessageItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalMessages: 0,
    flaggedCount: 0,
    highRiskCount: 0,
    flaggedOrdersCount: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'FLAGGED' | 'HIGH_RISK'>('FLAGGED');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderQuery, setOrderQuery] = useState<string>('');

  // Active chat inspection modal
  const [inspectingOrder, setInspectingOrder] = useState<{
    orderId: string;
    orderNumber: string;
    partnerName?: string;
    orderStatus?: string;
  } | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMode === 'FLAGGED') {
        params.set('flagged', 'true');
      } else if (filterMode === 'HIGH_RISK') {
        params.set('risk', 'HIGH');
      }

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      if (orderQuery.trim()) {
        params.set('orderNumber', orderQuery.trim());
      }

      const res = await fetch(`/api/admin/chat-audit?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch chat audit logs');

      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[AdminChatAuditTab fetch error]', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterMode, searchQuery, orderQuery]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
            ข้อความทั้งหมดในระบบ
          </span>
          <span className="text-2xl font-mono font-bold text-ink">
            {stats.totalMessages.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-mutedGray block mt-1">
            รวมทุกคำสั่งซื้อ
          </span>
        </div>

        <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
            ตรวจพบความเสี่ยงทุจริต
          </span>
          <span className="text-2xl font-mono font-bold text-amber-600">
            {stats.flaggedCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-amber-700 block mt-1">
            คำต้องห้าม / ดีลนอกระบบ
          </span>
        </div>

        <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
            ความเสี่ยงระดับสูง (High Risk)
          </span>
          <span className="text-2xl font-mono font-bold text-rose-600">
            {stats.highRiskCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-rose-700 block mt-1">
            พร้อมเพย์ / บัญชีธนาคาร / นอกระบบ
          </span>
        </div>

        <div className="bg-paper-light border border-borderCol p-4 rounded-lg shadow-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-mutedGray block mb-1">
            คำสั่งซื้อที่มีข้อสงสัย
          </span>
          <span className="text-2xl font-mono font-bold text-ink">
            {stats.flaggedOrdersCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-mono text-mutedGray block mt-1">
            คำสั่งซื้อต้องตรวจสอบ
          </span>
        </div>
      </div>

      {/* Control Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-paper-light p-3 border border-borderCol rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode('FLAGGED')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-semibold rounded transition flex items-center gap-1.5 ${
              filterMode === 'FLAGGED'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-paper-dark hover:bg-paper-light text-ink border border-borderCol'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>เฉพาะที่ถูกแจ้งเตือน ({stats.flaggedCount})</span>
          </button>

          <button
            onClick={() => setFilterMode('HIGH_RISK')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-semibold rounded transition flex items-center gap-1.5 ${
              filterMode === 'HIGH_RISK'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-paper-dark hover:bg-paper-light text-ink border border-borderCol'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ความเสี่ยงสูง ({stats.highRiskCount})</span>
          </button>

          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 font-mono text-xs uppercase font-semibold rounded transition flex items-center gap-1.5 ${
              filterMode === 'ALL'
                ? 'bg-ink text-paper shadow-sm'
                : 'bg-paper-dark hover:bg-paper-light text-ink border border-borderCol'
            }`}
          >
            <span>ทั้งหมด ({stats.totalMessages})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-mutedGray absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหาข้อความ, เบอร์โทร, ไลน์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-paper text-ink border border-borderCol rounded text-xs focus:outline-none focus:border-ink font-mono"
            />
          </div>

          <button
            onClick={() => fetchAuditLogs()}
            title="รีเฟรชข้อมูล"
            className="p-2 text-ink hover:bg-paper-dark border border-borderCol rounded transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message Audit Table */}
      <div className="bg-paper-light border border-borderCol rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-paper-dark border-b border-borderCol font-mono text-mutedGray uppercase">
                <th className="py-2.5 px-4 font-semibold">เวลา</th>
                <th className="py-2.5 px-4 font-semibold">คำสั่งซื้อ</th>
                <th className="py-2.5 px-4 font-semibold">ผู้ส่ง</th>
                <th className="py-2.5 px-4 font-semibold">ข้อความสนทนา</th>
                <th className="py-2.5 px-4 font-semibold">รูปภาพแนบ (TTL 7 วัน)</th>
                <th className="py-2.5 px-4 font-semibold">สถานะการตรวจจับ</th>
                <th className="py-2.5 px-4 font-semibold text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCol">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-mutedGray">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-warm" />
                    <span>กำลังโหลดบันทึกการตรวจสอบแชท...</span>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-mutedGray">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-600" />
                    <p className="font-medium text-ink">ไม่พบข้อความที่ตรงกับเงื่อนไขการตรวจสอบ</p>
                    <p className="text-[11px] text-mutedGray mt-0.5">
                      ระบบตรวจจับไม่พบความพยายามติดต่อหรือชำระเงินนอกแพลตฟอร์ม
                    </p>
                  </td>
                </tr>
              ) : (
                messages.map((item) => {
                  const hasImage = Boolean(item.imageExpiresAt);
                  const isExpired = item.isImageExpired || !item.imageUrl;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-paper-dark/60 transition ${
                        item.isHighRisk
                          ? 'bg-rose-50/40'
                          : item.isFlagged
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-mutedGray whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString('th-TH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Order Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-ink">
                          #{item.order?.orderNumber || 'N/A'}
                        </div>
                        <div className="text-[10px] text-mutedGray flex items-center gap-1 mt-0.5">
                          <span className="font-medium">{item.order?.status}</span>
                          <span>•</span>
                          <span>฿{item.order?.totalAmount?.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-ink flex items-center gap-1.5">
                          {item.senderRole === 'SUPPLIER' ? (
                            <Store className="w-3.5 h-3.5 text-sky-600" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span>{item.sender?.name || item.senderRole}</span>
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono ${
                            item.senderRole === 'SUPPLIER'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.senderRole === 'SUPPLIER' ? 'ผู้ผลิต (Supplier)' : 'ลูกค้า (Customer)'}
                        </span>
                      </td>

                      {/* Message Content */}
                      <td className="py-3 px-4 max-w-xs break-words">
                        <p className="text-ink leading-relaxed line-clamp-3">
                          {item.message}
                        </p>
                      </td>

                      {/* Image Attachment & TTL status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {!hasImage ? (
                          <span className="text-mutedGray font-mono text-[11px]">-</span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>หมดอายุ (ครบ 7 วัน)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt="thumb"
                                className="w-8 h-8 rounded object-cover border border-borderCol bg-paper"
                              />
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>{formatImageRemainingTime(item.imageExpiresAt)}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Anti-Fraud Flag Status */}
                      <td className="py-3 px-4">
                        {item.isFlagged ? (
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.isHighRisk
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{item.isHighRisk ? 'เสี่ยงสูง (High Risk)' : 'ตรวจพบคำต้องห้าม'}</span>
                            </span>
                            {item.flagReason && (
                              <p className="text-[11px] text-rose-700 leading-tight">
                                {item.flagReason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ผ่านการตรวจสอบ</span>
                          </span>
                        )}
                      </td>

                      {/* Action: Super-visibility chat view */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (item.order) {
                              setInspectingOrder({
                                orderId: item.order.id,
                                orderNumber: item.order.orderNumber,
                                partnerName: `${item.order.customer?.name || 'ลูกค้า'} ↔ ${item.order.supplier?.companyName || 'ผู้ผลิต'}`,
                                orderStatus: item.order.status,
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-ink text-paper hover:bg-ink/90 rounded font-mono text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>เปิดดูแชท</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super-visibility Full Order Chat Inspection Modal */}
      {inspectingOrder && (
        <OrderChatBox
          orderId={inspectingOrder.orderId}
          orderNumber={inspectingOrder.orderNumber}
          partnerName={inspectingOrder.partnerName}
          orderStatus={inspectingOrder.orderStatus}
          currentUserRole="ADMIN"
          isOpen={true}
          onClose={() => setInspectingOrder(null)}
        />
      )}
    </div>
  );
};
