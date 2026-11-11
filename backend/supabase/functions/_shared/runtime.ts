// Deno-side wiring shared by the edge functions.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { Json, Rpc } from "./logic.ts";

export function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim() !== "" ? v.trim() : undefined;
}

let adminClient: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  adminClient ??= createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export const rpc: Rpc = async (fn: string, args: Json) => {
  const { data, error } = await admin().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};

export function isCron(req: Request): boolean {
  const secret = env("CRON_SECRET");
  return !!secret && secret.length >= 24 && req.headers.get("x-cron-secret") === secret;
}

export async function callerId(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}
