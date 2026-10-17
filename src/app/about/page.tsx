'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Palette,
  Factory,
  Sparkles,
  ArrowRight,
  Code2,
  Lock,
  Layers,
  Cpu,
  CheckCircle2,
  Compass,
  Shirt,
  History,
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, APP_CODENAME, APP_CORE_STACK } from '@/lib/version';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      {/* Hero Section */}
      <section className="border-b border-borderCol bg-paper-dark/20 py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-ink text-paper text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-warm" />
            <span>Platform Manifesto & Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight font-mono text-ink leading-tight">
            APE-PAREL // The Streetwear IP & DTG Protocol
          </h1>

          <p className="text-base sm:text-lg text-mutedGray font-sans leading-relaxed max-w-3xl">
            A neutral, industrial-grade custom streetwear platform connecting independent graphic creators,
            discerning streetwear enthusiasts, and verified direct-to-garment (DTG) print houses under
            cryptographically verifiable licensing and double-entry escrow accounting.
          </p>

          {/* Version & Build Pill */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/changelog"
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-borderCol bg-paper hover:bg-paper-dark hover:border-ink transition-colors font-mono text-xs shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-bold">{APP_VERSION}</span>
              <span className="text-mutedGray">({APP_CODENAME})</span>
              <ArrowRight className="w-3.5 h-3.5 text-mutedGray ml-1" />
            </Link>
            <span className="font-mono text-xs text-mutedGray border border-borderCol/60 px-3 py-1.5 rounded-lg">
              Built on {APP_BUILD_DATE}
            </span>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="border-b border-borderCol pb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-warm-dark block">
            ECOSYSTEM DESIGN
          </span>
          <h2 className="text-2xl sm:text-3xl font-mono font-black uppercase tracking-tight">
            The Three Pillars of APE-PAREL
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Creators */}
          <div className="p-6 bg-paper border border-borderCol rounded-xl space-y-4 shadow-sm hover:border-ink transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-mono font-bold uppercase">
              1. Creators & Dual-Scope Licensing
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              We empower artists with flexible monetization models. Creators can offer artwork either on a
              per-garment royalty basis (e.g. ฿120/piece) or a permanent Lifetime Buyout (e.g. ฿1,200 flat).
            </p>
            <ul className="text-xs font-mono space-y-2 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>14-day escrow royalty protection</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>SHA-256 digital provenance certificates</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero-royalty reorders for lifetime license owners</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: DTG Suppliers */}
          <div className="p-6 bg-paper border border-borderCol rounded-xl space-y-4 shadow-sm hover:border-ink transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Factory className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-mono font-bold uppercase">
              2. Audited DTG Suppliers & Craft
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              Every production partner must pass strict KYB verification (DBD Juristic Certificate, PP.20 VAT,
              passbook, and sample print audit) before accepting print orders.
            </p>
            <ul className="text-xs font-mono space-y-2 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Automated Vector Production Blueprints</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>OEKO-TEX certified pigment ink standards</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Heavyweight 240 GSM & 200 GSM Combed Cotton</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3: Shoppers */}
          <div className="p-6 bg-paper border border-borderCol rounded-xl space-y-4 shadow-sm hover:border-ink transition-all">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-mono font-bold uppercase">
              3. Shoppers & 3D Interactive Studio
            </h3>
            <p className="text-xs text-mutedGray font-sans leading-relaxed">
              Experience streetwear customisation in full WebGL 3D. Inspect fabrics, rotate apparel in real-time,
              and review authoritative licensing transparently at checkout.
            </p>
            <ul className="text-xs font-mono space-y-2 text-ink/80 pt-2 border-t border-borderCol/60">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Real-time Three.js 360° orbit customizer</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Permanent Design Vault for 1-click reorders</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Direct order tracking & live shop chat</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tech Specifications Matrix */}
      <section className="bg-paper-dark/30 border-y border-borderCol py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-warm-dark block">
              INFRASTRUCTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-mono font-black uppercase tracking-tight">
              Platform Engineering Specifications
            </h2>
            <p className="text-xs text-mutedGray font-sans mt-1">
              Built on modern high-concurrency web standards with financial-grade ledger security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {APP_CORE_STACK.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-paper border border-borderCol rounded-lg flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] text-mutedGray uppercase tracking-wider block">
                    {item.name}
                  </span>
                  <span className="font-bold text-ink">{item.value}</span>
                </div>
                <Code2 className="w-4 h-4 text-warm-dark" />
              </div>
            ))}
            <div className="p-4 bg-paper border border-borderCol rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-mutedGray uppercase tracking-wider block">
                  Current Engine
                </span>
                <span className="font-bold text-ink">{APP_VERSION}</span>
              </div>
              <Cpu className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="p-8 sm:p-10 bg-ink text-paper rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-mono font-black uppercase tracking-tight">
              Ready to craft your custom streetwear?
            </h3>
            <p className="text-xs text-paper-dark/80 font-sans max-w-lg">
              Launch our 3D Studio to build your piece, browse curated graphic artworks from top street artists,
              or review the platform release timeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/studio/new"
              className="px-5 py-2.5 rounded-lg bg-warm text-ink font-mono text-xs font-bold uppercase tracking-wider hover:bg-warm-light transition-colors flex items-center space-x-2"
            >
              <Shirt className="w-4 h-4" />
              <span>Launch Studio</span>
            </Link>
            <Link
              href="/marketplace"
              className="px-5 py-2.5 rounded-lg border border-paper/30 text-paper hover:bg-paper/10 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-2"
            >
              <Compass className="w-4 h-4" />
              <span>Marketplace</span>
            </Link>
            <Link
              href="/changelog"
              className="px-5 py-2.5 rounded-lg border border-paper/30 text-paper hover:bg-paper/10 font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span>Changelog</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
