import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Globe,
  Home,
  LayoutGrid,
  Palette,
  Phone,
  Play,
  Search,
  Send,
  Settings,
  ShoppingCart,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { BrandLogo } from './BrandLogo';
import { buildWhatsAppLink } from '../lib/whatsapp';
import { Project, ProjectCategory } from '../types';

type NavTab = 'home' | 'projects' | 'about' | 'profile';

const WhatsAppLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M16.01 3C8.83 3 3 8.83 3 16.01c0 2.52.72 4.97 2.08 7.08L3.7 28.3l5.35-1.36A12.94 12.94 0 0 0 16.01 29C23.17 29 29 23.17 29 16.01 29 8.83 23.17 3 16.01 3Zm0 23.62c-2.16 0-4.27-.58-6.11-1.69l-.44-.26-3.17.81.84-3.09-.29-.46a10.56 10.56 0 0 1-1.62-5.62c0-5.85 4.76-10.61 10.62-10.61 5.85 0 10.61 4.76 10.61 10.61 0 5.85-4.76 10.61-10.61 10.61Zm5.82-7.95c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.89-1.78-2.21-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.36-.26-.62-.52-.54-.71-.55h-.61c-.21 0-.55.08-.84.4-.29.32-1.11 1.08-1.11 2.64 0 1.56 1.13 3.06 1.29 3.27.16.21 2.23 3.41 5.41 4.78.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.26-.74.26-1.37.18-1.51-.08-.13-.29-.21-.61-.37Z" />
  </svg>
);

