'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
  ShieldAlert,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  CheckCheck,
  User,
  ShieldCheck,
  Store,
  Minus,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  formatImageRemainingTime,
  isImageExpired,
  compressImageInBrowser,
} from '@/lib/orderChat';

export type ChatDisplayMode = 'DOCK_FLOATING' | 'MINIMIZED' | 'MAXIMIZED_MODAL';

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'SUPPLIER' | 'ADMIN' | 'SYSTEM' | string;
  message: string;
  imageUrl?: string | null;
  imageExpiresAt?: string | null;
  isImageExpired?: boolean;
  isFlagged?: boolean;
  flagReason?: string | null;
  isRead?: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string | null;
    role: string;
  };
}

export interface OrderChatBoxProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: 'CUSTOMER' | 'SUPPLIER' | 'ADMIN';
  partnerName?: string;
  orderStatus?: string;
  initialMode?: ChatDisplayMode;
}

export const OrderChatBox: React.FC<OrderChatBoxProps> = ({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  currentUserRole = 'CUSTOMER',
  partnerName,
  orderStatus,
  initialMode = 'DOCK_FLOATING',
}) => {
  const [displayMode, setDisplayMode] = useState<ChatDisplayMode>(initialMode);

  // Restore floating view whenever orderId changes or window reopens
  useEffect(() => {
    if (isOpen) {
      if (displayMode === 'MINIMIZED') {
        setDisplayMode('DOCK_FLOATING');
      }
    }
  }, [orderId, isOpen]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<{
    dataUrl: string;
    sizeKb: number;
    fileName: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [fraudWarning, setFraudWarning] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Fetch messages from backend
  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!orderId) return;
    try {
      if (isInitial) setIsLoading(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/messages`, {
        headers: {
          'x-client-role': currentUserRole,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load messages (${res.status})`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('[OrderChatBox fetch error]', err);
    } finally {
      if (isInitial) {
        setIsLoading(false);
        setTimeout(() => scrollToBottom(false), 100);
      }
    }
  }, [orderId, currentUserRole, scrollToBottom]);

  // Periodic polling every 3.5 seconds when modal is active
  useEffect(() => {
    if (!isOpen) return;

    fetchMessages(true);
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [isOpen, fetchMessages]);

  // Scroll to bottom when message count changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // Handle client-side image compression
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (PNG, JPG, WEBP)');
      return;
    }

    try {
      setIsCompressing(true);
      const { dataUrl, sizeBytes } = await compressImageInBrowser(file, 1200, 0.82);
      setAttachedImage({
        dataUrl,
        sizeKb: Math.round(sizeBytes / 1024),
        fileName: file.name,
      });
    } catch (compressErr) {
      console.error('[Image Compression Failed]', compressErr);
      alert('ไม่สามารถบีบอัดรูปภาพได้ โปรดลองใหม่อีกครั้ง');
    } finally {
      setIsCompressing(false);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isSending || isCompressing) return;

    const messageText = inputText.trim() || (attachedImage ? '[แนบรูปภาพรายละเอียดงาน]' : '');

    try {
      setIsSending(true);
      setFraudWarning(null);

      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-role': currentUserRole,
        },
        body: JSON.stringify({
          message: messageText,
          imageUrl: attachedImage ? attachedImage.dataUrl : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || data.error || 'ส่งข้อความไม่สำเร็จ');
        return;
      }

      if (data.fraudAlert?.isFlagged) {
        setFraudWarning(
          `คำเตือนความปลอดภัย: ข้อความของคุณมีรูปแบบการชักชวนนอกระบบ (${data.fraudAlert.reason}) ระบบได้บันทึกประวัติการตรวจสอบเพื่อความปลอดภัยของคำสั่งซื้อ`
        );
      }

      setInputText('');
      setAttachedImage(null);
      await fetchMessages(false);
      scrollToBottom(true);
    } catch (sendErr) {
      console.error('[Send message error]', sendErr);
      alert('เกิดข้อผิดพลาดในการส่งข้อความ โปรดลองใหม่อีกครั้ง');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const isMaximized = displayMode === 'MAXIMIZED_MODAL';

  if (displayMode === 'MINIMIZED') {
    return (
      <div
        onClick={() => setDisplayMode('DOCK_FLOATING')}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl cursor-pointer transition-all hover:scale-[1.02] text-white backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150"
      >
        <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <MessageSquare className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-slate-900" />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold">แชทคำสั่งซื้อ</span>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-800 px-1.5 py-0.2 rounded">
              #{orderNumber}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
            {partnerName || 'คู่สนทนา'}
          </span>
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDisplayMode('DOCK_FLOATING');
            }}
            title="เปิดหน้าต่างแชท"
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="ปิดการสนทนา"
            className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700/60"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const containerClasses = isMaximized
    ? 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200'
    : 'fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:right-4 z-50 flex items-end justify-end pointer-events-none p-0 sm:p-0';

  const boxClasses = isMaximized
    ? 'flex flex-col w-full max-w-4xl h-[90vh] max-h-[820px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden'
    : 'pointer-events-auto flex flex-col w-full sm:w-[410px] h-[85vh] sm:h-[600px] max-h-[90vh] bg-slate-900 border border-slate-700/90 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200';

  return (
    <div className={containerClasses}>
      <div className={boxClasses}>
        {/* Mobile Bottom-sheet Drag Handle */}
        {!isMaximized && (
          <div
            onClick={() => setDisplayMode('MINIMIZED')}
            className="sm:hidden flex flex-col items-center justify-center pt-2 pb-1 bg-slate-950/90 cursor-pointer"
            title="แตะเพื่อย่อหน้าต่าง"
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide truncate">
                  กล่องข้อความ
                </h3>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-xs font-mono font-medium rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                  #{orderNumber}
                </span>
                {orderStatus && (
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    {orderStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                {currentUserRole === 'CUSTOMER' && (
                  <>
                    <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">ผู้ผลิต: {partnerName || 'Ape-Parel Certified Partner'}</span>
                  </>
                )}
                {currentUserRole === 'SUPPLIER' && (
                  <>
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">ลูกค้า: {partnerName || 'ลูกค้าคำสั่งซื้อ'}</span>
                  </>
                )}
                {currentUserRole === 'ADMIN' && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium truncate">โหมดตรวจสอบ Admin</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => fetchMessages(false)}
              title="รีเฟรชข้อความ"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('MINIMIZED')}
              title="ย่อหน้าต่างลงมุมจอ"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setDisplayMode(isMaximized ? 'DOCK_FLOATING' : 'MAXIMIZED_MODAL')
              }
              title={isMaximized ? 'ย่อเป็นกล่องลอยมุมจอ' : 'ขยายเต็มหน้าจอ'}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition hidden sm:inline-flex"
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onClose}
              title="ปิดหน้าต่างแชท"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Security Policy Banner */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <span className="font-medium text-amber-300">มาตรการคุ้มครองคำสั่งซื้อ:</span>{' '}
            กรุณาสื่อสารและตกลงสเปกผ่านระบบเท่านั้น เพื่อสิทธิ์การรับประกันและการระงับข้อพิพาท รูปภาพในแชทจะถูกบีบอัดและ
            <span className="text-amber-200 font-medium"> มีอายุจัดเก็บ 7 วัน</span> เพื่อความเป็นส่วนตัว
          </div>
        </div>

        {/* Fraud Risk Warning Banner if triggered */}
        {fraudWarning && (
          <div className="px-4 py-2.5 bg-rose-950/70 border-b border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-200 animate-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed font-medium">
              {fraudWarning}
            </div>
            <button
              onClick={() => setFraudWarning(null)}
              className="text-rose-400 hover:text-rose-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">กำลังโหลดข้อความ...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-slate-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">ยังไม่มีข้อความในคำสั่งซื้อนี้</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                เริ่มต้นสนทนาเพื่อปรึกษางานสกรีน ตำแหน่งลาย หรือปรับรายละเอียดงานผลิตนอกเหนือจากแบบมาตรฐาน
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSenderSelf =
                (currentUserRole === 'CUSTOMER' && msg.senderRole === 'CUSTOMER') ||
                (currentUserRole === 'SUPPLIER' && msg.senderRole === 'SUPPLIER') ||
                (currentUserRole === 'ADMIN' && msg.senderRole === 'ADMIN');

              const isExpired = isImageExpired(msg.imageExpiresAt, msg.isImageExpired);
              const remainingTimeStr = formatImageRemainingTime(msg.imageExpiresAt);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSenderSelf ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Label & Role Badge */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-300">
                      {msg.sender?.name || (msg.senderRole === 'SUPPLIER' ? 'ผู้ผลิต' : 'ลูกค้า')}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${
                        msg.senderRole === 'ADMIN'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : msg.senderRole === 'SUPPLIER'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {msg.senderRole === 'ADMIN'
                        ? 'แอดมิน'
                        : msg.senderRole === 'SUPPLIER'
                        ? 'ผู้ผลิต'
                        : 'ลูกค้า'}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(msg.createdAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-md ${
                      isSenderSelf
                        ? 'bg-amber-600 text-white rounded-tr-none'
                        : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    {/* Text Message */}
                    {msg.message && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                        {msg.message}
                      </p>
                    )}

                    {/* Image Attachment with 7-Day TTL logic */}
                    {msg.imageExpiresAt && (
                      <div className="mt-2.5 pt-2 border-t border-white/10">
                        {isExpired || !msg.imageUrl ? (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/10 text-xs text-slate-300">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="leading-tight">
                              <span className="font-medium text-slate-200">รูปภาพหมดอายุแล้ว</span>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                ไฟล์รูปภาพถูกทำลายอัตโนมัติตามนโยบายความเป็นส่วนตัว 7 วัน
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div
                              onClick={() => setPreviewZoomImage(msg.imageUrl || null)}
                              className="relative cursor-pointer group rounded-lg overflow-hidden border border-white/10 bg-black/40 max-h-52"
                            >
                              <img
                                src={msg.imageUrl}
                                alt="รูปภาพประกอบรายละเอียดงาน"
                                className="w-full object-cover max-h-52 group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <ExternalLink className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] opacity-90 px-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {remainingTimeStr}
                              </span>
                              <span className="text-[10px] opacity-75">บีบอัดความละเอียดสูง</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Flagged warning badge if inspected by Admin or recipient */}
                    {msg.isFlagged && (
                      <div className="mt-2 p-2 rounded bg-rose-950/80 border border-rose-500/40 text-[11px] text-rose-200 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-rose-300">ตรวจพบคำต้องห้าม:</span>{' '}
                          {msg.flagReason || 'ติดต่อหรือชำระเงินนอกระบบ'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Attachment Preview before sending */}
        {attachedImage && (
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                <img
                  src={attachedImage.dataUrl}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs">
                <p className="font-medium text-slate-200 max-w-[200px] truncate">
                  {attachedImage.fileName}
                </p>
                <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                  <span className="text-emerald-400 font-medium">บีบอัดแล้ว {attachedImage.sizeKb} KB</span>
                  <span>• อายุจัดเก็บ 7 วัน</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAttachedImage(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isCompressing}
            title="แนบรูปภาพ (ระบบจะบีบอัดอัตโนมัติและเก็บ 7 วัน)"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            {isCompressing ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="พิมพ์ข้อความสอบถามหรือแจ้งรายละเอียดงานผลิต..."
            disabled={isSending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !attachedImage) || isSending || isCompressing}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-semibold text-sm transition flex items-center gap-1.5 shrink-0 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>ส่ง</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Image Zoom Modal */}
      {previewZoomImage && (
        <div
          onClick={() => setPreviewZoomImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
        >
          <button
            onClick={() => setPreviewZoomImage(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800 rounded-full hover:bg-slate-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewZoomImage}
            alt="Zoomed preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
