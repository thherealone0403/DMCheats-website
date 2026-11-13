import React from 'react';
import { KeyRound, Wallet, X } from 'lucide-react';

interface TopUpModalProps {
  open: boolean;
  context?: 'topup' | 'checkout';
  onClose: () => void;
  onGoToRedeem: () => void;
}

export function TopUpModal({ open, context = 'topup', onClose, onGoToRedeem }: TopUpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#11161F] border border-slate-400/20 rounded-lg p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/15 border border-[#2563EB]/35 flex items-center justify-center text-[#38BDF8] shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
                {context === 'checkout' ? 'Insufficient Account Balance' : 'Self-Service Top-Up Disabled'}
              </h2>
              <p className="text-xs text-[#8B98AC]">Manual administrator balance crediting active</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          Automated card or crypto top-ups are not enabled yet. Balance can be credited directly by
          an administrator, or you can activate a product immediately using a license key in{' '}
          <span className="text-[#EDF2F7] font-medium">Redeem Key</span>.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-400/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs font-medium text-[#CBD5E1] hover:bg-white/[0.04] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToRedeem();
            }}
            className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white flex items-center gap-2 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Go to Redeem Key</span>
          </button>
        </div>
      </div>
    </div>
  );
}
