import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConnectionConfig } from '../types';

const STORAGE_KEY = 'mjlab_supabase_config';

export function getSavedSupabaseConfig(): SupabaseConnectionConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SupabaseConnectionConfig>;
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
          roleKey: parsed.roleKey || '',
          enabled: Boolean(parsed.enabled),
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
  const envRole = (import.meta.env.VITE_SUPABASE_ROLE_KEY as string | undefined) || '';
  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, roleKey: envRole, enabled: true };
  }
  return { url: '', anonKey: '', roleKey: '', enabled: false };
}

export function saveSupabaseConfig(config: SupabaseConnectionConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createSupabaseClient(
  config: SupabaseConnectionConfig,
  useRoleKey = false
): SupabaseClient | null {
  const key = useRoleKey && config.roleKey ? config.roleKey.trim() : config.anonKey.trim();
  if (!config.enabled || !config.url || !key) return null;
  try {
    return createClient(config.url.trim(), key, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch {
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- Run this SQL once in Supabase SQL Editor for MJ LAB User & Admin Panel sync
create table if not exists public.projects (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  image_url text not null,
  demo_url text default '',
  whatsapp_url text default '',
  status text not null default 'Active',
  price text default '',
  featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.banners (
  id text primary key,
  badge_text text default '',
  title text not null,
  highlight_word text default '',
  description text default '',
  button_text text default 'View Portfolio',
  button_link text default '#projects',
  image_url text not null,
  sort_order int default 1,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.website_settings (
  id text primary key,
  site_name text not null default 'MJ LAB',
  tagline text default 'Web Developer & Designer',
  description text default '',
  theme text default 'Dark',
  logo_url text default '',
  favicon_url text default '',
  whatsapp_number text not null default '+8801923948150',
  about_title text default '',
  about_description text default '',
  footer_text text default '© 2026 MJ LAB. All rights reserved.',
  social_links jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.team_members (
  id text primary key,
  name text not null,
  role text not null,
  bio text default '',
  avatar_url text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contacts (
  id text primary key,
  name text not null,
  email text default '',
  phone text default '',
  subject text default '',
  message text not null,
  status text not null default 'Unread',
  created_at timestamptz default now()
);

create table if not exists public.visitors (
  id text primary key,
  visitor_hash text not null,
  date_key text not null,
  is_unique boolean default true,
  page text default '/',
  device text default 'Desktop',
  created_at timestamptz default now()
);

create table if not exists public.contact_clicks (
  id text primary key,
  source text not null,
  project_id text default '',
  project_name text default '',
  date_key text not null,
  created_at timestamptz default now()
);

create table if not exists public.orders (
  id text primary key,
  client_name text not null,
  client_contact text not null,
  project_id text default '',
  project_name text not null,
  category text default '',
  notes text default '',
  status text not null default 'Pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Safely enable Realtime on all tables (idempotent)
do $$
declare
  t text;
  tables text[] := array[
    'projects',
    'banners',
    'website_settings',
    'team_members',
    'contacts',
    'visitors',
    'contact_clicks',
    'orders'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- Enable RLS with policies for Anon + Service Role sync
alter table public.projects enable row level security;
alter table public.banners enable row level security;
alter table public.website_settings enable row level security;
alter table public.team_members enable row level security;
alter table public.contacts enable row level security;
alter table public.visitors enable row level security;
alter table public.contact_clicks enable row level security;
alter table public.orders enable row level security;

drop policy if exists "public_all_projects" on public.projects;
create policy "public_all_projects" on public.projects for all using (true) with check (true);
drop policy if exists "public_all_banners" on public.banners;
create policy "public_all_banners" on public.banners for all using (true) with check (true);
drop policy if exists "public_all_settings" on public.website_settings;
create policy "public_all_settings" on public.website_settings for all using (true) with check (true);
drop policy if exists "public_all_team" on public.team_members;
create policy "public_all_team" on public.team_members for all using (true) with check (true);
drop policy if exists "public_all_contacts" on public.contacts;
create policy "public_all_contacts" on public.contacts for all using (true) with check (true);
drop policy if exists "public_all_visitors" on public.visitors;
create policy "public_all_visitors" on public.visitors for all using (true) with check (true);
drop policy if exists "public_all_clicks" on public.contact_clicks;
create policy "public_all_clicks" on public.contact_clicks for all using (true) with check (true);
drop policy if exists "public_all_orders" on public.orders;
create policy "public_all_orders" on public.orders for all using (true) with check (true);

-- Optional public storage bucket for uploaded images
insert into storage.buckets (id, name, public)
values ('mjlab-assets', 'mjlab-assets', true)
on conflict (id) do nothing;

-- Reload Supabase PostgREST schema cache immediately
notify pgrst, 'reload schema';
`;
