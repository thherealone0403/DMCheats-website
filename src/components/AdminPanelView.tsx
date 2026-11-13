import React, { useEffect, useState } from 'react';
import {
  Ban,
  Check,
  Copy,
  KeyRound,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { api, formatEur } from '../lib/api';
import {
  DURATION_META,
  DURATION_ORDER,
  type DurationTier,
  type LicenseKey,
  type Product,
  type ProductPrices,
  type ProductStatus,
  type PublicUser,
} from '../types';

interface AdminPanelViewProps {
  currentUser: PublicUser;
  products: Product[];
  onProductsChanged: (products: Product[]) => void;
  onCurrentUserUpdated: (user: PublicUser) => void;
}

type AdminSubTab = 'products' | 'keys' | 'users';

interface TierDraft {
  enabled: boolean;
  eur: string;
}

type PriceDraftMap = Record<DurationTier, TierDraft>;

function pricesToDraft(prices?: ProductPrices): PriceDraftMap {
  return {
    d1: {
      enabled: prices ? prices.d1 !== null : true,
      eur: prices?.d1 !== null && prices?.d1 !== undefined ? (prices.d1 / 100).toFixed(2) : '4.99',
    },
    d3: {
      enabled: prices ? prices.d3 !== null : true,
      eur: prices?.d3 !== null && prices?.d3 !== undefined ? (prices.d3 / 100).toFixed(2) : '9.99',
    },
    d7: {
      enabled: prices ? prices.d7 !== null : true,
      eur: prices?.d7 !== null && prices?.d7 !== undefined ? (prices.d7 / 100).toFixed(2) : '16.99',
    },
    d30: {
      enabled: prices ? prices.d30 !== null : true,
      eur: prices?.d30 !== null && prices?.d30 !== undefined ? (prices.d30 / 100).toFixed(2) : '34.99',
    },
    lifetime: {
      enabled: prices ? prices.lifetime !== null : true,
      eur:
        prices?.lifetime !== null && prices?.lifetime !== undefined
          ? (prices.lifetime / 100).toFixed(2)
          : '89.99',
    },
  };
}

function draftToCents(draft: PriceDraftMap): ProductPrices {
  const convert = (tier: DurationTier): number | null => {
    if (!draft[tier].enabled) return null;
    const val = Number(draft[tier].eur.replace(',', '.'));
    if (!Number.isFinite(val) || val < 0) {
      throw new Error(`Invalid EUR price for ${DURATION_META[tier].label}.`);
    }
    return Math.round(val * 100);
  };
  return {
    d1: convert('d1'),
    d3: convert('d3'),
    d7: convert('d7'),
    d30: convert('d30'),
    lifetime: convert('lifetime'),
  };
}

export function AdminPanelView({
  currentUser,
  products,
  onProductsChanged,
  onCurrentUserUpdated,
}: AdminPanelViewProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('products');
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Product Editor Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Software Suite');
  const [prodStatus, setProdStatus] = useState<ProductStatus>('Undetected');
  const [prodCover, setProdCover] = useState<Product['coverKey']>('custom');
  const [prodDescription, setProdDescription] = useState('');
  const [prodGuidesText, setProdGuidesText] = useState('');
  const [priceDraft, setPriceDraft] = useState<PriceDraftMap>(() => pricesToDraft());
  const [savingProduct, setSavingProduct] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Key Generator state
  const [genProductId, setGenProductId] = useState<string>(products[0]?.id || '');
  const [genDuration, setGenDuration] = useState<DurationTier>('d7');
  const [genQuantity, setGenQuantity] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [latestBatch, setLatestBatch] = useState<LicenseKey[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [keySearch, setKeySearch] = useState('');
  const [keyStatusFilter, setKeyStatusFilter] = useState<'all' | 'unused' | 'redeemed' | 'revoked'>('all');

  // Users Search & Balance Grant Modal state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [balanceTarget, setBalanceTarget] = useState<PublicUser | null>(null);
  const [balanceMode, setBalanceMode] = useState<'add' | 'set'>('add');
  const [balanceEurInput, setBalanceEurInput] = useState('10.00');
  const [balanceSaving, setBalanceSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingOverview(true);
    api
      .adminOverview()
      .then((res) => {
        if (!mounted) return;
        onProductsChanged(res.products);
        setKeys(res.keys);
        setUsers(res.users);
        if (res.products.length > 0 && !genProductId) {
          setGenProductId(res.products[0].id);
        }
      })
      .catch((err) => {
        if (mounted) {
          setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Failed to load admin data.' });
        }
      })
      .finally(() => {
        if (mounted) setLoadingOverview(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === genProductId)) {
      setGenProductId(products[0].id);
    }
  }, [products, genProductId]);

  function openCreateProduct() {
    setBanner(null);
    setEditingProduct(null);
    setProdName('');
    setProdCategory('Software Suite');
    setProdStatus('Undetected');
    setProdCover('custom');
    setProdDescription('');
    setProdGuidesText(
      'Download the DMCheats Loader from the Download tab.\nRun the loader as Administrator and select your product.'
    );
    setPriceDraft(pricesToDraft());
    setEditorOpen(true);
  }

  function openEditProduct(product: Product) {
    setBanner(null);
    setEditingProduct(product);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdStatus(product.status);
    setProdCover(product.coverKey);
    setProdDescription(product.description);
    setProdGuidesText(product.guideSteps.join('\n'));
    setPriceDraft(pricesToDraft(product.prices));
    setEditorOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setSavingProduct(true);
    try {
      const prices = draftToCents(priceDraft);
      const guideSteps = prodGuidesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (editingProduct) {
        const res = await api.adminUpdateProduct(editingProduct.id, {
          name: prodName.trim(),
          category: prodCategory.trim(),
          description: prodDescription.trim(),
          status: prodStatus,
          coverKey: prodCover,
          guideSteps,
          prices,
        });
        onProductsChanged(res.products);
        setBanner({ type: 'ok', text: `Updated "${res.product.name}" and synced storefront prices.` });
      } else {
        const res = await api.adminCreateProduct({
          name: prodName.trim(),
          category: prodCategory.trim(),
          description: prodDescription.trim(),
          status: prodStatus,
          coverKey: prodCover,
          guideSteps,
          prices,
        });
        onProductsChanged(res.products);
        setGenProductId(res.product.id);
        setBanner({ type: 'ok', text: `Created product "${res.product.name}".` });
      }
      setEditorOpen(false);
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to save product.',
      });
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    setBanner(null);
    try {
      const res = await api.adminDeleteProduct(id);
      onProductsChanged(res.products);
      setConfirmDeleteId(null);
      setBanner({ type: 'ok', text: 'Product removed from catalog.' });
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to delete product.',
      });
    }
  }

  async function handleGenerateKeys(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!genProductId) {
      setBanner({ type: 'err', text: 'Create or select a product first.' });
      return;
    }
    setGenerating(true);
    try {
      const res = await api.adminGenerateKeys({
        productId: genProductId,
        durationTier: genDuration,
        quantity: genQuantity,
      });
      setLatestBatch(res.generated);
      setKeys(res.keys);
      setBanner({
        type: 'ok',
        text: `Generated ${res.generated.length} ${DURATION_META[genDuration].label} key(s).`,
      });
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Key generation failed.',
      });
    } finally {
      setGenerating(false);
    }
  }

  function copySingle(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((curr) => (curr === code ? null : curr)), 1500);
  }

  function copyBatch() {
    const text = latestBatch.map((k) => k.code).join('\n');
    navigator.clipboard?.writeText(text);
    setCopiedCode('__BATCH__');
    setTimeout(() => setCopiedCode((curr) => (curr === '__BATCH__' ? null : curr)), 1500);
  }

  async function handleRevokeKey(id: string) {
    try {
      const res = await api.adminRevokeKey(id);
      setKeys(res.keys);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Failed to revoke key.' });
    }
  }

  async function handleDeleteKey(id: string) {
    try {
      const res = await api.adminDeleteKey(id);
      setKeys(res.keys);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Failed to delete key.' });
    }
  }

  async function handleToggleUserRole(target: PublicUser) {
    const nextRole = target.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await api.adminUpdateUserRole(target.id, nextRole);
      setUsers(res.users);
    } catch (err) {
      setBanner({ type: 'err', text: err instanceof Error ? err.message : 'Unable to update role.' });
    }
  }

  function openBalanceModal(target: PublicUser) {
    setBalanceTarget(target);
    setBalanceMode('add');
    setBalanceEurInput('10.00');
  }

  async function handleSaveBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!balanceTarget) return;
    const parsedEur = Number(balanceEurInput.replace(',', '.'));
    if (!Number.isFinite(parsedEur) || parsedEur < 0 || (balanceMode === 'add' && parsedEur === 0)) {
      setBanner({ type: 'err', text: 'Enter a valid EUR amount.' });
      return;
    }

    setBalanceSaving(true);
    try {
      const res = await api.adminUpdateUserBalance(balanceTarget.id, {
        amountCents: Math.round(parsedEur * 100),
        mode: balanceMode,
      });
      setUsers(res.users);
      if (res.updatedUser.id === currentUser.id) {
        onCurrentUserUpdated(res.updatedUser);
      }
      setBanner({ type: 'ok', text: res.message });
      setBalanceTarget(null);
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update user balance.',
      });
    } finally {
      setBalanceSaving(false);
    }
  }

  const filteredKeys = keys.filter((k) => {
    if (keyStatusFilter !== 'all' && k.status !== keyStatusFilter) return false;
    if (keySearch.trim()) {
      const q = keySearch.trim().toLowerCase();
      return (
        k.code.toLowerCase().includes(q) ||
        k.productName.toLowerCase().includes(q) ||
        (k.redeemedByEmail || '').toLowerCase().includes(q) ||
        (k.redeemedByUsername || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.discordHandle || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Admin Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-400/15 pb-4">
        <div>
          <h1 className="font-display text-xl font-bold text-[#EDF2F7]">Admin Console</h1>
          <p className="text-xs text-[#8B98AC] mt-0.5">
            Manage catalog products, multi-duration pricing, license keys, and user balances.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#11161F] border border-slate-400/15 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setSubTab('products')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'products'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#8B98AC] hover:text-[#EDF2F7]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Products ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('keys')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'keys'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#8B98AC] hover:text-[#EDF2F7]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Keys ({keys.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('users')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              subTab === 'users'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#8B98AC] hover:text-[#EDF2F7]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users ({users.length})</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-xs border flex items-center justify-between gap-3 ${
            banner.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: PRODUCT MANAGEMENT */}
      {subTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-[#8B98AC]">
              Create products and configure prices for 1 Day, 3 Days, 7 Days, 30 Days, and Lifetime.
            </p>
            <button
              type="button"
              onClick={openCreateProduct}
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Product</span>
            </button>
          </div>

          <section className="bg-[#11161F] border border-slate-400/15 rounded-lg overflow-hidden">
            {products.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Layers className="w-7 h-7 text-[#64748B] mx-auto" />
                <p className="text-sm font-medium text-[#EDF2F7]">No products created yet</p>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white"
                >
                  Create First Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400/10 text-[11px] font-medium text-[#8B98AC]">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">1 Day</th>
                      <th className="py-3 px-3 text-right">3 Days</th>
                      <th className="py-3 px-3 text-right">7 Days</th>
                      <th className="py-3 px-3 text-right">30 Days</th>
                      <th className="py-3 px-3 text-right">Lifetime</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400/10 text-xs">
                    {products.map((prod) => {
                      const statusColor =
                        prod.status === 'Undetected'
                          ? 'text-emerald-400'
                          : prod.status === 'Updating'
                            ? 'text-amber-400'
                            : 'text-rose-400';

                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 max-w-[240px]">
                            <p className="font-medium text-[#EDF2F7] truncate">{prod.name}</p>
                            <p className="text-[11px] text-[#8B98AC] truncate">{prod.category}</p>
                          </td>
                          <td className={`py-3 px-3 font-medium ${statusColor}`}>{prod.status}</td>
                          {DURATION_ORDER.map((tier) => (
                            <td
                              key={tier}
                              className="py-3 px-3 text-right font-mono tabular-nums text-[#CBD5E1]"
                            >
                              {prod.prices[tier] !== null ? formatEur(prod.prices[tier]!) : '—'}
                            </td>
                          ))}
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProduct(prod)}
                                className="px-2.5 py-1.5 rounded-md border border-slate-400/20 hover:border-[#38BDF8]/60 text-[11px] font-medium text-[#EDF2F7] inline-flex items-center gap-1 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit</span>
                              </button>

                              {confirmDeleteId === prod.id ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-[11px] font-medium text-white"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded border border-slate-400/20 text-[11px] text-[#8B98AC]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(prod.id)}
                                  aria-label={`Delete ${prod.name}`}
                                  className="p-1.5 rounded-md text-[#8B98AC] hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: KEY GENERATOR & REGISTRY */}
      {subTab === 'keys' && (
        <div className="space-y-6">
          <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 space-y-5">
            <div>
              <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
                Generate License Keys
              </h2>
              <p className="text-xs text-[#8B98AC] mt-0.5">
                Issue single or batch keys for 1 Day, 3 Days, 7 Days, 30 Days, or Lifetime access.
              </p>
            </div>

            <form onSubmit={handleGenerateKeys} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="gen-product" className="block text-xs font-medium text-[#CBD5E1]">
                  Product
                </label>
                <select
                  id="gen-product"
                  value={genProductId}
                  onChange={(e) => setGenProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-duration" className="block text-xs font-medium text-[#CBD5E1]">
                  Duration
                </label>
                <select
                  id="gen-duration"
                  value={genDuration}
                  onChange={(e) => setGenDuration(e.target.value as DurationTier)}
                  className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                >
                  {DURATION_ORDER.map((tier) => (
                    <option key={tier} value={tier}>
                      {DURATION_META[tier].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gen-qty" className="block text-xs font-medium text-[#CBD5E1]">
                  Quantity (1–50)
                </label>
                <div className="flex gap-2">
                  <input
                    id="gen-qty"
                    type="number"
                    min={1}
                    max={50}
                    value={genQuantity}
                    onChange={(e) =>
                      setGenQuantity(Math.min(50, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="w-20 h-10 px-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none font-mono text-sm text-[#EDF2F7] tabular-nums"
                  />
                  <button
                    type="submit"
                    disabled={generating || products.length === 0}
                    className="flex-1 h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-xs font-semibold text-white whitespace-nowrap transition-colors"
                  >
                    {generating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </form>

            {latestBatch.length > 0 && (
              <div className="border-t border-slate-400/10 pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-400">
                    Newly Generated Keys ({latestBatch.length})
                  </span>
                  <button
                    type="button"
                    onClick={copyBatch}
                    className="text-xs text-[#38BDF8] hover:underline inline-flex items-center gap-1"
                  >
                    {copiedCode === '__BATCH__' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied All</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {latestBatch.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 py-2 rounded-lg bg-[#0A0D12] border border-slate-400/15 flex items-center justify-between gap-2"
                    >
                      <code className="font-mono text-xs text-[#EDF2F7]">{item.code}</code>
                      <button
                        type="button"
                        onClick={() => copySingle(item.code)}
                        aria-label="Copy key"
                        className="text-[#8B98AC] hover:text-[#EDF2F7]"
                      >
                        {copiedCode === item.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-[#11161F] border border-slate-400/15 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-400/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#8B98AC] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={keySearch}
                  onChange={(e) => setKeySearch(e.target.value)}
                  placeholder="Search keys, products, emails..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0A0D12] border border-slate-400/15 focus:border-[#38BDF8] focus:outline-none text-xs text-[#EDF2F7] placeholder:text-[#475569]"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#0A0D12] border border-slate-400/15 rounded-lg w-fit">
                {(['all', 'unused', 'redeemed', 'revoked'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setKeyStatusFilter(status)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                      keyStatusFilter === status
                        ? 'bg-[#171E2A] text-[#EDF2F7]'
                        : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {loadingOverview ? (
              <div className="p-8 text-center text-xs text-[#8B98AC]">Loading key registry...</div>
            ) : filteredKeys.length === 0 ? (
              <div className="p-10 text-center text-xs text-[#8B98AC]">
                No keys match the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400/10 text-[11px] font-medium text-[#8B98AC]">
                      <th className="py-3 px-4">Key Code</th>
                      <th className="py-3 px-3">Product</th>
                      <th className="py-3 px-3">Duration</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Redeemed By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400/10 text-xs">
                    {filteredKeys.map((item) => {
                      const statusColor =
                        item.status === 'unused'
                          ? 'text-emerald-400'
                          : item.status === 'redeemed'
                            ? 'text-[#38BDF8]'
                            : 'text-rose-400';

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-mono text-[#EDF2F7] whitespace-nowrap">
                            {item.code}
                          </td>
                          <td className="py-2.5 px-3 text-[#CBD5E1]">{item.productName}</td>
                          <td className="py-2.5 px-3 text-[#8B98AC]">
                            {DURATION_META[item.durationTier].label}
                          </td>
                          <td className={`py-2.5 px-3 font-medium capitalize ${statusColor}`}>
                            {item.status}
                          </td>
                          <td className="py-2.5 px-3 text-[#8B98AC]">
                            {item.redeemedByEmail || '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => copySingle(item.code)}
                                aria-label="Copy key"
                                className="p-1.5 text-[#8B98AC] hover:text-[#EDF2F7]"
                              >
                                {copiedCode === item.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {item.status === 'unused' && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeKey(item.id)}
                                  title="Revoke key"
                                  className="p-1.5 text-[#8B98AC] hover:text-amber-400"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteKey(item.id)}
                                title="Delete key"
                                className="p-1.5 text-[#8B98AC] hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: USERS DIRECTORY + SEARCH + GIVE BALANCE */}
      {subTab === 'users' && (
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-400/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#8B98AC] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0A0D12] border border-slate-400/15 focus:border-[#38BDF8] focus:outline-none text-xs text-[#EDF2F7] placeholder:text-[#475569]"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-[#0A0D12] border border-slate-400/15 rounded-lg w-fit">
              {(['all', 'admin', 'user'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors ${
                    userRoleFilter === role
                      ? 'bg-[#171E2A] text-[#EDF2F7]'
                      : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                  }`}
                >
                  {role === 'user' ? 'Customers' : role === 'admin' ? 'Admins' : 'All'}
                </button>
              ))}
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#8B98AC]">
              No users match &ldquo;{userSearch}&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-400/10 text-[11px] font-medium text-[#8B98AC]">
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-3 text-right">Active Subs</th>
                    <th className="py-3 px-3">Discord</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400/10 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-medium text-[#EDF2F7]">{u.username}</td>
                      <td className="py-3 px-3 text-[#CBD5E1]">{u.email}</td>
                      <td
                        className={`py-3 px-3 font-medium capitalize ${
                          u.role === 'admin' ? 'text-[#38BDF8]' : 'text-[#8B98AC]'
                        }`}
                      >
                        {u.role}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-400">
                        {formatEur(u.balanceCents)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#EDF2F7]">
                        {u.activeSubscriptionsCount ?? 0}
                      </td>
                      <td className="py-3 px-3 text-[#8B98AC]">{u.discordHandle || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openBalanceModal(u)}
                            className="px-2.5 py-1 rounded border border-emerald-500/30 hover:border-emerald-400/70 bg-emerald-500/10 text-[11px] font-medium text-emerald-300 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Give Balance</span>
                          </button>

                          {u.id === currentUser.id ? (
                            <span className="text-[11px] text-[#64748B] px-1">You</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              className="px-2.5 py-1 rounded border border-slate-400/20 hover:border-[#38BDF8]/60 text-[11px] text-[#CBD5E1] transition-colors whitespace-nowrap"
                            >
                              {u.role === 'admin' ? 'Set Customer' : 'Make Admin'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* GIVE / ADJUST USER BALANCE MODAL */}
      {balanceTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#11161F] border border-slate-400/20 rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-400/10 pb-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
                  Give Balance to {balanceTarget.username}
                </h2>
                <p className="text-xs text-[#8B98AC]">
                  {balanceTarget.email} · Current:{' '}
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {formatEur(balanceTarget.balanceCents)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBalanceTarget(null)}
                className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#0A0D12] border border-slate-400/15 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBalanceMode('add')}
                  className={`py-1.5 rounded text-xs font-medium transition-colors ${
                    balanceMode === 'add'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                  }`}
                >
                  Add Funds (+)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceMode('set')}
                  className={`py-1.5 rounded text-xs font-medium transition-colors ${
                    balanceMode === 'set'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                  }`}
                >
                  Set Exact Balance (=)
                </button>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="balance-eur" className="block text-xs font-medium text-[#CBD5E1]">
                  Amount (EUR)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[#8B98AC]">
                    €
                  </span>
                  <input
                    id="balance-eur"
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceEurInput}
                    onChange={(e) => setBalanceEurInput(e.target.value)}
                    required
                    className="w-full h-11 pl-8 pr-4 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none font-mono text-sm text-[#EDF2F7] tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {['5.00', '10.00', '25.00', '50.00', '100.00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBalanceEurInput(preset)}
                    className="px-2.5 py-1 rounded bg-[#0A0D12] border border-slate-400/15 hover:border-[#38BDF8]/60 font-mono text-xs text-[#CBD5E1] tabular-nums"
                  >
                    €{preset}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-400/10">
                <button
                  type="button"
                  onClick={() => setBalanceTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs font-medium text-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={balanceSaving}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {balanceSaving
                    ? 'Applying...'
                    : balanceMode === 'add'
                      ? 'Add Balance'
                      : 'Set Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#11161F] border border-slate-400/20 rounded-lg p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-400/10 pb-3">
              <div>
                <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
                </h2>
                <p className="text-xs text-[#8B98AC]">
                  Define product details and EUR pricing for each key duration tier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="prod-name" className="block text-xs font-medium text-[#CBD5E1]">
                    Product Name
                  </label>
                  <input
                    id="prod-name"
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="e.g. Apex Internal Suite"
                    required
                    minLength={2}
                    className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prod-cat" className="block text-xs font-medium text-[#CBD5E1]">
                    Category
                  </label>
                  <input
                    id="prod-cat"
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. FiveM Suite"
                    required
                    className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prod-status" className="block text-xs font-medium text-[#CBD5E1]">
                    Operational Status
                  </label>
                  <select
                    id="prod-status"
                    value={prodStatus}
                    onChange={(e) => setProdStatus(e.target.value as ProductStatus)}
                    className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                  >
                    <option value="Undetected">Undetected</option>
                    <option value="Updating">Updating</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="prod-cover" className="block text-xs font-medium text-[#CBD5E1]">
                    Storefront Artwork
                  </label>
                  <select
                    id="prod-cover"
                    value={prodCover}
                    onChange={(e) => setProdCover(e.target.value as Product['coverKey'])}
                    className="w-full h-10 px-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                  >
                    <option value="custom">Minimal Architectural Card</option>
                    <option value="executor">Geometric Grid Artwork</option>
                    <option value="vanity">Carbon Monolith Artwork</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-desc" className="block text-xs font-medium text-[#CBD5E1]">
                  Description
                </label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="Describe features, compatibility, and loader behavior..."
                  required
                  className="w-full p-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                />
              </div>

              <div className="space-y-2.5 border-t border-slate-400/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#EDF2F7]">
                    Duration Tier Pricing (EUR)
                  </span>
                  <span className="text-[11px] text-[#8B98AC]">
                    Toggle durations on/off and adjust prices anytime
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {DURATION_ORDER.map((tier) => {
                    const entry = priceDraft[tier];
                    return (
                      <div
                        key={tier}
                        className={`p-3 rounded-lg border transition-colors ${
                          entry.enabled
                            ? 'bg-[#0A0D12] border-slate-400/20'
                            : 'bg-[#0A0D12]/40 border-slate-400/5 opacity-60'
                        }`}
                      >
                        <label className="flex items-center justify-between gap-2 text-xs font-medium text-[#CBD5E1] mb-2 cursor-pointer">
                          <span>{DURATION_META[tier].label}</span>
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={(e) =>
                              setPriceDraft((prev) => ({
                                ...prev,
                                [tier]: { ...prev[tier], enabled: e.target.checked },
                              }))
                            }
                            className="accent-[#2563EB]"
                          />
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8B98AC]">
                            €
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!entry.enabled}
                            value={entry.eur}
                            onChange={(e) =>
                              setPriceDraft((prev) => ({
                                ...prev,
                                [tier]: { ...prev[tier], eur: e.target.value },
                              }))
                            }
                            className="w-full h-9 pl-6 pr-2 rounded bg-[#11161F] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none font-mono text-xs text-[#EDF2F7] tabular-nums"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prod-guides" className="block text-xs font-medium text-[#CBD5E1]">
                  Launch Guide Steps (one step per line)
                </label>
                <textarea
                  id="prod-guides"
                  rows={3}
                  value={prodGuidesText}
                  onChange={(e) => setProdGuidesText(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-xs text-[#CBD5E1]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-400/10">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs font-medium text-[#CBD5E1] hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {savingProduct
                    ? 'Saving...'
                    : editingProduct
                      ? 'Save Changes'
                      : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
