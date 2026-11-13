import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Layers, Lock, ShieldCheck } from 'lucide-react';
import { api, setStoredToken, type AuthResponse } from '../lib/api';

interface AuthGateProps {
  onAuthenticated: (data: Required<Pick<AuthResponse, 'user' | 'subscriptions' | 'orders'>>) => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [humanVerified, setHumanVerified] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [challengeEmail, setChallengeEmail] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!humanVerified) {
      setError('Please confirm the verification checkbox before continuing.');
      return;
    }

    setLoading(true);
    try {
      if (challengeToken) {
        const res = await api.verify2fa({ challengeToken, code: twoFactorCode.trim() });
        if (res.token && res.user) {
          setStoredToken(res.token, rememberMe);
          onAuthenticated({
            user: res.user,
            subscriptions: res.subscriptions || [],
            orders: res.orders || [],
          });
        }
        return;
      }

      if (mode === 'login') {
        const res = await api.login({ email: email.trim(), password, rememberMe });
        if (res.requires2fa && res.challengeToken) {
          setChallengeToken(res.challengeToken);
          setChallengeEmail(res.email || email.trim());
          setTwoFactorCode('');
          return;
        }
        if (res.token && res.user) {
          setStoredToken(res.token, rememberMe);
          onAuthenticated({
            user: res.user,
            subscriptions: res.subscriptions || [],
            orders: res.orders || [],
          });
        }
      } else {
        const res = await api.register({
          email: email.trim(),
          username: username.trim(),
          password,
          rememberMe,
        });
        if (res.token && res.user) {
          setStoredToken(res.token, rememberMe);
          onAuthenticated({
            user: res.user,
            subscriptions: res.subscriptions || [],
            orders: res.orders || [],
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setError(null);
    setChallengeToken(null);
    setTwoFactorCode('');
  }

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#EDF2F7] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Architectural Showcase Column */}
      <aside className="lg:col-span-5 bg-[#0E131B] border-b lg:border-b-0 lg:border-r border-slate-400/10 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center text-white font-display font-bold text-sm">
            D
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[#EDF2F7]">
            DMCheats
          </span>
        </div>

        <div className="relative z-10 my-10 lg:my-0 space-y-8 max-w-md">
          <div className="space-y-3">
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#EDF2F7] text-balance leading-[1.15]">
              Centralized license access and loader control.
            </h1>
            <p className="text-sm text-[#8B98AC] leading-relaxed">
              Sign in or register an account to activate license keys, inspect product pricing tiers,
              manage two-factor security, and download your assigned loader builds.
            </p>
          </div>

          <div className="space-y-4 border-t border-slate-400/15 pt-6">
            <div className="flex items-start gap-3.5">
              <KeyRound className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#EDF2F7]">Instant Key Activation</p>
                <p className="text-xs text-[#8B98AC]">
                  Redeem 1-day, 3-day, 7-day, 30-day, or Lifetime keys directly in your workspace.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <Layers className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#EDF2F7]">Live Product Catalog</p>
                <p className="text-xs text-[#8B98AC]">
                  Browse software suites with transparent duration pricing and launch guides.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-4 h-4 text-[#38BDF8] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#EDF2F7]">Account Hardening</p>
                <p className="text-xs text-[#8B98AC]">
                  Built-in 2FA verification, email/password updates, and Discord role syncing.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-[#64748B]">
          DMCheats Member Portal · Encrypted Session Gate
        </p>
      </aside>

      {/* Right Auth Form Column */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[440px] space-y-6">
          {!challengeToken && (
            <div className="grid grid-cols-2 p-1 rounded-lg bg-[#11161F] border border-slate-400/15">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'register'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#8B98AC] hover:text-[#EDF2F7]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <div className="bg-[#11161F] border border-slate-400/15 rounded-xl p-7">
            {challengeToken ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#38BDF8] text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Two-Factor Security</span>
                  </div>
                  <h2 className="font-display text-xl font-semibold text-[#EDF2F7]">
                    Enter verification code
                  </h2>
                  <p className="text-xs text-[#8B98AC]">
                    Provide the 6-digit authenticator code for {challengeEmail}.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="tfa-code" className="block text-xs font-medium text-[#CBD5E1]">
                    6-Digit Code
                  </label>
                  <input
                    id="tfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-center font-mono text-lg tracking-[0.35em] text-[#EDF2F7] tabular-nums"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorCode.length !== 6}
                  className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChallengeToken(null);
                    setTwoFactorCode('');
                    setError(null);
                  }}
                  className="w-full text-center text-xs text-[#8B98AC] hover:text-[#EDF2F7]"
                >
                  Cancel and return to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#EDF2F7]">
                    {mode === 'login' ? 'Sign in to DMCheats' : 'Register a new account'}
                  </h2>
                  <p className="text-xs text-[#8B98AC] mt-1">
                    {mode === 'login'
                      ? 'Enter your credentials to open your dashboard.'
                      : 'Set up your member credentials in seconds.'}
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-username" className="block text-xs font-medium text-[#CBD5E1]">
                      Username
                    </label>
                    <input
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a handle"
                      autoComplete="username"
                      required
                      minLength={3}
                      maxLength={24}
                      className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7] placeholder:text-[#475569]"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="block text-xs font-medium text-[#CBD5E1]">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    autoComplete="email"
                    required
                    className="w-full h-10 px-3.5 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7] placeholder:text-[#475569]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auth-password" className="block text-xs font-medium text-[#CBD5E1]">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs text-[#8B98AC] hover:text-[#38BDF8] transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'login' ? 'Enter password' : 'At least 6 characters'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      minLength={mode === 'register' ? 6 : 1}
                      className="w-full h-10 pl-3.5 pr-10 rounded-lg bg-[#0A0D12] border border-slate-400/20 focus:border-[#38BDF8] focus:outline-none text-sm text-[#EDF2F7] placeholder:text-[#475569]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8B98AC] hover:text-[#EDF2F7] p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-xs text-[#CBD5E1] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-400/30 bg-[#0A0D12] accent-[#2563EB]"
                    />
                    <span>Keep me signed in</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setHumanVerified((prev) => !prev)}
                    className="inline-flex items-center gap-2 text-xs text-[#CBD5E1] hover:text-white"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        humanVerified
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-[#0A0D12] border-slate-400/30 text-transparent'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#8B98AC]" />
                      Human Check
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-xs font-semibold tracking-wide text-white transition-colors"
                >
                  {loading
                    ? mode === 'login'
                      ? 'Signing in...'
                      : 'Creating account...'
                    : mode === 'login'
                      ? 'Sign In to Workspace'
                      : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#11161F] border border-slate-400/20 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-[#EDF2F7]">
              Password Recovery
            </h2>
            <p className="text-xs text-[#8B98AC] leading-relaxed">
              Signed-in members can update their email and password anytime under{' '}
              <span className="text-[#EDF2F7]">Settings</span>. If you are locked out, reach out to a
              DMCheats administrator with your registered email or redeemed license key.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
