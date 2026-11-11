// POST { type: "post" | "comment", id }   (member token: reviews the caller's own pending item)
// POST { sweep: true }                    (x-cron-secret: reviews whatever is still pending)
//
// When the app setting ai_moderation is on, new posts and comments are saved as
// "pending" and only their author can see them. This function asks Claude for a
// verdict and publishes, holds for a moderator, or removes.
import Anthropic from "npm:@anthropic-ai/sdk";
import {
  corsHeaders, fail, handleModerate, MODERATION_SYSTEM, moderationUserMessage, parseVerdict, VERDICT_JSON_SCHEMA,
  type Verdict,
} from "../_shared/logic.ts";
import { callerId, env, isCron, rpc } from "../_shared/runtime.ts";

let client: Anthropic | null = null;

async function classify(kind: "post" | "comment", body: string, channel: string, context: string | null): Promise<Verdict | null> {
  if (!env("ANTHROPIC_API_KEY")) {
    // AI switched on in settings but no key: never publish unreviewed.
    return { decision: "hold", category: "other", reason: "AI moderation has no API key; sent to a moderator." };
  }
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.create({
      model: env("MODERATION_MODEL") ?? "claude-opus-5-5",
      max_tokens: 2000,
      // If the model declines to read abusive text, the API retries on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: MODERATION_SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low", format: { type: "json_schema", schema: VERDICT_JSON_SCHEMA } },
      messages: [{ role: "user", content: moderationUserMessage(kind, body, channel, context) }],
    });
    if (res.stop_reason === "refusal") {
      return { decision: "hold", category: "other", reason: "The AI declined to review this text; sent to a moderator." };
    }
    let text = "";
    for (const block of res.content) if (block.type === "text") text += block.text;
    return parseVerdict(text);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.APIConnectionError ||
        (err instanceof Anthropic.APIError && typeof err.status === "number" && err.status >= 500)) {
      console.error("moderate: temporary AI failure, leaving pending:", (err as Error).message);
      return null;   // stays pending; the sweep retries, and after 10 minutes a moderator gets it
    }
    console.error("moderate: AI call failed:", (err as Error).message);
    return { decision: "hold", category: "other", reason: "The AI check failed; sent to a moderator." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("not-found");
  try {
    return await handleModerate(req, { rpc, callerId, isCron, classify });
  } catch (err) {
    console.error("moderate:", (err as Error).message);
    return fail("unknown");
  }
});
