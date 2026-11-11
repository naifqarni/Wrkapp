/**
 * Arabic first. The whole app is RTL, always, whatever the phone language is.
 *
 * Rules for every screen:
 * - Use start/end (paddingStart, marginEnd, `start:`/`end:`), never left/right. Exception: system insets
 *   from useSafeAreaInsets() are physical, so apply insets.left to paddingLeft and insets.right to paddingRight.
 * - Rows are `flexDirection: 'row'`: React Native mirrors them for you. Do not use 'row-reverse' to "fix" RTL.
 * - Numbers, prices, mm, emails, "wrk." are LTR islands: use <Num>, <Price>, <Wordmark>, or <Field ltr>.
 * - Directional glyphs (back chevron, disclosure) flip. Use <Icon name="back" /> and <Icon name="forward" />,
 *   which already do. Light and shadows never flip: the light is always top-left.
 */
import { I18nManager, Platform } from 'react-native';

/**
 * Call once before the first render (top of app/_layout.tsx).
 * Returns true when the native side needs one restart to apply RTL (first launch on a non-Arabic phone).
 * Also set `"extra": { "supportsRTL": true, "forcesRTL": true }` with the expo-localization plugin in
 * app.json so the first launch is already RTL and no restart is needed.
 */
export function setupRTL(): boolean {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    }
    return false;
  }
  I18nManager.allowRTL(true);
  if (!I18nManager.isRTL) {
    I18nManager.forceRTL(true);
    return true;
  }
  return false;
}

/** True when layout is mirrored. On web we always render RTL. */
export function isRTL(): boolean {
  return Platform.OS === 'web' ? true : I18nManager.isRTL;
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
/** The brand uses Latin digits in Jost everywhere. Use this only inside running Arabic sentences if ever needed. */
export function toArabicDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)] ?? d);
}

/** Wrap an LTR fragment (order number, email) so it stays intact inside an Arabic sentence. */
export function ltr(text: string): string {
  return `⁦${text}⁩`;
}
