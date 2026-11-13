import React, { useState } from 'react';
import { BookOpen, Download, Lock } from 'lucide-react';
import { getStoredToken } from '../lib/api';
import type { Product, PublicUser, Subscription } from '../types';
import type { DashboardTab } from './TopBar';

export function LaunchGuidesView({ products }: { products: Product[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[#EDF2F7]">Launch Guides</h1>
        <p className="text-xs text-[#8B98AC] mt-1">
          Preparation steps required before initializing each product loader.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-8 text-center text-xs text-[#8B98AC]">
          No launch guides published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <section
              key={product.id}
              className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-400/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-[#38BDF8]" />
                  <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
                    {product.name}
                  </h2>
                </div>
                <span className="text-xs text-[#8B98AC]">
                  {product.category} · {product.status}
                </span>
              </div>

              <ol className="space-y-2.5">
                {product.guideSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-xs text-[#CBD5E1]">
                    <span className="w-5 h-5 rounded-md bg-[#0A0D12] border border-slate-400/20 font-mono text-[11px] text-[#38BDF8] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function DownloadView({
  user,
  products,
  subscriptions,
  onNavigateTab,
}: {
  user: PublicUser;
  products: Product[];
  subscriptions: Subscription[];
  onNavigateTab: (tab: DashboardTab) => void;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlockedProducts =
    user.role === 'admin'
      ? products
      : products.filter((p) => subscriptions.some((s) => s.productId === p.id));

  async function handleDownload(product: Product) {
    setError(null);
    setDownloadingId(product.id);
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/loader/download/${product.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Download failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DMCheats-${product.name.replace(/[^a-z0-9]+/gi, '-')}-Loader.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[#EDF2F7]">Download Loader</h1>
        <p className="text-xs text-[#8B98AC] mt-1">
          Fetch the loader package for any product with an active subscription.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {unlockedProducts.length === 0 ? (
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-8 text-center space-y-3">
          <Lock className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm font-medium text-[#EDF2F7]">No active loader access</p>
          <p className="text-xs text-[#8B98AC] max-w-md mx-auto">
            Redeem a license key or purchase from the catalog with credited balance to unlock builds.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab('redeem')}
            className="mt-2 px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white transition-colors"
          >
            Redeem License Key
          </button>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unlockedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-[#11161F] border border-slate-400/15 rounded-lg p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-[#EDF2F7] truncate">{product.name}</p>
                <p className="text-xs text-[#8B98AC]">
                  {product.category} · {product.status}
                </p>
              </div>
              <button
                type="button"
                disabled={downloadingId === product.id}
                onClick={() => handleDownload(product)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-medium text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingId === product.id ? 'Preparing...' : 'Download'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
