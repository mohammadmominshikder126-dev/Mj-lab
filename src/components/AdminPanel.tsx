import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Database,
  FilePlus2,
  FolderKanban,
  Home,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  Palette,
  Settings,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { AdminTab, Project } from '../types';
import { BrandLogo } from './BrandLogo';
import { AdminLogin } from './AdminLogin';
import { AdminDashboardTab } from './AdminDashboardTab';
import { AdminSections } from './AdminSections';

export const AdminPanel: React.FC = () => {
  const { authReady, isAdmin, settings, supabaseConnected, supabaseError, adminLogout, contacts } =
    useData();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [nowStr, setNowStr] = useState(() =>
    new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNowStr(
        new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#050B18] text-white flex items-center justify-center">
        <div className="text-sm text-[#22D3EE] font-medium">Verifying Admin Session...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin />;
  }

  const unreadCount = contacts.filter((c) => c.status === 'Unread').length;

  const menuGroups: {
    items: {
      id: AdminTab | 'logout';
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      accent?: string;
    }[];
  }[] = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'projects', label: 'Projects', icon: LayoutGrid },
        { id: 'add-project', label: 'Add Project', icon: FilePlus2 },
        { id: 'manage-projects', label: 'Manage Projects', icon: FolderKanban },
      ],
    },
    {
      items: [
        { id: 'banners', label: 'Banner Settings', icon: ImageIcon },
        { id: 'whatsapp', label: 'WhatsApp Contact', icon: MessageCircle, accent: 'text-[#00E676]' },
        { id: 'visitors', label: 'Visitors Info', icon: Users },
        { id: 'contacts', label: 'Contact Messages', icon: MessageSquare, badge: unreadCount },
      ],
    },
    {
      items: [
        { id: 'settings', label: 'Website Settings', icon: Settings },
        { id: 'branding', label: 'Logo & Favicon', icon: Palette },
        { id: 'about', label: 'About Us', icon: FilePlus2 },
        { id: 'team', label: 'Team Members', icon: Users },
        { id: 'social', label: 'Social Links', icon: Link2 },
      ],
    },
    {
      items: [
        { id: 'account', label: 'Account Settings', icon: UserCog },
        { id: 'password', label: 'Change Password', icon: KeyRound },
        { id: 'logout', label: 'Logout', icon: LogOut },
      ],
    },
  ];

  const handleMenuClick = async (id: AdminTab | 'logout') => {
    setSidebarOpen(false);
    if (id === 'logout') {
      await adminLogout();
      return;
    }
    setActiveTab(id);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setActiveTab('manage-projects');
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-white flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* SIDEBAR (Matches Reference Image 2) */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 bg-[#071022] border-r border-cyan-500/15 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Sidebar Brand Header */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-3">
              <BrandLogo logoUrl={settings.logoUrl} size="sm" siteName={settings.siteName} />
              <div>
                <div className="text-base font-display font-extrabold leading-none">
                  <span className="text-white">{settings.siteName.split(' ')[0]}</span>
                  <span className="text-[#22D3EE] ml-1">
                    {settings.siteName.split(' ').slice(1).join(' ') || 'LAB'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Admin Panel</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 16 Menu Items Grouped Like Reference Image 2 */}
          <nav aria-label="Admin Sidebar" className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {menuGroups.map((group, gIdx) => (
              <div
                key={gIdx}
                className={`space-y-0.5 ${
                  gIdx > 0 ? 'pt-2 border-t border-white/10' : ''
                }`}
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMenuClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-[#0D4F4B] via-[#0B3540] to-[#082032] text-[#00E676] border border-[#00E676]/40 shadow-[0_0_18px_rgba(0,230,118,0.14)]'
                          : 'text-slate-300 hover:bg-white/[0.04] hover:text-white border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#00E676]' : item.accent || 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#00E676] text-[#050B18] text-[10px] font-bold tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Online Status Box */}
        <div className="p-3 border-t border-white/5">
          <div className="rounded-xl bg-[#0B162C] border border-cyan-500/20 p-3 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#102A4C] border border-cyan-400/30 flex items-center justify-center text-xs font-bold text-[#22D3EE] shrink-0">
              MJ
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#00E676]">
                <span className="w-2 h-2 rounded-full bg-[#00E676]" />
                <span>Online</span>
              </div>
              <p className="text-xs font-medium text-white truncate">Welcome Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOP HEADER BAR (Matches Reference Image 2) */}
        <header className="sticky top-0 z-30 bg-[#071022]/90 backdrop-blur-md border-b border-cyan-500/15 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg bg-[#0B162C] border border-slate-700 flex items-center justify-center text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm sm:text-base font-display font-bold truncate">
              <span className="text-white">{settings.siteName}</span>
              <span className="text-slate-500 mx-2">|</span>
              <span className="text-[#22D3EE] font-medium">Admin Panel</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0B162C] border text-xs font-medium transition cursor-pointer ${
                supabaseConnected
                  ? 'border-cyan-500/25 text-[#00E676] hover:border-[#00E676]/60'
                  : 'border-amber-400/40 text-amber-300 hover:border-amber-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{supabaseConnected ? 'Supabase Live' : 'Connect Supabase'}</span>
            </button>

            <div className="hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B162C] border border-slate-700/80 text-xs text-slate-200 font-mono tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>{nowStr}</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#0B162C] border border-slate-700/80 hover:border-cyan-400/50 transition cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-[#22D3EE]/20 text-[#22D3EE] text-[10px] font-bold flex items-center justify-center">
                A
              </span>
              <span className="text-xs font-medium text-white hidden sm:inline">Admin</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </header>

        {/* ACTIVE ROUTE CONTENT */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {supabaseError && activeTab !== 'settings' && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-400/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-200">
              <span>
                Supabase sync notice: <span className="font-mono">{supabaseError}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-[#050B18] font-bold text-xs shrink-0 cursor-pointer self-start sm:self-auto"
              >
                Open Supabase Setup
              </button>
            </div>
          )}
          {activeTab === 'dashboard' ? (
            <AdminDashboardTab
              onNavigateTab={setActiveTab}
              onViewWebsite={() => {
                window.location.href = '/';
              }}
              onEditProject={handleEditProject}
            />
          ) : (
            <AdminSections
              activeTab={activeTab}
              editingProject={editingProject}
              setEditingProject={setEditingProject}
              onNavigateTab={setActiveTab}
            />
          )}
        </main>
      </div>
    </div>
  );
};
