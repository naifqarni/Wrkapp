/**
 * Design-system gallery: every primitive on one screen, plus a two-pane demo.
 * Open /dev/ui. Add ?fold=v (vertical fold), ?fold=h (tabletop) or ?pane=1 to simulate.
 * Development only; nothing links here.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LayoutProvider, TabletopSplit, TwoPane, useLayoutClass, type LayoutSimulation } from '@/layout';
import { clearOrderSurfaces, syncOrderSurfaces, type OrderStatus } from '@/native';
import { color, space } from '@/theme';
import {
  Avatar,
  Button,
  ChipRow,
  EmptyState,
  Field,
  Hairline,
  Header,
  IconButton,
  ListRow,
  Num,
  OrderProgress,
  Price,
  Screen,
  Segmented,
  Sheet,
  Skeleton,
  Stepper,
  Text,
  ToastProvider,
  useToast,
} from '@/ui';

const CHANNELS = [
  { id: 'all', label: 'الكل' },
  { id: 'company', label: 'شركتي' },
  { id: 'first-day', label: 'أول يوم' },
  { id: 'salaries', label: 'رواتب' },
  { id: 'interviews', label: 'مقابلات' },
  { id: 'advice', label: 'نصيحة' },
] as const;

const TIERS = [
  { id: 'ess', label: 'الأساسي' },
  { id: 'sig', label: 'المميّز' },
  { id: 'pre', label: 'الفاخر' },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: space[8], gap: space[4] }}>
      <Text variant="caption" mute>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Gallery() {
  const toast = useToast();
  const layout = useLayoutClass();
  const [cart, setCart] = React.useState(0);
  const [name, setName] = React.useState('نايف');
  const [channel, setChannel] = React.useState<(typeof CHANNELS)[number]['id']>('all');
  const [tier, setTier] = React.useState<(typeof TIERS)[number]['id']>('sig');
  const [qty, setQty] = React.useState(1);
  const [sheet, setSheet] = React.useState(false);
  const [order, setOrder] = React.useState<OrderStatus>('personalising');

  return (
    <Screen
      header={
        <Header
          cartCount={cart}
          onPressCart={() => toast.show('السلة')}
          trailing={<IconButton icon="search" label="بحث" />}
        />
      }
      footer={
        <Button
          full
          size="lg"
          label="أضف للسلة"
          trailing={<Price amount={399} tone="onBlack" />}
          haptic="setDown"
          onPress={() => {
            setCart((c) => c + 1);
            toast.show('أضيف للسلة', { action: { label: 'تراجع', onPress: () => setCart((c) => Math.max(0, c - 1)) } });
          }}
        />
      }>
      <Text variant="display" style={{ marginTop: space[4] }}>
        أول يوم
      </Text>
      <Text mute>الطقم. كل ما يحتاجه أول يوم عمل، باسمك.</Text>
      <Num mute style={{ marginTop: space[2] }}>
        {`340 × 150 × 38 mm  ·  ${layout.widthClass}  ${Math.round(layout.width)}pt  ${layout.posture}`}
      </Num>

      <Section title="الاسم">
        <Field label="باسمك" value={name} onChangeText={setName} placeholder="اكتب اسمك" hint="يظهر على كل قطعة." />
        <Field label="البريد" ltr size="body" placeholder="name@company.com" keyboardType="email-address" error="استخدم بريد العمل." />
      </Section>

      <Section title="الأزرار">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], alignItems: 'center' }}>
          <Button label="ادفع" />
          <Button label="تابع" variant="ghost" />
          <Button label="لاحقاً" variant="quiet" />
          <Button label="احذف" variant="danger" />
          <Button label="انشر" size="sm" icon="send" />
          <Button label="جارٍ" loading />
          <IconButton icon="heart" label="إعجاب" />
          <IconButton icon="plus" label="جديد" variant="filled" />
          <IconButton icon="close" label="إغلاق" variant="glass" />
        </View>
      </Section>

      <Section title="الاختيار">
        <Segmented items={TIERS} value={tier} onChange={setTier} />
        <ChipRow items={CHANNELS} value={channel} onChange={setChannel} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stepper value={qty} onChange={setQty} />
          <Price amount={399 * qty} large />
        </View>
      </Section>

      <Section title="الطلب">
        <OrderProgress status={order} />
        <OrderProgress status={order} detailed />
        {/* On a device this drives the Live Activity, Dynamic Island, widget and Android notification. */}
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <Button
            size="sm"
            variant="ghost"
            label="الخطوة التالية"
            onPress={() => {
              const flow: OrderStatus[] = ['paid', 'personalising', 'shipped', 'out-for-delivery', 'delivered'];
              const next = flow[(flow.indexOf(order) + 1) % flow.length] ?? 'paid';
              setOrder(next);
              void syncOrderSurfaces({
                id: 'demo',
                number: '1042',
                status: next,
                updatedAt: new Date().toISOString(),
                etaDate: new Date(Date.now() + 86_400_000).toISOString(),
                itemCount: 3,
                total: 399,
              });
            }}
          />
          <Button size="sm" variant="quiet" label="أوقف التتبع" onPress={() => void clearOrderSurfaces()} />
        </View>
      </Section>

      <Section title="القوائم">
        <View style={{ marginHorizontal: -space[4] }}>
          <ListRow leading={<Avatar name="quiet-falcon" />} title="quiet-falcon" subtitle="قطاع البنوك · قبل ساعتين" onPress={() => {}} />
          <ListRow leading={<Avatar name="نجم" filled />} title="طلباتي" trailing={<Num mute>3</Num>} onPress={() => {}} chevron />
          <ListRow title="افتح نافذة" onPress={() => setSheet(true)} />
          <ListRow title="احذف حسابي" destructive onPress={() => {}} chevron={false} divider={false} />
        </View>
      </Section>

      <Section title="التحميل">
        <Skeleton width="60%" height={18} />
        <Skeleton />
        <Skeleton width="85%" />
      </Section>

      <Hairline style={{ marginTop: space[8] }} />
      <EmptyState title="لا منشورات بعد" body="كن أول من يكتب." action={{ label: 'اكتب', onPress: () => setSheet(true) }} style={{ paddingVertical: space[10] }} />

      <Sheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="بلاغ"
        footer={<Button full label="أرسل" onPress={() => setSheet(false)} haptic="success" />}>
        <ListRow padded={false} title="إساءة" onPress={() => {}} chevron={false} />
        <ListRow padded={false} title="تشهير" onPress={() => {}} chevron={false} />
        <ListRow padded={false} title="معلومات خاصة" onPress={() => {}} chevron={false} divider={false} />
      </Sheet>
    </Screen>
  );
}

