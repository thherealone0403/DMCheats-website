import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, Shield, ShoppingCart } from 'lucide-react';
import { formatEur } from '../lib/api';
import type { PublicUser } from '../types';

export type MainSection = 'products' | 'dashboard';
export type DashboardTab =
  | 'overview'
  | 'redeem'
  | 'guides'
  | 'download'
  | 'settings'
  | 'admin';

interface TopBarProps {
  user: PublicUser;
  section: MainSection;
  cartCount: number;
  onNavigateSection: (section: MainSection, tab?: DashboardTab) => void;
  onOpenCart: () => void;
  onLogout: () => void;
}

export function TopBar({
  user,
  section,
  cartCount,
  onNavigateSection,
  onOpenCart,
  onLogout,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-400/15 bg-[#0A0D12]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigateSection('dashboard', 'overview')}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center text-white font-display font-bold text-xs">
            D
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#EDF2F7]">
            DMCheats
          </span>
        </button>

        {/* Zone 2: Clean single-line navigation */}
        <nav className="flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => onNavigateSection('dashboard', 'overview')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
              section === 'dashboard'
                ? 'text-[#EDF2F7] border-[#38BDF8]'
                : 'text-[#8B98AC] border-transparent hover:text-[#EDF2F7]'
            }`}
          >
            Workspace
          </button>

          <button
            type="button"
            onClick={() => onNavigateSection('products')}
            className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
              section === 'products'
                ? 'text-[#EDF2F7] border-[#38BDF8]'
                : 'text-[#8B98AC] border-transparent hover:text-[#EDF2F7]'
            }`}
          >
            Products
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-1.5 text-[#8B98AC] hover:text-[#EDF2F7] transition-colors whitespace-nowrap shrink-0 py-1"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="font-mono text-xs text-[#38BDF8] tabular-nums">({cartCount})</span>
            )}
          </button>
        </nav>

        {/* Zone 3: Account dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-[#11161F] border border-slate-400/15 hover:border-slate-400/30 transition-colors whitespace-nowrap shrink-0"
          >
            <span className="w-6 h-6 rounded-md bg-[#2563EB]/25 text-[#38BDF8] text-xs font-semibold flex items-center justify-center">
              {initial}
            </span>
            <span className="text-xs font-semibold text-[#EDF2F7] max-w-[120px] truncate">
              {user.username}
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-mono text-xs text-emerald-400 tabular-nums">
              {formatEur(user.balanceCents)}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8B98AC]" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-[#11161F] border border-slate-400/20 shadow-2xl shadow-black/60 py-1.5 z-50">
              <div className="px-3.5 py-2 border-b border-slate-400/10">
                <p className="text-xs font-semibold text-[#EDF2F7] truncate">{user.username}</p>
                <p className="text-[11px] text-[#8B98AC] truncate">{user.email}</p>
              </div>

              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigateSection('dashboard', 'admin');
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-[#38BDF8] hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigateSection('dashboard', 'settings');
                }}
                className="w-full px-3.5 py-2 text-left text-xs text-[#CBD5E1] hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-[#8B98AC]" />
                <span>Account Settings</span>
              </button>

              <div className="border-t border-slate-400/10 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-white/[0.04] flex items-center gap-2.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
