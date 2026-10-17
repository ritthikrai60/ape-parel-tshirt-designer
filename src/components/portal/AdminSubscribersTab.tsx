'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Download,
  Search,
  Bell,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Package,
  Coins,
  Palette,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface SubscriberItem {
  id: string;
  email: string;
  status: string;
  source: string;
  consentGiven: boolean;
  consentTimestamp: string;
  createdAt: string;
}

interface AlertSubscriberItem {
  id: string;
  email: string;
  name: string | null;
  alertTypes: string; // JSON string
  isActive: boolean;
  createdAt: string;
}

const AVAILABLE_ALERTS = [
  { id: 'NEW_ORDER', label: 'คำสั่งซื้อใหม่ (New Orders)', icon: Package, color: 'text-sky-600' },
  { id: 'FRAUD_ALERT', label: 'ข้อความแชททุจริต (Fraud & Risk)', icon: ShieldAlert, color: 'text-rose-600' },
  { id: 'PAYOUT_REQUEST', label: 'คำขอเบิกเงินครีเอเตอร์ (Payouts)', icon: Coins, color: 'text-amber-600' },
  { id: 'MODERATION_PENDING', label: 'ผลงานรอการอนุมัติ (Moderation)', icon: Palette, color: 'text-purple-600' },
];

export const AdminSubscribersTab: React.FC = () => {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState<'newsletter' | 'alerts'>('newsletter');

  // Newsletter State
  const [newsletterSubs, setNewsletterSubs] = useState<SubscriberItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingNews, setLoadingNews] = useState(false);

  // Alert Subscribers State
  const [alertSubs, setAlertSubs] = useState<AlertSubscriberItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [newAlertEmail, setNewAlertEmail] = useState('');
  const [newAlertName, setNewAlertName] = useState('');
  const [newSelectedTypes, setNewSelectedTypes] = useState<string[]>([
    'NEW_ORDER',
    'FRAUD_ALERT',
    'PAYOUT_REQUEST',
    'MODERATION_PENDING',
  ]);
  const [savingAlert, setSavingAlert] = useState(false);

  // Fetch Newsletter Subscribers
  const fetchNewsletterSubs = async () => {
    setLoadingNews(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/subscribers/newsletter?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNewsletterSubs(data.subscribers || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      toast({ type: 'error', title: 'ดึงข้อมูลไม่สำเร็จ', message: 'ไม่สามารถโหลดรายชื่อสมาชิกได้' });
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch Alert Subscribers
  const fetchAlertSubs = async () => {
    setLoadingAlerts(true);
    try {
      const res = await fetch('/api/subscribers/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlertSubs(data.subscribers || []);
      }
    } catch {
      toast({ type: 'error', title: 'ดึงข้อมูลไม่สำเร็จ', message: 'ไม่สามารถโหลดรายชื่อผู้รับแจ้งเตือนได้' });
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    if (subTab === 'newsletter') {
      fetchNewsletterSubs();
    } else {
      fetchAlertSubs();
    }
  }, [subTab, statusFilter]);

  const handleExportCsv = () => {
    window.open('/api/subscribers/newsletter/export', '_blank');
    toast({
      type: 'success',
      title: 'ดาวน์โหลดไฟล์ CSV แล้ว',
      message: 'ระบบได้ส่งออกข้อมูลสมาชิกผู้รับข่าวสารเรียบร้อยแล้ว',
    });
  };

  const handleCreateAlertSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertEmail || !newAlertEmail.includes('@')) {
      toast({ type: 'error', title: 'อีเมลไม่ถูกต้อง', message: 'กรุณากรอกอีเมลที่ถูกต้อง' });
      return;
    }
    if (newSelectedTypes.length === 0) {
      toast({ type: 'warning', title: 'เลือกประเภทการแจ้งเตือน', message: 'ต้องเลือกอย่างน้อย 1 ประเภท' });
      return;
    }

    setSavingAlert(true);
    try {
      const res = await fetch('/api/subscribers/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAlertEmail,
          name: newAlertName || undefined,
          alertTypes: newSelectedTypes,
          isActive: true,
        }),
      });

      if (res.ok) {
        toast({ type: 'success', title: 'เพิ่มผู้รับการแจ้งเตือนสำเร็จ' });
        setShowAddAlertModal(false);
        setNewAlertEmail('');
        setNewAlertName('');
        fetchAlertSubs();
      } else {
        const data = await res.json();
        toast({ type: 'error', title: 'บันทึกไม่สำเร็จ', message: data.error });
      }
    } catch {
      toast({ type: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setSavingAlert(false);
    }
  };

  const handleToggleAlertActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/subscribers/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        setAlertSubs((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, isActive: !currentActive } : sub))
        );
        toast({ type: 'info', title: 'อัปเดตสถานะการแจ้งเตือนแล้ว' });
      }
    } catch {
      toast({ type: 'error', title: 'ไม่สามารถอัปเดตสถานะได้' });
    }
  };

  const handleDeleteAlertSubscriber = async (id: string) => {
    if (!confirm('ต้องการลบผู้รับการแจ้งเตือนนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/subscribers/alerts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlertSubs((prev) => prev.filter((sub) => sub.id !== id));
        toast({ type: 'success', title: 'ลบผู้รับการแจ้งเตือนแล้ว' });
      }
    } catch {
      toast({ type: 'error', title: 'ลบไม่สำเร็จ' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderCol pb-4">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setSubTab('newsletter')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 ${
              subTab === 'newsletter'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Newsletter Subscribers ({counts.active})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('alerts')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 ${
              subTab === 'alerts'
                ? 'bg-ink text-paper shadow-sm'
                : 'text-mutedGray hover:text-ink hover:bg-paper-dark'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>System Alert Routing ({alertSubs.length})</span>
          </button>
        </div>

        {subTab === 'newsletter' ? (
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-mono font-semibold bg-paper hover:bg-paper-dark border border-borderCol rounded-xl transition-colors flex items-center space-x-1.5 text-ink shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV (Export)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddAlertModal(true)}
            className="px-3.5 py-2 text-xs font-mono font-bold bg-ink text-paper hover:bg-ink-light rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มอีเมลผู้รับแจ้งเตือน</span>
          </button>
        )}
      </div>

      {/* Sub-tab 1: Newsletter Subscribers */}
      {subTab === 'newsletter' && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-paper rounded-xl border border-borderCol">
              <span className="text-[11px] font-mono text-mutedGray uppercase">ผู้ติดตามทั้งหมด</span>
              <p className="text-xl font-bold font-mono text-ink mt-1">{counts.total}</p>
            </div>
            <div className="p-4 bg-paper rounded-xl border border-borderCol">
              <span className="text-[11px] font-mono text-emerald-700 uppercase">สถานะใช้งาน (Active)</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{counts.active}</p>
            </div>
            <div className="p-4 bg-paper rounded-xl border border-borderCol">
              <span className="text-[11px] font-mono text-mutedGray uppercase">ยกเลิกรับข่าวสาร (Unsubscribed)</span>
              <p className="text-xl font-bold font-mono text-mutedGray mt-1">{counts.unsubscribed}</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-mutedGray absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchNewsletterSubs()}
                placeholder="ค้นหาตามอีเมล..."
                className="w-full pl-9 pr-4 py-2 text-xs font-mono bg-paper border border-borderCol rounded-xl text-ink placeholder:text-mutedGray focus:outline-none focus:ring-1 focus:ring-warm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-mono bg-paper border border-borderCol rounded-xl text-ink focus:outline-none"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="ACTIVE">เฉพาะ Active</option>
                <option value="UNSUBSCRIBED">เฉพาะ Unsubscribed</option>
              </select>
              <button
                type="button"
                onClick={fetchNewsletterSubs}
                className="p-2 bg-paper hover:bg-paper-dark border border-borderCol rounded-xl text-ink"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loadingNews ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-paper border border-borderCol rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-paper-dark/40 border-b border-borderCol font-mono text-[11px] text-mutedGray uppercase">
                  <tr>
                    <th className="px-4 py-3">อีเมล</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3">ช่องทาง (Source)</th>
                    <th className="px-4 py-3">ความยินยอม PDPA</th>
                    <th className="px-4 py-3">วันที่สมัคร</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCol/60">
                  {loadingNews ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-mutedGray font-mono">
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  ) : newsletterSubs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-mutedGray font-mono">
                        ไม่พบข้อมูลผู้สมัครรับข่าวสาร
                      </td>
                    </tr>
                  ) : (
                    newsletterSubs.map((sub) => (
                      <tr key={sub.id} className="hover:bg-paper-dark/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-ink">{sub.email}</td>
                        <td className="px-4 py-3">
                          {sub.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3" />
                              <span>UNSUBSCRIBED</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-mutedGray">{sub.source}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-mutedGray">
                          {sub.consentGiven ? '✓ บันทึกความยินยอม' : '✗'}
                        </td>
                        <td className="px-4 py-3 font-mono text-mutedGray text-[11px]">
                          {new Date(sub.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
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

      {/* Sub-tab 2: System Alert Subscribers */}
      {subTab === 'alerts' && (
        <div className="space-y-4">
          <div className="p-4 bg-paper rounded-xl border border-borderCol flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-ink">การตั้งค่าอีเมลแจ้งเตือนการทำงานของระบบ (Admin Email Alerts)</h4>
              <p className="text-mutedGray leading-relaxed">
                กำหนดที่อยู่อีเมลของทีมงานหรือผู้ดูแลระบบที่จะได้รับอีเมลแจ้งเตือนอัตโนมัติเมื่อเกิดเหตุการณ์สำคัญ เช่น มีคำสั่งซื้อใหม่, ข้อความแชทที่มีแนวโน้มดีลนอกระบบ (Fraud), มีผลงานรอกรรมการตรวจ, หรือคำขอยื่นเบิกเงิน
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingAlerts ? (
              <div className="col-span-2 py-8 text-center text-mutedGray font-mono">กำลังโหลด...</div>
            ) : alertSubs.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-mutedGray font-mono">
                ยังไม่มีการตั้งค่าอีเมลรับแจ้งเตือน คลิก &quot;เพิ่มอีเมลผู้รับแจ้งเตือน&quot; เพื่อเริ่มต้น
              </div>
            ) : (
              alertSubs.map((sub) => {
                let parsedTypes: string[] = [];
                try {
                  parsedTypes = JSON.parse(sub.alertTypes);
                } catch {}

                return (
                  <div
                    key={sub.id}
                    className={`p-4 bg-paper rounded-2xl border transition-all ${
                      sub.isActive ? 'border-borderCol' : 'border-borderCol/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold font-mono text-sm text-ink">{sub.email}</span>
                          {sub.name && (
                            <span className="text-[11px] font-sans text-mutedGray">({sub.name})</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-mutedGray">
                          เพิ่มเมื่อ: {new Date(sub.createdAt).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAlertActive(sub.id, sub.isActive)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                            sub.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-paper-dark text-mutedGray'
                          }`}
                        >
                          {sub.isActive ? 'ACTIVE' : 'PAUSED'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlertSubscriber(sub.id)}
                          className="p-1.5 text-mutedGray hover:text-rose-600 rounded transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-borderCol/60">
                      <span className="text-[11px] font-mono text-mutedGray block mb-1.5">
                        หมวดการแจ้งเตือนที่รับ:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_ALERTS.map((alert) => {
                          const isSubscribed = parsedTypes.includes(alert.id);
                          const Icon = alert.icon;
                          return (
                            <span
                              key={alert.id}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                                isSubscribed
                                  ? 'bg-paper-dark border border-borderCol text-ink font-semibold'
                                  : 'text-mutedGray/50 line-through'
                              }`}
                            >
                              <Icon className={`w-3 h-3 ${isSubscribed ? alert.color : ''}`} />
                              <span>{alert.id}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Alert Subscriber Modal */}
      {showAddAlertModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-paper-light border border-borderCol rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-borderCol pb-3">
              <h3 className="text-sm font-bold font-sans text-ink">เพิ่มอีเมลผู้รับ System Alert</h3>
              <button
                type="button"
                onClick={() => setShowAddAlertModal(false)}
                className="text-mutedGray hover:text-ink text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlertSubscriber} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-mutedGray mb-1">
                  ที่อยู่อีเมล (Staff Email) *
                </label>
                <input
                  type="email"
                  value={newAlertEmail}
                  onChange={(e) => setNewAlertEmail(e.target.value)}
                  placeholder="admin@ape-parel.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-paper border border-borderCol rounded-xl text-ink focus:outline-none focus:ring-1 focus:ring-warm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-mutedGray mb-1">
                  ชื่อผู้รับ / แผนก (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={newAlertName}
                  onChange={(e) => setNewAlertName(e.target.value)}
                  placeholder="Ops Team / Fraud Manager"
                  className="w-full px-3 py-2 text-xs font-mono bg-paper border border-borderCol rounded-xl text-ink focus:outline-none focus:ring-1 focus:ring-warm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-mutedGray mb-2">
                  เลือกประเภทการแจ้งเตือนที่ต้องการรับ *
                </label>
                <div className="space-y-2">
                  {AVAILABLE_ALERTS.map((alert) => {
                    const checked = newSelectedTypes.includes(alert.id);
                    return (
                      <label
                        key={alert.id}
                        className="flex items-center space-x-2 text-xs text-ink cursor-pointer p-2 rounded-lg hover:bg-paper-dark transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedTypes([...newSelectedTypes, alert.id]);
                            } else {
                              setNewSelectedTypes(newSelectedTypes.filter((t) => t !== alert.id));
                            }
                          }}
                          className="rounded border-borderCol text-ink focus:ring-warm"
                        />
                        <alert.icon className={`w-3.5 h-3.5 ${alert.color}`} />
                        <span>{alert.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-borderCol flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddAlertModal(false)}
                  className="px-3 py-1.5 text-xs font-mono text-mutedGray hover:text-ink border border-borderCol rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingAlert}
                  className="px-4 py-1.5 text-xs font-mono font-bold bg-ink text-paper rounded-xl hover:bg-ink-light flex items-center space-x-1"
                >
                  {savingAlert && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
