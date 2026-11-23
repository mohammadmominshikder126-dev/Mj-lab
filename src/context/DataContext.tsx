import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Banner,
  ContactClick,
  ContactMessage,
  OrderRequest,
  OrderStatus,
  Project,
  SupabaseConnectionConfig,
  TeamMember,
  WebsiteSettings,
  VisitorEvent,
} from '../types';
import {
  DEFAULT_BANNERS,
  DEFAULT_PROJECTS,
  DEFAULT_SETTINGS,
  DEFAULT_TEAM,
} from '../lib/defaults';
import {
  clearSupabaseConfig,
  createSupabaseClient,
  getSavedSupabaseConfig,
  saveSupabaseConfig,
} from '../lib/supabase';

const LOCAL_STORE_KEY = 'mjlab_local_store_v1';
const ADMIN_PASSCODE_KEY = 'mjlab_admin_passcode';
const ADMIN_SESSION_KEY = 'mjlab_admin_session';
const DEFAULT_ADMIN_PASSWORD = 'mjlab2026';

interface LocalStoreData {
  projects: Project[];
  banners: Banner[];
  settings: WebsiteSettings;
  team: TeamMember[];
  contacts: ContactMessage[];
  visitors: VisitorEvent[];
  contactClicks: ContactClick[];
  orders: OrderRequest[];
}

function readLocalStore(): LocalStoreData {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
      return {
        projects: parsed.projects || DEFAULT_PROJECTS,
        banners: parsed.banners || DEFAULT_BANNERS,
        settings: parsed.settings || DEFAULT_SETTINGS,
        team: parsed.team || DEFAULT_TEAM,
        contacts: parsed.contacts || [],
        visitors: parsed.visitors || [],
        contactClicks: parsed.contactClicks || [],
        orders: parsed.orders || [],
      };
    }
  } catch {
    // ignore
  }
  return {
    projects: DEFAULT_PROJECTS,
    banners: DEFAULT_BANNERS,
    settings: DEFAULT_SETTINGS,
    team: DEFAULT_TEAM,
    contacts: [],
    visitors: [],
    contactClicks: [],
    orders: [],
  };
}

