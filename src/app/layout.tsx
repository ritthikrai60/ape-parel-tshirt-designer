import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ape-parel | Creator-Powered Apparel Studio & Marketplace',
  description:
    'Creator-powered apparel design and production marketplace connecting Designers, Customers, and Suppliers with interactive 2D/3D customizer, server-authoritative pricing, and auditable royalty tracking.',
  keywords: [
    'ape-parel',
    'streetwear',
    'apparel design',
    '3d t-shirt customizer',
    'creator royalties',
    'dtg printing',
  ],
};

import NextAuthSessionProvider from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { SettingsModal } from '@/components/settings/SettingsModal';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CookieConsentBanner } from '@/components/pdpa/CookieConsentBanner';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full bg-paper text-ink">
      <body className="min-h-full flex flex-col font-sans antialiased bg-paper text-ink selection:bg-warm selection:text-ink">
        <NextAuthSessionProvider>
          <SettingsProvider>
            <ToastProvider>
              {/* Automated Visitor & Interaction Analytics Tracker */}
              <AnalyticsTracker />

              {/* Global Brand Navigation Bar with Multi-Role Switcher, Quick i18n & Notification Bell */}
              <Navbar />

              {/* Primary Page Canvas */}
              <main className="flex-1 flex flex-col w-full">
                {children}
              </main>

              {/* Global Brand Footer with Newsletter & Thai PDPA Links */}
              <Footer />

              {/* Central Preferences & System Settings Modal */}
              <SettingsModal />

              {/* Floating Cookie Consent Banner & PDPA Manager */}
              <CookieConsentBanner />
            </ToastProvider>
          </SettingsProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
