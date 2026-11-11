/**
 * Pseudonymous handles: an object from a desk, a quiet adjective and two digits.
 * "قلم هادئ 42". Never a name, never a job title, nothing that hints at a person.
 * The backend owns real handle generation; this is what the mock uses, and the word lists are
 * here so the backend can reuse them if it wants the same voice.
 */
export const HANDLE_NOUNS = [
  'قلم', 'دفتر', 'مكتب', 'كرسي', 'مفتاح', 'كوب', 'مصباح', 'ظرف', 'ختم', 'مشبك',
  'رفّ', 'درج', 'ملف', 'سطر', 'هامش', 'حبر', 'ورق', 'شبّاك', 'ممرّ', 'مصعد',
];
// All nouns above are grammatically masculine, so the adjectives need no agreement logic.
export const HANDLE_ADJECTIVES = [
  'هادئ', 'صبور', 'دقيق', 'خفيف', 'ثابت', 'بسيط', 'واضح', 'أمين', 'جديد', 'قديم',
  'بعيد', 'قريب', 'صامت', 'مرتّب', 'عميق', 'رفيع',
];

/** FNV-1a. Stable across platforms, good enough to pick words. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function makeHandle(seed: string): string {
  const h = hash(seed);
  const noun = HANDLE_NOUNS[h % HANDLE_NOUNS.length];
  const adj = HANDLE_ADJECTIVES[(h >>> 8) % HANDLE_ADJECTIVES.length];
  const n = 10 + ((h >>> 16) % 90);
  return `${noun} ${adj} ${n}`;
}
