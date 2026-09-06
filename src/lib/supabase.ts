/**
 * Supabase Client & Data Access Layer
 * Supports NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));
}

export async function supabaseFetch(
  table: string,
  options: {
    method?: string;
    query?: string;
    body?: any;
    prefer?: string;
  } = {}
) {
  if (!isSupabaseConfigured()) {
    return { data: null, error: new Error("Supabase credentials not configured in environment variables") };
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}${options.query ? `?${options.query}` : ""}`;
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: key!,
    Authorization: `Bearer ${key}`,
  };

  if (options.prefer) {
    headers["Prefer"] = options.prefer;
  }

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: null, error: new Error(`Supabase HTTP ${res.status}: ${errText}`) };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
