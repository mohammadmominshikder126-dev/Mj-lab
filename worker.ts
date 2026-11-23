interface AssetFetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: AssetFetcher;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ROLE_KEY?: string;
  ROLE_KEY?: string;
  SERVICE_ROLE_KEY?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
}

const ALLOWED_TABLES = new Set([
  'projects',
  'banners',
  'website_settings',
  'team_members',
  'contacts',
  'visitors',
  'contact_clicks',
  'orders',
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getSupabaseEnv(env: Env) {
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseAnonKey = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
  const supabaseRoleKey = (
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ROLE_KEY ||
    env.ROLE_KEY ||
    env.SERVICE_ROLE_KEY ||
    ''
  ).trim();
  const adminPassword = (env.ADMIN_PASSWORD || 'mjlab2026').trim();
  const signingSecret =
    env.ADMIN_SECRET || supabaseRoleKey || adminPassword || 'mjlab-worker-signing-key-2026';

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseRoleKey,
    adminPassword,
    signingSecret,
  };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return atob(b64);
}

async function signHmac(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toBase64Url(new Uint8Array(sig));
}

async function createAdminToken(secret: string): Promise<string> {
  const payload = JSON.stringify({
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const encodedPayload = toBase64Url(new TextEncoder().encode(payload));
  const sig = await signHmac(encodedPayload, secret);
  return `${encodedPayload}.${sig}`;
}

async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false;
  const [encodedPayload, sig] = token.split('.', 2);
  if (!encodedPayload || !sig) return false;
  const expectedSig = await signHmac(encodedPayload, secret);
  if (!timingSafeEqualStr(sig, expectedSig)) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(encodedPayload)) as { role?: string; exp?: number };
    return decoded.role === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

async function supabaseRest(
  supabaseUrl: string,
  roleKey: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: roleKey,
      Authorization: `Bearer ${roleKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

async function parseSupabaseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string; hint?: string };
    return parsed.message || parsed.error || parsed.hint || `Supabase error (${res.status})`;
  } catch {
    return text || `Supabase error (${res.status})`;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const cfg = getSupabaseEnv(env);

    // 1. Public runtime configuration (never exposes Service Role Key)
    if (pathname === '/api/config' && request.method === 'GET') {
      return jsonResponse({
        supabaseUrl: cfg.supabaseUrl,
        supabaseAnonKey: cfg.supabaseAnonKey,
        hasWorkerRole: Boolean(cfg.supabaseUrl && cfg.supabaseRoleKey),
        hasWorkerAuth: true,
      });
    }

    // 2. Password-only Admin Login
    if (pathname === '/api/admin/login' && request.method === 'POST') {
      let body: { password?: string } = {};
      try {
        body = (await request.json()) as { password?: string };
      } catch {
        return jsonResponse({ error: 'Invalid request body.' }, 400);
      }
      const submitted = typeof body.password === 'string' ? body.password.trim() : '';
      if (!submitted || !timingSafeEqualStr(submitted, cfg.adminPassword)) {
        return jsonResponse({ error: 'Incorrect admin password.' }, 401);
      }
      const token = await createAdminToken(cfg.signingSecret);
      return jsonResponse({ token });
    }

    // 3. Protected Admin Data Fetch (uses Service Role Key server-side)
    if (pathname === '/api/admin/data' && request.method === 'GET') {
      const token = request.headers.get('x-admin-token') || '';
      if (!(await verifyAdminToken(token, cfg.signingSecret))) {
        return jsonResponse({ error: 'Unauthorized admin session.' }, 401);
      }
      if (!cfg.supabaseUrl || !cfg.supabaseRoleKey) {
        return jsonResponse({ error: 'Worker Supabase Role Key is not configured.' }, 400);
      }

      const [cRes, vRes, kRes, oRes] = await Promise.all([
        supabaseRest(cfg.supabaseUrl, cfg.supabaseRoleKey, 'contacts?select=*&order=created_at.desc'),
        supabaseRest(cfg.supabaseUrl, cfg.supabaseRoleKey, 'visitors?select=*&order=created_at.desc'),
        supabaseRest(
          cfg.supabaseUrl,
          cfg.supabaseRoleKey,
          'contact_clicks?select=*&order=created_at.desc'
        ),
        supabaseRest(cfg.supabaseUrl, cfg.supabaseRoleKey, 'orders?select=*&order=created_at.desc'),
      ]);

      return jsonResponse({
        contacts: cRes.ok ? await cRes.json() : [],
        visitors: vRes.ok ? await vRes.json() : [],
        contactClicks: kRes.ok ? await kRes.json() : [],
        orders: oRes.ok ? await oRes.json() : [],
      });
    }

    // 4. Protected Admin Mutations (uses Service Role Key server-side)
    if (pathname === '/api/admin/mutate' && request.method === 'POST') {
      const token = request.headers.get('x-admin-token') || '';
      if (!(await verifyAdminToken(token, cfg.signingSecret))) {
        return jsonResponse({ error: 'Unauthorized admin session.' }, 401);
      }
      if (!cfg.supabaseUrl || !cfg.supabaseRoleKey) {
        return jsonResponse({ error: 'Worker Supabase Role Key is not configured.' }, 400);
      }

      let body: {
        table?: string;
        action?: 'insert' | 'update' | 'upsert' | 'delete';
        payload?: Record<string, unknown>;
        id?: string;
      } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ error: 'Invalid JSON payload.' }, 400);
      }

      const { table, action, payload, id } = body;
      if (!table || !ALLOWED_TABLES.has(table)) {
        return jsonResponse({ error: 'Invalid target table.' }, 400);
      }

      let res: Response;
      if (action === 'insert' && payload) {
        res = await supabaseRest(cfg.supabaseUrl, cfg.supabaseRoleKey, table, {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
      } else if (action === 'upsert' && payload) {
        res = await supabaseRest(cfg.supabaseUrl, cfg.supabaseRoleKey, `${table}?on_conflict=id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(payload),
        });
      } else if (action === 'update' && payload && id) {
        res = await supabaseRest(
          cfg.supabaseUrl,
          cfg.supabaseRoleKey,
          `${table}?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload),
          }
        );
      } else if (action === 'delete' && id) {
        res = await supabaseRest(
          cfg.supabaseUrl,
          cfg.supabaseRoleKey,
          `${table}?id=eq.${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
      } else {
        return jsonResponse({ error: 'Invalid mutation action or missing parameters.' }, 400);
      }

      if (!res.ok) {
        return jsonResponse({ error: await parseSupabaseError(res) }, res.status);
      }
      return jsonResponse({ ok: true });
    }

    // 5. Protected Seed Endpoint (populates empty tables using Service Role Key)
    if (pathname === '/api/admin/seed' && request.method === 'POST') {
      const token = request.headers.get('x-admin-token') || '';
      if (!(await verifyAdminToken(token, cfg.signingSecret))) {
        return jsonResponse({ error: 'Unauthorized admin session.' }, 401);
      }
      if (!cfg.supabaseUrl || !cfg.supabaseRoleKey) {
        return jsonResponse({ error: 'Worker Supabase Role Key is not configured.' }, 400);
      }

      let body: {
        settings?: Record<string, unknown>;
        projects?: Record<string, unknown>[];
        banners?: Record<string, unknown>[];
        team?: Record<string, unknown>[];
      } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return jsonResponse({ error: 'Invalid seed payload.' }, 400);
      }

      const steps: Array<{ table: string; data: unknown }> = [];
      if (body.settings) steps.push({ table: 'website_settings', data: body.settings });
      if (Array.isArray(body.projects) && body.projects.length > 0) {
        steps.push({ table: 'projects', data: body.projects });
      }
      if (Array.isArray(body.banners) && body.banners.length > 0) {
        steps.push({ table: 'banners', data: body.banners });
      }
      if (Array.isArray(body.team) && body.team.length > 0) {
        steps.push({ table: 'team_members', data: body.team });
      }

      for (const step of steps) {
        const res = await supabaseRest(
          cfg.supabaseUrl,
          cfg.supabaseRoleKey,
          `${step.table}?on_conflict=id`,
          {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(step.data),
          }
        );
        if (!res.ok) {
          return jsonResponse({ error: await parseSupabaseError(res) }, res.status);
        }
      }

      return jsonResponse({ ok: true });
    }

    // 6. Serve Static Assets & Separate Admin/User HTML Entry Points
    const withNoCacheHtml = (res: Response): Response => {
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return res;
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    };

    if (pathname === '/admin' || pathname === '/admin/') {
      const adminUrl = new URL('/admin.html', url.origin);
      return withNoCacheHtml(await env.ASSETS.fetch(new Request(adminUrl.toString(), request)));
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404 && !pathname.includes('.')) {
      const fallbackPath = pathname.startsWith('/admin') ? '/admin.html' : '/index.html';
      const fallbackUrl = new URL(fallbackPath, url.origin);
      return withNoCacheHtml(await env.ASSETS.fetch(new Request(fallbackUrl.toString(), request)));
    }
    return withNoCacheHtml(assetResponse);
  },
};
