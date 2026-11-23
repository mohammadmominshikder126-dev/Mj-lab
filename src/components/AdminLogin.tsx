import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Database,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { BrandLogo } from './BrandLogo';

export const AdminLogin: React.FC = () => {
  const {
    supabaseConnected,
    supabaseConfig,
    connectSupabase,
    adminLoginPassword,
    settings,
  } = useData();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const [sbUrl, setSbUrl] = useState(supabaseConfig.url);
  const [sbKey, setSbKey] = useState(supabaseConfig.anonKey);
  const [sbRoleKey, setSbRoleKey] = useState(supabaseConfig.roleKey || '');
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
      setError(err instanceof Error ? err.message : 'Invalid admin password.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setConnectingSb(true);
    try {
      await connectSupabase(sbUrl, sbKey, sbRoleKey);
      setInfoMsg('Supabase connected! Enter your admin password to open Dashboard.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Supabase connection failed.';
      if (msg.includes('Keys saved!')) {
        setInfoMsg(msg);
      } else {
        setError(msg);
      }
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
            <span>{supabaseConnected ? 'Supabase Live' : 'Supabase'}</span>
          </span>
        </div>

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

        {/* Collapsible Supabase Key Setup */}
        <div className="pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setShowSetup((s) => !s)}
            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 cursor-pointer py-1"
          >
            <span>Supabase Database Key Setup</span>
            {showSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSetup && (
            <form
              onSubmit={handleConnectSupabase}
              className="mt-3 bg-[#050B18] p-3.5 rounded-xl border border-slate-800 space-y-2.5"
            >
              <p className="text-[11px] font-semibold text-[#00E676]">
                Connect Supabase Realtime Keys
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
              <input
                type="password"
                placeholder="Supabase Service Role Key (Optional)"
                value={sbRoleKey}
                onChange={(e) => setSbRoleKey(e.target.value)}
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
          )}
        </div>
      </div>
    </div>
  );
};