export const WebsiteView: React.FC = () => {
  const {
    projects,
    banners,
    settings,
    team,
    recordVisit,
    recordContactClick,
    submitContactMessage,
    submitOrderRequest,
  } = useData();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProjectCategory>('All');
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Slider state
  const activeBanners = useMemo(() => banners.filter((b) => b.active), [banners]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Modals
  const [demoProject, setDemoProject] = useState<Project | null>(null);
  const [orderProject, setOrderProject] = useState<Project | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [sendingContact, setSendingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  // Order form state
  const [orderForm, setOrderForm] = useState({
    clientName: '',
    clientContact: '',
    notes: '',
  });
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Record visitor once on mount
  useEffect(() => {
    recordVisit('/');
  }, [recordVisit]);

  // Keep slideIndex valid when banners change
  useEffect(() => {
    if (slideIndex >= activeBanners.length && activeBanners.length > 0) {
      setSlideIndex(0);
    }
  }, [activeBanners.length, slideIndex]);

  // Auto-slide every 5s
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'Active'),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    return activeProjects.filter((p) => {
      const catMatch = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const textMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [activeProjects, selectedCategory, searchQuery]);

  const visibleProjects = useMemo(() => {
    if (activeTab === 'projects' || showAllProjects || selectedCategory !== 'All') {
      return filteredProjects;
    }
    return filteredProjects.slice(0, 2);
  }, [activeTab, showAllProjects, selectedCategory, filteredProjects]);

  const currentBanner = activeBanners[slideIndex] || activeBanners[0];

  const handleCategoryClick = (category: ProjectCategory) => {
    setSelectedCategory((prev) => (prev === category ? 'All' : category));
    if (activeTab !== 'home' && activeTab !== 'projects') {
      setActiveTab('projects');
    } else {
      setTimeout(() => {
        document.getElementById('projects-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    if (!contactForm.name.trim() || !contactForm.message.trim()) {
      setContactError('Please enter your name and message.');
      return;
    }
    setSendingContact(true);
    try {
      await submitContactMessage(contactForm);
      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setContactSuccess(false), 4500);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSendingContact(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderProject) return;
    setOrderError('');
    if (!orderForm.clientName.trim() || !orderForm.clientContact.trim()) {
      setOrderError('Please enter your name and WhatsApp/Email contact.');
      return;
    }
    setSendingOrder(true);
    try {
      await submitOrderRequest({
        clientName: orderForm.clientName,
        clientContact: orderForm.clientContact,
        projectId: orderProject.id,
        projectName: orderProject.name,
        category: orderProject.category,
        notes: orderForm.notes,
      });
      setOrderSuccess(true);
      setOrderForm({ clientName: '', clientContact: '', notes: '' });
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Failed to submit order.');
    } finally {
      setSendingOrder(false);
    }
  };

  const renderHighlightedTitle = (title: string, highlightWord: string) => {
    if (!highlightWord || !title.includes(highlightWord)) {
      return <span>{title}</span>;
    }
    const idx = title.indexOf(highlightWord);
    const before = title.slice(0, idx);
    const after = title.slice(idx + highlightWord.length);
    return (
      <>
        {before}
        <span className="text-[#00E676]">{highlightWord}</span>
        {after}
      </>
    );
  };

  const siteNameParts = useMemo(() => {
    const trimmed = (settings.siteName || 'MJ LAB').trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return { first: parts[0], rest: '' };
    return { first: parts[0], rest: parts.slice(1).join(' ') };
  }, [settings.siteName]);

  const generalWhatsAppHref = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.siteName}! I would like to discuss a new website project.`
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 relative overflow-x-hidden">
      {/* Soft Harmonious Sky-Emerald Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.10),_transparent_58%)]"
      />

      {/* Main Responsive Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6 sm:space-y-8">
        {/* TOP HEADER */}
        <header className="flex items-center justify-between gap-3 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 text-left cursor-pointer group shrink-0"
          >
            <BrandLogo logoUrl={settings.logoUrl} size="md" siteName={settings.siteName} />
            <div>
              <div className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
                <span className="text-[#0F172A]">{siteNameParts.first}</span>
                {siteNameParts.rest && (
                  <span className="text-[#0284C7] ml-1.5">{siteNameParts.rest}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-none">
                {settings.tagline}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Prominent Top WhatsApp Logo Button */}
            <a
              href={generalWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact on WhatsApp"
              title="Chat on WhatsApp"
              onClick={() => recordContactClick('header_whatsapp_logo')}
              className="inline-flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#25D366] text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] hover:bg-[#1FB858] hover:scale-105 transition shrink-0"
            >
              <WhatsAppLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </a>

            <button
              type="button"
              onClick={() => {
                setActiveTab('projects');
                setShowAllProjects(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs sm:text-sm font-semibold text-[#0F172A] hover:border-[#0284C7] transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] shrink-0" aria-hidden="true" />
              <span>Portfolio</span>
            </button>
          </div>
        </header>

        {/* HOME & PROJECTS MAIN CONTENT */}
        {(activeTab === 'home' || activeTab === 'projects') && (
          <>
            {/* FOUR SERVICE ICONS */}
            {activeTab === 'home' && (
              <section aria-label="Services" className="grid grid-cols-4 gap-2.5 sm:gap-4">
                <a
                  href={generalWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordContactClick('service_icon_whatsapp')}
                  className="group flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#25D366] transition min-h-[84px] sm:min-h-[96px]"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#25D366]/12 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <WhatsAppLogo className="w-5 h-5 sm:w-6 sm:h-6 text-[#25D366]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">
                    WhatsApp Contact
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCategoryClick('New Design')}
                  className={`group flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white border shadow-sm hover:shadow-md transition min-h-[84px] sm:min-h-[96px] cursor-pointer ${
                    selectedCategory === 'New Design'
                      ? 'border-[#0284C7] ring-2 ring-sky-200'
                      : 'border-slate-200 hover:border-[#0284C7]'
                  }`}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-[#0284C7]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">
                    New Design
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryClick('E-Commerce')}
                  className={`group flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white border shadow-sm hover:shadow-md transition min-h-[84px] sm:min-h-[96px] cursor-pointer ${
                    selectedCategory === 'E-Commerce'
                      ? 'border-[#16A34A] ring-2 ring-emerald-200'
                      : 'border-slate-200 hover:border-[#16A34A]'
                  }`}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-[#16A34A]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">
                    E-Commerce
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCategoryClick('Business')}
                  className={`group flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-white border shadow-sm hover:shadow-md transition min-h-[84px] sm:min-h-[96px] cursor-pointer ${
                    selectedCategory === 'Business'
                      ? 'border-[#2563EB] ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-[#2563EB]'
                  }`}
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB]" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-800 leading-tight">
                    Business
                  </span>
                </button>
              </section>
            )}

            {/* HERO BANNER SLIDER */}
            {activeTab === 'home' && currentBanner && (
              <section
                aria-label="Featured Showcase Banner"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="relative rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#0A1F44] via-[#102E63] to-[#081938] shadow-[0_14px_38px_rgba(15,23,42,0.14)]"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[230px] sm:min-h-[280px] lg:min-h-[330px]">
                  {/* Left Copy Column */}
                  <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 z-10 space-y-3 sm:space-y-4">
                    {currentBanner.badgeText && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-slate-100">
                        <Play className="w-3 h-3 text-[#00E676] fill-[#00E676]" />
                        <span>{currentBanner.badgeText}</span>
                      </div>
                    )}

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold text-white leading-[1.15] tracking-tight text-balance max-w-lg">
                      {renderHighlightedTitle(currentBanner.title, currentBanner.highlightWord)}
                    </h1>

                    {currentBanner.description && (
                      <p className="text-xs sm:text-sm text-slate-200/90 max-w-md">
                        {currentBanner.description}
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (currentBanner.buttonLink.startsWith('http')) {
                            window.location.assign(currentBanner.buttonLink);
                          } else if (currentBanner.buttonLink === '#contact') {
                            document
                              .getElementById('contact-section')
                              ?.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            setShowAllProjects(true);
                            document
                              .getElementById('projects-section')
                              ?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0F172A] border border-white/80 text-xs sm:text-sm font-bold hover:bg-[#00E676] hover:text-[#050B18] hover:border-[#00E676] transition whitespace-nowrap cursor-pointer shadow-sm"
                      >
                        <span>{currentBanner.buttonText || 'View Portfolio'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Right Visual Mockup Column */}
                  <div className="md:col-span-5 relative h-44 sm:h-56 md:h-full min-h-[200px] flex items-center justify-center p-4 sm:p-6">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.28),_transparent_68%)]"
                    />
                    {currentBanner.imageUrl ? (
                      <img
                        src={currentBanner.imageUrl}
                        alt={currentBanner.title}
                        referrerPolicy="no-referrer"
                        className="relative z-10 w-full h-full max-h-[260px] object-cover rounded-xl border border-white/20 shadow-2xl"
                      />
                    ) : (
                      <div className="relative z-10 w-full h-44 rounded-xl bg-[#071A40] border border-cyan-400/20 flex items-center justify-center">
                        <Globe className="w-12 h-12 text-[#22D3EE]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Prev / Next Slider Controls */}
                {activeBanners.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Previous banner"
                      onClick={() =>
                        setSlideIndex(
                          (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                        )
                      }
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-[#0F172A] hover:bg-white transition cursor-pointer shadow"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next banner"
                      onClick={() => setSlideIndex((prev) => (prev + 1) % activeBanners.length)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 border border-slate-200 flex items-center justify-center text-[#0F172A] hover:bg-white transition cursor-pointer shadow"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Slider Dot Indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                      {activeBanners.map((b, idx) => (
                        <button
                          key={b.id}
                          type="button"
                          aria-label={`Slide ${idx + 1}`}
                          onClick={() => setSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === slideIndex
                              ? 'w-5 bg-[#00E676]'
                              : 'w-2 bg-white/45 hover:bg-white/80'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* MY PROJECTS SECTION */}
            <section id="projects-section" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-1 h-6 rounded-full bg-[#0284C7]" aria-hidden="true" />
                  <h2 className="text-lg sm:text-2xl font-display font-bold tracking-tight">
                    <span className="text-[#0F172A]">My </span>
                    <span className="text-[#16A34A]">Projects</span>
                  </h2>
                  {selectedCategory !== 'All' && (
                    <span className="text-xs text-[#0284C7] font-semibold">
                      · {selectedCategory}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedCategory !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('All')}
                      className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700 hover:text-[#0F172A] hover:border-slate-300 transition cursor-pointer shadow-sm"
                    >
                      Clear Filter
                    </button>
                  )}
                  {activeTab === 'home' && activeProjects.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setShowAllProjects((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs sm:text-sm font-semibold text-[#0F172A] hover:border-[#0284C7] transition whitespace-nowrap cursor-pointer"
                    >
                      <span>{showAllProjects ? 'Show Less' : 'View All'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0284C7]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Category Tabs on full Projects View */}
              {(activeTab === 'projects' || showAllProjects) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['All', 'New Design', 'E-Commerce', 'Business', 'Portfolio'] as const).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-[#0284C7] text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* 2-Column Side-by-Side Project Grid */}
              {visibleProjects.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center space-y-2">
                  <FolderKanban className="w-9 h-9 text-[#0284C7] mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-[#0F172A]">No projects match this filter</p>
                  <p className="text-xs text-slate-500">
                    Select another category or clear your search query.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5">
                  {visibleProjects.map((project) => {
                    const waLink = buildWhatsAppLink(
                      settings.whatsappNumber,
                      `Hello ${settings.siteName}! I am interested in the "${project.name}" (${project.category}) website.`
                    );

                    return (
                      <article
                        key={project.id}
                        className="group flex flex-col justify-between rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 p-2.5 sm:p-4 transition"
                      >
                        <div>
                          {/* Project Thumbnail + Live Badge */}
                          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 mb-3">
                            {project.imageUrl ? (
                              <img
                                src={project.imageUrl}
                                alt={project.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                <Globe className="w-8 h-8 text-[#0284C7]/70" />
                              </div>
                            )}
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#25D366] text-white text-[10px] sm:text-xs font-bold leading-tight shadow-sm">
                              Live
                            </span>
                          </div>

                          {/* Title, Category & Description */}
                          <div className="space-y-1 px-0.5">
                            <h3 className="text-sm sm:text-base font-display font-bold text-[#0F172A] leading-snug line-clamp-1">
                              {project.name}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-[#0284C7] font-semibold">
                              {project.category}
                              {project.price ? ` · ${project.price}` : ''}
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {project.description}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-4 pt-1">
                          <button
                            type="button"
                            onClick={() => setDemoProject(project)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-[11px] sm:text-xs font-semibold text-slate-800 hover:bg-slate-200/80 hover:border-[#0284C7] transition whitespace-nowrap cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-slate-800 shrink-0" />
                            <span>Live Demo</span>
                          </button>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordContactClick('project_card_whatsapp', project)}
                            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#25D366] text-white text-[11px] sm:text-xs font-bold hover:bg-[#1FB858] transition whitespace-nowrap shadow-sm"
                          >
                            <WhatsAppLogo className="w-3.5 h-3.5 shrink-0" />
                            <span>Contact</span>
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ABOUT US & TEAM SECTION */}
        {(activeTab === 'about' || activeTab === 'home') && (
          <section
            id="about-section"
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-bold text-[#0284C7]">About {settings.siteName}</p>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-[#0F172A] text-balance">
                  {settings.aboutTitle}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {settings.aboutDescription}
                </p>
              </div>
              <a
                href={generalWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordContactClick('about_whatsapp')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1FB858] transition whitespace-nowrap shrink-0 self-start md:self-center shadow-sm"
              >
                <WhatsAppLogo className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>

            {team.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h3 className="text-sm font-display font-bold text-[#0F172A]">Team Members</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border border-sky-300 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#0A1F44] border border-sky-300 flex items-center justify-center text-sm font-bold text-[#22D3EE] shrink-0">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#0F172A] truncate">
                          {member.name}
                        </div>
                        <div className="text-xs font-semibold text-[#16A34A] truncate">
                          {member.role}
                        </div>
                        {member.bio && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{member.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* CONTACT FORM SECTION */}
        {(activeTab === 'home' || activeTab === 'about' || activeTab === 'profile') && (
          <section
            id="contact-section"
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#25D366]" aria-hidden="true" />
                <h2 className="text-lg sm:text-xl font-display font-bold text-[#0F172A]">
                  Send a Message
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Need a custom website, e-commerce store, or web app? Send your requirements directly
                to our team or reach us instantly on WhatsApp.
              </p>

              <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 pt-1">
                <a
                  href={generalWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordContactClick('contact_section_whatsapp')}
                  className="inline-flex items-center gap-2.5 hover:text-[#16A34A] transition"
                >
                  <Phone className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="font-mono font-semibold">{settings.whatsappNumber}</span>
                </a>
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <span>{settings.siteName} · {settings.tagline}</span>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(settings.socialLinks || {})
                  .filter(([, val]) => Boolean(val))
                  .map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0F172A] capitalize transition"
                    >
                      {platform}
                    </a>
                  ))}
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Your Name *"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
                <input
                  type="text"
                  placeholder="Phone / WhatsApp"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((s) => ({ ...s, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((s) => ({ ...s, email: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
                <input
                  type="text"
                  placeholder="Project Type (e.g., E-Commerce)"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm((s) => ({ ...s, subject: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
              </div>

              <textarea
                required
                rows={3}
                placeholder="Tell us about the website you want to build... *"
                value={contactForm.message}
                onChange={(e) => setContactForm((s) => ({ ...s, message: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
              />

              {contactError && <p className="text-xs text-rose-600">{contactError}</p>}
              {contactSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Message sent! Our team will contact you shortly.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={sendingContact}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1FB858] disabled:opacity-60 transition cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{sendingContact ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          </section>
        )}

        {/* DEVELOPER PROFILE TAB */}
        {activeTab === 'profile' && (
          <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <BrandLogo logoUrl={settings.logoUrl} size="lg" siteName={settings.siteName} />
                <div>
                  <h2 className="text-xl font-display font-bold text-[#0F172A]">
                    {settings.siteName}
                  </h2>
                  <p className="text-sm font-semibold text-[#0284C7]">{settings.tagline}</p>
                  <p className="text-xs text-slate-600 mt-1 max-w-md">{settings.description}</p>
                </div>
              </div>

              <a
                href={generalWhatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => recordContactClick('profile_whatsapp')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1FB858] transition whitespace-nowrap shrink-0 self-start sm:self-center shadow-sm"
              >
                <WhatsAppLogo className="w-4 h-4" />
                <span>Hire MJ LAB</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Active Portfolio</div>
                <div className="text-2xl font-display font-bold text-[#0F172A] tabular-nums mt-1">
                  {activeProjects.length}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">WhatsApp Support</div>
                <div className="text-sm font-mono font-bold text-[#16A34A] mt-1.5">
                  {settings.whatsappNumber}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-500">Live Banners</div>
                <div className="text-2xl font-display font-bold text-[#0284C7] tabular-nums mt-1">
                  {activeBanners.length}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="text-center text-xs text-slate-500 pt-3 pb-4 border-t border-slate-200">
          {settings.footerText}
        </footer>
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] h-16"
      >
        <div className="max-w-3xl mx-auto h-full grid grid-cols-4 divide-x divide-slate-200">
          {(
            [
              { id: 'home', label: 'Home', icon: Home },
              { id: 'projects', label: 'Projects', icon: LayoutGrid },
              { id: 'about', label: 'About', icon: UserIcon },
              { id: 'profile', label: 'Profile', icon: Settings },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`relative flex flex-col items-center justify-center gap-1 h-full transition cursor-pointer ${
                  active ? 'text-[#16A34A]' : 'text-slate-500 hover:text-[#0F172A]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-semibold leading-none">{item.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 w-10 h-0.5 rounded-full bg-[#16A34A]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* LIVE DEMO & PROJECT DETAILS MODAL */}
      {demoProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-display font-bold text-[#0F172A]">
                  {demoProject.name}
                </h3>
                <p className="text-xs font-semibold text-[#0284C7]">
                  {demoProject.category}
                  {demoProject.price ? ` · ${demoProject.price}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setDemoProject(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={demoProject.imageUrl}
                  alt={demoProject.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{demoProject.description}</p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {demoProject.demoUrl && (
                  <a
                    href={demoProject.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] text-white font-bold text-xs sm:text-sm hover:brightness-110 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Live URL</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const target = demoProject;
                    setDemoProject(null);
                    setOrderSuccess(false);
                    setOrderProject(target);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] text-white font-bold text-xs sm:text-sm hover:bg-slate-800 transition cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Order Website</span>
                </button>
                <a
                  href={buildWhatsAppLink(
                    settings.whatsappNumber,
                    `Hello ${settings.siteName}! I saw "${demoProject.name}" and want a quote.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordContactClick('demo_modal_whatsapp', demoProject)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-xs sm:text-sm hover:bg-[#1FB858] transition"
                >
                  <WhatsAppLogo className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER WEBSITE MODAL */}
      {orderProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <div>
                <h3 className="text-base font-display font-bold text-[#0F172A]">Order Website</h3>
                <p className="text-xs font-semibold text-[#16A34A]">{orderProject.name}</p>
              </div>
              <button
                type="button"
                aria-label="Close order modal"
                onClick={() => setOrderProject(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#16A34A] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-display font-bold text-[#0F172A]">
                  Order Request Received!
                </h4>
                <p className="text-xs text-slate-600">
                  Your order for {orderProject.name} has been recorded. You can also chat directly
                  on WhatsApp for instant setup.
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  <a
                    href={buildWhatsAppLink(
                      settings.whatsappNumber,
                      `Hello ${settings.siteName}! I just submitted an order request for "${orderProject.name}".`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordContactClick('order_success_whatsapp', orderProject)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] text-white font-bold text-xs"
                  >
                    <WhatsAppLogo className="w-4 h-4" />
                    <span>Open WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setOrderProject(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleOrderSubmit} className="p-5 space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Your Full Name *"
                  value={orderForm.clientName}
                  onChange={(e) => setOrderForm((s) => ({ ...s, clientName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
                <input
                  type="text"
                  required
                  placeholder="WhatsApp Number or Email *"
                  value={orderForm.clientContact}
                  onChange={(e) => setOrderForm((s) => ({ ...s, clientContact: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
                <textarea
                  rows={3}
                  placeholder="Custom requirements or domain details..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7] focus:bg-white"
                />
                {orderError && <p className="text-xs text-rose-600">{orderError}</p>}
                <button
                  type="submit"
                  disabled={sendingOrder}
                  className="w-full py-2.5 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#1FB858] disabled:opacity-60 transition cursor-pointer"
                >
                  {sendingOrder ? 'Submitting...' : 'Submit Order Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
