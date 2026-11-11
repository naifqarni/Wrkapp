/** The cart: what is inside, whose name is on it, one total, one button. */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { shippingFor } from '@/store/checkout';
import { products, thumb } from '@/store/catalogue';
import { personalNote } from '@/store/format';
import { cartTotal, useCart } from '@/store/state';
import { color, radius, space } from '@/theme';
import { Button, EmptyState, Press, Price, Screen, Stepper, Text } from '@/ui';

export default function CartScreen() {
  const router = useRouter();
  const lines = useCart((c) => c.lines);
  const setQty = useCart((c) => c.setQty);
  const remove = useCart((c) => c.remove);
  const subtotal = cartTotal(lines);
  const ship = shippingFor(subtotal);

  if (lines.length === 0) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState title="السلة فارغة." action={{ label: 'القطع', onPress: () => (router.canGoBack() ? router.back() : router.replace('/store')) }} style={{ marginTop: space[16] }} />
      </Screen>
    );
  }

  const footer = (
    <View style={{ gap: space[3] }}>
      <View style={styles.sum}>
        <Text variant="caption" mute>التوصيل داخل المملكة</Text>
        {ship === 0 ? <Text variant="caption" mute>مشمول</Text> : <Price amount={ship} mute />}
      </View>
      <View style={styles.sum}>
        <View>
          <Text variant="body">المجموع</Text>
          <Text variant="caption" mute>شامل الضريبة</Text>
        </View>
        <Price amount={subtotal + ship} large />
      </View>
      <Button label="ادفع" full haptic="tap" onPress={() => router.push('/checkout')} />
    </View>
  );

  return (
    <Screen edges={['left', 'right']} footer={footer}>
      <View style={{ paddingTop: space[2] }}>
        {lines.map((l, i) => {
          const p = products[l.id];
          const tier = l.tier && p.tiers ? p.tiers.find((t) => t.id === l.tier) : undefined;
          const note = personalNote(p, l.personal);
          return (
            <View key={l.key} style={[styles.line, i > 0 && styles.lineTop]}>
              <Image source={thumb(l.id)} style={styles.photo} contentFit="cover" />
              <View style={{ flex: 1, gap: space[1] }}>
                <View style={styles.sum}>
                  <Text variant="headline" style={{ flex: 1 }}>{p.word}</Text>
                  <Price amount={l.price * l.qty} />
                </View>
                <Text variant="caption" mute>{tier ? `${p.ar} · ${tier.ar}` : p.ar}</Text>
                {note ? <Text variant="caption">{note}</Text> : null}
                <View style={[styles.sum, { marginTop: space[2] }]}>
                  <Stepper value={l.qty} onChange={(n) => setQty(l.key, n)} />
                  <Press onPress={() => remove(l.key)} haptic="tap" accessibilityRole="button" accessibilityLabel={`احذف ${p.word}`} hitSlop={10}>
                    <Text variant="caption" mute style={{ textDecorationLine: 'underline' }}>احذف</Text>
                  </Press>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', gap: space[4], paddingVertical: space[5] },
  lineTop: { borderTopWidth: 1, borderTopColor: color.line },
  photo: { width: 92, height: 69, borderRadius: radius.small, backgroundColor: color.stock },
  sum: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
});
