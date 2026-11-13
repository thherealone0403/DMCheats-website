import React, { useState } from 'react';
import { Check, KeyRound, Layers, ShieldCheck, ShoppingCart } from 'lucide-react';
import { formatEur } from '../lib/api';
import { resolveProductCover } from '../lib/productAssets';
import { DURATION_META, DURATION_ORDER, type DurationTier, type Product } from '../types';

interface ProductsViewProps {
  products: Product[];
  onAddToCart: (product: Product, durationTier: DurationTier, priceCents: number) => void;
  onGoToRedeem: () => void;
}

function getDefaultTier(product: Product): DurationTier {
  for (const tier of DURATION_ORDER) {
    if (product.prices[tier] !== null) return tier;
  }
  return 'd1';
}

export function ProductsView({ products, onAddToCart, onGoToRedeem }: ProductsViewProps) {
  const [selectedTiers, setSelectedTiers] = useState<Record<string, DurationTier>>({});
  const [addedKey, setAddedKey] = useState<string | null>(null);

  function handleSelectTier(productId: string, tier: DurationTier) {
    setSelectedTiers((prev) => ({ ...prev, [productId]: tier }));
  }

  function handleAdd(product: Product, tier: DurationTier, priceCents: number) {
    onAddToCart(product, tier, priceCents);
    const k = `${product.id}-${tier}`;
    setAddedKey(k);
    setTimeout(() => {
      setAddedKey((curr) => (curr === k ? null : curr));
    }, 1400);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-400/15 pb-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-[#EDF2F7] text-balance">
            Software Catalog
          </h1>
          <p className="text-sm text-[#8B98AC]">
            Choose a license duration tier to add to cart using credited balance, or redeem an issued key.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToRedeem}
          className="px-4 py-2.5 rounded-lg border border-slate-400/20 hover:border-[#38BDF8]/60 text-xs font-medium text-[#EDF2F7] inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <KeyRound className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Redeem Key</span>
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-12 text-center space-y-2">
          <Layers className="w-8 h-8 text-[#64748B] mx-auto" />
          <p className="text-sm font-medium text-[#EDF2F7]">No products published yet</p>
          <p className="text-xs text-[#8B98AC]">
            Administrators can create products and duration pricing in the Admin Console.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const coverSrc = resolveProductCover(product.coverKey);
            const activeTier = selectedTiers[product.id] || getDefaultTier(product);
            const activePrice = product.prices[activeTier];
            const availableTiers = DURATION_ORDER.filter((t) => product.prices[t] !== null);
            const statusColor =
              product.status === 'Undetected'
                ? 'text-emerald-400'
                : product.status === 'Updating'
                  ? 'text-amber-400'
                  : 'text-rose-400';

            const isAdded = addedKey === `${product.id}-${activeTier}`;

            return (
              <article
                key={product.id}
                className="bg-[#11161F] border border-slate-400/15 rounded-lg overflow-hidden flex flex-col hover:border-slate-400/30 transition-colors"
              >
                <div className="aspect-[4/3] w-full bg-[#0A0D12] border-b border-slate-400/10 relative overflow-hidden">
                  {coverSrc ? (
                    <img
                      src={coverSrc}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#0A0D12] to-[#111C2D] p-6 text-center">
                      <Layers className="w-9 h-9 text-[#38BDF8]/75 mb-2" />
                      <span className="font-display text-sm font-semibold text-[#EDF2F7]">
                        {product.name}
                      </span>
                      <span className="text-[11px] text-[#8B98AC] mt-0.5">{product.category}</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-[#8B98AC] truncate">{product.category}</span>
                      <span className={`inline-flex items-center gap-1 font-medium shrink-0 ${statusColor}`}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{product.status}</span>
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-semibold text-[#EDF2F7]">
                      {product.name}
                    </h2>

                    <p className="text-xs text-[#8B98AC] leading-relaxed line-clamp-3">
                      {product.description}
                    </p>
                  </div>

                  <div className="space-y-4 pt-3 border-t border-slate-400/10">
                    <div className="flex flex-wrap gap-1.5">
                      {availableTiers.map((tier) => {
                        const selected = tier === activeTier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => handleSelectTier(product.id, tier)}
                            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                              selected
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-[#0A0D12] border border-slate-400/15 text-[#8B98AC] hover:text-[#EDF2F7]'
                            }`}
                          >
                            {DURATION_META[tier].label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[11px] text-[#8B98AC]">
                          {DURATION_META[activeTier].label} License
                        </span>
                        <span className="font-mono text-xl font-semibold text-[#EDF2F7] tabular-nums">
                          {activePrice !== null ? formatEur(activePrice) : '—'}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={activePrice === null || product.status === 'Offline'}
                        onClick={() => activePrice !== null && handleAdd(product, activeTier, activePrice)}
                        className="px-4 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
