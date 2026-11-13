import React from 'react';
import {
  BookOpen,
  Download,
  KeyRound,
  LayoutGrid,
  Settings,
  Shield,
} from 'lucide-react';
import { formatEur } from '../lib/api';
import type { PublicUser } from '../types';
import type { DashboardTab } from './TopBar';

interface DashboardShellProps {
  user: PublicUser;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  activeTab,
  onSelectTab,
  children,
}: DashboardShellProps) {
  const navItems: Array<{
    id: DashboardTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'redeem', label: 'Redeem Key', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'guides', label: 'Launch Guides', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'download', label: 'Download', icon: <Download className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Console', icon: <Shield className="w-4 h-4" />, adminOnly: true },
  ];

  const visibleItems = navItems.filter((item) => !item.adminOnly || user.role === 'admin');
  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* Left Navigation Rail (No Orders Tab) */}
      <aside className="w-full lg:w-[236px] shrink-0 space-y-4">
        <nav
          aria-label="Workspace Navigation"
          className="bg-[#11161F] border border-slate-400/15 rounded-lg p-2 flex lg:flex-col gap-1 overflow-x-auto"
        >
          {visibleItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  active
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#EDF2F7]'
                }`}
              >
                <span className={active ? 'text-white' : 'text-[#64748B]'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Compact Member Identity Footer Card */}
        <div className="bg-[#11161F] border border-slate-400/15 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-md bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#38BDF8] font-semibold text-xs flex items-center justify-center shrink-0">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#EDF2F7] truncate">{user.username}</p>
              <p className="text-[11px] text-[#8B98AC] capitalize">
                {user.role === 'admin' ? 'Administrator' : 'Member Account'}
              </p>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-400/10 flex items-center justify-between text-xs">
            <span className="text-[#8B98AC]">Balance</span>
            <span className="font-mono font-semibold text-emerald-400 tabular-nums">
              {formatEur(user.balanceCents)}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full">{children}</main>
    </div>
  );
}
