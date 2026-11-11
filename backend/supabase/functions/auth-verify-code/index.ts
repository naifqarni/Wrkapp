// POST { email, code }  ->  { ok, tokenHash, isNew }
// Checks the code, creates the member on first sign-in, and returns a one-time
// token the app exchanges for a session (supabase.auth.verifyOtp).
//
// The Supabase auth user never holds the real address. It gets a random
// placeholder (<uuid>@<SYNTHETIC_EMAIL_DOMAIN>) that no mail is ever sent to.
import { corsHeaders, fail, handleVerifyCode, requirePepper } from "../_shared/logic.ts";
import { admin, env, rpc } from "../_shared/runtime.ts";

const placeholderDomain = () => env("SYNTHETIC_EMAIL_DOMAIN") ?? "members.wrk.invalid";

async function createUser(): Promise<string> {
  const { data, error } = await admin().auth.admin.createUser({
    email: `${crypto.randomUUID()}@${placeholderDomain()}`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`);
  return data.user.id;
}

async function signInToken(userId: string): Promise<string> {
  const { data: u, error: e1 } = await admin().auth.admin.getUserById(userId);
  if (e1 || !u.user?.email) throw new Error(`getUserById: ${e1?.message}`);
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message}`);
  return data.properties.hashed_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("not-found");
  try {
    return await handleVerifyCode(req, {
      rpc,
      pepper: requirePepper(env("EMAIL_PEPPER")),
      sendCode: () => Promise.reject(new Error("unused")),
      echoCode: false,
      createUser,
      signInToken,
    });
  } catch (err) {
    console.error("auth-verify-code:", (err as Error).message);
    return fail("unknown");
  }
});
