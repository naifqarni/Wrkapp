// POST { email }  ->  { ok, expiresInSeconds, companyName }
// Sends a 6-digit code to a work email. The address is used for this one
// message and is never written to the database or the logs.
import { corsHeaders, fail, handleRequestCode, requirePepper } from "../_shared/logic.ts";
import { env, rpc } from "../_shared/runtime.ts";
import { codeEmail } from "../_shared/logic.ts";

async function sendCode(to: string, code: string): Promise<void> {
  const key = env("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const mail = codeEmail(code);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("MAIL_FROM") ?? "wrk. <verify@ranlab.dev>", to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) throw new Error(`mail provider answered ${res.status}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("not-found");
  try {
    return await handleRequestCode(req, {
      rpc,
      pepper: requirePepper(env("EMAIL_PEPPER")),
      sendCode,
      echoCode: env("DEV_ECHO_CODE") === "true",
      createUser: () => Promise.reject(new Error("unused")),
      signInToken: () => Promise.reject(new Error("unused")),
    });
  } catch (err) {
    console.error("auth-request-code:", (err as Error).message);
    return fail("unknown");
  }
});
