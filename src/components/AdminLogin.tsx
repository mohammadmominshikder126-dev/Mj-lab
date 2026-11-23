import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Database,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MailCheck,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { BrandLogo } from './BrandLogo';

export const AdminLogin: React.FC = () => {
  const {
    user,
    isAdmin,
    backendMode,
    supabaseConfig,
    connectSupabase,
    adminLoginPassword,
    sendAdminVerification,
    adminLogout,
    settings,
  } = useData();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  // Optional Supabase key connect right on login
  const [sbUrl, setSbUrl] = useState(supabaseConfig.url);
  const [sbKey, setSbKey] = useState(supabaseConfig.anonKey);
  const [connectingSb, setConnectingSb] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    if (!password) {
      setError('Please enter your admin password.');
      return;
    }
    setLoading(true);
    try {
      await adminLoginPassword(password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed.';
      if (msg.includes('operation-not-allowed')) {
        setError(
          'Firebase Email/Password sign-in is disabled. Enable Email/Password in Firebase Console (Authentication → Sign-in method) or connect your Supabase key below.'
        );
        setShowSetup(true);
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Invalid admin password. Please check your password and try again.');
      } else if (msg.includes('user-not-found')) {
        setError(
          'Admin password user not created yet in Firebase Console (Authentication → Users). Create the admin user or connect Supabase below.'
        );
        setShowSetup(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConnectingSb(true);
    try {
      await connectSupabase(sbUrl, sbKey);
      setInfoMsg('Supabase connected! Enter your admin password (default: mjlab2026) to sign in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Supabase connection failed.');
    } finally {
      setConnectingSb(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_55%)]"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#0B162C]/95 border border-cyan-500/25 p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo logoUrl={settings.logoUrl} size="md" siteName={settings.siteName} />
            <div>
              <h1 className="text-xl font-display font-extrabold text-white leading-tight">
                {settings.siteName} <span className="text-[#22D3EE]">Admin</span>
              </h1>
              <p className="text-xs text-slate-400">Password Protected Access</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#00E676] font-medium">
            <Database className="w-3.5 h-3.5" />
            <span>{backendMode === 'supabase' ? 'Supabase' : 'Firebase'}</span>
          </span>
        </div>

        {/* Unverified or non-admin Firebase session notice */}
        {backendMode === 'firebase' && user && !isAdmin && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100 space-y-1">
                {!user.emailVerified ? (
                  <>
                    <p className="font-semibold">Verify Admin Email Once</p>
                    <p className="text-amber-200/80">
                      Password verified for <span className="font-mono">{user.email}</span>, but
                      email verification is required by security rules.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Unauthorized Account</p>
                    <p className="text-amber-200/80">
                      Signed-in account <span className="font-mono">{user.email}</span> is not
                      authorized as admin.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await sendAdminVerification();
                      setInfoMsg('Verification email sent! Click the link in your inbox, then log in.');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to send verification email.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E676] text-[#050B18] text-xs font-bold cursor-pointer"
                >
                  <MailCheck className="w-3.5 h-3.5" />
                  <span>Send Verification Email</span>
                </button>
              )}
              <button
                type="button"
                onClick={adminLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-200 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Reset Session</span>
              </button>
            </div>
          </div>
        )}

        {/* Password-Only Login Form */}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-xs font-medium text-slate-300">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Enter Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-[#050B18] border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#22D3EE]"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
              {error}
            </p>
          )}
          {infoMsg && (
            <p className="text-xs text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/25 rounded-xl p-3">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm hover:brightness-110 disabled:opacity-60 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Verifying...' : 'Login to Admin Panel'}</span>
          </button>
        </form>

        {/* Collapsible Setup & Supabase Key Connection */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowSetup((s) => !s)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 cursor-pointer py-1"
          >
            <span>Password & Database Key Setup</span>
            {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSetup && (
            <div className="mt-3 space-y-4">
              <div className="text-[11px] text-slate-300 bg-[#050B18] p-3 rounded-xl border border-slate-800 space-y-1.5">
                <p className="font-semibold text-[#22D3EE]">Firebase Password Login Setup:</p>
                <p>
                  1. Open Firebase Console &rarr; Authentication &rarr; Sign-in method &rarr; Enable{' '}
                  <strong>Email/Password</strong>.
                </p>
                <p>
                  2. Under Authentication &rarr; Users, create user{' '}
                  <span className="font-mono text-[#00E676]">nexasworld5@gmail.com</span> with your
                  chosen password.
                </p>
              </div>

              <form
                onSubmit={handleConnectSupabase}
                className="bg-[#050B18] p-3 rounded-xl border border-slate-800 space-y-2.5"
              >
                <p className="text-[11px] font-semibold text-[#00E676]">
                  Or Connect Supabase Realtime Key (Default Passcode: mjlab2026)
                </p>
                <input
                  type="url"
                  required
                  placeholder="Supabase URL (https://xxx.supabase.co)"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B162C] border border-slate-700 text-xs font-mono text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Supabase Anon Public Key"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B162C] border border-slate-700 text-xs font-mono text-white"
                />
                <button
                  type="submit"
                  disabled={connectingSb}
                  className="w-full py-2 rounded-lg bg-[#22D3EE] text-[#050B18] font-bold text-xs cursor-pointer"
                >
                  {connectingSb ? 'Connecting...' : 'Connect Supabase Key'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
