'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  ExternalLink,
  Info,
  AlertTriangle,
  CheckCircle,
  Package,
  Sparkles,
  ShieldAlert,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: string | null;
  isRead: boolean;
  createdAt: string;
}

export const NotificationBell: React.FC<{ className?: string }> = ({ className = '' }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initialFetchRef = useRef(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.status === 401) {
        // User not logged in, clear state and avoid errors
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        initialFetchRef.current = true;
      }
    } catch {
      // Graceful offline/network fallback
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Smart Polling: every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);

    // Re-fetch immediately when window gains focus
    const handleFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('[NotificationBell] Failed to mark notifications as read:', e);
    } finally {
      setLoading(false);
    }
  };

  const markSingleAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error('[NotificationBell] Failed to mark notification as read:', e);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await markSingleAsRead(n.id);
    }

    let parsedMeta: any = null;
    try {
      if (n.metadata) parsedMeta = JSON.parse(n.metadata);
    } catch {}

    const targetUrl =
      parsedMeta?.url ||
      (n.type === 'ORDER_UPDATE' || n.type === 'NEW_ORDER'
        ? '/account/orders'
        : n.type === 'ARTWORK_APPROVED' || n.type === 'ARTWORK_REJECTED'
        ? '/creator/dashboard'
        : n.type === 'ROYALTY_CREDITED' || n.type === 'PAYOUT_UPDATE'
        ? '/creator/dashboard'
        : n.type === 'FRAUD_ALERT' || n.type === 'ADMIN_ALERT'
        ? '/admin'
        : null);

    if (targetUrl) {
      setIsOpen(false);
      router.push(targetUrl);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'ARTWORK_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
      case 'ARTWORK_REJECTED':
        return <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />;
      case 'ORDER_UPDATE':
      case 'NEW_ORDER':
        return <Package className="w-4 h-4 text-sky-600 flex-shrink-0" />;
      case 'ROYALTY_CREDITED':
      case 'PAYOUT_UPDATE':
        return <Coins className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      case 'FRAUD_ALERT':
        return <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-warm-dark flex-shrink-0" />;
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-borderCol hover:border-ink bg-paper hover:bg-paper-dark text-ink transition-colors focus:outline-none focus:ring-1 focus:ring-warm flex items-center justify-center"
        aria-label="แจ้งเตือนระบบ (System Notifications)"
        title="แจ้งเตือนระบบ (System Notifications)"
        data-testid="notification-bell-btn"
      >
        <Bell className="w-4 h-4 text-ink" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-paper-light border border-borderCol rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-borderCol flex items-center justify-between bg-paper">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs text-ink uppercase tracking-wider">
                การแจ้งเตือน
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-mono font-bold">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={loading}
                className="text-[11px] font-mono text-mutedGray hover:text-ink transition-colors flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>อ่านทั้งหมดแล้ว</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-borderCol/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-mutedGray">
                ไม่มีการแจ้งเตือนใหม่ในขณะนี้
              </div>
            ) : (
              notifications.map((n) => {
                let parsedMeta: any = null;
                try {
                  if (n.metadata) parsedMeta = JSON.parse(n.metadata);
                } catch {}

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer ${
                      n.isRead ? 'bg-transparent hover:bg-paper/40' : 'bg-warm/15 hover:bg-warm/25'
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs font-sans truncate ${
                            n.isRead ? 'font-medium text-ink' : 'font-bold text-ink'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] font-mono text-mutedGray flex-shrink-0 ml-2">
                          {new Date(n.createdAt).toLocaleDateString('th-TH', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-mutedGray leading-relaxed break-words">
                        {n.message}
                      </p>
                      {parsedMeta?.reason && (
                        <div className="mt-1 p-2 bg-paper rounded border border-borderCol/80 text-[11px] font-mono text-rose-700">
                          <span className="font-bold">สาเหตุ:</span> {parsedMeta.reason}
                        </div>
                      )}
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-rose-600 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
