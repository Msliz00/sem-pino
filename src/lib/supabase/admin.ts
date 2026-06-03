import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client admin com service role key — bypassa RLS. Uso EXCLUSIVO em rotas de
// backend (sync/webhook) que escrevem sem sessão de usuário. Nunca expor no
// browser nem usar em componentes/rotas que dependem da sessão.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("missing-admin-env");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
