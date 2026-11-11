/** Checkout on one short page: who receives it, where, and how to pay. */
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { callbackUrlFor, finishPaid, markFailed, payDescription, shippingFor, startOrder, type Started } from '@/store/checkout';
import { normalizeMobile } from '@/store/format';
import {
  PayError, cardBrand, digits, formatCardNumber, formatExpiry, isDemoPay, parseExpiry, payWithCard, payWithStcPay, submitStcOtp, validateCard,
  type CardErrors, type PayRequest,
} from '@/store/moyasar';
import { Section } from '@/store/parts';
import { cartTotal, useCart, useProfile } from '@/store/state';
import { ShopError } from '@/store/woo';
import { space } from '@/theme';
import { Button, EmptyState, Field, Num, Price, Screen, Segmented, Text, haptic } from '@/ui';

type Method = 'card' | 'stcpay';
const METHODS = [{ id: 'card', label: 'بطاقة' }, { id: 'stcpay', label: 'STC Pay' }] as const;
const BRAND: Record<string, string> = { mada: 'mada', visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex' };

function explain(e: unknown): string {
  if (e instanceof PayError) {
    if (e.code === 'network') return 'تعذّر الاتصال ببوابة الدفع. حاول مرة أخرى.';
    if (e.code === 'invalid') return 'بيانات الدفع غير صحيحة.';
    return 'لم تُقبل العملية. جرّب بطاقة أخرى.';
  }
  if (e instanceof ShopError) return e.code === 'network' ? 'تعذّر الاتصال بالمتجر. حاول مرة أخرى.' : 'تعذّر إنشاء الطلب. حاول مرة أخرى.';
  return 'حدث خطأ. حاول مرة أخرى.';
}

export default function CheckoutScreen() {
  const router = useRouter();
  const lines = useCart((c) => c.lines);
  const profile = useProfile();
  const subtotal = cartTotal(lines);
  const estimate = subtotal + shippingFor(subtotal);

  const [method, setMethod] = useState<Method>('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [stcMobile, setStcMobile] = useState('');
  const [otp, setOtp] = useState<{ url: string; paymentId: string; orderId: string } | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardErrors, setCardErrors] = useState<CardErrors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  /** the order already created for this cart, so a retry does not create a second one */
  const started = useRef<{ sig: string; value: Started } | null>(null);

  if (lines.length === 0) {
    return <Screen><EmptyState title="السلة فارغة." action={{ label: 'القطع', onPress: () => router.replace('/') }} style={{ marginTop: space[16] }} /></Screen>;
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (profile.fullName.trim().length < 3) e.fullName = 'اكتب اسم المستلم.';
    if (!normalizeMobile(profile.mobile)) e.mobile = 'رقم الجوال هكذا: 05XXXXXXXX';
    if (profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(profile.email.trim())) e.email = 'البريد غير صحيح.';
    if (profile.city.trim().length < 2) e.city = 'اكتب المدينة.';
    if (profile.district.trim().length < 2) e.district = 'اكتب الحي.';
    if (profile.street.trim().length < 2) e.street = 'اكتب الشارع.';
    let ce: CardErrors = {};
    if (method === 'card') ce = validateCard(card);
    else if (!normalizeMobile(stcMobile || profile.mobile)) e.stc = 'رقم STC Pay هكذا: 05XXXXXXXX';
    setErrors(e);
    setCardErrors(ce);
    return Object.keys(e).length === 0 && Object.keys(ce).length === 0;
  };

  const done = async (orderId: string, paymentId: string) => {
    await finishPaid(orderId, paymentId);
    haptic.success();
    router.dismissTo('/');
    router.push({ pathname: '/order/[id]', params: { id: orderId, fresh: '1' } });
  };

  const pay = async () => {
    setFailure(null);
    if (!validate()) { haptic.warning(); return; }
    setBusy(true);
    try {
      const who = { ...profile, mobile: normalizeMobile(profile.mobile)!, fullName: profile.fullName.trim(), email: profile.email.trim() };
      const sig = JSON.stringify([lines.map((l) => [l.key, l.qty]), who.fullName, who.mobile, who.city, who.district, who.street, who.extra]);
      if (!started.current || started.current.sig !== sig) started.current = { sig, value: await startOrder(lines, who) };
      const { order } = started.current.value;
      const req: PayRequest = { amount: order.total, description: payDescription(order), callbackUrl: callbackUrlFor(order.id), metadata: { order_id: order.id, order_number: order.number, source: 'wrk-app' } };

      if (method === 'card') {
        const exp = parseExpiry(card.expiry)!;
        const r = await payWithCard(req, { name: card.name, number: card.number, cvc: card.cvc, month: exp.month, year: exp.year });
        if (r.kind === 'paid') await done(order.id, r.paymentId);
        else if (r.kind === 'redirect') {
          if (Platform.OS === 'web') window.location.assign(r.url);
          else router.push({ pathname: '/checkout/pay', params: { url: r.url, orderId: order.id, callback: req.callbackUrl } });
        }
      } else {
        const r = await payWithStcPay(req, normalizeMobile(stcMobile || profile.mobile)!);
        if (r.kind === 'otp') setOtp({ url: r.otpUrl, paymentId: r.paymentId, orderId: order.id });
      }
    } catch (e) {
      haptic.error();
      setFailure(explain(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async () => {
    if (!otp) return;
    setFailure(null);
    setBusy(true);
    try {
      await submitStcOtp(otp.url, otpValue);
      await done(otp.orderId, otp.paymentId);
    } catch (e) {
      haptic.error();
      setFailure(e instanceof PayError && e.code !== 'network' ? 'الرمز غير صحيح.' : explain(e));
      if (e instanceof PayError && e.code === 'declined') { markFailed(otp.orderId); started.current = null; setOtp(null); }
    } finally {
      setBusy(false);
    }
  };

  const fix = (k: string) => { if (errors[k]) setErrors(({ [k]: _gone, ...rest }) => rest); };
  const fixCard = (k: keyof CardErrors) => { if (cardErrors[k]) setCardErrors({ ...cardErrors, [k]: undefined }); };
  const brand = cardBrand(card.number);
  const footer = (
    <View style={{ gap: space[2] }}>
      {failure ? <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">{failure}</Text> : null}
      {otp ? <Button label="أكّد" full loading={busy} haptic="tap" onPress={confirmOtp} />
        : <Button label="ادفع" full loading={busy} haptic="tap" onPress={pay} trailing={<Price amount={started.current?.value.order.total ?? estimate} tone="onBlack" />} />}
      {isDemoPay() ? <Text variant="caption" mute center>وضع تجريبي. لا يُخصم أي مبلغ.</Text> : null}
    </View>
  );

  return (
    <Screen edges={['left', 'right']} footer={footer}>
      <Section title="المستلم">
        <Field label="الاسم الكامل" value={profile.fullName} onChangeText={(v) => { profile.set({ fullName: v }); fix('fullName'); }} error={errors.fullName} autoComplete="name" textContentType="name" maxLength={60} />
        <Field label="الجوال" ltr value={profile.mobile} onChangeText={(v) => { profile.set({ mobile: v }); fix('mobile'); }} error={errors.mobile} placeholder="05XXXXXXXX"
          keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={16} />
        <Field label="البريد (اختياري)" ltr value={profile.email} onChangeText={(v) => { profile.set({ email: v }); fix('email'); }} error={errors.email}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" maxLength={80} />
      </Section>

      <Section title="العنوان">
        <Field label="المدينة" value={profile.city} onChangeText={(v) => { profile.set({ city: v }); fix('city'); }} error={errors.city} textContentType="addressCity" maxLength={40} />
        <Field label="الحي" value={profile.district} onChangeText={(v) => { profile.set({ district: v }); fix('district'); }} error={errors.district} maxLength={40} />
        <Field label="الشارع ورقم المبنى" value={profile.street} onChangeText={(v) => { profile.set({ street: v }); fix('street'); }} error={errors.street} textContentType="streetAddressLine1" maxLength={80} />
        <Field label="العنوان الوطني المختصر (اختياري)" ltr value={profile.extra} onChangeText={(v) => profile.set({ extra: v.toUpperCase() })} placeholder="RRRD2929" autoCapitalize="characters" autoCorrect={false} maxLength={8} />
      </Section>

      <Section title="الدفع">
        {otp ? (
          <Field label="رمز التحقق من STC Pay" ltr value={otpValue} onChangeText={(v) => setOtpValue(digits(v).slice(0, 6))} keyboardType="number-pad"
            textContentType="oneTimeCode" autoComplete="sms-otp" autoFocus maxLength={6} />
        ) : (
          <>
            <Segmented items={METHODS} value={method} onChange={(m) => { setMethod(m); setFailure(null); }} />
            {method === 'card' ? (
              <>
                <Field label="رقم البطاقة" ltr value={card.number} onChangeText={(v) => { setCard({ ...card, number: formatCardNumber(v) }); fixCard('number'); }} error={cardErrors.number}
                  placeholder="0000 0000 0000 0000" keyboardType="number-pad" autoComplete="cc-number" textContentType="creditCardNumber" maxLength={23}
                  trailing={brand ? <Num>{BRAND[brand]}</Num> : undefined} />
                <Field label="الاسم على البطاقة" ltr value={card.name} onChangeText={(v) => { setCard({ ...card, name: v }); fixCard('name'); }} error={cardErrors.name}
                  autoCapitalize="characters" autoCorrect={false} autoComplete="cc-name" maxLength={50} />
                <View style={{ flexDirection: 'row', gap: space[5] }}>
                  <Field label="الانتهاء" ltr containerStyle={{ flex: 1, minWidth: 0 }} value={card.expiry} onChangeText={(v) => { setCard({ ...card, expiry: formatExpiry(v) }); fixCard('expiry'); }} error={cardErrors.expiry}
                    placeholder="MM / YY" keyboardType="number-pad" autoComplete="cc-exp" maxLength={7} />
                  <Field label="رمز الأمان" ltr containerStyle={{ flex: 1, minWidth: 0 }} value={card.cvc} onChangeText={(v) => { setCard({ ...card, cvc: digits(v).slice(0, 4) }); fixCard('cvc'); }} error={cardErrors.cvc}
                    placeholder="CVC" keyboardType="number-pad" autoComplete="cc-csc" secureTextEntry maxLength={4} />
                </View>
              </>
            ) : (
              <Field label="رقم الجوال المسجّل في STC Pay" ltr value={stcMobile || profile.mobile} onChangeText={(v) => { setStcMobile(v); fix('stc'); }} error={errors.stc}
                placeholder="05XXXXXXXX" keyboardType="phone-pad" maxLength={16} />
            )}
          </>
        )}
      </Section>
      <View style={{ height: space[8] }} />
    </Screen>
  );
}
