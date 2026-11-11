/**
 * Members-only access: the three ways in. These calls are being added to the contract by the
 * backend thread; this file is the one place the screens read them from, so a renamed field is
 * a one-line change here.
 */
import { getCommunityApi } from './index';
import type { CommunityApi } from './types';

/** How the person claims the right to join. */
export type Access = { kind: 'invite'; code: string } | { kind: 'buyer' } | { kind: 'member' };

export interface Invite {
  code: string;
  /** null while nobody has used it. */
  usedAt: string | null;
}

interface AccessCalls {
  requestEmailCode(email: string, access?: Access): Promise<void>;
  /** Resolves when the code can still be used; rejects with 'not-invited' or 'invite-used'. */
  checkInvite(code: string): Promise<unknown>;
  listMyInvites(): Promise<unknown>;
  /** A member who joined with a personal address adds their employer later. */
  requestWorkEmailCode(workEmail: string): Promise<void>;
  verifyWorkEmailCode(workEmail: string, code: string): Promise<unknown>;
}

function api(): CommunityApi & Partial<AccessCalls> {
  return getCommunityApi() as unknown as CommunityApi & Partial<AccessCalls>;
}

export const INVITE_BODY = 8;
/** "wrk 7q4k2m9x" becomes "WRK-7Q4K-2M9X". Any case, with or without dashes or spaces. */
export function normalizeInvite(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = (clean.startsWith('WRK') ? clean.slice(3) : clean).slice(0, INVITE_BODY);
  if (!body) return clean.startsWith('WRK') ? 'WRK-' : '';
  return `WRK-${body.slice(0, 4)}${body.length > 4 ? `-${body.slice(4)}` : ''}`;
}
export function inviteComplete(code: string): boolean {
  return /^WRK-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
}

export function requestCode(email: string, access: Access): Promise<void> {
  return (api().requestEmailCode as AccessCalls['requestEmailCode'])(email, access);
}

export async function checkInvite(code: string): Promise<void> {
  const fn = api().checkInvite;
  // Without the call, the code is checked when the email code is requested.
  if (typeof fn !== 'function') return;
  const r = (await fn.call(api(), code)) as { valid?: boolean; used?: boolean } | boolean | void;
  if (r === false || (typeof r === 'object' && r && r.valid === false)) {
    const { CommunityError } = await import('./types');
    throw new CommunityError((typeof r === 'object' && r.used ? 'invite-used' : 'not-invited') as never);
  }
}

export function canAddWorkEmail(): boolean {
  return typeof api().requestWorkEmailCode === 'function' && typeof api().verifyWorkEmailCode === 'function';
}
export function requestWorkCode(email: string): Promise<void> {
  return api().requestWorkEmailCode!(email);
}
export function verifyWorkCode(email: string, code: string) {
  return api().verifyWorkEmailCode!(email, code) as Promise<import('./types').Me>;
}

export function hasInvites(): boolean {
  return typeof api().listMyInvites === 'function';
}

export async function listMyInvites(): Promise<Invite[]> {
  const fn = api().listMyInvites;
  if (typeof fn !== 'function') return [];
  const r = (await fn.call(api())) as unknown;
  const rows = Array.isArray(r) ? r : ((r as { items?: unknown[] } | null)?.items ?? []);
  return rows.map((x) => {
    const o = x as { code: string; usedAt?: string | null; used_at?: string | null; used?: boolean; usedBy?: unknown };
    const used = o.usedAt ?? o.used_at ?? (o.used || o.usedBy ? 'used' : null);
    return { code: o.code, usedAt: used };
  });
}
