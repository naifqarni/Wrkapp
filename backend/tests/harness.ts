// A stand-in for supabase-js that talks to a local PostgreSQL the way Supabase
// does: every rpc runs as the `anon` or `authenticated` role with the caller's
// id in request.jwt.claims (this is exactly what PostgREST does), and the edge
// functions' real handlers run in-process with the service role.
import pg from 'pg';
import {
  handleModerate, handlePush, handleRequestCode, handleVerifyCode, type Json, type Verdict,
} from '../supabase/functions/_shared/logic.ts';

export const DB_URL = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/wrk_test';
export const PEPPER = 'test-pepper-0123456789-0123456789-abcdef';
export const CRON = 'cron-secret-0123456789-0123456789';

const ident = (s: string) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error(`bad identifier ${s}`); return s; };

export class World {
  pool = new pg.Pool({ connectionString: DB_URL, max: 4 });
  outbox = new Map<string, string>();           // email -> last code "sent"
  pushes: { to: string; body: string }[] = [];
  classify: (kind: string, body: string) => Verdict | null = () => ({ decision: 'allow', category: 'none', reason: 'ok' });
  deadTokens: string[] = [];

  async as(role: 'anon' | 'authenticated' | 'service_role', sub: string | null, fn: string, args: Json) {
    const c = await this.pool.connect();
    try {
      await c.query('begin');
      await c.query(`set local role ${ident(role)}`);
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(sub ? { sub, role } : { role })]);
      const keys = Object.keys(args);
      const sql = `select public.${ident(fn)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(', ')}) as r`;
      const res = await c.query(sql, keys.map((k) => args[k]));
      await c.query('commit');
      return { data: res.rows[0].r, error: null };
    } catch (e: any) {
      await c.query('rollback').catch(() => undefined);
      return { data: null, error: { message: e.message as string, code: e.code as string } };
    } finally {
      c.release();
    }
  }

  service = async (fn: string, args: Json) => {
    const r = await this.as('service_role', null, fn, args);
    if (r.error) throw new Error(`${fn}: ${r.error.message}`);
    return r.data;
  };

  sql = async (text: string, params: unknown[] = []) => (await this.pool.query(text, params)).rows;

  client() { return new FakeSupabase(this); }
  close() { return this.pool.end(); }
}

export class FakeSupabase {
  private userId: string | null = null;
  private authListeners: ((event: string, session: unknown) => void)[] = [];
  constructor(private w: World) {}

  rpc = (fn: string, args: Json = {}) => this.w.as(this.userId ? 'authenticated' : 'anon', this.userId, fn, args);

  functions = {
    invoke: async (name: string, opts: { body?: Json; headers?: Record<string, string> } = {}) => {
      const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers ?? {}) };
      if (this.userId) headers.authorization = `Bearer ${this.userId}`;
      const req = new Request(`http://local/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(opts.body ?? {}) });
      const w = this.w;
      const authDeps = {
        rpc: w.service, pepper: PEPPER, echoCode: false,
        sendCode: async (to: string, code: string) => { w.outbox.set(to, code); },
        createUser: async () => (await w.sql(`insert into auth.users (email) values (gen_random_uuid()::text || '@members.wrk.invalid') returning id`))[0].id as string,
        signInToken: async (userId: string) => `tok_${userId}`,
      };
      const isCron = (r: Request) => r.headers.get('x-cron-secret') === CRON;
      let res: Response;
      if (name === 'auth-request-code') res = await handleRequestCode(req, authDeps);
      else if (name === 'auth-verify-code') res = await handleVerifyCode(req, authDeps);
      else if (name === 'moderate') res = await handleModerate(req, {
        rpc: w.service, isCron,
        callerId: async (r) => (r.headers.get('authorization') ?? '').replace(/^Bearer /, '') || null,
        classify: async (kind, body) => w.classify(kind, body),
      });
      else if (name === 'push') res = await handlePush(req, {
        rpc: w.service, isCron,
        send: async (msgs) => { w.pushes.push(...msgs.map((m) => ({ to: m.to, body: m.body }))); return w.deadTokens; },
      });
      else throw new Error(`no such function ${name}`);
      if (!res.ok) return { data: null, error: { name: 'FunctionsHttpError', message: 'Edge Function returned a non-2xx status code', context: res } };
      return { data: await res.json(), error: null };
    },
  };

  auth = {
    getSession: async () => ({ data: { session: this.userId ? { user: { id: this.userId } } : null }, error: null }),
    verifyOtp: async ({ token_hash }: { token_hash: string; type: string }) => {
      if (!token_hash.startsWith('tok_')) return { data: { session: null }, error: { message: 'invalid token' } };
      this.userId = token_hash.slice(4);
      this.authListeners.forEach((l) => l('SIGNED_IN', {}));
      return { data: { session: { user: { id: this.userId } } }, error: null };
    },
    signOut: async (_opts?: unknown) => {
      this.userId = null;
      this.authListeners.forEach((l) => l('SIGNED_OUT', null));
      return { error: null };
    },
    onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
      this.authListeners.push(cb);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
  };
}
