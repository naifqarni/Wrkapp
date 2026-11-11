// POST {}  with x-cron-secret. Sends waiting notifications to phones through
// Expo's push service. The text is generic: nothing a member wrote leaves the
// database this way.
import { corsHeaders, fail, handlePush, type Json } from "../_shared/logic.ts";
import { env, isCron, rpc } from "../_shared/runtime.ts";

async function send(messages: { to: string; title: string; body: string; data: Json }[]): Promise<string[]> {
  const dead: string[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    const token = env("EXPO_ACCESS_TOKEN");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers, body: JSON.stringify(chunk.map((m) => ({ ...m, sound: "default" }))),
    });
    if (!res.ok) { console.error("push: Expo answered", res.status); continue; }
    const out = await res.json();
    (out.data ?? []).forEach((ticket: { status: string; details?: { error?: string } }, j: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to);
    });
  }
  return dead;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("not-found");
  try {
    return await handlePush(req, { rpc, isCron, send });
  } catch (err) {
    console.error("push:", (err as Error).message);
    return fail("unknown");
  }
});
