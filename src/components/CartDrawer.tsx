import React, { useState } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { api, formatEur } from '../lib/api';
import { DURATION_META, type CartItem, type PublicUser, type Subscription } from '../types';

interface CartDrawerProps {
  open: boolean;
  user: PublicUser;
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, durationTier: CartItem['durationTier'], delta: number) => void;
  onRemoveItem: (productId: string, durationTier: CartItem['durationTier']) => void;
  onClear: () => void;
  onCheckoutSuccess: (payload: { user: PublicUser; subscriptions: Subscription[] }) => void;
  onInsufficientBalance: () => void;
}

export function CartDrawer({
  open,
  user,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClear,
  onCheckoutSuccess,
  onInsufficientBalance,
}: CartDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const totalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const canAfford = user.balanceCents >= totalCents && items.length > 0;

  async function handleCheckout() {
    setError(null);
    if (!canAfford) {
      onInsufficientBalance();
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.checkoutCart(
        items.map((item) => ({
          productId: item.productId,
          durationTier: item.durationTier,
          quantity: item.quantity,
        }))
      );
      onClear();
      onCheckoutSuccess({ user: res.user, subscriptions: res.subscriptions });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#11161F] border-l border-slate-400/15 h-full flex flex-col">
        <div className="px-6 py-5 border-b border-slate-400/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="font-display text-base font-semibold text-[#EDF2F7]">Cart</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
              <ShoppingBag className="w-8 h-8 text-[#475569]" />
              <p className="text-sm font-medium text-[#CBD5E1]">Your cart is empty</p>
              <p className="text-xs text-[#8B98AC] max-w-xs">
                Add products from the Software Catalog to review duration pricing or check out with
                credited balance.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-400/10">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.durationTier}`}
                  className="py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-[#EDF2F7] truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[#8B98AC]">
                      {DURATION_META[item.durationTier].label} ·{' '}
                      <span className="font-mono tabular-nums text-[#CBD5E1]">
                        {formatEur(item.priceCents)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center border border-slate-400/20 rounded-md bg-[#0A0D12]">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.productId, item.durationTier, -1)}
                        aria-label="Decrease quantity"
                        className="p-1.5 text-[#8B98AC] hover:text-[#EDF2F7]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-mono text-xs tabular-nums text-[#EDF2F7]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.productId, item.durationTier, 1)}
                        aria-label="Increase quantity"
                        className="p-1.5 text-[#8B98AC] hover:text-[#EDF2F7]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId, item.durationTier)}
                      aria-label="Remove item"
                      className="text-[#8B98AC] hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-400/10 bg-[#0D1118] space-y-3">
          <div className="flex items-center justify-between text-xs text-[#8B98AC]">
            <span>Available Balance</span>
            <span className="font-mono text-emerald-400 tabular-nums">
              {formatEur(user.balanceCents)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8B98AC]">Total</span>
            <span className="font-mono text-base font-semibold text-[#EDF2F7] tabular-nums">
              {formatEur(totalCents)}
            </span>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="px-3.5 py-2.5 rounded-lg border border-slate-400/20 text-xs font-medium text-[#8B98AC] hover:text-[#EDF2F7] transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              disabled={items.length === 0 || submitting}
              onClick={handleCheckout}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-xs font-semibold text-white transition-colors"
            >
              {submitting
                ? 'Processing...'
                : canAfford
                  ? 'Purchase with Balance'
                  : 'Insufficient Balance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