function PaneDemo() {
  const [selected, setSelected] = React.useState<string | null>(null);
  const posts = ['أول يوم في البنك', 'كم راتب محلل بيانات؟', 'سؤال مقابلة غريب', 'نصيحة لمدير جديد', 'ثقافة الاجتماعات'];
  return (
    <TwoPane
      list={
        <Screen padded={false} header={<Header title="المجتمع" trailing={<IconButton icon="pencil" label="اكتب" />} />}>
          {posts.map((p) => (
            <ListRow key={p} leading={<Avatar name={p} />} title={p} subtitle="قطاع التقنية · اليوم" onPress={() => setSelected(p)} />
          ))}
        </Screen>
      }
      detail={
        selected ? (
          <Screen header={<Header title={selected} onBack={() => setSelected(null)} />}>
            <Text style={{ marginTop: space[4] }}>
              وصلت مبكراً، وجدت على المكتب صندوقاً أسود صغيراً عليه اسمي. لم أتوقع أن يهتم أحد بهذه التفاصيل.
            </Text>
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[6] }}>
              <IconButton icon="heart" label="إعجاب" />
              <IconButton icon="comment" label="تعليق" />
              <IconButton icon="flag" label="بلاغ" />
            </View>
          </Screen>
        ) : null
      }
      empty={<EmptyState title="اختر منشوراً" />}
    />
  );
}

function TabletopDemo() {
  return (
    <TabletopSplit
      stage={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper }}>
          <View style={{ width: 220, height: 97, borderRadius: 6, backgroundColor: color.black, boxShadow: '14px 22px 34px -16px rgba(17,17,18,0.42)' }} />
        </View>
      }
      controls={
        <Screen edges={['bottom', 'left', 'right']} footer={<Button full label="أضف للسلة" />}>
          <Field label="باسمك" defaultValue="نايف" />
        </Screen>
      }
    />
  );
}

export default function DevUi() {
  const params = useLocalSearchParams<{ fold?: string; pane?: string; w?: string; h?: string }>();
  const { width, height } = useLayoutClass();
  // Development builds only. A release build sends anyone who lands here back to the app.
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_GALLERY !== '1') return <Redirect href="/" />;
  let simulate: LayoutSimulation | null = null;
  if (params.fold === 'v') {
    simulate = {
      hinge: { angle: 180, status: 'fullyOpen' },
      fold: { x: Math.round(width / 2) - 1, y: 0, width: 2, height, occludes: false, orientation: 'vertical' },
    };
  } else if (params.fold === 'h') {
    simulate = {
      hinge: { angle: 100, status: 'partiallyOpen' },
      fold: { x: 0, y: Math.round(height / 2) - 12, width, height: 24, occludes: true, orientation: 'horizontal' },
    };
  }
  return (
    <SafeAreaProvider>
      <LayoutProvider simulate={simulate}>
        <ToastProvider>{params.fold === 'h' ? <TabletopDemo /> : params.pane || params.fold === 'v' ? <PaneDemo /> : <Gallery />}</ToastProvider>
      </LayoutProvider>
    </SafeAreaProvider>
  );
}
