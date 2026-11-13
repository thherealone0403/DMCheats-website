import React, { useState } from 'react';
import { CheckCircle2, KeyRound, MessageSquare, ShieldCheck, UserCog, X } from 'lucide-react';
import { api } from '../lib/api';
import type { PublicUser } from '../types';

interface SettingsViewProps {
  user: PublicUser;
  onUserUpdated: (user: PublicUser) => void;
}

export function SettingsView({ user, onUserUpdated }: SettingsViewProps) {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [tfaModalOpen, setTfaModalOpen] = useState(false);
  const [tfaSetup, setTfaSetup] = useState<{
    secret: string;
    otpauthUri: string;
    currentCode: string;
  } | null>(null);
  const [tfaVerifyCode, setTfaVerifyCode] = useState('');
  const [tfaDisablePassword, setTfaDisablePassword] = useState('');
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaError, setTfaError] = useState<string | null>(null);

  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const [discordInput, setDiscordInput] = useState(user.discordHandle || '');
  const [discordLoading, setDiscordLoading] = useState(false);
  const [discordMsg, setDiscordMsg] = useState<string | null>(null);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      const res = await api.updateProfile({
        email: email.trim(),
        username: username.trim(),
      });
      onUserUpdated(res.user);
      setProfileMsg({ type: 'ok', text: res.message });
    } catch (err) {
      setProfileMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update profile.',
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await api.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'ok', text: res.message });
    } catch (err) {
      setPasswordMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to change password.',
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function openTfaManage() {
    setTfaError(null);
    setTfaVerifyCode('');
    setTfaDisablePassword('');
    setTfaModalOpen(true);

    if (!user.twoFactorEnabled) {
      setTfaLoading(true);
      try {
        const setup = await api.setup2fa();
        setTfaSetup(setup);
      } catch (err) {
        setTfaError(err instanceof Error ? err.message : 'Failed to initialize 2FA.');
      } finally {
        setTfaLoading(false);
      }
    }
  }

  async function handleEnableTfa(e: React.FormEvent) {
    e.preventDefault();
    setTfaError(null);
    setTfaLoading(true);
    try {
      const res = await api.enable2fa(tfaVerifyCode.trim());
      onUserUpdated(res.user);
      setTfaModalOpen(false);
      setTfaSetup(null);
    } catch (err) {
      setTfaError(err instanceof Error ? err.message : 'Invalid 2FA code.');
    } finally {
      setTfaLoading(false);
    }
  }

  async function handleDisableTfa(e: React.FormEvent) {
    e.preventDefault();
    setTfaError(null);
    setTfaLoading(true);
    try {
      const res = await api.disable2fa(tfaDisablePassword);
      onUserUpdated(res.user);
      setTfaModalOpen(false);
    } catch (err) {
      setTfaError(err instanceof Error ? err.message : 'Unable to disable 2FA.');
    } finally {
      setTfaLoading(false);
    }
  }

  async function handleLinkDiscord(e: React.FormEvent) {
    e.preventDefault();
    setDiscordLoading(true);
    setDiscordMsg(null);
    try {
      const res = await api.updateDiscord({ action: 'link', handle: discordInput.trim() });
      onUserUpdated(res.user);
      setDiscordModalOpen(false);
    } catch (err) {
      setDiscordMsg(err instanceof Error ? err.message : 'Unable to link Discord.');
    } finally {
      setDiscordLoading(false);
    }
  }

  async function handleUnlinkDiscord() {
    setDiscordLoading(true);
    try {
      const res = await api.updateDiscord({ action: 'unlink' });
      onUserUpdated(res.user);
      setDiscordInput('');
    } finally {
      setDiscordLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[#EDF2F7]">Account Settings</h1>
        <p className="text-xs text-[#8B98AC] mt-1">
          Manage your login credentials, two-factor authentication, and linked community roles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Profile & Email */}
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-400/10 pb-3">
            <UserCog className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
              Identity &amp; Email
            </h2>
          </div>

          {profileMsg && (
            <div
              className={`rounded-lg px-3.5 py-2.5 text-xs border ${
                profileMsg.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="settings-username" className="block text-xs font-medium text-[#CBD5E1]">
                Username
              </label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={24}
                required
                className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings-email" className="block text-xs font-medium text-[#CBD5E1]">
                Email Address
              </label>
              <input
                id="settings-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
              >
                {profileSaving ? 'Saving...' : 'Save Identity'}
              </button>
            </div>
          </form>
        </section>

        {/* Password Update */}
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-400/10 pb-3">
            <KeyRound className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
              Password Security
            </h2>
          </div>

          {passwordMsg && (
            <div
              className={`rounded-lg px-3.5 py-2.5 text-xs border ${
                passwordMsg.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="curr-pass" className="block text-xs font-medium text-[#CBD5E1]">
                Current Password
              </label>
              <input
                id="curr-pass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="new-pass" className="block text-xs font-medium text-[#CBD5E1]">
                  New Password
                </label>
                <input
                  id="new-pass"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-pass" className="block text-xs font-medium text-[#CBD5E1]">
                  Confirm Password
                </label>
                <input
                  id="confirm-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>

        {/* Two-Factor Authentication */}
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
              <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
                Two-Factor Authentication (2FA)
              </h2>
            </div>
            <p className="text-xs text-[#8B98AC] leading-relaxed">
              Require a time-based 6-digit authenticator code alongside your password at login.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs">
              <CheckCircle2
                className={`w-4 h-4 ${user.twoFactorEnabled ? 'text-emerald-400' : 'text-[#475569]'}`}
              />
              <span className={user.twoFactorEnabled ? 'text-emerald-400 font-medium' : 'text-[#8B98AC]'}>
                {user.twoFactorEnabled ? 'Protected with 2FA' : '2FA is currently inactive'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-400/10">
            <button
              type="button"
              onClick={openTfaManage}
              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
            >
              {user.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </section>

        {/* Discord Integration & Role */}
        <section className="bg-[#11161F] border border-slate-400/15 rounded-lg p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#38BDF8]" />
              <h2 className="font-display text-sm font-semibold text-[#EDF2F7]">
                Discord &amp; Support Roles
              </h2>
            </div>
            <p className="text-xs text-[#8B98AC] leading-relaxed">
              Connect your Discord handle to synchronize verified customer and support roles.
            </p>
            {user.discordHandle && (
              <div className="pt-1 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-medium text-[#EDF2F7]">{user.discordHandle}</span>
                <span className="text-[#475569]">·</span>
                <span className="text-emerald-400 font-medium">
                  {user.discordRole || 'Verified Member'}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-400/10">
            {user.discordHandle ? (
              <button
                type="button"
                disabled={discordLoading}
                onClick={handleUnlinkDiscord}
                className="px-4 py-2 rounded-lg border border-slate-400/20 hover:bg-white/[0.04] text-xs font-medium text-[#CBD5E1] transition-colors"
              >
                Unlink Discord
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDiscordMsg(null);
                  setDiscordModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-semibold text-white transition-colors"
              >
                Link Discord
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 2FA Modal */}
      {tfaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#11161F] border border-slate-400/20 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                <h3 className="font-display text-base font-semibold text-[#EDF2F7]">
                  {user.twoFactorEnabled ? 'Disable Two-Factor Auth' : 'Enable Two-Factor Auth'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTfaModalOpen(false)}
                className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {tfaError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                {tfaError}
              </div>
            )}

            {user.twoFactorEnabled ? (
              <form onSubmit={handleDisableTfa} className="space-y-4">
                <p className="text-xs text-[#8B98AC]">
                  Confirm your current password to disable two-factor authentication.
                </p>
                <input
                  type="password"
                  value={tfaDisablePassword}
                  onChange={(e) => setTfaDisablePassword(e.target.value)}
                  placeholder="Current password"
                  required
                  className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTfaModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs text-[#CBD5E1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={tfaLoading}
                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white"
                  >
                    {tfaLoading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEnableTfa} className="space-y-4">
                {tfaSetup ? (
                  <>
                    <p className="text-xs text-[#8B98AC] leading-relaxed">
                      Add this secret to your authenticator app, then verify with the current
                      6-digit code below.
                    </p>
                    <div className="bg-[#0A0D12] border border-slate-400/15 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#8B98AC]">
                        <span>Authenticator Secret</span>
                        <span>Current TOTP Preview</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-mono text-xs text-[#EDF2F7] tracking-wider">
                          {tfaSetup.secret}
                        </code>
                        <code className="font-mono text-xs text-emerald-400 tabular-nums">
                          {tfaSetup.currentCode}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="enable-tfa-code" className="block text-xs text-[#CBD5E1]">
                        6-Digit Verification Code
                      </label>
                      <input
                        id="enable-tfa-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={tfaVerifyCode}
                        onChange={(e) => setTfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        required
                        className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none font-mono text-sm tracking-[0.3em] text-center text-[#EDF2F7] tabular-nums"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-[#8B98AC]">Generating authenticator secret...</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTfaModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs text-[#CBD5E1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={tfaLoading || !tfaSetup || tfaVerifyCode.length !== 6}
                    className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 text-xs font-medium text-white"
                  >
                    {tfaLoading ? 'Activating...' : 'Confirm & Enable'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Discord Modal */}
      {discordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#11161F] border border-slate-400/20 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-[#EDF2F7]">Link Discord</h3>
              <button
                type="button"
                onClick={() => setDiscordModalOpen(false)}
                className="text-[#8B98AC] hover:text-[#EDF2F7] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {discordMsg && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                {discordMsg}
              </div>
            )}
            <form onSubmit={handleLinkDiscord} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="discord-handle" className="block text-xs text-[#CBD5E1]">
                  Discord Username / Handle
                </label>
                <input
                  id="discord-handle"
                  type="text"
                  value={discordInput}
                  onChange={(e) => setDiscordInput(e.target.value)}
                  placeholder="username"
                  required
                  minLength={2}
                  maxLength={40}
                  className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDiscordModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-400/20 text-xs text-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={discordLoading}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white"
                >
                  {discordLoading ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
