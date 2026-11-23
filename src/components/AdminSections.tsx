import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  KeyRound,
  Link2,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { uploadProjectOrBannerImage } from '../lib/imageUtils';
import { buildWhatsAppLink, formatRelativeTime } from '../lib/whatsapp';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import {
  AdminTab,
  Banner,
  OrderStatus,
  Project,
  ProjectCategory,
  ProjectStatus,
  SiteTheme,
  TeamMember,
} from '../types';

interface AdminSectionsProps {
  activeTab: Exclude<AdminTab, 'dashboard'>;
  editingProject: Project | null;
  setEditingProject: (p: Project | null) => void;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminSections: React.FC<AdminSectionsProps> = ({
  activeTab,
  editingProject,
  setEditingProject,
  onNavigateTab,
}) => {
  const {
    adminDisplayName,
    projects,
    banners,
    settings,
    team,
    contacts,
    visitors,
    contactClicks,
    orders,
    supabaseConnected,
    hasWorkerRole,
    supabaseError,
    supabaseConfig,
    connectSupabase,
    disconnectSupabase,
    seedSupabaseData,
    syncingSeed,
    addProject,
    updateProject,
    deleteProject,
    addBanner,
    updateBanner,
    deleteBanner,
    saveSettings,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    markContactRead,
    deleteContact,
    updateOrderStatus,
    deleteOrder,
    adminChangePassword,
  } = useData();

  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const showToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // --- MANAGE PROJECTS STATE ---
  const [projSearch, setProjSearch] = useState('');
  const [projCategoryFilter, setProjCategoryFilter] = useState<'All' | ProjectCategory>('All');
  const [projStatusFilter, setProjStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [confirmDeleteProjId, setConfirmDeleteProjId] = useState<string | null>(null);

  // --- ADD / EDIT PROJECT FORM STATE ---
  const [newProj, setNewProj] = useState({
    name: '',
    description: '',
    category: 'New Design' as ProjectCategory,
    imageUrl: '',
    demoUrl: '',
    whatsappUrl: '',
    price: '',
    status: 'Active' as ProjectStatus,
    featured: true,
  });
  const [uploadingProjImg, setUploadingProjImg] = useState(false);
  const [savingProj, setSavingProj] = useState(false);

  const [editProjForm, setEditProjForm] = useState<{
    name: string;
    description: string;
    category: ProjectCategory;
    imageUrl: string;
    demoUrl: string;
    whatsappUrl: string;
    price: string;
    status: ProjectStatus;
  } | null>(null);

  useEffect(() => {
    if (editingProject) {
      setEditProjForm({
        name: editingProject.name,
        description: editingProject.description,
        category: editingProject.category,
        imageUrl: editingProject.imageUrl,
        demoUrl: editingProject.demoUrl || '',
        whatsappUrl: editingProject.whatsappUrl || '',
        price: editingProject.price || '',
        status: editingProject.status,
      });
    } else {
      setEditProjForm(null);
    }
  }, [editingProject]);

  // --- BANNER FORM STATE ---
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    badgeText: 'Welcome to MJ LAB',
    title: '',
    highlightWord: '',
    description: '',
    buttonText: 'View Portfolio',
    buttonLink: '#projects',
    imageUrl: '',
    order: banners.length + 1,
    active: true,
  });
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // --- WHATSAPP & WEBSITE SETTINGS FORM ---
  const [waNumberInput, setWaNumberInput] = useState(settings.whatsappNumber);
  const [siteForm, setSiteForm] = useState({
    siteName: settings.siteName,
    tagline: settings.tagline,
    description: settings.description,
    theme: settings.theme,
    footerText: settings.footerText,
  });
  const [aboutForm, setAboutForm] = useState({
    aboutTitle: settings.aboutTitle,
    aboutDescription: settings.aboutDescription,
  });
  const [socialForm, setSocialForm] = useState({
    facebook: settings.socialLinks?.facebook || '',
    github: settings.socialLinks?.github || '',
    linkedin: settings.socialLinks?.linkedin || '',
    youtube: settings.socialLinks?.youtube || '',
    instagram: settings.socialLinks?.instagram || '',
    twitter: settings.socialLinks?.twitter || '',
  });
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: settings.logoUrl || '',
    faviconUrl: settings.faviconUrl || '',
  });

  useEffect(() => {
    setWaNumberInput(settings.whatsappNumber);
    setSiteForm({
      siteName: settings.siteName,
      tagline: settings.tagline,
      description: settings.description,
      theme: settings.theme,
      footerText: settings.footerText,
    });
    setAboutForm({
      aboutTitle: settings.aboutTitle,
      aboutDescription: settings.aboutDescription,
    });
    setSocialForm({
      facebook: settings.socialLinks?.facebook || '',
      github: settings.socialLinks?.github || '',
      linkedin: settings.socialLinks?.linkedin || '',
      youtube: settings.socialLinks?.youtube || '',
      instagram: settings.socialLinks?.instagram || '',
      twitter: settings.socialLinks?.twitter || '',
    });
    setBrandingForm({
      logoUrl: settings.logoUrl || '',
      faviconUrl: settings.faviconUrl || '',
    });
  }, [settings]);

  // --- SUPABASE CONNECTION FORM ---
  const [sbUrl, setSbUrl] = useState(supabaseConfig.url);
  const [sbKey, setSbKey] = useState(supabaseConfig.anonKey);
  const [sbRoleKey, setSbRoleKey] = useState(supabaseConfig.roleKey || '');
  const [connectingSb, setConnectingSb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setSbUrl(supabaseConfig.url);
    setSbKey(supabaseConfig.anonKey);
    setSbRoleKey(supabaseConfig.roleKey || '');
  }, [supabaseConfig.url, supabaseConfig.anonKey, supabaseConfig.roleKey]);

  // --- TEAM FORM ---
  const [teamForm, setTeamForm] = useState({
    name: '',
    role: '',
    bio: '',
    avatarUrl: '',
  });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [uploadingTeamImg, setUploadingTeamImg] = useState(false);

  // --- CONTACTS / ORDERS TAB ---
  const [inboxTab, setInboxTab] = useState<'messages' | 'orders'>('messages');

  // --- PASSWORD CHANGE ---
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  // --- ANALYTICS COMPUTATIONS ---
  const visitorMetrics = useMemo(() => {
    const now = Date.now();
    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    })();
    const weekAgo = now - 7 * 86400000;
    const monthAgo = now - 30 * 86400000;

    const todayVisitors = visitors.filter((v) => v.dateKey === todayKey).length;
    const weeklyVisitors = visitors.filter((v) => new Date(v.createdAt).getTime() >= weekAgo).length;
    const monthlyVisitors = visitors.filter(
      (v) => new Date(v.createdAt).getTime() >= monthAgo
    ).length;
    const uniqueSet = new Set(visitors.map((v) => v.visitorHash));

    const todayClicks = contactClicks.filter((c) => c.dateKey === todayKey).length;
    const weeklyClicks = contactClicks.filter(
      (c) => new Date(c.createdAt).getTime() >= weekAgo
    ).length;
    const monthlyClicks = contactClicks.filter(
      (c) => new Date(c.createdAt).getTime() >= monthAgo
    ).length;

    const mobileCount = visitors.filter((v) => v.device === 'Mobile').length;
    const tabletCount = visitors.filter((v) => v.device === 'Tablet').length;
    const desktopCount = visitors.filter((v) => v.device === 'Desktop').length;

    return {
      totalVisitors: visitors.length,
      todayVisitors,
      weeklyVisitors,
      monthlyVisitors,
      uniqueVisitors: uniqueSet.size,
      totalClicks: contactClicks.length,
      todayClicks,
      weeklyClicks,
      monthlyClicks,
      mobileCount,
      tabletCount,
      desktopCount,
    };
  }, [visitors, contactClicks]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const catOk = projCategoryFilter === 'All' || p.category === projCategoryFilter;
      const statusOk = projStatusFilter === 'All' || p.status === projStatusFilter;
      const q = projSearch.trim().toLowerCase();
      const qOk =
        !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return catOk && statusOk && qOk;
    });
  }, [projects, projCategoryFilter, projStatusFilter, projSearch]);

  // --- HANDLERS ---
  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProj.name.trim() || !newProj.description.trim() || !newProj.imageUrl.trim()) {
      showToast('Project name, image, and description are required.', 'err');
      return;
    }
    setSavingProj(true);
    try {
      await addProject(newProj);
      setNewProj({
        name: '',
        description: '',
        category: 'New Design',
        imageUrl: '',
        demoUrl: '',
        whatsappUrl: '',
        price: '',
        status: 'Active',
        featured: true,
      });
      showToast('Project published successfully!');
      onNavigateTab('manage-projects');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add project.', 'err');
    } finally {
      setSavingProj(false);
    }
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjForm) return;
    try {
      await updateProject(editingProject.id, editProjForm);
      setEditingProject(null);
      showToast('Project updated in real time!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update project.', 'err');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim() || !bannerForm.imageUrl.trim()) {
      showToast('Banner title and image are required.', 'err');
      return;
    }
    setSavingBanner(true);
    try {
      if (editingBannerId) {
        await updateBanner(editingBannerId, bannerForm);
        showToast('Banner updated!');
      } else {
        await addBanner(bannerForm);
        showToast('New banner added!');
      }
      setEditingBannerId(null);
      setBannerForm({
        badgeText: 'Welcome to MJ LAB',
        title: '',
        highlightWord: '',
        description: '',
        buttonText: 'View Portfolio',
        buttonLink: '#projects',
        imageUrl: '',
        order: banners.length + 1,
        active: true,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save banner.', 'err');
    } finally {
      setSavingBanner(false);
    }
  };

  const startEditBanner = (b: Banner) => {
    setEditingBannerId(b.id);
    setBannerForm({
      badgeText: b.badgeText,
      title: b.title,
      highlightWord: b.highlightWord,
      description: b.description,
      buttonText: b.buttonText,
      buttonLink: b.buttonLink,
      imageUrl: b.imageUrl,
      order: b.order,
      active: b.active,
    });
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim() || !teamForm.role.trim()) {
      showToast('Name and role are required.', 'err');
      return;
    }
    try {
      if (editingTeamId) {
        await updateTeamMember(editingTeamId, teamForm);
        showToast('Team member updated!');
      } else {
        await addTeamMember(teamForm);
        showToast('Team member added!');
      }
      setEditingTeamId(null);
      setTeamForm({ name: '', role: '', bio: '', avatarUrl: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save team member.', 'err');
    }
  };

  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingSb(true);
    try {
      await connectSupabase(sbUrl, sbKey, sbRoleKey);
      showToast('Connected to Supabase Realtime!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Supabase connection failed.';
      showToast(msg, msg.includes('Keys saved!') ? 'ok' : 'err');
    } finally {
      setConnectingSb(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold shadow-2xl ${
            toast.type === 'ok'
              ? 'bg-[#072B24] border-[#00E676]/50 text-[#00E676]'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* 1. PROJECTS / MANAGE PROJECTS */}
      {(activeTab === 'projects' || activeTab === 'manage-projects') && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
                Manage Projects
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Edit, toggle status, search, filter, or delete live portfolio websites.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('add-project')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-xs sm:text-sm hover:brightness-110 transition self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={projSearch}
                onChange={(e) => setProjSearch(e.target.value)}
                placeholder="Search by project name or description..."
                className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={projCategoryFilter}
                onChange={(e) => setProjCategoryFilter(e.target.value as 'All' | ProjectCategory)}
                className="px-3 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-[#22D3EE]"
              >
                <option value="All">All Categories</option>
                <option value="New Design">New Design</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Business">Business</option>
                <option value="Portfolio">Portfolio</option>
              </select>

              <select
                value={projStatusFilter}
                onChange={(e) => setProjStatusFilter(e.target.value as 'All' | ProjectStatus)}
                className="px-3 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-medium text-white focus:outline-none focus:border-[#22D3EE]"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-[#050B18] mb-3">
                    <img
                      src={project.imageUrl}
                      alt={project.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateProject(project.id, {
                          status: project.status === 'Active' ? 'Inactive' : 'Active',
                        }).then(() => showToast('Project status updated!'))
                      }
                      className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                        project.status === 'Active'
                          ? 'bg-[#00E676] text-[#050B18]'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {project.status}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-display font-bold text-white">{project.name}</h3>
                    {project.price && (
                      <span className="text-xs font-mono text-[#00E676] shrink-0">
                        {project.price}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#22D3EE] mt-0.5">{project.category}</p>
                  <p className="text-xs text-slate-300 mt-1.5 line-clamp-2">{project.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingProject(project)}
                    className="inline-flex items-center justify-center gap-1 py-2 rounded-xl border border-blue-500/50 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {confirmDeleteProjId === project.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        deleteProject(project.id).then(() => showToast('Project deleted.'));
                        setConfirmDeleteProjId(null);
                      }}
                      className="inline-flex items-center justify-center gap-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteProjId(project.id)}
                      className="inline-flex items-center justify-center gap-1 py-2 rounded-xl border border-rose-500/50 text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  {project.demoUrl ? (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 py-2 rounded-xl border border-[#00E676]/50 text-[#00E676] text-xs font-semibold hover:bg-[#00E676]/10 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Demo</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-center justify-center py-2 rounded-xl border border-slate-700 text-slate-500 text-xs">
                      No URL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ADD NEW PROJECT */}
      {activeTab === 'add-project' && (
        <div className="max-w-3xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Add New Project
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Publish a website project directly to the live MJ LAB portfolio.
            </p>
          </div>

          <form
            onSubmit={handleAddProjectSubmit}
            className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Modern E-Commerce Store"
                  value={newProj.name}
                  onChange={(e) => setNewProj((s) => ({ ...s, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Category *</label>
                <select
                  value={newProj.category}
                  onChange={(e) =>
                    setNewProj((s) => ({ ...s, category: e.target.value as ProjectCategory }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                >
                  <option value="New Design">New Design</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Business">Business</option>
                  <option value="Portfolio">Portfolio</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Project Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe features, tech stack, and client value..."
                value={newProj.description}
                onChange={(e) => setNewProj((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Project Image Upload *</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white hover:border-[#22D3EE] cursor-pointer">
                  <Upload className="w-4 h-4 text-[#22D3EE]" />
                  <span>{uploadingProjImg ? 'Uploading...' : 'Upload Image File'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingProjImg(true);
                      try {
                        const url = await uploadProjectOrBannerImage(file, 'projects');
                        setNewProj((s) => ({ ...s, imageUrl: url }));
                        showToast('Image ready!');
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : 'Image upload failed.', 'err');
                      } finally {
                        setUploadingProjImg(false);
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Or paste Image URL / path..."
                  value={newProj.imageUrl}
                  onChange={(e) => setNewProj((s) => ({ ...s, imageUrl: e.target.value }))}
                  className="flex-1 w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
              {newProj.imageUrl && (
                <img
                  src={newProj.imageUrl}
                  alt="Preview"
                  className="h-36 rounded-xl object-cover border border-white/10 mt-2"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Live Demo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={newProj.demoUrl}
                  onChange={(e) => setNewProj((s) => ({ ...s, demoUrl: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Custom WhatsApp URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="Leave blank to use default WhatsApp"
                  value={newProj.whatsappUrl}
                  onChange={(e) => setNewProj((s) => ({ ...s, whatsappUrl: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Price Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., $299"
                  value={newProj.price}
                  onChange={(e) => setNewProj((s) => ({ ...s, price: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Project Status</label>
                <select
                  value={newProj.status}
                  onChange={(e) =>
                    setNewProj((s) => ({ ...s, status: e.target.value as ProjectStatus }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                >
                  <option value="Active">Active (Visible on Website)</option>
                  <option value="Inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProj}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm hover:brightness-110 disabled:opacity-60 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{savingProj ? 'Publishing...' : 'Publish Project'}</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. BANNER SETTINGS */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Banner Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload, edit, reorder, or remove hero slider banners displayed on the website.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Banner Form */}
            <form
              onSubmit={handleSaveBanner}
              className="lg:col-span-5 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-display font-bold text-white">
                  {editingBannerId ? 'Edit Banner' : 'Add New Banner'}
                </h2>
                {editingBannerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBannerId(null);
                      setBannerForm({
                        badgeText: 'Welcome to MJ LAB',
                        title: '',
                        highlightWord: '',
                        description: '',
                        buttonText: 'View Portfolio',
                        buttonLink: '#projects',
                        imageUrl: '',
                        order: banners.length + 1,
                        active: true,
                      });
                    }}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Top Badge Text (e.g. Welcome to MJ LAB)"
                value={bannerForm.badgeText}
                onChange={(e) => setBannerForm((s) => ({ ...s, badgeText: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
              />

              <input
                type="text"
                required
                placeholder="Banner Title *"
                value={bannerForm.title}
                onChange={(e) => setBannerForm((s) => ({ ...s, title: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
              />

              <input
                type="text"
                placeholder="Highlight Word in Neon Green (e.g. Website)"
                value={bannerForm.highlightWord}
                onChange={(e) => setBannerForm((s) => ({ ...s, highlightWord: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
              />

              <input
                type="text"
                placeholder="Banner Description (e.g. Modern · Fast · Responsive)"
                value={bannerForm.description}
                onChange={(e) => setBannerForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Button Text"
                  value={bannerForm.buttonText}
                  onChange={(e) => setBannerForm((s) => ({ ...s, buttonText: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
                <input
                  type="text"
                  placeholder="Button Link (#projects)"
                  value={bannerForm.buttonLink}
                  onChange={(e) => setBannerForm((s) => ({ ...s, buttonLink: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white hover:border-[#22D3EE] cursor-pointer">
                  <Upload className="w-4 h-4 text-[#22D3EE]" />
                  <span>{uploadingBannerImg ? 'Uploading...' : 'Upload Banner Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingBannerImg(true);
                      try {
                        const url = await uploadProjectOrBannerImage(file, 'banners');
                        setBannerForm((s) => ({ ...s, imageUrl: url }));
                        showToast('Banner image uploaded!');
                      } finally {
                        setUploadingBannerImg(false);
                      }
                    }}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Or paste Banner Image URL *"
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm((s) => ({ ...s, imageUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bannerForm.active}
                    onChange={(e) => setBannerForm((s) => ({ ...s, active: e.target.checked }))}
                    className="rounded"
                  />
                  <span>Active in Slider</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={bannerForm.order}
                  onChange={(e) =>
                    setBannerForm((s) => ({ ...s, order: Number(e.target.value || 1) }))
                  }
                  className="w-20 px-2.5 py-1.5 rounded-lg bg-[#050B18] border border-slate-700 text-xs text-white"
                  title="Display Order"
                />
              </div>

              <button
                type="submit"
                disabled={savingBanner}
                className="w-full py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm hover:brightness-110 transition cursor-pointer"
              >
                {savingBanner ? 'Saving...' : editingBannerId ? 'Update Banner' : 'Add Banner'}
              </button>
            </form>

            {/* Existing Banners List */}
            <div className="lg:col-span-7 space-y-3">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    className="w-full sm:w-36 h-24 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#22D3EE]">#{b.order}</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          b.active ? 'text-[#00E676]' : 'text-slate-400'
                        }`}
                      >
                        {b.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <h3 className="text-sm font-display font-bold text-white truncate">{b.title}</h3>
                    <p className="text-xs text-slate-400 truncate">{b.description}</p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => startEditBanner(b)}
                        className="px-3 py-1 rounded-lg border border-blue-500/50 text-blue-400 text-xs font-medium hover:bg-blue-500/10 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteBanner(b.id).then(() => showToast('Banner deleted.'))
                        }
                        className="px-3 py-1 rounded-lg border border-rose-500/50 text-rose-400 text-xs font-medium hover:bg-rose-500/10 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. WHATSAPP CONTACT SETTINGS */}
      {activeTab === 'whatsapp' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              WhatsApp Contact Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              All WhatsApp buttons across the main website use this number automatically.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                WhatsApp Number (with Country Code, e.g., +8801234567890)
              </label>
              <input
                type="text"
                value={waNumberInput}
                onChange={(e) => setWaNumberInput(e.target.value)}
                placeholder="+8801700000000"
                className="w-full px-4 py-3 rounded-xl bg-[#050B18] border border-slate-700 text-base font-mono text-white focus:outline-none focus:border-[#00E676]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await saveSettings({ whatsappNumber: waNumberInput.trim() });
                    showToast('WhatsApp number updated across website!');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'Save failed.', 'err');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm hover:brightness-110 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save WhatsApp Number</span>
              </button>

              <a
                href={buildWhatsAppLink(waNumberInput, 'Test message from MJ LAB Admin Panel')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-xs sm:text-sm font-medium text-white hover:border-[#00E676] transition"
              >
                <MessageCircle className="w-4 h-4 text-[#00E676]" />
                <span>Test WhatsApp Chat</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. VISITORS INFO & CONTACT CLICK ANALYTICS */}
      {activeTab === 'visitors' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Visitors & Contact Tracking
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time unique visitor analytics and WhatsApp contact button conversions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Total Visitors', val: visitorMetrics.totalVisitors, color: 'text-blue-400' },
              { label: 'Today Visitors', val: visitorMetrics.todayVisitors, color: 'text-[#00E676]' },
              { label: 'Weekly Visitors', val: visitorMetrics.weeklyVisitors, color: 'text-[#22D3EE]' },
              { label: 'Monthly Visitors', val: visitorMetrics.monthlyVisitors, color: 'text-purple-400' },
              { label: 'Unique Visitors', val: visitorMetrics.uniqueVisitors, color: 'text-amber-400' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 space-y-1"
              >
                <div className="text-xs text-slate-400">{stat.label}</div>
                <div className={`text-2xl font-display font-extrabold tabular-nums ${stat.color}`}>
                  {stat.val.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { label: 'Total Contact Clicks', val: visitorMetrics.totalClicks },
              { label: 'Today Contact Clicks', val: visitorMetrics.todayClicks },
              { label: 'Weekly Contact Clicks', val: visitorMetrics.weeklyClicks },
              { label: 'Monthly Contact Clicks', val: visitorMetrics.monthlyClicks },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-[#072B24]/60 border border-[#00E676]/25 p-4 space-y-1"
              >
                <div className="text-xs text-slate-300">{stat.label}</div>
                <div className="text-2xl font-display font-extrabold tabular-nums text-[#00E676]">
                  {stat.val.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-3">
              <h2 className="text-sm font-display font-bold text-white">Device Breakdown</h2>
              <div className="space-y-2.5 text-xs">
                {[
                  { name: 'Mobile', count: visitorMetrics.mobileCount },
                  { name: 'Tablet', count: visitorMetrics.tabletCount },
                  { name: 'Desktop', count: visitorMetrics.desktopCount },
                ].map((d) => {
                  const pct =
                    visitorMetrics.totalVisitors > 0
                      ? Math.round((d.count / visitorMetrics.totalVisitors) * 100)
                      : 0;
                  return (
                    <div key={d.name} className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>{d.name}</span>
                        <span className="font-mono tabular-nums">
                          {d.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#050B18] overflow-hidden">
                        <div
                          className="h-full bg-[#22D3EE] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-8 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-3">
              <h2 className="text-sm font-display font-bold text-white">Recent Visits</h2>
              {visitors.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No visitor events logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/10">
                        <th className="py-2 pr-3">Visitor ID</th>
                        <th className="py-2 pr-3">Device</th>
                        <th className="py-2 pr-3">Type</th>
                        <th className="py-2 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visitors.slice(0, 12).map((v) => (
                        <tr key={v.id}>
                          <td className="py-2 pr-3 font-mono text-slate-300">{v.visitorHash}</td>
                          <td className="py-2 pr-3 text-slate-200">{v.device}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={v.isUnique ? 'text-[#00E676] font-medium' : 'text-slate-400'}
                            >
                              {v.isUnique ? 'Unique' : 'Returning'}
                            </span>
                          </td>
                          <td className="py-2 text-right text-slate-400 tabular-nums">
                            {formatRelativeTime(v.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. CONTACT MESSAGES & ORDERS */}
      {activeTab === 'contacts' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
                Contact Messages & Orders
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Read client inquiries, manage order requests, or reply via WhatsApp.
              </p>
            </div>

            <div className="inline-flex p-1 rounded-xl bg-[#0B162C] border border-cyan-500/20">
              <button
                type="button"
                onClick={() => setInboxTab('messages')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  inboxTab === 'messages'
                    ? 'bg-[#22D3EE] text-[#050B18]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Messages ({contacts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('orders')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  inboxTab === 'orders'
                    ? 'bg-[#00E676] text-[#050B18]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Orders ({orders.length})</span>
              </button>
            </div>
          </div>

          {inboxTab === 'messages' ? (
            contacts.length === 0 ? (
              <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-10 text-center text-xs text-slate-400">
                No client contact messages yet.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 sm:p-5 border space-y-3 ${
                      msg.status === 'Unread'
                        ? 'bg-[#0B1E38]/90 border-[#22D3EE]/40'
                        : 'bg-[#0B162C]/75 border-cyan-500/15'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-display font-bold text-white">{msg.name}</h3>
                          <span
                            className={`text-[11px] font-semibold ${
                              msg.status === 'Unread' ? 'text-[#00E676]' : 'text-slate-400'
                            }`}
                          >
                            · {msg.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[msg.email, msg.phone, msg.subject].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 leading-relaxed bg-[#050B18]/70 p-3 rounded-xl border border-white/5">
                      {msg.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          markContactRead(msg.id, msg.status === 'Unread' ? 'Read' : 'Unread')
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#050B18] border border-slate-700 text-xs font-medium text-white hover:border-[#22D3EE] cursor-pointer"
                      >
                        Mark as {msg.status === 'Unread' ? 'Read' : 'Unread'}
                      </button>
                      {msg.phone && (
                        <a
                          href={buildWhatsAppLink(
                            msg.phone,
                            `Hi ${msg.name}, thanks for contacting ${settings.siteName}!`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00E676] text-[#050B18] text-xs font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reply on WhatsApp</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          deleteContact(msg.id).then(() => showToast('Message deleted.'))
                        }
                        className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 text-xs font-medium hover:bg-rose-500/10 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : orders.length === 0 ? (
            <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-10 text-center text-xs text-slate-400">
              No website order requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-display font-bold text-white">
                        {ord.projectName}
                      </h3>
                      <span className="text-xs text-[#22D3EE]">· {ord.clientName}</span>
                    </div>
                    <p className="text-xs font-mono text-slate-300">{ord.clientContact}</p>
                    {ord.notes && <p className="text-xs text-slate-400">{ord.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={ord.status}
                      onChange={(e) =>
                        updateOrderStatus(ord.id, e.target.value as OrderStatus).then(() =>
                          showToast('Order status updated!')
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#050B18] border border-slate-700 text-xs font-semibold text-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteOrder(ord.id).then(() => showToast('Order removed.'))}
                      className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 text-xs font-medium hover:bg-rose-500/10 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. WEBSITE SETTINGS + SUPABASE REALTIME KEY CONNECTION */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Website Settings & Database Sync
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Update site identity, theme, footer, or connect your Supabase URL & Anon Key for live
              sync.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveSettings(siteForm);
                showToast('Website settings saved!');
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Save failed.', 'err');
              }
            }}
            className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Website Name</label>
                <input
                  type="text"
                  required
                  value={siteForm.siteName}
                  onChange={(e) => setSiteForm((s) => ({ ...s, siteName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Tagline</label>
                <input
                  type="text"
                  value={siteForm.tagline}
                  onChange={(e) => setSiteForm((s) => ({ ...s, tagline: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Website Description</label>
              <textarea
                rows={2}
                value={siteForm.description}
                onChange={(e) => setSiteForm((s) => ({ ...s, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Website Theme</label>
                <select
                  value={siteForm.theme}
                  onChange={(e) =>
                    setSiteForm((s) => ({ ...s, theme: e.target.value as SiteTheme }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                >
                  <option value="Dark">Dark (Classic Navy)</option>
                  <option value="Midnight">Midnight (Deep Obsidian)</option>
                  <option value="Ocean">Ocean (Royal Blue)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Footer Text</label>
                <input
                  type="text"
                  value={siteForm.footerText}
                  onChange={(e) => setSiteForm((s) => ({ ...s, footerText: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm hover:brightness-110 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Website Settings</span>
            </button>
          </form>

          {/* Supabase Realtime Connection Card */}
          <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/25 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-[#00E676]" />
                <div>
                  <h2 className="text-base font-display font-bold text-white">
                    Supabase Realtime & Role Key Connection
                  </h2>
                  <p className="text-xs text-slate-400">
                    Active Database:{' '}
                    <span
                      className={`font-semibold ${
                        supabaseConnected ? 'text-[#00E676]' : 'text-amber-300'
                      }`}
                    >
                      {supabaseConnected
                        ? hasWorkerRole
                          ? 'Supabase Live (Cloudflare Worker Role Key)'
                          : 'Supabase Live'
                        : 'Local Preview (Enter Supabase Keys below)'}
                    </span>
                  </p>
                </div>
              </div>
              {supabaseConnected && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={syncingSeed}
                    onClick={() =>
                      seedSupabaseData()
                        .then(() => showToast('Seeded data into Supabase!'))
                        .catch((err) =>
                          showToast(
                            err instanceof Error ? err.message : 'Failed to sync seed data.',
                            'err'
                          )
                        )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE] text-[#050B18] text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingSeed ? 'animate-spin' : ''}`} />
                    <span>Sync Data to Supabase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      disconnectSupabase();
                      showToast('Supabase disconnected. Using local browser preview.');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    Disconnect Supabase
                  </button>
                </div>
              )}
            </div>

            {supabaseError && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 text-xs text-amber-200">
                Supabase table check notice: <span className="font-mono">{supabaseError}</span>.
                Click &ldquo;Copy Supabase SQL Setup&rdquo; below and run it once in your Supabase
                SQL Editor.
              </div>
            )}

            <form onSubmit={handleConnectSupabase} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="url"
                  required
                  placeholder="Supabase Project URL (https://xxx.supabase.co)"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-mono text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Supabase Anon Public Key"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-mono text-white"
                />
              </div>
              <input
                type="password"
                placeholder="Supabase Service Role Key (Optional — auto-used if configured in Cloudflare Worker)"
                value={sbRoleKey}
                onChange={(e) => setSbRoleKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-mono text-white"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={connectingSb}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{connectingSb ? 'Connecting...' : 'Connect Supabase Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-xs text-slate-200 hover:border-[#22D3EE] cursor-pointer"
                >
                  {copiedSql ? (
                    <Check className="w-3.5 h-3.5 text-[#00E676]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#22D3EE]" />
                  )}
                  <span>{copiedSql ? 'Copied SQL Schema!' : 'Copy Supabase SQL Setup'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. LOGO & FAVICON */}
      {activeTab === 'branding' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Logo & Favicon
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload a custom MJ LAB brand logo and browser tab favicon.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Website Logo</label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white cursor-pointer">
                  <Upload className="w-4 h-4 text-[#22D3EE]" />
                  <span>Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadProjectOrBannerImage(file, 'branding');
                      setBrandingForm((s) => ({ ...s, logoUrl: url }));
                    }}
                  />
                </label>
                {brandingForm.logoUrl && (
                  <>
                    <img
                      src={brandingForm.logoUrl}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-full object-cover border border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setBrandingForm((s) => ({ ...s, logoUrl: '' }))}
                      className="text-xs text-rose-400 cursor-pointer"
                    >
                      Reset Default
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Website Favicon</label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-[#00E676]" />
                  <span>Upload Favicon</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadProjectOrBannerImage(file, 'branding');
                      setBrandingForm((s) => ({ ...s, faviconUrl: url }));
                    }}
                  />
                </label>
                {brandingForm.faviconUrl && (
                  <img
                    src={brandingForm.faviconUrl}
                    alt="Favicon Preview"
                    className="w-9 h-9 rounded-lg object-cover border border-white/15"
                  />
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                saveSettings(brandingForm).then(() => showToast('Logo & Favicon updated!'))
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Branding</span>
            </button>
          </div>
        </div>
      )}

      {/* 9. ABOUT US */}
      {activeTab === 'about' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">About Us</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Update the About section headline and story displayed on the main website.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveSettings(aboutForm);
              showToast('About Us updated!');
            }}
            className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">About Title</label>
              <input
                type="text"
                required
                value={aboutForm.aboutTitle}
                onChange={(e) => setAboutForm((s) => ({ ...s, aboutTitle: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">About Description</label>
              <textarea
                rows={5}
                required
                value={aboutForm.aboutDescription}
                onChange={(e) =>
                  setAboutForm((s) => ({ ...s, aboutDescription: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save About Section</span>
            </button>
          </form>
        </div>
      )}

      {/* 10. TEAM MEMBERS */}
      {activeTab === 'team' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Team Members</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage developers and designers showcased in the About section.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form
              onSubmit={handleSaveTeam}
              className="lg:col-span-5 rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 space-y-3.5"
            >
              <h2 className="text-base font-display font-bold text-white">
                {editingTeamId ? 'Edit Member' : 'Add Team Member'}
              </h2>
              <input
                type="text"
                required
                placeholder="Full Name *"
                value={teamForm.name}
                onChange={(e) => setTeamForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <input
                type="text"
                required
                placeholder="Role (e.g., Full-Stack Developer) *"
                value={teamForm.role}
                onChange={(e) => setTeamForm((s) => ({ ...s, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <textarea
                rows={3}
                placeholder="Short Bio"
                value={teamForm.bio}
                onChange={(e) => setTeamForm((s) => ({ ...s, bio: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white cursor-pointer">
                <Upload className="w-4 h-4 text-[#22D3EE]" />
                <span>{uploadingTeamImg ? 'Uploading...' : 'Upload Avatar'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingTeamImg(true);
                    try {
                      const url = await uploadProjectOrBannerImage(file, 'team');
                      setTeamForm((s) => ({ ...s, avatarUrl: url }));
                    } finally {
                      setUploadingTeamImg(false);
                    }
                  }}
                />
              </label>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
              >
                {editingTeamId ? 'Update Member' : 'Add Member'}
              </button>
            </form>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {team.map((m: TeamMember) => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-12 h-12 rounded-full object-cover border border-cyan-400/50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#071A40] flex items-center justify-center text-sm font-bold text-[#22D3EE]">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-display font-bold text-white truncate">
                        {m.name}
                      </h3>
                      <p className="text-xs text-[#00E676] truncate">{m.role}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.bio}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTeamId(m.id);
                        setTeamForm({
                          name: m.name,
                          role: m.role,
                          bio: m.bio,
                          avatarUrl: m.avatarUrl,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-blue-500/40 text-blue-400 text-xs cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        deleteTeamMember(m.id).then(() => showToast('Team member removed.'))
                      }
                      className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 text-xs cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. SOCIAL LINKS */}
      {activeTab === 'social' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">Social Links</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Update social profile URLs displayed in your website contact & footer sections.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveSettings({ socialLinks: socialForm });
              showToast('Social links updated!');
            }}
            className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-3.5"
          >
            {(
              [
                { key: 'facebook', label: 'Facebook URL' },
                { key: 'github', label: 'GitHub URL' },
                { key: 'linkedin', label: 'LinkedIn URL' },
                { key: 'youtube', label: 'YouTube URL' },
                { key: 'instagram', label: 'Instagram URL' },
                { key: 'twitter', label: 'X / Twitter URL' },
              ] as const
            ).map((item) => (
              <div key={item.key} className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>{item.label}</span>
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={socialForm[item.key]}
                  onChange={(e) =>
                    setSocialForm((s) => ({ ...s, [item.key]: e.target.value }))
                  }
                  className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                />
              </div>
            ))}
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Save Social Links</span>
            </button>
          </form>
        </div>
      )}

      {/* 12. ACCOUNT SETTINGS */}
      {activeTab === 'account' && (
        <div className="max-w-2xl space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Account Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Current admin session details and Supabase database sync status.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#071A40] border border-[#22D3EE]/50 flex items-center justify-center text-[#22D3EE]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-display font-bold text-white">
                  {adminDisplayName}
                </div>
                <div className="text-xs font-mono text-[#00E676]">
                  Password-Protected Admin Session
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Database:{' '}
                  <span className="font-mono text-slate-200">
                    {supabaseConnected
                      ? hasWorkerRole
                        ? 'Supabase Live (Cloudflare Worker Role Key)'
                        : 'Supabase Live'
                      : 'Local Browser Mode (Connect Supabase in Website Settings)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('password')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#22D3EE] text-[#050B18] font-bold text-xs cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Admin Password</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-xs font-medium text-white hover:border-[#00E676] cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-[#00E676]" />
                <span>Manage Supabase Keys</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="max-w-lg space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">
              Change Password
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Update your Admin Panel login password.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (pwForm.next.length < 6) {
                showToast('New password must be at least 6 characters.', 'err');
                return;
              }
              if (pwForm.next !== pwForm.confirm) {
                showToast('Passwords do not match.', 'err');
                return;
              }
              setSavingPw(true);
              try {
                await adminChangePassword(pwForm.current, pwForm.next);
                setPwForm({ current: '', next: '', confirm: '' });
                showToast('Password updated successfully!');
              } catch (err) {
                showToast(
                  err instanceof Error
                    ? err.message
                    : 'Password change applies to Email/Password accounts.',
                  'err'
                );
              } finally {
                setSavingPw(false);
              }
            }}
            className="rounded-2xl bg-[#0B162C]/85 border border-cyan-500/15 p-5 sm:p-6 space-y-3.5"
          >
            <input
              type="password"
              required
              placeholder="Current Password"
              value={pwForm.current}
              onChange={(e) => setPwForm((s) => ({ ...s, current: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
            />
            <input
              type="password"
              required
              placeholder="New Password (min 6 chars)"
              value={pwForm.next}
              onChange={(e) => setPwForm((s) => ({ ...s, next: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
            />
            <input
              type="password"
              required
              placeholder="Confirm New Password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((s) => ({ ...s, confirm: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
            />
            <button
              type="submit"
              disabled={savingPw}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{savingPw ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {editingProject && editProjForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-[#0B162C] border border-cyan-500/30 overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <h3 className="text-base font-display font-bold text-white">Edit Project</h3>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProject} className="p-5 space-y-3 overflow-y-auto">
              <input
                type="text"
                required
                value={editProjForm.name}
                onChange={(e) => setEditProjForm((s) => (s ? { ...s, name: e.target.value } : s))}
                placeholder="Project Name"
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <textarea
                rows={3}
                required
                value={editProjForm.description}
                onChange={(e) =>
                  setEditProjForm((s) => (s ? { ...s, description: e.target.value } : s))
                }
                placeholder="Description"
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editProjForm.category}
                  onChange={(e) =>
                    setEditProjForm((s) =>
                      s ? { ...s, category: e.target.value as ProjectCategory } : s
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                >
                  <option value="New Design">New Design</option>
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Business">Business</option>
                  <option value="Portfolio">Portfolio</option>
                </select>
                <select
                  value={editProjForm.status}
                  onChange={(e) =>
                    setEditProjForm((s) =>
                      s ? { ...s, status: e.target.value as ProjectStatus } : s
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <input
                type="url"
                value={editProjForm.demoUrl}
                onChange={(e) =>
                  setEditProjForm((s) => (s ? { ...s, demoUrl: e.target.value } : s))
                }
                placeholder="Live Demo URL"
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <input
                type="text"
                value={editProjForm.price}
                onChange={(e) => setEditProjForm((s) => (s ? { ...s, price: e.target.value } : s))}
                placeholder="Price (optional)"
                className="w-full px-3.5 py-2 rounded-xl bg-[#050B18] border border-slate-700 text-sm text-white"
              />
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#071A40] border border-cyan-500/40 text-xs font-semibold text-white cursor-pointer">
                  <Upload className="w-4 h-4 text-[#22D3EE]" />
                  <span>Change Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadProjectOrBannerImage(file, 'projects');
                      setEditProjForm((s) => (s ? { ...s, imageUrl: url } : s));
                    }}
                  />
                </label>
                {editProjForm.imageUrl && (
                  <img
                    src={editProjForm.imageUrl}
                    alt="Preview"
                    className="h-12 w-20 rounded-lg object-cover border border-white/10"
                  />
                )}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#00E676] text-[#050B18] font-bold text-sm cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
