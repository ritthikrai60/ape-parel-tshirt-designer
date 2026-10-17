import React from 'react';
import { CustomerProfileClient } from '@/components/portal/CustomerProfileClient';

export const metadata = {
  title: 'โปรไฟล์ & ที่อยู่จัดส่ง | APE-PAREL',
  description: 'จัดการข้อมูลโปรไฟล์ลูกค้าและที่อยู่จัดส่งเริ่มต้นสำหรับคำสั่งซื้อ',
};

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-paper py-8 px-4 sm:px-6 lg:px-8">
      <CustomerProfileClient />
    </div>
  );
}
