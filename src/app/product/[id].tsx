/** One piece: the object in 3D with the shopper's name on it, what to put on it, and one button. */
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { captions, isProductId, photos, priceOf, products, sample } from '@/store/catalogue';
import { isIsoDate, toLatinDigits } from '@/store/format';
import { Choice } from '@/store/parts';
import { shown, useCart, usePersonal } from '@/store/state';
import type { Product } from '@/store/types';
import { useLive } from '@/store/useLive';
import { Viewer } from '@/store/viewer/Viewer';
import type { ViewerAction, ViewerHandle } from '@/store/viewer/protocol';
import { color, gutter, radius, space } from '@/theme';
import { Button, EmptyState, Field, Num, Price, Screen, Text, haptic, useLayoutClass, useToast } from '@/ui';

const formatDateInput = (v: string) => {
  const d = toLatinDigits(v).replace(/\D/g, '').slice(0, 8);
  return [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join('-');
};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  if (!isProductId(id)) {
    return <Screen><EmptyState title="هذه القطعة غير موجودة." action={{ label: 'القطع', onPress: () => router.replace('/store') }} /></Screen>;
  }
  return <ProductView product={products[id]} key={id} />;
}

function ProductView({ product: p }: { product: Product }) {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const { isTwoPane, posture, height } = useLayoutClass();
  const personal = usePersonal();
  const add = useCart((c) => c.add);
  const viewer = useRef<ViewerHandle>(null);
  const [actions, setActions] = useState<ViewerAction[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const tier = p.tiers ? personal.tier : null;
  const price = priceOf(p.id, tier, live?.price);
  const soldOut = live ? live.inStock[tier && p.tiers ? p.tiers.find((t) => t.id === tier)!.sku : p.sku] === false : false;
  const dateOk = !personal.date || isIsoDate(personal.date);

  const viewerPersonal = useMemo(
    () => ({ name: shown(personal, 'name'), latin: shown(personal, 'nameEn'), date: isIsoDate(personal.date) ? personal.date : '2026-12-06' }),
    [personal],
  );
  const onActions = useCallback((a: ViewerAction[]) => setActions(a), []);

  const onAdd = () => {
    if (p.personal.includes('name') && !personal.name.trim()) {
      setNameError('اكتب الاسم أولاً.');
      haptic.warning();
      return;
    }
    if (!dateOk) { haptic.warning(); return; }
    add(p.id, tier, { name: personal.name, nameEn: personal.nameEn, msg: personal.msg, from: personal.from, date: personal.date }, price);
    haptic.setDown();
    setAdded(true);
    toast.show('في السلة', { haptic: false, action: { label: 'السلة', onPress: () => router.push('/cart') } });
    setTimeout(() => setAdded(false), 2400);
  };

  const stage = (
    <View style={{ flex: 1 }}>
      <View style={[styles.stage, isTwoPane && { borderRadius: radius.panel }]}>
        <Viewer ref={viewer} id={p.id} personal={viewerPersonal} onActions={onActions} />
      </View>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button key={a.id} variant="ghost" size="sm" haptic="lid" label={a.on && !a.step ? a.labelOn : a.label} onPress={() => viewer.current?.act(a.id)} />
          ))}
        </View>
      ) : null}
    </View>
  );

  const fields = (
    <View style={{ gap: space[5] }}>
      {p.personal.includes('name') ? (
        <Field label="الاسم" value={personal.name} onChangeText={(v) => { personal.set('name', v); if (nameError) setNameError(null); }}
          placeholder={sample.name} error={nameError} autoCorrect={false} maxLength={40} returnKeyType="done" />
      ) : null}
      {p.personal.includes('nameEn') ? (
        <Field label="الاسم بالإنجليزية" ltr value={personal.nameEn} onChangeText={(v) => personal.set('nameEn', v)}
          placeholder={sample.nameEn} autoCorrect={false} autoCapitalize="words" maxLength={40} returnKeyType="done" />
      ) : null}
      {p.personal.includes('date') ? (
        <Field label="أول يوم عمل" ltr value={personal.date} onChangeText={(v) => personal.set('date', formatDateInput(v))}
          placeholder="2026-12-06" keyboardType="number-pad" maxLength={10} error={dateOk ? null : 'اكتب التاريخ هكذا: 2026-12-06'} />
      ) : null}
      {p.personal.includes('msg') ? (
        <Field label="رسالتك" value={personal.msg} onChangeText={(v) => personal.set('msg', v)} placeholder={sample.msg} maxLength={60}
          hint={personal.msg.length > 40 ? `${60 - personal.msg.length}` : undefined} />
      ) : null}
      {p.personal.includes('from') ? (
        <Field label="من" value={personal.from} onChangeText={(v) => personal.set('from', v)} placeholder={sample.from} maxLength={30} />
      ) : null}
    </View>
  );

  const gallery = photos(p.id).slice(1);
  const info = (
    <View style={{ gap: space[8] }}>
      <View style={{ gap: space[1] }}>
        <Text variant="display" accessibilityRole="header">{p.word}</Text>
        <Text variant="body" mute>{p.ar}</Text>
      </View>
      {fields}
      {p.tiers ? (
        <View accessibilityRole="radiogroup">
          {p.tiers.map((t) => (
            <Choice key={t.id} title={t.ar} note={t.note} selected={personal.tier === t.id} onPress={() => personal.setTier(t.id)}
              end={<Price amount={live?.price[t.sku] ?? t.price} mute={personal.tier !== t.id} />} />
          ))}
        </View>
      ) : null}
      <Text variant="body">{p.story}</Text>
      <View>
        {p.spec.map((row) => {
          const [k, v] = row.split('|');
          return (
            <View key={k} style={styles.spec}>
              <Text variant="caption" mute style={{ width: 92 }}>{k}</Text>
              <Text variant="caption" style={{ flex: 1 }}>{v}</Text>
            </View>
          );
        })}
      </View>
      {gallery.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingHorizontal: gutter, gap: space[3] }}>
          {gallery.map((src, i) => (
            <View key={i} style={{ width: 260, gap: space[2] }}>
              <Image source={src} style={styles.shot} contentFit="cover" transition={200} />
              {captions[p.id]?.[i] ? <Text variant="caption" mute>{captions[p.id]![i]}</Text> : null}
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View>
        <Price amount={price} large />
        <Text variant="caption" mute>شامل الضريبة</Text>
      </View>
      <Button label={soldOut ? 'نفدت' : added ? 'في السلة' : 'أضف'} disabled={soldOut} haptic={false} onPress={onAdd} style={{ flex: 1, maxWidth: 280 }} />
    </View>
  );

  if (isTwoPane || posture === 'tabletop') {
    const tabletop = posture === 'tabletop';
    return (
      <Screen scroll={false} edges={['left', 'right', 'top']} maxWidth={1120} footer={tabletop ? undefined : undefined}>
        <View style={[{ flex: 1, gap: space[8] }, tabletop ? { flexDirection: 'column' } : { flexDirection: 'row', paddingTop: space[4] }]}>
          <View style={{ flex: 1, paddingBottom: tabletop ? 0 : insets.bottom + space[4] }}>{stage}</View>
          <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space[8], paddingTop: space[2] }}>
              {info}
            </ScrollView>
            <View style={{ paddingBottom: insets.bottom + space[3], paddingTop: space[3], borderTopWidth: 1, borderTopColor: color.line }}>{footer}</View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']} footer={footer}>
      <View style={{ height: Math.min(height * 0.5, 440), marginHorizontal: -gutter, marginBottom: space[6] }}>{stage}</View>
      {info}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', backgroundColor: color.paper },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space[2], paddingTop: space[3], paddingHorizontal: gutter },
  spec: { flexDirection: 'row', gap: space[3], paddingVertical: space[3], borderTopWidth: 1, borderTopColor: color.line },
  shot: { width: 260, height: 195, borderRadius: radius.small, backgroundColor: color.stock },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[5] },
});
