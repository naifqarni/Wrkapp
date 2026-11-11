// Lets `tsc` type-check the Deno edge functions under Node (tests only).
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
declare module 'npm:@supabase/supabase-js@2' { export * from '@supabase/supabase-js'; }
declare module 'npm:@anthropic-ai/sdk' { import Anthropic from '@anthropic-ai/sdk'; export default Anthropic; }
