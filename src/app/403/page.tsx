import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '403 Forbidden | ape-parel',
  description: 'You do not have permission to access this page.',
};

export default function ForbiddenPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-6xl font-bold text-zinc-200 dark:text-zinc-700 select-none mb-2">403</p>
      <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100 mb-3">
        Access Denied
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้ หากคิดว่านี่คือข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          กลับหน้าแรก
        </Link>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          เข้าสู่ระบบใหม่
        </Link>
      </div>
    </div>
  );
}
