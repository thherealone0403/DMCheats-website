import React from 'react';
import { ArrowRight, BookOpen, Download, KeyRound, Plus, ShieldCheck } from 'lucide-react';
import { formatEur } from '../lib/api';
import type { PublicUser, Subscription } from '../types';
import type { DashboardTab } from './TopBar';

interface OverviewViewProps {
  user: PublicUser;
  subscriptions: Subscription[];
  onNavigateTab: (tab: DashboardTab) => void;
  onOpenProducts: () => void;
  onOpenTopUp: () => void;
}

function formatRemaining(expiresAt: string | null): string {
  if (expiresAt === null) return 'Lifetime';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return days === 1 ? '1 day left' : `${days} days left`;
}

function formatDateEu(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

export function OverviewView({
  user,
  subscriptions,
  onNavigateTab,
  onOpenProducts,
  onOpenTopUp,
}: OverviewViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-400/15 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#EDF2F7] text-balance">
            {user.username}&apos;s Workspace
          </h1>
          <p className="text-xs text-[#8B98AC] mt-1">
            Monitor active software access, review your credited balance, and launch builds.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenProducts}
            className="px-4 py-2 rounded-lg border border-slate-400/20 hover:border-slate-400/40 text-xs font-medium text-[#EDF2F7] transition-colors whitespace-nowrap"
          >
            Browse Products
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('redeem')}
            className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Redeem Key</span>
          </button>
        </div>
      </section>

      {/* 3-Column Metrics Strip (No Orders Metric) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-5 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[#8B98AC]">Account Balance</span>
            <p className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums">
              {formatEur(user.balanceCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTopUp}
            className="px-3 py-1.5 rounded-md bg-[#171E2A] border border-slate-400/20 hover:border-[#38BDF8]/60 text-[11px] font-medium text-[#EDF2F7] inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3 text-[#38BDF8]" />
            <span>Top Up</span>
          </button>
        </div>

        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-5 space-y-1">
          <span className="text-xs font-medium text-[#8B98AC]">Active Subscriptions</span>
          <p className="font-mono text-2xl font-semibold text-[#38BDF8] tabular-nums">
            {subscriptions.length}
          </p>
        </div>

        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-5 space-y-1">
          <span className="text-xs font-medium text-[#8B98AC]">Member Since</span>
          <p className="font-mono text-xl font-semibold text-[#EDF2F7] tabular-nums">
            {formatDateEu(user.createdAt)}
          </p>
        </div>
      </section>

      {/* Asymmetric 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Subscriptions Table */}
        <section className="lg:col-span-8 bg-[#11161F] border border-slate-400/15 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-400/10 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
              Active Licenses
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('download')}
              className="text-xs font-medium text-[#38BDF8] hover:underline inline-flex items-center gap-1"
            >
              <span>Download Loader</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm font-medium text-[#CBD5E1]">No active subscriptions</p>
              <p className="text-xs text-[#8B98AC] max-w-md mx-auto">
                Redeem an admin-issued license key or use your credited account balance in the
                storefront to unlock software access.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateTab('redeem')}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white"
                >
                  Redeem Product Key
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-400/10">
              {subscriptions.map((sub) => {
                const statusColor =
                  sub.productStatus === 'Undetected'
                    ? 'text-emerald-400'
                    : sub.productStatus === 'Updating'
                      ? 'text-amber-400'
                      : 'text-rose-400';

                return (
                  <div
                    key={sub.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-semibold text-[#EDF2F7] truncate">
                        {sub.productName}
                      </p>
                      <p className="font-mono text-xs text-[#8B98AC] tabular-nums">
                        {formatRemaining(sub.expiresAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{sub.productStatus}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('download')}
                        className="px-3 py-1.5 rounded-md border border-slate-400/20 hover:border-[#38BDF8]/60 text-xs font-medium text-[#EDF2F7] transition-colors"
                      >
                        Launch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Quick Setup Checklist */}
        <section className="lg:col-span-4 bg-[#11161F] border border-slate-400/15 rounded-lg p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
            Setup Checklist
          </h2>

          <div className="space-y-3 text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('redeem')}
              className="w-full p-3 rounded-lg bg-[#0A0D12] border border-slate-400/15 hover:border-[#38BDF8]/50 text-left flex items-start gap-3 transition-colors"
            >
              <KeyRound className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#EDF2F7]">01. Activate License</p>
                <p className="text-[#8B98AC] mt-0.5">Redeem a key or spend credited balance.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('download')}
              className="w-full p-3 rounded-lg bg-[#0A0D12] border border-slate-400/15 hover:border-[#38BDF8]/50 text-left flex items-start gap-3 transition-colors"
            >
              <Download className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#EDF2F7]">02. Fetch Loader</p>
                <p className="text-[#8B98AC] mt-0.5">Download the latest build for your PC.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('guides')}
              className="w-full p-3 rounded-lg bg-[#0A0D12] border border-slate-400/15 hover:border-[#38BDF8]/50 text-left flex items-start gap-3 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#EDF2F7]">03. Review Launch Guide</p>
                <p className="text-[#8B98AC] mt-0.5">Verify preparation steps before running.</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
