import type { OrderStatus, Personal, Product } from './types';

/** Prices and numbers are always Latin digits (brand rule). */
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  return `${Number(m[3])} / ${Number(m[2])} / ${m[1]}`;
}

export const isIsoDate = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

/** One line describing what will be put on the piece. Same format the shop already uses in order notes. */
export function personalNote(p: Product, v: Personal): string {
  const parts: string[] = [];
  if (p.personal.includes('name') && v.name) parts.push(`الاسم: ${v.name}`);
  if (p.personal.includes('nameEn') && v.nameEn) parts.push(`بالإنجليزية: ${v.nameEn}`);
  if (p.personal.includes('date') && v.date) parts.push(`أول يوم: ${v.date}`);
  if (p.personal.includes('msg') && v.msg) parts.push(`الرسالة: ${v.msg}`);
  if (p.personal.includes('from') && v.from) parts.push(`من: ${v.from}`);
  return parts.join(' · ');
}

/** The same per-field labels the web shop stores on an order line. */
export function personalFields(p: Product, v: Personal): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.personal.includes('name') && v.name) out['الاسم'] = v.name;
  if (p.personal.includes('nameEn') && v.nameEn) out['Name'] = v.nameEn;
  if (p.personal.includes('date') && v.date) out['أول يوم'] = v.date;
  if (p.personal.includes('msg') && v.msg) out['الرسالة'] = v.msg;
  if (p.personal.includes('from') && v.from) out['من'] = v.from;
  return out;
}

export const statusLabel: Record<OrderStatus, string> = {
  'pending-payment': 'بانتظار الدفع',
  paid: 'تم الدفع',
  personalising: 'نكتب الاسم',
  shipped: 'في الطريق',
  'out-for-delivery': 'مع المندوب',
  delivered: 'وصل',
  cancelled: 'ملغي',
};
export const statusSteps: OrderStatus[] = ['paid', 'personalising', 'shipped', 'delivered'];

/** Saudi mobile: accepts 05XXXXXXXX, 5XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX and Arabic digits. Returns 05XXXXXXXX or null. */
export function normalizeMobile(input: string): string | null {
  const latin = input.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^\d+]/g, '');
  let d = latin.replace(/^\+/, '').replace(/^00/, '');
  if (d.startsWith('966')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? '0' + d : null;
}
export const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** 1 قطعة، قطعتان، 3 قطع، 11 قطعة */
export const piecesLabel = (n: number) => (n === 1 ? 'قطعة' : n === 2 ? 'قطعتان' : n <= 10 ? `${n} قطع` : `${n} قطعة`);
