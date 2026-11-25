import { Banner, Project, TeamMember, WebsiteSettings } from '../types';

export const DEFAULT_BANNER_IMAGE = '/src/assets/images/banner_mjlab_laptop_1795419356763.jpg';
export const DEFAULT_PORTFOLIO_IMAGE = '/src/assets/images/project_portfolio_dark_1795419357254.jpg';
export const DEFAULT_ECOMMERCE_IMAGE = '/src/assets/images/project_ecommerce_store_1795419356814.jpg';
export const DEFAULT_BUSINESS_IMAGE = '/src/assets/images/project_business_saas_1795419356813.jpg';
export const DEFAULT_NEW_DESIGN_IMAGE = '/src/assets/images/project_new_design_1795419356682.jpg';

export const DEFAULT_SETTINGS: WebsiteSettings = {
  siteName: 'MJ LAB',
  tagline: 'Web Developer & Designer',
  description:
    'MJ LAB builds high-converting portfolios, e-commerce storefronts, and custom business web platforms.',
  theme: 'Dark',
  logoUrl: '',
  faviconUrl: '',
  whatsappNumber: '+8801923948150',
  aboutTitle: 'Crafting High-Performance Websites for Growing Brands',
  aboutDescription:
    'MJ LAB is a dedicated web development and UI/UX design studio. We build fast, mobile-first websites, custom e-commerce stores, and scalable SaaS dashboards tailored for real client growth.',
  footerText: '© 2026 MJ LAB. All rights reserved.',
  socialLinks: {
    facebook: 'https://facebook.com',
    github: 'https://github.com',
    linkedin: 'https://linkedin.com',
    youtube: 'https://youtube.com',
    instagram: '',
    twitter: '',
  },
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'banner_primary',
    badgeText: 'Welcome to MJ LAB',
    title: 'Turn Your Ideas Into a Powerful Website',
    highlightWord: 'Website',
    description: 'Modern · Fast · Responsive',
    buttonText: 'View Portfolio',
    buttonLink: '#projects',
    imageUrl: DEFAULT_BANNER_IMAGE,
    order: 1,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner_ecommerce',
    badgeText: 'E-Commerce Solutions',
    title: 'Launch Your Online Store Today',
    highlightWord: 'Store',
    description: 'Secure Checkout · Mobile Ready · Admin Control',
    buttonText: 'Explore Stores',
    buttonLink: '#projects',
    imageUrl: DEFAULT_ECOMMERCE_IMAGE,
    order: 2,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'banner_business',
    badgeText: 'Business Platforms',
    title: 'Scale Faster With Custom Web Apps',
    highlightWord: 'Custom',
    description: 'Analytics · Real-Time Sync · Clean UI',
    buttonText: 'Contact Now',
    buttonLink: '#contact',
    imageUrl: DEFAULT_BUSINESS_IMAGE,
    order: 3,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj_mj_portfolio',
    name: 'MJ LAB Portfolio',
    description: 'A modern portfolio website showcasing skills, case studies, and interactive projects.',
    category: 'Portfolio',
    imageUrl: DEFAULT_PORTFOLIO_IMAGE,
    demoUrl: 'https://mjlab.example.com/portfolio',
    whatsappUrl: '',
    status: 'Active',
    price: '$299',
    featured: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'proj_ecommerce_store',
    name: 'E-Commerce Store',
    description: 'A modern e-commerce website with product catalog, cart, and secure payment.',
    category: 'E-Commerce',
    imageUrl: DEFAULT_ECOMMERCE_IMAGE,
    demoUrl: 'https://mjlab.example.com/store',
    whatsappUrl: '',
    status: 'Active',
    price: '$499',
    featured: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'proj_business_analytics',
    name: 'Corporate SaaS Hub',
    description: 'Enterprise analytics and business landing platform with real-time reporting.',
    category: 'Business',
    imageUrl: DEFAULT_BUSINESS_IMAGE,
    demoUrl: 'https://mjlab.example.com/saas',
    whatsappUrl: '',
    status: 'Active',
    price: '$599',
    featured: false,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'proj_agency_design',
    name: 'Aether Studio Design',
    description: 'Interactive creative agency website with bold typography and smooth transitions.',
    category: 'New Design',
    imageUrl: DEFAULT_NEW_DESIGN_IMAGE,
    demoUrl: 'https://mjlab.example.com/agency',
    whatsappUrl: '',
    status: 'Active',
    price: '$399',
    featured: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const DEFAULT_TEAM: TeamMember[] = [
  {
    id: 'team_lead_mj',
    name: 'MJ Founder',
    role: 'Lead Web Developer & UI Designer',
    bio: 'Specializes in full-stack React, TypeScript, Supabase, and high-converting business websites.',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
