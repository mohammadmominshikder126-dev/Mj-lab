import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
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
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
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

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && 'seconds' in (val as Record<string, unknown>)) {
    const secs = Number((val as { seconds: number }).seconds);
    return new Date(secs * 1000).toISOString();
  }
  return new Date().toISOString();
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
  // Auth
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminLoginPassword: (password: string, adminEmail?: string) => Promise<void>;
  sendAdminVerification: () => Promise<void>;
  adminLogout: () => Promise<void>;
  adminChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;

  // Backend Mode
  backendMode: 'firebase' | 'supabase';
  supabaseConfig: SupabaseConnectionConfig;
  connectSupabase: (url: string, anonKey: string) => Promise<void>;
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
  updateProject: (id: string, payload: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addBanner: (payload: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBanner: (id: string, payload: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;

  saveSettings: (payload: Partial<WebsiteSettings>) => Promise<void>;

  addTeamMember: (payload: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTeamMember: (id: string, payload: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  markContactRead: (id: string, status: 'Read' | 'Unread') => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConnectionConfig>(() =>
    getSavedSupabaseConfig()
  );
  const supabaseClient: SupabaseClient | null = useMemo(
    () => createSupabaseClient(supabaseConfig),
    [supabaseConfig]
  );
  const backendMode: 'firebase' | 'supabase' = supabaseClient ? 'supabase' : 'firebase';

  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_SETTINGS);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);

  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [visitors, setVisitors] = useState<VisitorEvent[]>([]);
  const [contactClicks, setContactClicks] = useState<ContactClick[]>([]);
  const [orders, setOrders] = useState<OrderRequest[]>([]);

  const [supabaseAdminAuth, setSupabaseAdminAuth] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('mjlab_sb_admin_auth') === '1';
    } catch {
      return false;
    }
  });

  const [loadingData, setLoadingData] = useState(true);
  const [syncingSeed, setSyncingSeed] = useState(false);
  const seededFirestoreRef = useRef(false);
  const visitRecordedRef = useRef(false);

  const isAdmin = useMemo(() => {
    if (backendMode === 'supabase') return supabaseAdminAuth;
    if (!user) return false;
    if (user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified) return true;
    return isAdminDoc && user.emailVerified;
  }, [backendMode, supabaseAdminAuth, user, isAdminDoc]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
        try {
          const snap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdminDoc(snap.exists() && snap.data()?.role === 'admin');
        } catch {
          setIsAdminDoc(false);
        }
      } else {
        setIsAdminDoc(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
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

  // Auto-seed Firestore once if admin logs in and collections are empty
  const seedFirestoreIfEmpty = useCallback(async () => {
    if (seededFirestoreRef.current || !isAdmin || backendMode !== 'firebase') return;
    seededFirestoreRef.current = true;
    try {
      const siteSnap = await getDoc(doc(db, 'settings', 'site'));
      if (siteSnap.exists()) return;

      const batch = writeBatch(db);
      batch.set(doc(db, 'settings', 'site'), {
        siteName: DEFAULT_SETTINGS.siteName,
        tagline: DEFAULT_SETTINGS.tagline,
        description: DEFAULT_SETTINGS.description,
        theme: DEFAULT_SETTINGS.theme,
        logoUrl: DEFAULT_SETTINGS.logoUrl,
        faviconUrl: DEFAULT_SETTINGS.faviconUrl,
        whatsappNumber: DEFAULT_SETTINGS.whatsappNumber,
        aboutTitle: DEFAULT_SETTINGS.aboutTitle,
        aboutDescription: DEFAULT_SETTINGS.aboutDescription,
        footerText: DEFAULT_SETTINGS.footerText,
        socialLinks: DEFAULT_SETTINGS.socialLinks,
        updatedAt: serverTimestamp(),
      });

      for (const proj of DEFAULT_PROJECTS) {
        batch.set(doc(db, 'projects', proj.id), {
          name: proj.name,
          description: proj.description,
          category: proj.category,
          imageUrl: proj.imageUrl,
          demoUrl: proj.demoUrl,
          whatsappUrl: proj.whatsappUrl,
          status: proj.status,
          price: proj.price || '',
          featured: Boolean(proj.featured),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const banner of DEFAULT_BANNERS) {
        batch.set(doc(db, 'banners', banner.id), {
          badgeText: banner.badgeText,
          title: banner.title,
          highlightWord: banner.highlightWord,
          description: banner.description,
          buttonText: banner.buttonText,
          buttonLink: banner.buttonLink,
          imageUrl: banner.imageUrl,
          order: banner.order,
          active: banner.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const member of DEFAULT_TEAM) {
        batch.set(doc(db, 'team', member.id), {
          name: member.name,
          role: member.role,
          bio: member.bio,
          avatarUrl: member.avatarUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (err) {
      console.warn('Firestore initial seed skipped:', err);
    }
  }, [isAdmin, backendMode]);

  useEffect(() => {
    if (isAdmin && backendMode === 'firebase') {
      seedFirestoreIfEmpty();
    }
  }, [isAdmin, backendMode, seedFirestoreIfEmpty]);

  // Firebase Real-Time Subscriptions
  useEffect(() => {
    if (backendMode !== 'firebase') return;
    setLoadingData(true);

    // 1. Projects (Admin sees all, public queries Active only to comply with security rules)
    const projectsQuery = isAdmin
      ? collection(db, 'projects')
      : query(collection(db, 'projects'), where('status', '==', 'Active'));

    const unsubProjects = onSnapshot(
      projectsQuery,
      (snap) => {
        if (!snap.empty) {
          const list: Project[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              description: String(data.description || ''),
              category: (data.category as Project['category']) || 'New Design',
              imageUrl: String(data.imageUrl || ''),
              demoUrl: String(data.demoUrl || ''),
              whatsappUrl: String(data.whatsappUrl || ''),
              status: (data.status as Project['status']) || 'Active',
              price: data.price ? String(data.price) : '',
              featured: Boolean(data.featured),
              createdAt: toIso(data.createdAt),
              updatedAt: toIso(data.updatedAt),
            };
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setProjects(list);
        } else if (isAdmin) {
          setProjects([]);
        }
        setLoadingData(false);
      },
      (err) => {
        setLoadingData(false);
        handleFirestoreError(err, OperationType.LIST, 'projects');
      }
    );

    // 2. Banners
    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        if (!snap.empty) {
          const list: Banner[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              badgeText: String(data.badgeText || ''),
              title: String(data.title || ''),
              highlightWord: String(data.highlightWord || ''),
              description: String(data.description || ''),
              buttonText: String(data.buttonText || 'View Portfolio'),
              buttonLink: String(data.buttonLink || '#projects'),
              imageUrl: String(data.imageUrl || ''),
              order: Number(data.order ?? 1),
              active: data.active !== false,
              createdAt: toIso(data.createdAt),
              updatedAt: toIso(data.updatedAt),
            };
          });
          list.sort((a, b) => a.order - b.order);
          setBanners(list);
        } else if (isAdmin) {
          setBanners([]);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'banners')
    );

    // 3. Website Settings
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'site'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSettings({
            siteName: String(data.siteName || DEFAULT_SETTINGS.siteName),
            tagline: String(data.tagline || DEFAULT_SETTINGS.tagline),
            description: String(data.description || DEFAULT_SETTINGS.description),
            theme: (data.theme as WebsiteSettings['theme']) || 'Dark',
            logoUrl: String(data.logoUrl || ''),
            faviconUrl: String(data.faviconUrl || ''),
            whatsappNumber: String(data.whatsappNumber || DEFAULT_SETTINGS.whatsappNumber),
            aboutTitle: String(data.aboutTitle || DEFAULT_SETTINGS.aboutTitle),
            aboutDescription: String(data.aboutDescription || DEFAULT_SETTINGS.aboutDescription),
            footerText: String(data.footerText || DEFAULT_SETTINGS.footerText),
            socialLinks: (data.socialLinks as WebsiteSettings['socialLinks']) || {},
            updatedAt: toIso(data.updatedAt),
          });
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/site')
    );

    // 4. Team Members
    const unsubTeam = onSnapshot(
      collection(db, 'team'),
      (snap) => {
        if (!snap.empty) {
          const list: TeamMember[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              role: String(data.role || ''),
              bio: String(data.bio || ''),
              avatarUrl: String(data.avatarUrl || ''),
              createdAt: toIso(data.createdAt),
              updatedAt: toIso(data.updatedAt),
            };
          });
          setTeam(list);
        } else if (isAdmin) {
          setTeam([]);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'team')
    );

    return () => {
      unsubProjects();
      unsubBanners();
      unsubSettings();
      unsubTeam();
    };
  }, [backendMode, isAdmin]);

  // Admin-only Firebase Real-Time Subscriptions (Contacts, Visitors, Contact Clicks, Orders)
  useEffect(() => {
    if (backendMode !== 'firebase' || !authReady || !isAdmin) {
      if (backendMode === 'firebase') {
        setContacts([]);
        setVisitors([]);
        setContactClicks([]);
        setOrders([]);
      }
      return;
    }

    const unsubContacts = onSnapshot(
      collection(db, 'contacts'),
      (snap) => {
        const list: ContactMessage[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            email: String(data.email || ''),
            phone: String(data.phone || ''),
            subject: String(data.subject || ''),
            message: String(data.message || ''),
            status: (data.status as 'Unread' | 'Read') || 'Unread',
            createdAt: toIso(data.createdAt),
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setContacts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contacts')
    );

    const unsubVisitors = onSnapshot(
      collection(db, 'visitors'),
      (snap) => {
        const list: VisitorEvent[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            visitorHash: String(data.visitorHash || ''),
            dateKey: String(data.dateKey || ''),
            isUnique: Boolean(data.isUnique),
            page: String(data.page || '/'),
            device: (data.device as VisitorEvent['device']) || 'Desktop',
            createdAt: toIso(data.createdAt),
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setVisitors(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'visitors')
    );

    const unsubClicks = onSnapshot(
      collection(db, 'contact_clicks'),
      (snap) => {
        const list: ContactClick[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            source: String(data.source || 'WhatsApp'),
            projectId: data.projectId ? String(data.projectId) : '',
            projectName: data.projectName ? String(data.projectName) : '',
            dateKey: String(data.dateKey || ''),
            createdAt: toIso(data.createdAt),
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setContactClicks(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contact_clicks')
    );

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list: OrderRequest[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            clientName: String(data.clientName || ''),
            clientContact: String(data.clientContact || ''),
            projectId: data.projectId ? String(data.projectId) : '',
            projectName: String(data.projectName || ''),
            category: data.category ? String(data.category) : '',
            notes: data.notes ? String(data.notes) : '',
            status: (data.status as OrderStatus) || 'Pending',
            createdAt: toIso(data.createdAt),
            updatedAt: toIso(data.updatedAt),
          };
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    return () => {
      unsubContacts();
      unsubVisitors();
      unsubClicks();
      unsubOrders();
    };
  }, [backendMode, authReady, isAdmin]);

  // Supabase Loader & Realtime Subscription
  const loadSupabaseAll = useCallback(async (client: SupabaseClient) => {
    setLoadingData(true);
    try {
      const [projRes, banRes, setRes, teamRes, contRes, visRes, clkRes, ordRes] = await Promise.all([
        client.from('projects').select('*').order('created_at', { ascending: false }),
        client.from('banners').select('*').order('sort_order', { ascending: true }),
        client.from('website_settings').select('*').eq('id', 'site').maybeSingle(),
        client.from('team_members').select('*').order('created_at', { ascending: true }),
        client.from('contacts').select('*').order('created_at', { ascending: false }),
        client.from('visitors').select('*').order('created_at', { ascending: false }),
        client.from('contact_clicks').select('*').order('created_at', { ascending: false }),
        client.from('orders').select('*').order('created_at', { ascending: false }),
      ]);

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
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!supabaseClient) return;
    loadSupabaseAll(supabaseClient);

    const channel = supabaseClient
      .channel('mjlab-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadSupabaseAll(supabaseClient);
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [supabaseClient, loadSupabaseAll]);

  // Auth Actions (Password-Only)
  const adminLoginPassword = useCallback(
    async (password: string, adminEmail?: string) => {
      if (backendMode === 'supabase') {
        const storedPass = (() => {
          try {
            return localStorage.getItem('mjlab_admin_passcode') || 'mjlab2026';
          } catch {
            return 'mjlab2026';
          }
        })();
        if (password !== storedPass) {
          throw new Error('Incorrect admin password.');
        }
        try {
          sessionStorage.setItem('mjlab_sb_admin_auth', '1');
        } catch {
          // ignore
        }
        setSupabaseAdminAuth(true);
        return;
      }

      const targetEmail = (adminEmail || '').trim() || BOOTSTRAPPED_ADMIN_EMAIL;
      await signInWithEmailAndPassword(auth, targetEmail, password);
    },
    [backendMode]
  );

  const sendAdminVerification = useCallback(async () => {
    if (!auth.currentUser) throw new Error('No signed-in user.');
    await sendEmailVerification(auth.currentUser);
  }, []);

  const adminLogout = useCallback(async () => {
    try {
      sessionStorage.removeItem('mjlab_sb_admin_auth');
    } catch {
      // ignore
    }
    setSupabaseAdminAuth(false);
    if (auth.currentUser) {
      await signOut(auth);
    }
  }, []);

  const adminChangePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (backendMode === 'supabase') {
        const storedPass = (() => {
          try {
            return localStorage.getItem('mjlab_admin_passcode') || 'mjlab2026';
          } catch {
            return 'mjlab2026';
          }
        })();
        if (currentPassword !== storedPass) {
          throw new Error('Current password is incorrect.');
        }
        localStorage.setItem('mjlab_admin_passcode', newPassword);
        return;
      }

      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error('No authenticated admin session.');
      }
      const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPassword);
    },
    [backendMode]
  );

  // Supabase connection controls
  const connectSupabase = useCallback(async (url: string, anonKey: string) => {
    const cfg: SupabaseConnectionConfig = { url: url.trim(), anonKey: anonKey.trim(), enabled: true };
    const testClient = createSupabaseClient(cfg);
    if (!testClient) throw new Error('Invalid Supabase URL or Anon Key.');
    const { error } = await testClient.from('website_settings').select('id').limit(1);
    if (error && !error.message.includes('0 rows')) {
      throw new Error(`Supabase connection check failed: ${error.message}`);
    }
    saveSupabaseConfig(cfg);
    setSupabaseConfig(cfg);
  }, []);

  const disconnectSupabase = useCallback(() => {
    clearSupabaseConfig();
    setSupabaseConfig({ url: '', anonKey: '', enabled: false });
  }, []);

  const seedSupabaseData = useCallback(async () => {
    if (!supabaseClient) throw new Error('Supabase is not connected.');
    setSyncingSeed(true);
    try {
      await supabaseClient.from('website_settings').upsert({
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
      });

      await supabaseClient.from('projects').upsert(
        projects.map((p) => ({
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
        }))
      );

      await supabaseClient.from('banners').upsert(
        banners.map((b) => ({
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
        }))
      );

      await supabaseClient.from('team_members').upsert(
        team.map((t) => ({
          id: t.id,
          name: t.name,
          role: t.role,
          bio: t.bio,
          avatar_url: t.avatarUrl,
          created_at: t.createdAt,
          updated_at: t.updatedAt,
        }))
      );
      await loadSupabaseAll(supabaseClient);
    } finally {
      setSyncingSeed(false);
    }
  }, [supabaseClient, settings, projects, banners, team, loadSupabaseAll]);

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
        // ignore sessionStorage block
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

      if (supabaseClient) {
        await supabaseClient.from('visitors').insert({
          id,
          visitor_hash: hash,
          date_key: dateKey,
          is_unique: isUniqueToday,
          page,
          device,
          created_at: new Date().toISOString(),
        });
        return;
      }

      try {
        await setDoc(doc(db, 'visitors', id), {
          visitorHash: hash,
          dateKey,
          isUnique: isUniqueToday,
          page: page.slice(0, 120),
          device,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Visit tracking skipped:', err);
      }
    },
    [supabaseClient]
  );

  const recordContactClick = useCallback(
    async (source: string, project?: Project) => {
      const id = makeSafeId('clk');
      const dateKey = getTodayDateKey();

      if (supabaseClient) {
        await supabaseClient.from('contact_clicks').insert({
          id,
          source,
          project_id: project?.id || '',
          project_name: project?.name || '',
          date_key: dateKey,
          created_at: new Date().toISOString(),
        });
        return;
      }

      try {
        await setDoc(doc(db, 'contact_clicks', id), {
          source: source.slice(0, 80),
          projectId: project?.id || '',
          projectName: project?.name ? project.name.slice(0, 120) : '',
          dateKey,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Contact click tracking error:', err);
      }
    },
    [supabaseClient]
  );

  const submitContactMessage = useCallback(
    async (payload: { name: string; email: string; phone: string; subject: string; message: string }) => {
      const id = makeSafeId('msg');
      if (supabaseClient) {
        const { error } = await supabaseClient.from('contacts').insert({
          id,
          name: payload.name.trim(),
          email: payload.email.trim(),
          phone: payload.phone.trim(),
          subject: payload.subject.trim(),
          message: payload.message.trim(),
          status: 'Unread',
          created_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
        return;
      }

      try {
        await setDoc(doc(db, 'contacts', id), {
          name: payload.name.trim().slice(0, 80),
          email: payload.email.trim().slice(0, 120),
          phone: payload.phone.trim().slice(0, 32),
          subject: payload.subject.trim().slice(0, 120),
          message: payload.message.trim().slice(0, 2000),
          status: 'Unread',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `contacts/${id}`);
      }
    },
    [supabaseClient]
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
      if (supabaseClient) {
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('orders').insert({
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

      try {
        await setDoc(doc(db, 'orders', id), {
          clientName: payload.clientName.trim().slice(0, 80),
          clientContact: payload.clientContact.trim().slice(0, 120),
          projectId: (payload.projectId || '').slice(0, 128),
          projectName: payload.projectName.trim().slice(0, 120),
          category: (payload.category || '').slice(0, 60),
          notes: (payload.notes || '').slice(0, 1000),
          status: 'Pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `orders/${id}`);
      }
    },
    [supabaseClient]
  );

  // Admin CRUD: Projects
  const addProject = useCallback(
    async (payload: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('proj');
      if (supabaseClient) {
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('projects').insert({
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
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await setDoc(doc(db, 'projects', id), {
          name: payload.name.slice(0, 120),
          description: payload.description.slice(0, 1000),
          category: payload.category,
          imageUrl: payload.imageUrl,
          demoUrl: (payload.demoUrl || '').slice(0, 500),
          whatsappUrl: (payload.whatsappUrl || '').slice(0, 500),
          status: payload.status,
          price: (payload.price || '').slice(0, 40),
          featured: Boolean(payload.featured),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${id}`);
      }
    },
    [supabaseClient]
  );

  const updateProject = useCallback(
    async (id: string, payload: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (supabaseClient) {
        const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (payload.name !== undefined) mapped.name = payload.name;
        if (payload.description !== undefined) mapped.description = payload.description;
        if (payload.category !== undefined) mapped.category = payload.category;
        if (payload.imageUrl !== undefined) mapped.image_url = payload.imageUrl;
        if (payload.demoUrl !== undefined) mapped.demo_url = payload.demoUrl;
        if (payload.whatsappUrl !== undefined) mapped.whatsapp_url = payload.whatsappUrl;
        if (payload.status !== undefined) mapped.status = payload.status;
        if (payload.price !== undefined) mapped.price = payload.price;
        if (payload.featured !== undefined) mapped.featured = payload.featured;
        const { error } = await supabaseClient.from('projects').update(mapped).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await updateDoc(doc(db, 'projects', id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
      }
    },
    [supabaseClient]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('projects').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
      }
    },
    [supabaseClient]
  );

  // Admin CRUD: Banners
  const addBanner = useCallback(
    async (payload: Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('ban');
      if (supabaseClient) {
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('banners').insert({
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
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await setDoc(doc(db, 'banners', id), {
          badgeText: payload.badgeText.slice(0, 80),
          title: payload.title.slice(0, 160),
          highlightWord: payload.highlightWord.slice(0, 60),
          description: payload.description.slice(0, 300),
          buttonText: payload.buttonText.slice(0, 50),
          buttonLink: payload.buttonLink.slice(0, 500),
          imageUrl: payload.imageUrl,
          order: Number(payload.order || 1),
          active: Boolean(payload.active),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `banners/${id}`);
      }
    },
    [supabaseClient]
  );

  const updateBanner = useCallback(
    async (id: string, payload: Partial<Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (supabaseClient) {
        const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (payload.badgeText !== undefined) mapped.badge_text = payload.badgeText;
        if (payload.title !== undefined) mapped.title = payload.title;
        if (payload.highlightWord !== undefined) mapped.highlight_word = payload.highlightWord;
        if (payload.description !== undefined) mapped.description = payload.description;
        if (payload.buttonText !== undefined) mapped.button_text = payload.buttonText;
        if (payload.buttonLink !== undefined) mapped.button_link = payload.buttonLink;
        if (payload.imageUrl !== undefined) mapped.image_url = payload.imageUrl;
        if (payload.order !== undefined) mapped.sort_order = payload.order;
        if (payload.active !== undefined) mapped.active = payload.active;
        const { error } = await supabaseClient.from('banners').update(mapped).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await updateDoc(doc(db, 'banners', id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `banners/${id}`);
      }
    },
    [supabaseClient]
  );

  const deleteBanner = useCallback(
    async (id: string) => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('banners').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await deleteDoc(doc(db, 'banners', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `banners/${id}`);
      }
    },
    [supabaseClient]
  );

  // Admin CRUD: Website Settings
  const saveSettings = useCallback(
    async (payload: Partial<WebsiteSettings>) => {
      const merged: WebsiteSettings = {
        ...settings,
        ...payload,
        socialLinks: {
          ...settings.socialLinks,
          ...(payload.socialLinks || {}),
        },
        updatedAt: new Date().toISOString(),
      };

      if (supabaseClient) {
        const { error } = await supabaseClient.from('website_settings').upsert({
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
          updated_at: merged.updatedAt,
        });
        if (error) throw new Error(error.message);
        return;
      }

      try {
        await setDoc(doc(db, 'settings', 'site'), {
          siteName: merged.siteName.slice(0, 80),
          tagline: merged.tagline.slice(0, 120),
          description: merged.description.slice(0, 600),
          theme: merged.theme,
          logoUrl: merged.logoUrl || '',
          faviconUrl: merged.faviconUrl || '',
          whatsappNumber: merged.whatsappNumber.slice(0, 24),
          aboutTitle: merged.aboutTitle.slice(0, 140),
          aboutDescription: merged.aboutDescription.slice(0, 2000),
          footerText: merged.footerText.slice(0, 240),
          socialLinks: merged.socialLinks,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/site');
      }
    },
    [settings, supabaseClient]
  );

  // Admin CRUD: Team Members
  const addTeamMember = useCallback(
    async (payload: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => {
      const id = makeSafeId('team');
      if (supabaseClient) {
        const now = new Date().toISOString();
        const { error } = await supabaseClient.from('team_members').insert({
          id,
          name: payload.name,
          role: payload.role,
          bio: payload.bio,
          avatar_url: payload.avatarUrl,
          created_at: now,
          updated_at: now,
        });
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await setDoc(doc(db, 'team', id), {
          name: payload.name.slice(0, 80),
          role: payload.role.slice(0, 80),
          bio: payload.bio.slice(0, 400),
          avatarUrl: payload.avatarUrl || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `team/${id}`);
      }
    },
    [supabaseClient]
  );

  const updateTeamMember = useCallback(
    async (id: string, payload: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>>) => {
      if (supabaseClient) {
        const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (payload.name !== undefined) mapped.name = payload.name;
        if (payload.role !== undefined) mapped.role = payload.role;
        if (payload.bio !== undefined) mapped.bio = payload.bio;
        if (payload.avatarUrl !== undefined) mapped.avatar_url = payload.avatarUrl;
        const { error } = await supabaseClient.from('team_members').update(mapped).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await updateDoc(doc(db, 'team', id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `team/${id}`);
      }
    },
    [supabaseClient]
  );

  const deleteTeamMember = useCallback(
    async (id: string) => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('team_members').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await deleteDoc(doc(db, 'team', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `team/${id}`);
      }
    },
    [supabaseClient]
  );

  // Admin CRUD: Contacts & Orders
  const markContactRead = useCallback(
    async (id: string, status: 'Read' | 'Unread') => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('contacts').update({ status }).eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await updateDoc(doc(db, 'contacts', id), { status });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `contacts/${id}`);
      }
    },
    [supabaseClient]
  );

  const deleteContact = useCallback(
    async (id: string) => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('contacts').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await deleteDoc(doc(db, 'contacts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `contacts/${id}`);
      }
    },
    [supabaseClient]
  );

  const updateOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      if (supabaseClient) {
        const { error } = await supabaseClient
          .from('orders')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await updateDoc(doc(db, 'orders', id), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
      }
    },
    [supabaseClient]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      if (supabaseClient) {
        const { error } = await supabaseClient.from('orders').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return;
      }
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
      }
    },
    [supabaseClient]
  );

  const value: DataContextValue = {
    user,
    authReady,
    isAdmin,
    adminLoginPassword,
    sendAdminVerification,
    adminLogout,
    adminChangePassword,
    backendMode,
    supabaseConfig,
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
