import React, { useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import type { Order, PublicUser, Subscription } from '../types';

interface RedeemKeyViewProps {
  onRedeemed: (payload: {
    user: PublicUser;
    subscriptions: Subscription[];
    orders: Order[];
  }) => void;
}

function formatKeyInput(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  return parts.join('-');
}

export function RedeemKeyView({ onRedeemed }: RedeemKeyViewProps) {
  const [keyCode, setKeyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!keyCode.trim()) {
      setError('Please enter a license key.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.redeemKey(keyCode.trim());
      setSuccess(res.message);
      setKeyCode('');
      onRedeemed({
        user: res.user,
        subscriptions: res.subscriptions,
        orders: res.orders,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to redeem key.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[#EDF2F7]">License Key Activation</h1>
        <p className="text-xs text-[#8B98AC] mt-1">
          Enter a 16-character key issued by an administrator to activate or extend software access.
        </p>
      </div>

      <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 space-y-5">
        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-2.5">
          <label htmlFor="redeem-key-input" className="block text-xs font-medium text-[#CBD5E1]">
            License Key Code
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="redeem-key-input"
                type="text"
                value={keyCode}
                onChange={(e) => setKeyCode(formatKeyInput(e.target.value))}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                spellCheck={false}
                autoComplete="off"
                className="w-full h-11 pl-10 pr-4 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none font-mono text-sm tracking-widest text-[#EDF2F7] placeholder:text-[#475569]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || keyCode.trim().length < 19}
              className="h-11 px-6 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              {loading ? 'Activating...' : 'Activate Key'}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-400/10 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#8B98AC]">
          <div>
            <p className="font-semibold text-[#CBD5E1]">Stackable Durations</p>
            <p className="mt-0.5 leading-relaxed">
              Redeeming a 1-day, 3-day, 7-day, or 30-day key adds onto any active timer for the same product.
            </p>
          </div>
          <div>
            <p className="font-semibold text-[#CBD5E1]">Instant Loader Access</p>
            <p className="mt-0.5 leading-relaxed">
              Once activated, the product loader unlocks immediately under your Download tab.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
