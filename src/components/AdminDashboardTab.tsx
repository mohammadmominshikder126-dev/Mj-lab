import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Edit3,
  ExternalLink,
  Eye,
  FileCode2,
  Globe,
  Image as ImageIcon,
  MessageCircle,
  MessageSquare,
  Send,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { AdminTab, Project } from '../types';
import { formatRelativeTime } from '../lib/whatsapp';

interface AdminDashboardTabProps {
  onNavigateTab: (tab: AdminTab) => void;
  onViewWebsite: () => void;
  onEditProject: (project: Project) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  onNavigateTab,
  onViewWebsite,
  onEditProject,
}) => {
  const {
    visitors,
    contacts,
    projects,
    orders,
    banners,
    settings,
    deleteProject,
  } = useData();

  const [chartRange, setChartRange] = useState<'week' | 'month' | 'today'>('week');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const todayVisitorsCount = useMemo(
    () => visitors.filter((v) => v.dateKey === todayKey).length,
    [visitors, todayKey]
  );

  const unreadContactsCount = useMemo(
    () => contacts.filter((c) => c.status === 'Unread').length,
    [contacts]
  );

  const activeProjectsCount = useMemo(
    () => projects.filter((p) => p.status === 'Active').length,
    [projects]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'Pending').length,
    [orders]
  );

  // Build real chart points from visitors data
  const chartData = useMemo(() => {
    const now = new Date();
    if (chartRange === 'today') {
      const buckets = ['00h', '04h', '08h', '12h', '16h', '20h', '24h'];
      const counts = new Array(7).fill(0);
      visitors
        .filter((v) => v.dateKey === todayKey)
        .forEach((v) => {
          const hr = new Date(v.createdAt).getHours();
          const idx = Math.min(6, Math.floor(hr / 4));
          counts[idx] += 1;
        });
      return buckets.map((label, i) => ({ label, value: counts[i] }));
    }

    if (chartRange === 'month') {
      const labels = ['W1', 'W2', 'W3', 'W4'];
      const counts = [0, 0, 0, 0];
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      visitors.forEach((v) => {
        const ts = new Date(v.createdAt).getTime();
        if (ts >= thirtyDaysAgo) {
          const weekIdx = Math.min(3, Math.floor((Date.now() - ts) / (7.5 * 86400000)));
          counts[3 - weekIdx] += 1;
        }
      });
      return labels.map((label, i) => ({ label, value: counts[i] }));
    }

    // Default: This Week (Mon..Sun or last 7 days)
    const days: { label: string; key: string; value: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      days.push({
        label: dayNames[d.getDay()],
        key,
        value: visitors.filter((v) => v.dateKey === key).length,
      });
    }
    return days;
  }, [visitors, chartRange, todayKey]);

  const maxChartValue = Math.max(4, ...chartData.map((d) => d.value));

  // SVG coordinates for area line chart
  const svgPoints = useMemo(() => {
    const w = 520;
    const h = 175;
    const padX = 22;
    const padY = 18;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;
    return chartData.map((d, i) => {
      const x =
        chartData.length === 1 ? w / 2 : padX + (i / (chartData.length - 1)) * usableW;
      const y = h - padY - (d.value / maxChartValue) * usableH;
      return { x, y, ...d };
    });
  }, [chartData, maxChartValue]);

  const linePath = svgPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath =
    svgPoints.length > 0
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} 165 L ${svgPoints[0].x} 165 Z`
      : '';

  const activeBanner = banners.find((b) => b.active) || banners[0];
  const previewProjects = projects.slice(0, 2);

  const avatarColors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-emerald-500',
  ];

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00E676]/15 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white leading-tight">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Welcome back! Here&apos;s your live website overview.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewWebsite}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#071A2F] border border-[#00E676]/50 text-xs sm:text-sm font-semibold text-white hover:bg-[#00E676] hover:text-[#050B18] transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Eye className="w-4 h-4 text-[#00E676] group-hover:text-current" />
          <span>View Website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 KPI Statistics Cards (Real Data Only - Matches Reference Image 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Visitors */}
        <button
          type="button"
          onClick={() => onNavigateTab('visitors')}
          className="text-left rounded-2xl p-4 bg-gradient-to-br from-[#0A2558] to-[#081533] border border-blue-400/25 hover:border-blue-400/50 transition relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Total Visitors</p>
                <p className="text-2xl font-display font-extrabold text-white tabular-nums mt-0.5">
                  {visitors.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00E676] tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" />
              +{todayVisitorsCount} today
            </span>
            <svg viewBox="0 0 64 22" className="w-16 h-6 text-blue-400/70" fill="none">
              <path
                d="M2 18 Q 14 14, 24 16 T 42 8 T 62 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>

        {/* Card 2: Total Contacts */}
        <button
          type="button"
          onClick={() => onNavigateTab('contacts')}
          className="text-left rounded-2xl p-4 bg-gradient-to-br from-[#073B3A] to-[#081928] border border-emerald-400/25 hover:border-emerald-400/50 transition relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#00E676]/20 border border-[#00E676]/30 flex items-center justify-center text-[#00E676] shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Total Contacts</p>
                <p className="text-2xl font-display font-extrabold text-white tabular-nums mt-0.5">
                  {contacts.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00E676] tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" />
              {unreadContactsCount} unread
            </span>
            <svg viewBox="0 0 64 22" className="w-16 h-6 text-[#00E676]/70" fill="none">
              <path
                d="M2 16 Q 16 18, 28 10 T 46 12 T 62 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>

        {/* Card 3: Total Projects */}
        <button
          type="button"
          onClick={() => onNavigateTab('manage-projects')}
          className="text-left rounded-2xl p-4 bg-gradient-to-br from-[#271153] to-[#110C2E] border border-purple-400/25 hover:border-purple-400/50 transition relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Total Projects</p>
                <p className="text-2xl font-display font-extrabold text-white tabular-nums mt-0.5">
                  {projects.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00E676] tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" />
              {activeProjectsCount} active
            </span>
            <svg viewBox="0 0 64 22" className="w-16 h-6 text-purple-400/70" fill="none">
              <path
                d="M2 17 Q 18 12, 30 14 T 48 6 T 62 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>

        {/* Card 4: Total Orders */}
        <button
          type="button"
          onClick={() => onNavigateTab('contacts')}
          className="text-left rounded-2xl p-4 bg-gradient-to-br from-[#08344F] to-[#08162B] border border-cyan-400/25 hover:border-cyan-400/50 transition relative overflow-hidden cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#22D3EE]/20 border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE] shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">Total Orders</p>
                <p className="text-2xl font-display font-extrabold text-white tabular-nums mt-0.5">
                  {orders.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00E676] tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" />
              {pendingOrdersCount} pending
            </span>
            <svg viewBox="0 0 64 22" className="w-16 h-6 text-[#22D3EE]/70" fill="none">
              <path
                d="M2 19 Q 15 10, 29 13 T 47 7 T 62 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Middle Row: Visitors Overview Chart + Recent Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visitors Overview Chart */}
        <section className="lg:col-span-7 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-base font-display font-bold text-white">Visitors Overview</h2>
            </div>

            <select
              aria-label="Chart range"
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value as 'week' | 'month' | 'today')}
              className="px-3 py-1.5 rounded-lg bg-[#050B18] border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-[#22D3EE] cursor-pointer"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="today">Today</option>
            </select>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[360px]">
              <svg viewBox="0 0 520 190" className="w-full h-48 overflow-visible">
                <defs>
                  <linearGradient id="visitorAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E676" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                  const y = 165 - ratio * 139;
                  const tickVal = Math.round(ratio * maxChartValue);
                  return (
                    <g key={idx}>
                      <line
                        x1="22"
                        y1={y}
                        x2="498"
                        y2={y}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x="0"
                        y={y + 4}
                        className="fill-slate-400 text-[10px] font-mono tabular-nums"
                      >
                        {tickVal}
                      </text>
                    </g>
                  );
                })}

                {areaPath && <path d={areaPath} fill="url(#visitorAreaGrad)" />}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#00E676"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {svgPoints.map((pt, idx) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#00E676"
                      stroke="#050B18"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y="184"
                      textAnchor="middle"
                      className="fill-slate-400 text-[11px]"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </section>

        {/* Recent Contacts Table */}
        <section className="lg:col-span-5 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-base font-display font-bold text-white">Recent Contacts</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('contacts')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#050B18] border border-slate-700 text-xs font-medium text-slate-200 hover:border-[#22D3EE] transition cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <MessageSquare className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs font-medium text-slate-300">No contact messages yet</p>
              <p className="text-[11px] text-slate-500">
                Messages submitted from your website contact form appear here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="py-2 pr-2 font-medium">#</th>
                    <th className="py-2 pr-2 font-medium">Name</th>
                    <th className="py-2 pr-2 font-medium">Message</th>
                    <th className="py-2 text-right font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {contacts.slice(0, 5).map((msg, idx) => (
                    <tr key={msg.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-2 text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full ${
                              avatarColors[idx % avatarColors.length]
                            } text-white text-[10px] font-bold flex items-center justify-center shrink-0`}
                          >
                            {msg.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="font-medium text-white truncate max-w-[90px]">
                            {msg.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-2 text-slate-300 truncate max-w-[140px]">
                        {msg.message}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 whitespace-nowrap tabular-nums">
                        {formatRelativeTime(msg.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Row: Manage Projects + Right Banner/WhatsApp/Settings Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Manage Projects Preview */}
        <section className="lg:col-span-7 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-[#00E676]" />
              <h2 className="text-base font-display font-bold text-white">Manage Projects</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('manage-projects')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#050B18] border border-slate-700 text-xs font-medium text-slate-200 hover:border-[#22D3EE] transition cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {previewProjects.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs text-slate-400">No projects published yet.</p>
              <button
                type="button"
                onClick={() => onNavigateTab('add-project')}
                className="px-4 py-2 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-xs cursor-pointer"
              >
                Add First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {previewProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl bg-[#050B18]/85 border border-slate-800 p-3 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-[#0B162C] mb-2.5">
                      {project.imageUrl ? (
                        <img
                          src={project.imageUrl}
                          alt={project.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Globe className="w-7 h-7 text-[#22D3EE]" />
                        </div>
                      )}
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          project.status === 'Active'
                            ? 'bg-[#00E676] text-[#050B18]'
                            : 'bg-slate-600 text-white'
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-display font-bold text-white truncate">
                      {project.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {project.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditProject(project)}
                      className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 text-xs font-medium hover:bg-blue-500/10 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {confirmDeleteId === project.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(project.id);
                          setConfirmDeleteId(null);
                        }}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(project.id)}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-rose-500/50 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onViewWebsite}
                      className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[#00E676]/50 text-[#00E676] text-xs font-medium hover:bg-[#00E676]/10 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Website Banner + WhatsApp Contact + Website Settings */}
        <div className="lg:col-span-5 space-y-4">
          {/* Website Banner Card */}
          <section className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#22D3EE]" />
                <h2 className="text-base font-display font-bold text-white">Website Banner</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('banners')}
                className="px-3 py-1 rounded-lg bg-[#050B18] border border-cyan-500/40 text-xs font-semibold text-[#22D3EE] hover:bg-[#22D3EE] hover:text-[#050B18] transition cursor-pointer"
              >
                Change Banner
              </button>
            </div>

            {activeBanner && (
              <div className="relative rounded-xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-[#071A40] to-[#0A2B66] p-4 grid grid-cols-12 items-center gap-3">
                <div className="col-span-7 space-y-1.5">
                  <div className="text-sm font-display font-bold text-white leading-tight line-clamp-2">
                    {activeBanner.title}
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1">
                    {activeBanner.description}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#00E676]/60 text-[10px] font-semibold text-[#00E676]">
                    {activeBanner.buttonText} &rarr;
                  </span>
                </div>
                <div className="col-span-5">
                  <img
                    src={activeBanner.imageUrl}
                    alt={activeBanner.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-20 object-cover rounded-lg border border-white/10"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Bottom Split: WhatsApp Contact + Website Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#00E676]" />
                <h3 className="text-sm font-display font-bold text-white">WhatsApp Contact</h3>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-300 truncate">
                  {settings.whatsappNumber}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('whatsapp')}
                  className="px-3 py-1.5 rounded-lg bg-[#00E676] text-[#050B18] text-xs font-bold hover:brightness-110 transition shrink-0 cursor-pointer"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#22D3EE]" />
                <h3 className="text-sm font-display font-bold text-white">Website Settings</h3>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300">Theme : {settings.theme}</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('settings')}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:brightness-110 transition shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
