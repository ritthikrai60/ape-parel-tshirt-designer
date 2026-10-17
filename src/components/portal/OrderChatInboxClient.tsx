'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Inbox,
  MessageSquare,
  Search,
  RefreshCw,
  ExternalLink,
  Clock,
  Shirt,
  Store,
  User,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Ruler,
} from 'lucide-react';
import { OrderChatBox } from '@/components/portal/OrderChatBox';

export interface InboxThreadItem {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  garment: {
    name: string;
    sku: string;
    colorHex: string;
    colorName?: string | null;
    size: string;
    previewFrontUrl?: string | null;
  };
  partner: {
    name: string;
    role: string;
  };
  lastMessage: {
    id: string;
    message: string;
    senderRole: string;
    senderName: string;
    hasImage: boolean;
    isImageExpired: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  hasFlagged: boolean;
}

export const OrderChatInboxClient: React.FC = () => {
  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [currentUserRole, setCurrentRole] = useState<string>('CUSTOMER');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [selectedThread, setSelectedThread] = useState<InboxThreadItem | null>(null);

  // Fetch all conversation threads from API
  const fetchInboxThreads = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const res = await fetch('/api/chat/inbox');
      if (!res.ok) throw new Error('Failed to fetch inbox threads');

      const data = await res.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        setTotalUnread(data.totalUnread || 0);
        if (data.currentUser?.role) {
          setCurrentRole(data.currentUser.role);
        }
        // Auto-select first thread on desktop if none selected
        if (isInitial && data.threads.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setSelectedThread(data.threads[0]);
        }
      }
    } catch (err) {
      console.error('[OrderChatInbox fetch error]', err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInboxThreads(true);
    const interval = setInterval(() => {
      fetchInboxThreads(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchInboxThreads]);

  // Filter threads by search query & read status
  const filteredThreads = threads.filter((thread) => {
    if (filterMode === 'UNREAD' && thread.unreadCount === 0) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      thread.orderNumber.toLowerCase().includes(q) ||
      thread.garment.name.toLowerCase().includes(q) ||
      thread.partner.name.toLowerCase().includes(q) ||
      (thread.lastMessage?.message && thread.lastMessage.message.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAYMENT_CONFIRMED':
        return { label: 'Queued', bg: 'bg-amber-500/15 text-amber-900 border-amber-500/30' };
      case 'IN_PRODUCTION':
        return { label: 'In Printing', bg: 'bg-indigo-500/15 text-indigo-900 border-indigo-500/30' };
      case 'QA':
      case 'QA_PASSED':
        return { label: 'QA Check', bg: 'bg-purple-500/15 text-purple-900 border-purple-500/30' };
      case 'READY_TO_PACK':
        return { label: 'Ready to Pack', bg: 'bg-blue-500/15 text-blue-900 border-blue-500/30' };
      case 'SHIPPED':
        return { label: 'Dispatched', bg: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/30' };
      case 'DELIVERED':
        return { label: 'Delivered', bg: 'bg-emerald-600/20 text-emerald-950 border-emerald-600/40' };
      default:
        return { label: status, bg: 'bg-paper-dark text-ink border-borderCol' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderCol pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] tracking-widest uppercase bg-warm/30 text-ink border border-warm/60 px-2 py-0.5 rounded font-bold flex items-center space-x-1">
              <Inbox className="w-3 h-3 text-ink" />
              <span>COMMUNICATION // CENTRAL INBOX</span>
            </span>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 animate-pulse">
                {totalUnread} ข้อความใหม่
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-sans text-ink mt-1">
            กล่องข้อความรวม (Order Chat Inbox)
          </h1>
          <p className="font-mono text-xs text-mutedGray">
            ศูนย์กลางการสื่อสารระหว่างลูกค้าและโรงงานผู้ผลิต ติดตามการปรับแต่งลายและดีลงานผลิตที่ผูกกับแต่ละคำสั่งซื้อ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInboxThreads(true)}
            className="p-2 border border-borderCol rounded-lg hover:bg-paper-dark text-ink transition-colors"
            title="รีเฟรชกล่องข้อความ"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/account/orders"
            className="px-3.5 py-2 border border-borderCol hover:bg-paper-dark text-ink rounded-lg font-mono text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <span>รายการคำสั่งซื้อทั้งหมด</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Dual-Pane Inbox Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left Column: Thread Conversations List (lg:col-span-5) */}
        <div className={`lg:col-span-5 flex flex-col space-y-3 ${selectedThread ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 bg-paper-light p-2.5 border border-borderCol rounded-xl shadow-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-mutedGray absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="ค้นหาเลขออเดอร์, เสื้อ, ข้อความ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-paper text-ink border border-borderCol/80 rounded-lg text-xs font-mono focus:outline-none focus:border-ink"
              />
            </div>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                  filterMode === 'ALL'
                    ? 'bg-ink text-paper'
                    : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilterMode('UNREAD')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition flex items-center space-x-1 ${
                  filterMode === 'UNREAD'
                    ? 'bg-amber-600 text-white'
                    : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
                }`}
              >
                <span>ยังไม่อ่าน</span>
                {totalUnread > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                )}
              </button>
            </div>
          </div>

          {/* Threads Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[680px] pr-1">
            {isLoading && threads.length === 0 ? (
              <div className="py-16 text-center text-mutedGray space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-warm" />
                <p className="text-xs font-mono">กำลังโหลดกล่องข้อความ...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="py-16 text-center bg-paper-light border border-borderCol rounded-2xl p-6 space-y-3">
                <MessageSquare className="w-8 h-8 mx-auto text-mutedGray/60" />
                <h4 className="font-bold text-sm text-ink">ไม่พบบทสนทนา</h4>
                <p className="text-xs text-mutedGray font-mono max-w-xs mx-auto">
                  {filterMode === 'UNREAD'
                    ? 'ไม่มีข้อความที่ยังไม่ได้อ่านในขณะนี้'
                    : 'ยังไม่มีประวัติการแชทในคำสั่งซื้อของคุณ'}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.orderId === thread.orderId;
                const statusBadge = getStatusBadge(thread.orderStatus);

                return (
                  <div
                    key={thread.orderId}
                    onClick={() => setSelectedThread(thread)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer relative group ${
                      isSelected
                        ? 'bg-paper-light border-ink shadow-sm'
                        : 'bg-paper-light/60 hover:bg-paper-light border-borderCol'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Garment Preview Swatch */}
                      <div
                        className="w-12 h-12 rounded-lg border border-borderCol flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: thread.garment.colorHex }}
                      >
                        {thread.garment.previewFrontUrl ? (
                          <img
                            src={thread.garment.previewFrontUrl}
                            alt="thumb"
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Shirt className="w-5 h-5 text-paper/80 stroke-1" />
                        )}
                      </div>

                      {/* Thread Header & Meta */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-mono text-xs font-bold text-ink">
                              #{thread.orderNumber}
                            </span>
                            <span
                              className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-semibold ${statusBadge.bg}`}
                            >
                              {statusBadge.label}
                            </span>
                          </div>
                          {thread.lastMessage && (
                            <span className="font-mono text-[10px] text-mutedGray shrink-0">
                              {new Date(thread.lastMessage.createdAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        {/* Partner label */}
                        <div className="flex items-center space-x-1.5 text-[11px] text-mutedGray">
                          <Store className="w-3 h-3 text-mutedGray shrink-0" />
                          <span className="font-medium text-ink truncate">
                            {thread.partner.name}
                          </span>
                        </div>

                        {/* Last message preview */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <p className="text-xs text-mutedGray truncate flex-1 font-sans">
                            {thread.lastMessage ? (
                              <>
                                <span className="font-semibold text-ink">
                                  {thread.lastMessage.senderName}:{' '}
                                </span>
                                <span>{thread.lastMessage.message}</span>
                              </>
                            ) : (
                              <span className="italic text-mutedGray">ยังไม่มีข้อความ (คลิกเพื่อเริ่มแชท)</span>
                            )}
                          </p>

                          {/* Unread Badge */}
                          {thread.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-slate-950 shrink-0">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation Pane (lg:col-span-7) */}
        <div className={`lg:col-span-7 flex flex-col ${selectedThread ? 'flex' : 'hidden lg:flex'}`}>
          {selectedThread ? (
            <div className="flex flex-col h-full bg-paper-light border border-borderCol rounded-2xl overflow-hidden shadow-sm">
              {/* Top Order Context Reference Bar */}
              <div className="px-4 py-3 bg-paper-dark/40 border-b border-borderCol flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="lg:hidden p-1.5 -ml-1 text-ink hover:bg-paper-dark rounded-lg transition"
                    title="กลับหน้ารายการ"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className="w-9 h-9 rounded-md border border-borderCol flex items-center justify-center shrink-0"
                    style={{ backgroundColor: selectedThread.garment.colorHex }}
                  >
                    <Shirt className="w-5 h-5 text-paper/80 stroke-1" />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-mono text-sm font-bold text-ink">
                        คำสั่งซื้อ #{selectedThread.orderNumber}
                      </h3>
                      <span className="text-[10px] font-mono text-mutedGray">
                        ฿{selectedThread.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-mutedGray font-mono">
                      {selectedThread.garment.name} (ไซส์ {selectedThread.garment.size}) &bull; {selectedThread.partner.name}
                    </p>
                  </div>
                </div>

                {/* Direct Order Navigation Links */}
                <div className="flex items-center space-x-2 shrink-0">
                  <Link
                    href={`/account/orders/${selectedThread.orderNumber}`}
                    className="px-2.5 py-1.5 bg-paper hover:bg-paper-dark border border-borderCol rounded-lg text-xs font-mono font-bold text-ink flex items-center space-x-1 transition shadow-2xs"
                    title="ดูรายละเอียดคำสั่งซื้อและพิมพ์ใบพิมพ์ลาย (Placement Blueprint)"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-mutedGray" />
                    <span>ดูรายละเอียดออเดอร์</span>
                  </Link>
                </div>
              </div>

              {/* Embedded Chat Modal/Box View */}
              <div className="flex-1 min-h-[540px] relative">
                <OrderChatBox
                  orderId={selectedThread.orderId}
                  orderNumber={selectedThread.orderNumber}
                  partnerName={selectedThread.partner.name}
                  orderStatus={selectedThread.orderStatus}
                  currentUserRole={currentUserRole as any}
                  isOpen={true}
                  onClose={() => setSelectedThread(null)}
                />
              </div>
            </div>
          ) : (
            /* Empty selection state for desktop */
            <div className="h-full flex flex-col items-center justify-center p-8 bg-paper-light border border-borderCol rounded-2xl text-center space-y-3 min-h-[500px]">
              <div className="w-14 h-14 rounded-2xl bg-paper-dark flex items-center justify-center text-mutedGray border border-borderCol">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-ink">เลือกคำสั่งซื้อเพื่อดูการสนทนา</h3>
              <p className="text-xs text-mutedGray font-mono max-w-sm">
                คลิกเลือกคำสั่งซื้อจากรายการด้านซ้ายเพื่อเปิดกล่องข้อความพูดคุยกับผู้ผลิต ส่งรูปภาพแบบร่าง หรือตรวจสอบข้อพิพาท
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
