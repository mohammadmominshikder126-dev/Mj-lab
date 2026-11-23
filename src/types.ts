export type ProjectCategory = 'New Design' | 'E-Commerce' | 'Business' | 'Portfolio';
export type ProjectStatus = 'Active' | 'Inactive';
export type SiteTheme = 'Dark' | 'Midnight' | 'Ocean';
export type OrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  imageUrl: string;
  demoUrl: string;
  whatsappUrl: string;
  status: ProjectStatus;
  price?: string;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  badgeText: string;
  title: string;
  highlightWord: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLinks {
  facebook?: string;
  github?: string;
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  twitter?: string;
}

export interface WebsiteSettings {
  siteName: string;
  tagline: string;
  description: string;
  theme: SiteTheme;
  logoUrl: string;
  faviconUrl: string;
  whatsappNumber: string;
  aboutTitle: string;
  aboutDescription: string;
  footerText: string;
  socialLinks: SocialLinks;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'Unread' | 'Read';
  createdAt: string;
}

export interface VisitorEvent {
  id: string;
  visitorHash: string;
  dateKey: string;
  isUnique: boolean;
  page: string;
  device: 'Mobile' | 'Tablet' | 'Desktop';
  createdAt: string;
}

export interface ContactClick {
  id: string;
  source: string;
  projectId?: string;
  projectName?: string;
  dateKey: string;
  createdAt: string;
}

export interface OrderRequest {
  id: string;
  clientName: string;
  clientContact: string;
  projectId?: string;
  projectName: string;
  category?: string;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupabaseConnectionConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export type AdminTab =
  | 'dashboard'
  | 'projects'
  | 'add-project'
  | 'manage-projects'
  | 'banners'
  | 'whatsapp'
  | 'visitors'
  | 'contacts'
  | 'settings'
  | 'branding'
  | 'about'
  | 'team'
  | 'social'
  | 'account'
  | 'password';
