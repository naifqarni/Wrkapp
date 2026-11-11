/**
 * Moyasar payments through the REST API with the publishable key (the same calls Moyasar's own form makes).
 * Card: create payment -> open source.transaction_url for 3-D Secure -> Moyasar redirects to callback_url?id=..&status=..
 * STC Pay: create payment with the mobile -> POST the OTP to source.transaction_url.
 * With no key configured the app runs in demo mode and no money moves.
 */
import { config, hasMoyasar } from '@/config';

import { toLatinDigits } from './format';

const API = 'https://api.moyasar.com/v1';

export class PayError extends Error {
  code: 'network' | 'declined' | 'invalid' | 'cancelled';
  constructor(code: PayError['code'], message?: string) {
    super(message ?? code);
    this.name = 'PayError';
    this.code = code;
  }
}

export interface CardInput { name: string; number: string; month: string; year: string; cvc: string }
export type CardBrand = 'mada' | 'visa' | 'mastercard' | 'amex' | null;

export const digits = (s: string) => toLatinDigits(s).replace(/\D/g, '');

export function luhn(num: string): boolean {
  const d = digits(num);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = d.charCodeAt(d.length - 1 - i) - 48;
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

// A short list of common mada BIN prefixes; the acquirer decides the real scheme, this only picks the mark to show.
const MADA = ['4000', '4031', '4040', '4092', '4101', '4179', '4188', '4201', '4209', '4226', '4285', '4291', '4319', '4391', '4406', '4407', '4410', '4455', '4466', '4578', '4688', '4835', '4849', '4865', '4909', '5044', '5078', '5211', '5245', '5293', '5350', '5388', '5852', '5857', '5880', '5888', '6046', '6360'];
export function cardBrand(num: string): CardBrand {
  const d = digits(num);
  if (d.length < 2) return null;
  if (d.length >= 4 && MADA.includes(d.slice(0, 4))) return 'mada';
  if (d[0] === '4') return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return null;
}

export function formatCardNumber(s: string): string {
  return digits(s).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}
/** "1228" -> "12 / 28" */
export function formatExpiry(s: string): string {
  const d = digits(s).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
}
export function parseExpiry(s: string): { month: string; year: string } | null {
  const d = digits(s);
  if (d.length !== 4) return null;
  const m = Number(d.slice(0, 2)), y = 2000 + Number(d.slice(2));
  if (m < 1 || m > 12) return null;
  const now = new Date();
  if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return null;
  return { month: d.slice(0, 2), year: String(y) };
}

export interface CardErrors { number?: string; name?: string; expiry?: string; cvc?: string }
export function validateCard(c: { name: string; number: string; expiry: string; cvc: string }): CardErrors {
  const e: CardErrors = {};
  if (!luhn(c.number)) e.number = 'رقم البطاقة غير صحيح.';
  if (c.name.trim().split(/\s+/).length < 2 || /[^\x20-\x7E]/.test(c.name)) e.name = 'الاسم كما على البطاقة، بالإنجليزية.';
  if (!parseExpiry(c.expiry)) e.expiry = 'تاريخ الانتهاء غير صحيح.';
  const cvc = digits(c.cvc);
  if (cvc.length < 3 || cvc.length > 4) e.cvc = 'رمز الأمان غير صحيح.';
  return e;
}

function b64(s: string): string {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
    out += abc[a >> 2] + abc[((a & 3) << 4) | (b >> 4 || 0)] + (isNaN(b) ? '=' : abc[((b & 15) << 2) | (c >> 6 || 0)]) + (isNaN(c) ? '=' : abc[c & 63]);
  }
  return out;
}

interface MoyasarPayment {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number;
  source?: { type?: string; transaction_url?: string; message?: string | null };
}

async function post<T>(url: string, body: unknown, auth = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: 'Basic ' + b64(config.moyasarPublishableKey + ':') } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PayError('network');
  }
  let json: unknown = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const j = json as { message?: string; type?: string } | null;
    throw new PayError(res.status >= 500 ? 'network' : res.status === 400 || res.status === 422 ? 'invalid' : 'declined', j?.message);
  }
  return json as T;
}

export interface PayRequest {
  /** SAR, including VAT */
  amount: number;
  description: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}
export type PayStart =
  | { kind: 'paid'; paymentId: string }
  | { kind: 'redirect'; paymentId: string; url: string }
  | { kind: 'otp'; paymentId: string; otpUrl: string };

const halalas = (sar: number) => Math.round(sar * 100);
export const isDemoPay = () => !hasMoyasar();

export async function payWithCard(req: PayRequest, card: CardInput): Promise<PayStart> {
  if (isDemoPay()) {
    await new Promise((r) => setTimeout(r, 900));
    if (digits(card.number).endsWith('0002')) throw new PayError('declined');
    return { kind: 'paid', paymentId: 'demo_' + Date.now().toString(36) };
  }
  const p = await post<MoyasarPayment>(`${API}/payments`, {
    amount: halalas(req.amount),
    currency: 'SAR',
    description: req.description,
    callback_url: req.callbackUrl,
    metadata: req.metadata,
    source: { type: 'creditcard', name: card.name.trim(), number: digits(card.number), cvc: digits(card.cvc), month: card.month, year: card.year },
  });
  if (p.status === 'paid' || p.status === 'captured') return { kind: 'paid', paymentId: p.id };
  if (p.status === 'initiated' && p.source?.transaction_url) return { kind: 'redirect', paymentId: p.id, url: p.source.transaction_url };
  throw new PayError('declined', p.source?.message ?? undefined);
}

export async function payWithStcPay(req: PayRequest, mobile: string): Promise<PayStart> {
  if (isDemoPay()) {
    await new Promise((r) => setTimeout(r, 700));
    return { kind: 'otp', paymentId: 'demo_' + Date.now().toString(36), otpUrl: 'demo' };
  }
  const p = await post<MoyasarPayment>(`${API}/payments`, {
    amount: halalas(req.amount),
    currency: 'SAR',
    description: req.description,
    callback_url: req.callbackUrl,
    metadata: req.metadata,
    source: { type: 'stcpay', mobile },
  });
  if (p.status === 'initiated' && p.source?.transaction_url) return { kind: 'otp', paymentId: p.id, otpUrl: p.source.transaction_url };
  throw new PayError('declined', p.source?.message ?? undefined);
}

export async function submitStcOtp(otpUrl: string, otp: string): Promise<void> {
  if (otpUrl === 'demo') {
    await new Promise((r) => setTimeout(r, 700));
    if (digits(otp).length < 4) throw new PayError('invalid');
    return;
  }
  const p = await post<MoyasarPayment>(otpUrl, { otp_value: digits(otp) }, false);
  if (p.status !== 'paid') throw new PayError('declined', p.source?.message ?? undefined);
}

/** Reads Moyasar's redirect back to callback_url. Returns null if the URL is not the callback. */
export function parseCallback(url: string, callbackUrl: string): { paymentId: string; paid: boolean; message: string } | null {
  if (!url.startsWith(callbackUrl.split('?')[0])) return null;
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const get = (k: string) => {
    for (const part of q.split('&')) {
      const [a, b = ''] = part.split('=');
      if (decodeURIComponent(a) === k) return decodeURIComponent(b.replace(/\+/g, ' '));
    }
    return '';
  };
  const id = get('id');
  if (!id) return null;
  return { paymentId: id, paid: get('status') === 'paid', message: get('message') };
}
