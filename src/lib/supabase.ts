/**
 * Clean data access stub (Supabase removed)
 */

export function isSupabaseConfigured(): boolean {
  return false;
}

export async function supabaseFetch() {
  return { data: null, error: new Error("Supabase has been removed from this project.") };
}