function writeLocalStore(data: LocalStoreData): void {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function detectDevice(): 'Mobile' | 'Tablet' | 'Desktop' {
  const w = window.innerWidth;
  if (w < 640) return 'Mobile';
  if (w < 1024) return 'Tablet';
  return 'Desktop';
}

function getOrCreateVisitorHash(): { hash: string; isFirstEver: boolean } {
  try {
    const existing = localStorage.getItem('mjlab_visitor_hash');
    if (existing && /^[a-zA-Z0-9_\-]+$/.test(existing)) {
      return { hash: existing, isFirstEver: false };
    }
    const created = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('mjlab_visitor_hash', created);
    return { hash: created, isFirstEver: true };
  } catch {
    return { hash: `v_${Date.now().toString(36)}`, isFirstEver: true };
  }
}

interface DataContextValue {
  // Auth (Password-Only)
  authReady: boolean;
  isAdmin: boolean;
  adminDisplayName: string;
  adminLoginPassword: (password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  adminChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Supabase Backend Status & Config
  supabaseConnected: boolean;
  hasWorkerRole: boolean;
  supabaseConfig: SupabaseConnectionConfig;
  supabaseError: string;
  connectSupabase: (url: string, anonKey: string, roleKey?: string) => Promise<void>;
  disconnectSupabase: () => void;
  seedSupabaseData: () => Promise<void>;
  syncingSeed: boolean;

  // Data
  projects: Project[];
  banners: Banner[];
  settings: WebsiteSettings;
  team: TeamMember[];
  contacts: ContactMessage[];
  visitors: VisitorEvent[];
  contactClicks: ContactClick[];
  orders: OrderRequest[];
  loadingData: boolean;

  // Public interactions
  recordVisit: (page?: string) => Promise<void>;
  recordContactClick: (source: string, project?: Project) => Promise<void>;
  submitContactMessage: (payload: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  }) => Promise<void>;
  submitOrderRequest: (payload: {
    clientName: string;
    clientContact: string;
    projectId?: string;
    projectName: string;
    category?: string;
    notes?: string;
  }) => Promise<void>;

  // Admin CRUD
  addProject: (payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (
    id: string,
    payload: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addBanner: (payload: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBanner: (
    id: string,
    payload: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;

  saveSettings: (payload: Partial<WebsiteSettings>) => Promise<void>;

  addTeamMember: (payload: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTeamMember: (
    id: string,
    payload: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  markContactRead: (id: string, status: 'Read' | 'Unread') => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem(ADMIN_SESSION_KEY));
    } catch {
      return false;
    }
  });
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
    } catch {
      return '';
    }
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConnectionConfig>(() =>
    getSavedSupabaseConfig()
  );
  const [hasWorkerRole, setHasWorkerRole] = useState(false);
  const [hasWorkerAuth, setHasWorkerAuth] = useState(false);
  const [supabaseError, setSupabaseError] = useState('');

  // Public Supabase client (anon key)
  const supabaseAnonClient: SupabaseClient | null = useMemo(
    () => createSupabaseClient(supabaseConfig, false),
    [supabaseConfig]
  );

  // Admin Supabase client (uses roleKey if entered locally, otherwise anonKey)
  const supabaseAdminClient: SupabaseClient | null = useMemo(
    () => createSupabaseClient(supabaseConfig, true),
    [supabaseConfig]
  );

  const supabaseConnected = Boolean(supabaseAnonClient);

  const initialLocal = useMemo(() => readLocalStore(), []);
  const [projects, setProjects] = useState<Project[]>(initialLocal.projects);
  const [banners, setBanners] = useState<Banner[]>(initialLocal.banners);
  const [settings, setSettings] = useState<WebsiteSettings>(initialLocal.settings);
  const [team, setTeam] = useState<TeamMember[]>(initialLocal.team);
  const [contacts, setContacts] = useState<ContactMessage[]>(initialLocal.contacts);
  const [visitors, setVisitors] = useState<VisitorEvent[]>(initialLocal.visitors);
  const [contactClicks, setContactClicks] = useState<ContactClick[]>(initialLocal.contactClicks);
  const [orders, setOrders] = useState<OrderRequest[]>(initialLocal.orders);

  const [loadingData, setLoadingData] = useState(true);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const visitRecordedRef = useRef(false);
  const autoSeededRef = useRef(false);

  // Persist local store whenever offline/pre-Supabase state updates
  const persistLocal = useCallback(
    (patch: Partial<LocalStoreData>) => {
      const current = readLocalStore();
      const next: LocalStoreData = {
        projects: patch.projects ?? current.projects,
        banners: patch.banners ?? current.banners,
        settings: patch.settings ?? current.settings,
        team: patch.team ?? current.team,
        contacts: patch.contacts ?? current.contacts,
        visitors: patch.visitors ?? current.visitors,
        contactClicks: patch.contactClicks ?? current.contactClicks,
        orders: patch.orders ?? current.orders,
      };
      writeLocalStore(next);
    },
    []
  );

  // Cross-tab sync when Supabase is not yet connected
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORE_KEY && !supabaseConnected) {
        const fresh = readLocalStore();
        setProjects(fresh.projects);
        setBanners(fresh.banners);
        setSettings(fresh.settings);
        setTeam(fresh.team);
        setContacts(fresh.contacts);
        setVisitors(fresh.visitors);
        setContactClicks(fresh.contactClicks);
        setOrders(fresh.orders);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [supabaseConnected]);

  // Discover Cloudflare Worker /api/config automatically if deployed on Workers
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const cfg = (await res.json()) as {
              supabaseUrl?: string;
              supabaseAnonKey?: string;
              hasWorkerRole?: boolean;
              hasWorkerAuth?: boolean;
            };
            if (!active) return;
            setHasWorkerRole(Boolean(cfg.hasWorkerRole));
            setHasWorkerAuth(Boolean(cfg.hasWorkerAuth));
            if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
              const merged: SupabaseConnectionConfig = {
                url: cfg.supabaseUrl,
                anonKey: cfg.supabaseAnonKey,
                roleKey: getSavedSupabaseConfig().roleKey || '',
                enabled: true,
              };
              saveSupabaseConfig(merged);
              setSupabaseConfig(merged);
            }
          }
        }
      } catch {
        // Not running on Worker backend, continue with env/localStorage config
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sync <title> and favicon dynamically from settings
  useEffect(() => {
    document.title = `${settings.siteName} — ${settings.tagline}`;
    if (settings.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.faviconUrl;
    }
  }, [settings.siteName, settings.tagline, settings.faviconUrl]);

  // Helper to call Cloudflare Worker Admin proxy when Worker Role Key is configured
  const workerAdminRequest = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      const res = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
          ...(options?.headers || {}),
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || `Request failed (${res.status})`);
      }
      return json;
    },
    [adminToken]
  );

  // Load all data from Supabase (or Worker Admin proxy for private tables)
  const loadSupabaseAll = useCallback(
    async (client: SupabaseClient) => {
      setLoadingData(true);
      setSupabaseError('');
      try {
        const activeClient = isAdmin && supabaseAdminClient ? supabaseAdminClient : client;

        const [projRes, banRes, setRes, teamRes] = await Promise.all([
          activeClient.from('projects').select('*').order('created_at', { ascending: false }),
          activeClient.from('banners').select('*').order('sort_order', { ascending: true }),
          activeClient.from('website_settings').select('*').eq('id', 'site').maybeSingle(),
          activeClient.from('team_members').select('*').order('created_at', { ascending: true }),
        ]);

        const firstErr = projRes.error || banRes.error || setRes.error || teamRes.error;
        if (firstErr) {
          setSupabaseError(firstErr.message);
        }

        if (projRes.data && projRes.data.length > 0) {
          setProjects(
            projRes.data.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              category: r.category,
              imageUrl: r.image_url,
              demoUrl: r.demo_url || '',
              whatsappUrl: r.whatsapp_url || '',
              status: r.status,
              price: r.price || '',
              featured: Boolean(r.featured),
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }))
          );
        } else if (projRes.data && projRes.data.length === 0 && !autoSeededRef.current && isAdmin) {
          // Auto-seed empty Supabase tables automatically when admin is logged in
          autoSeededRef.current = true;
          setTimeout(() => {
            seedSupabaseData().catch(() => {});
          }, 50);
        }

        if (banRes.data && banRes.data.length > 0) {
          setBanners(
            banRes.data.map((r) => ({
              id: r.id,
              badgeText: r.badge_text || '',
              title: r.title,
              highlightWord: r.highlight_word || '',
              description: r.description || '',
              buttonText: r.button_text || 'View Portfolio',
              buttonLink: r.button_link || '#projects',
              imageUrl: r.image_url,
              order: r.sort_order ?? 1,
              active: r.active !== false,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }))
          );
        }

        if (setRes.data) {
          const s = setRes.data;
          setSettings({
            siteName: s.site_name || DEFAULT_SETTINGS.siteName,
            tagline: s.tagline || DEFAULT_SETTINGS.tagline,
            description: s.description || DEFAULT_SETTINGS.description,
            theme: s.theme || 'Dark',
            logoUrl: s.logo_url || '',
            faviconUrl: s.favicon_url || '',
            whatsappNumber: s.whatsapp_number || DEFAULT_SETTINGS.whatsappNumber,
            aboutTitle: s.about_title || DEFAULT_SETTINGS.aboutTitle,
            aboutDescription: s.about_description || DEFAULT_SETTINGS.aboutDescription,
            footerText: s.footer_text || DEFAULT_SETTINGS.footerText,
            socialLinks: s.social_links || {},
            updatedAt: s.updated_at || new Date().toISOString(),
          });
        }

        if (teamRes.data && teamRes.data.length > 0) {
          setTeam(
            teamRes.data.map((r) => ({
              id: r.id,
              name: r.name,
              role: r.role,
              bio: r.bio || '',
              avatarUrl: r.avatar_url || '',
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            }))
          );
        }

        // Load admin analytics & inbox tables if admin logged in
        if (isAdmin) {
          if (hasWorkerRole && adminToken) {
            try {
              const adminData = (await workerAdminRequest('/api/admin/data')) as {
                contacts?: Record<string, unknown>[];
                visitors?: Record<string, unknown>[];
                contactClicks?: Record<string, unknown>[];
                orders?: Record<string, unknown>[];
              };
              if (adminData.contacts) {
                setContacts(
                  adminData.contacts.map((r) => ({
                    id: String(r.id),
                    name: String(r.name),
                    email: String(r.email || ''),
                    phone: String(r.phone || ''),
                    subject: String(r.subject || ''),
                    message: String(r.message || ''),
                    status: (r.status as 'Unread' | 'Read') || 'Unread',
                    createdAt: String(r.created_at),
                  }))
                );
              }
              if (adminData.visitors) {
                setVisitors(
                  adminData.visitors.map((r) => ({
                    id: String(r.id),
                    visitorHash: String(r.visitor_hash),
                    dateKey: String(r.date_key),
                    isUnique: Boolean(r.is_unique),
                    page: String(r.page || '/'),
                    device: (r.device as VisitorEvent['device']) || 'Desktop',
                    createdAt: String(r.created_at),
                  }))
                );
              }
              if (adminData.contactClicks) {
                setContactClicks(
                  adminData.contactClicks.map((r) => ({
                    id: String(r.id),
                    source: String(r.source),
                    projectId: String(r.project_id || ''),
                    projectName: String(r.project_name || ''),
                    dateKey: String(r.date_key),
                    createdAt: String(r.created_at),
                  }))
                );
              }
              if (adminData.orders) {
                setOrders(
                  adminData.orders.map((r) => ({
                    id: String(r.id),
                    clientName: String(r.client_name),
                    clientContact: String(r.client_contact),
                    projectId: String(r.project_id || ''),
                    projectName: String(r.project_name),
                    category: String(r.category || ''),
                    notes: String(r.notes || ''),
                    status: (r.status as OrderStatus) || 'Pending',
                    createdAt: String(r.created_at),
                    updatedAt: String(r.updated_at),
                  }))
                );
              }
              return;
            } catch {
              // Fall through to direct Supabase client
            }
          }

          const [contRes, visRes, clkRes, ordRes] = await Promise.all([
            activeClient.from('contacts').select('*').order('created_at', { ascending: false }),
            activeClient.from('visitors').select('*').order('created_at', { ascending: false }),
            activeClient
              .from('contact_clicks')
              .select('*')
              .order('created_at', { ascending: false }),
            activeClient.from('orders').select('*').order('created_at', { ascending: false }),
          ]);

          if (contRes.data) {
            setContacts(
              contRes.data.map((r) => ({
                id: r.id,
                name: r.name,
                email: r.email || '',
                phone: r.phone || '',
                subject: r.subject || '',
                message: r.message,
                status: r.status,
                createdAt: r.created_at,
              }))
            );
          }
          if (visRes.data) {
            setVisitors(
              visRes.data.map((r) => ({
                id: r.id,
                visitorHash: r.visitor_hash,
                dateKey: r.date_key,
                isUnique: Boolean(r.is_unique),
                page: r.page || '/',
                device: r.device || 'Desktop',
                createdAt: r.created_at,
              }))
            );
          }
          if (clkRes.data) {
            setContactClicks(
              clkRes.data.map((r) => ({
                id: r.id,
                source: r.source,
                projectId: r.project_id || '',
                projectName: r.project_name || '',
                dateKey: r.date_key,
                createdAt: r.created_at,
              }))
            );
          }
          if (ordRes.data) {
            setOrders(
              ordRes.data.map((r) => ({
                id: r.id,
                clientName: r.client_name,
                clientContact: r.client_contact,
                projectId: r.project_id || '',
                projectName: r.project_name,
                category: r.category || '',
                notes: r.notes || '',
                status: r.status,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
              }))
            );
          }
        }
      } finally {
        setLoadingData(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, supabaseAdminClient, hasWorkerRole, adminToken, workerAdminRequest]
  );

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!supabaseAnonClient) {
      setLoadingData(false);
      return;
    }
    loadSupabaseAll(supabaseAnonClient);

    const channel = supabaseAnonClient
      .channel('mjlab-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadSupabaseAll(supabaseAnonClient);
      })
      .subscribe();

    return () => {
      supabaseAnonClient.removeChannel(channel);
    };
  }, [supabaseAnonClient, loadSupabaseAll]);

  // Seed Supabase with default MJ LAB data
  const seedSupabaseData = useCallback(async () => {
    const client = supabaseAdminClient || supabaseAnonClient;
    if (!client && !hasWorkerRole) throw new Error('Supabase is not connected yet.');
    setSyncingSeed(true);
    try {
      const settingsRow = {
        id: 'site',
        site_name: settings.siteName,
        tagline: settings.tagline,
        description: settings.description,
        theme: settings.theme,
        logo_url: settings.logoUrl,
        favicon_url: settings.faviconUrl,
        whatsapp_number: settings.whatsappNumber,
        about_title: settings.aboutTitle,
        about_description: settings.aboutDescription,
        footer_text: settings.footerText,
        social_links: settings.socialLinks,
        updated_at: new Date().toISOString(),
      };
      const projectRows = projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        image_url: p.imageUrl,
        demo_url: p.demoUrl,
        whatsapp_url: p.whatsappUrl,
        status: p.status,
        price: p.price || '',
        featured: Boolean(p.featured),
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      }));
      const bannerRows = banners.map((b) => ({
        id: b.id,
        badge_text: b.badgeText,
        title: b.title,
        highlight_word: b.highlightWord,
        description: b.description,
        button_text: b.buttonText,
        button_link: b.buttonLink,
        image_url: b.imageUrl,
        sort_order: b.order,
        active: b.active,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
      }));
      const teamRows = team.map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        bio: t.bio,
        avatar_url: t.avatarUrl,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }));

      if (hasWorkerRole && adminToken) {
        await workerAdminRequest('/api/admin/seed', {
          method: 'POST',
          body: JSON.stringify({
            settings: settingsRow,
            projects: projectRows,
            banners: bannerRows,
            team: teamRows,
          }),
        });
      } else if (client) {
        const r1 = await client.from('website_settings').upsert(settingsRow);
        if (r1.error) throw new Error(r1.error.message);
        const r2 = await client.from('projects').upsert(projectRows);
        if (r2.error) throw new Error(r2.error.message);
        const r3 = await client.from('banners').upsert(bannerRows);
        if (r3.error) throw new Error(r3.error.message);
        const r4 = await client.from('team_members').upsert(teamRows);
        if (r4.error) throw new Error(r4.error.message);
      }
      if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    } finally {
      setSyncingSeed(false);
    }
  }, [
    supabaseAdminClient,
    supabaseAnonClient,
    hasWorkerRole,
    adminToken,
    workerAdminRequest,
    settings,
    projects,
    banners,
    team,
    loadSupabaseAll,
  ]);

  // Password-Only Admin Authentication
  const adminLoginPassword = useCallback(
    async (password: string) => {
      const cleanPassword = password.trim();
      if (hasWorkerAuth) {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: cleanPassword }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          token?: string;
          error?: string;
        };
        if (!res.ok || !data.token) {
          throw new Error(data.error || 'Incorrect admin password.');
        }
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, data.token);
        } catch {
          // ignore
        }
        setAdminToken(data.token);
        setIsAdmin(true);
        return;
      }

      const storedPass = (() => {
        try {
          return (localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_ADMIN_PASSWORD).trim();
        } catch {
          return DEFAULT_ADMIN_PASSWORD;
        }
      })();
      if (cleanPassword !== storedPass) {
        throw new Error('Incorrect admin password.');
      }
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'local-admin-session');
      } catch {
        // ignore
      }
      setAdminToken('local-admin-session');
      setIsAdmin(true);
    },
    [hasWorkerAuth]
  );

  const adminLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // ignore
    }
    setAdminToken('');
    setIsAdmin(false);
  }, []);

  const adminChangePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (hasWorkerAuth) {
        throw new Error(
          'Password is managed by Cloudflare Worker ADMIN_PASSWORD secret. Update ADMIN_PASSWORD in Cloudflare Worker Settings.'
        );
      }
      const storedPass = (() => {
        try {
          return localStorage.getItem(ADMIN_PASSCODE_KEY) || DEFAULT_ADMIN_PASSWORD;
        } catch {
          return DEFAULT_ADMIN_PASSWORD;
        }
      })();
      if (currentPassword !== storedPass) {
        throw new Error('Current password is incorrect.');
      }
      localStorage.setItem(ADMIN_PASSCODE_KEY, newPassword);
    },
    [hasWorkerAuth]
  );

  // Supabase Key Connect / Disconnect
  const connectSupabase = useCallback(async (url: string, anonKey: string, roleKey = '') => {
    const cfg: SupabaseConnectionConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      roleKey: roleKey.trim(),
      enabled: true,
    };
    const testClient = createSupabaseClient(cfg, Boolean(roleKey.trim()));
    if (!testClient) throw new Error('Invalid Supabase URL or Key.');
    const { error } = await testClient.from('website_settings').select('id').limit(1);
    if (error && !error.message.includes('0 rows')) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        saveSupabaseConfig(cfg);
        setSupabaseConfig(cfg);
        setSupabaseError(error.message);
        throw new Error(
          'Keys saved! Now run the SQL Setup script once in your Supabase SQL Editor to create the tables.'
        );
      }
      throw new Error(`Supabase connection check failed: ${error.message}`);
    }
    saveSupabaseConfig(cfg);
    setSupabaseConfig(cfg);
    setSupabaseError('');
  }, []);

  const disconnectSupabase = useCallback(() => {
    clearSupabaseConfig();
    setSupabaseConfig({ url: '', anonKey: '', roleKey: '', enabled: false });
    setSupabaseError('');
  }, []);

  // Mutation Helper (Worker Service Role -> Direct Admin/Anon Supabase -> Local Store)
  const mutateTable = useCallback(
    async (
      table: string,
      action: 'insert' | 'update' | 'upsert' | 'delete',
      payload?: Record<string, unknown>,
      id?: string
    ) => {
      if (hasWorkerRole && adminToken) {
        await workerAdminRequest('/api/admin/mutate', {
          method: 'POST',
          body: JSON.stringify({ table, action, payload, id }),
        });
        return true;
      }

      const client = supabaseAdminClient || supabaseAnonClient;
      if (client) {
        if (action === 'insert' && payload) {
          const { error } = await client.from(table).insert(payload);
          if (error) throw new Error(error.message);
        } else if (action === 'upsert' && payload) {
          const { error } = await client.from(table).upsert(payload);
          if (error) throw new Error(error.message);
        } else if (action === 'update' && payload && id) {
          const { error } = await client.from(table).update(payload).eq('id', id);
          if (error) throw new Error(error.message);
        } else if (action === 'delete' && id) {
          const { error } = await client.from(table).delete().eq('id', id);
          if (error) throw new Error(error.message);
        }
        return true;
      }

      return false;
    },
    [hasWorkerRole, adminToken, workerAdminRequest, supabaseAdminClient, supabaseAnonClient]
  );

  // Public interactions
  const recordVisit = useCallback(
    async (page = '/') => {
      if (visitRecordedRef.current) return;
      try {
        if (sessionStorage.getItem('mjlab_session_visited')) {
          visitRecordedRef.current = true;
          return;
        }
        sessionStorage.setItem('mjlab_session_visited', '1');
      } catch {
        // ignore
      }
      visitRecordedRef.current = true;

      const { hash, isFirstEver } = getOrCreateVisitorHash();
      const dateKey = getTodayDateKey();
      let isUniqueToday = isFirstEver;
      try {
        const lastDate = localStorage.getItem('mjlab_last_visit_date');
        if (lastDate !== dateKey) {
          isUniqueToday = true;
          localStorage.setItem('mjlab_last_visit_date', dateKey);
        } else {
          isUniqueToday = false;
        }
      } catch {
        // ignore
      }

      const id = makeSafeId('vis');
      const device = detectDevice();
      const now = new Date().toISOString();

      if (supabaseAnonClient) {
        await supabaseAnonClient.from('visitors').insert({
          id,
          visitor_hash: hash,
          date_key: dateKey,
          is_unique: isUniqueToday,
          page,
          device,
          created_at: now,
        });
        return;
      }

      setVisitors((prev) => {
        const next = [{ id, visitorHash: hash, dateKey, isUnique: isUniqueToday, page, device, createdAt: now }, ...prev];
        persistLocal({ visitors: next });
        return next;
      });
    },
    [supabaseAnonClient, persistLocal]
  );

  const recordContactClick = useCallback(
    async (source: string, project?: Project) => {
      const id = makeSafeId('clk');
      const dateKey = getTodayDateKey();
      const now = new Date().toISOString();

      if (supabaseAnonClient) {
        await supabaseAnonClient.from('contact_clicks').insert({
          id,
          source,
          project_id: project?.id || '',
          project_name: project?.name || '',
          date_key: dateKey,
          created_at: now,
        });
        return;
      }

      setContactClicks((prev) => {
        const next = [
          {
            id,
            source,
            projectId: project?.id || '',
            projectName: project?.name || '',
            dateKey,
            createdAt: now,
          },
          ...prev,
        ];
        persistLocal({ contactClicks: next });
        return next;
      });
    },
    [supabaseAnonClient, persistLocal]
  );

  const submitContactMessage = useCallback(
    async (payload: { name: string; email: string; phone: string; subject: string; message: string }) => {
      const id = makeSafeId('msg');
      const now = new Date().toISOString();

      if (supabaseAnonClient) {
        const { error } = await supabaseAnonClient.from('contacts').insert({
          id,
          name: payload.name.trim(),
          email: payload.email.trim(),
          phone: payload.phone.trim(),
          subject: payload.subject.trim(),
          message: payload.message.trim(),
          status: 'Unread',
          created_at: now,
        });
        if (error) throw new Error(error.message);
        return;
      }

      setContacts((prev) => {
        const next: ContactMessage[] = [
          {
            id,
            name: payload.name.trim(),
            email: payload.email.trim(),
            phone: payload.phone.trim(),
            subject: payload.subject.trim(),
            message: payload.message.trim(),
            status: 'Unread',
            createdAt: now,
          },
          ...prev,
        ];
        persistLocal({ contacts: next });
        return next;
      });
    },
    [supabaseAnonClient, persistLocal]
  );

  const submitOrderRequest = useCallback(
    async (payload: {
      clientName: string;
      clientContact: string;
      projectId?: string;
      projectName: string;
      category?: string;
      notes?: string;
    }) => {
      const id = makeSafeId('ord');
      const now = new Date().toISOString();

      if (supabaseAnonClient) {
        const { error } = await supabaseAnonClient.from('orders').insert({
          id,
          client_name: payload.clientName.trim(),
          client_contact: payload.clientContact.trim(),
          project_id: payload.projectId || '',
          project_name: payload.projectName.trim(),
          category: payload.category || '',
          notes: payload.notes || '',
          status: 'Pending',
          created_at: now,
          updated_at: now,
        });
        if (error) throw new Error(error.message);
        return;
      }

      setOrders((prev) => {
        const next: OrderRequest[] = [
          {
            id,
            clientName: payload.clientName.trim(),
            clientContact: payload.clientContact.trim(),
            projectId: payload.projectId || '',
            projectName: payload.projectName.trim(),
            category: payload.category || '',
            notes: payload.notes || '',
            status: 'Pending',
            createdAt: now,
            updatedAt: now,
          },
          ...prev,
        ];
        persistLocal({ orders: next });
        return next;
      });
    },
    [supabaseAnonClient, persistLocal]
  );

  // Admin CRUD: Projects
  const addProject = useCallback(
    async (payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('proj');
      const now = new Date().toISOString();
      const handled = await mutateTable('projects', 'insert', {
        id,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        image_url: payload.imageUrl,
        demo_url: payload.demoUrl || '',
        whatsapp_url: payload.whatsappUrl || '',
        status: payload.status,
        price: payload.price || '',
        featured: Boolean(payload.featured),
        created_at: now,
        updated_at: now,
      });
      if (!handled) {
        setProjects((prev) => {
          const next = [{ ...payload, id, createdAt: now, updatedAt: now }, ...prev];
          persistLocal({ projects: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const updateProject = useCallback(
    async (id: string, payload: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = new Date().toISOString();
      const mapped: Record<string, unknown> = { updated_at: now };
      if (payload.name !== undefined) mapped.name = payload.name;
      if (payload.description !== undefined) mapped.description = payload.description;
      if (payload.category !== undefined) mapped.category = payload.category;
      if (payload.imageUrl !== undefined) mapped.image_url = payload.imageUrl;
      if (payload.demoUrl !== undefined) mapped.demo_url = payload.demoUrl;
      if (payload.whatsappUrl !== undefined) mapped.whatsapp_url = payload.whatsappUrl;
      if (payload.status !== undefined) mapped.status = payload.status;
      if (payload.price !== undefined) mapped.price = payload.price;
      if (payload.featured !== undefined) mapped.featured = payload.featured;

      const handled = await mutateTable('projects', 'update', mapped, id);
      if (!handled) {
        setProjects((prev) => {
          const next = prev.map((p) => (p.id === id ? { ...p, ...payload, updatedAt: now } : p));
          persistLocal({ projects: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const handled = await mutateTable('projects', 'delete', undefined, id);
      if (!handled) {
        setProjects((prev) => {
          const next = prev.filter((p) => p.id !== id);
          persistLocal({ projects: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  // Admin CRUD: Banners
  const addBanner = useCallback(
    async (payload: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('ban');
      const now = new Date().toISOString();
      const handled = await mutateTable('banners', 'insert', {
        id,
        badge_text: payload.badgeText,
        title: payload.title,
        highlight_word: payload.highlightWord,
        description: payload.description,
        button_text: payload.buttonText,
        button_link: payload.buttonLink,
        image_url: payload.imageUrl,
        sort_order: payload.order,
        active: payload.active,
        created_at: now,
        updated_at: now,
      });
      if (!handled) {
        setBanners((prev) => {
          const next = [...prev, { ...payload, id, createdAt: now, updatedAt: now }].sort(
            (a, b) => a.order - b.order
          );
          persistLocal({ banners: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const updateBanner = useCallback(
    async (id: string, payload: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = new Date().toISOString();
      const mapped: Record<string, unknown> = { updated_at: now };
      if (payload.badgeText !== undefined) mapped.badge_text = payload.badgeText;
      if (payload.title !== undefined) mapped.title = payload.title;
      if (payload.highlightWord !== undefined) mapped.highlight_word = payload.highlightWord;
      if (payload.description !== undefined) mapped.description = payload.description;
      if (payload.buttonText !== undefined) mapped.button_text = payload.buttonText;
      if (payload.buttonLink !== undefined) mapped.button_link = payload.buttonLink;
      if (payload.imageUrl !== undefined) mapped.image_url = payload.imageUrl;
      if (payload.order !== undefined) mapped.sort_order = payload.order;
      if (payload.active !== undefined) mapped.active = payload.active;

      const handled = await mutateTable('banners', 'update', mapped, id);
      if (!handled) {
        setBanners((prev) => {
          const next = prev
            .map((b) => (b.id === id ? { ...b, ...payload, updatedAt: now } : b))
            .sort((a, b) => a.order - b.order);
          persistLocal({ banners: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const deleteBanner = useCallback(
    async (id: string) => {
      const handled = await mutateTable('banners', 'delete', undefined, id);
      if (!handled) {
        setBanners((prev) => {
          const next = prev.filter((b) => b.id !== id);
          persistLocal({ banners: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  // Admin CRUD: Website Settings
  const saveSettings = useCallback(
    async (payload: Partial<WebsiteSettings>) => {
      const now = new Date().toISOString();
      const merged: WebsiteSettings = {
        ...settings,
        ...payload,
        socialLinks: {
          ...settings.socialLinks,
          ...(payload.socialLinks || {}),
        },
        updatedAt: now,
      };

      const handled = await mutateTable('website_settings', 'upsert', {
        id: 'site',
        site_name: merged.siteName,
        tagline: merged.tagline,
        description: merged.description,
        theme: merged.theme,
        logo_url: merged.logoUrl,
        favicon_url: merged.faviconUrl,
        whatsapp_number: merged.whatsappNumber,
        about_title: merged.aboutTitle,
        about_description: merged.aboutDescription,
        footer_text: merged.footerText,
        social_links: merged.socialLinks,
        updated_at: now,
      });

      if (!handled) {
        setSettings(merged);
        persistLocal({ settings: merged });
      } else if (supabaseAnonClient) {
        setSettings(merged);
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [settings, mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  // Admin CRUD: Team Members
  const addTeamMember = useCallback(
    async (payload: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('team');
      const now = new Date().toISOString();
      const handled = await mutateTable('team_members', 'insert', {
        id,
        name: payload.name,
        role: payload.role,
        bio: payload.bio,
        avatar_url: payload.avatarUrl,
        created_at: now,
        updated_at: now,
      });
      if (!handled) {
        setTeam((prev) => {
          const next = [...prev, { ...payload, id, createdAt: now, updatedAt: now }];
          persistLocal({ team: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const updateTeamMember = useCallback(
    async (id: string, payload: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>>) => {
      const now = new Date().toISOString();
      const mapped: Record<string, unknown> = { updated_at: now };
      if (payload.name !== undefined) mapped.name = payload.name;
      if (payload.role !== undefined) mapped.role = payload.role;
      if (payload.bio !== undefined) mapped.bio = payload.bio;
      if (payload.avatarUrl !== undefined) mapped.avatar_url = payload.avatarUrl;

      const handled = await mutateTable('team_members', 'update', mapped, id);
      if (!handled) {
        setTeam((prev) => {
          const next = prev.map((m) => (m.id === id ? { ...m, ...payload, updatedAt: now } : m));
          persistLocal({ team: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const deleteTeamMember = useCallback(
    async (id: string) => {
      const handled = await mutateTable('team_members', 'delete', undefined, id);
      if (!handled) {
        setTeam((prev) => {
          const next = prev.filter((m) => m.id !== id);
          persistLocal({ team: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  // Admin CRUD: Contacts & Orders
  const markContactRead = useCallback(
    async (id: string, status: 'Read' | 'Unread') => {
      const handled = await mutateTable('contacts', 'update', { status }, id);
      if (!handled) {
        setContacts((prev) => {
          const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
          persistLocal({ contacts: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const deleteContact = useCallback(
    async (id: string) => {
      const handled = await mutateTable('contacts', 'delete', undefined, id);
      if (!handled) {
        setContacts((prev) => {
          const next = prev.filter((c) => c.id !== id);
          persistLocal({ contacts: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const now = new Date().toISOString();
      const handled = await mutateTable('orders', 'update', { status, updated_at: now }, id);
      if (!handled) {
        setOrders((prev) => {
          const next = prev.map((o) => (o.id === id ? { ...o, status, updatedAt: now } : o));
          persistLocal({ orders: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      const handled = await mutateTable('orders', 'delete', undefined, id);
      if (!handled) {
        setOrders((prev) => {
          const next = prev.filter((o) => o.id !== id);
          persistLocal({ orders: next });
          return next;
        });
      } else if (supabaseAnonClient) {
        await loadSupabaseAll(supabaseAnonClient);
      }
    },
    [mutateTable, persistLocal, supabaseAnonClient, loadSupabaseAll]
  );

  const value: DataContextValue = {
    authReady,
    isAdmin,
    adminDisplayName: 'MJ LAB Admin',
    adminLoginPassword,
    adminLogout,
    adminChangePassword,
    supabaseConnected,
    hasWorkerRole,
    supabaseConfig,
    supabaseError,
    connectSupabase,
    disconnectSupabase,
    seedSupabaseData,
    syncingSeed,
    projects,
    banners,
    settings,
    team,
    contacts,
    visitors,
    contactClicks,
    orders,
    loadingData,
    recordVisit,
    recordContactClick,
    submitContactMessage,
    submitOrderRequest,
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
