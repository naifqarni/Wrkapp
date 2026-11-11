/** One order: its number, where it is now, and what is in it. */
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { hasWoo } from '@/config';
import { refreshOrder } from '@/store/checkout';
import { products, thumb } from '@/store/catalogue';
import { fmtDate, personalNote, statusLabel } from '@/store/format';
import { useOrders } from '@/store/state';
import { color, radius, space } from '@/theme';
import { Button, EmptyState, Num, OrderProgress, Price, Screen, Text } from '@/ui';

export default function OrderScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const order = useOrders((s) => s.orders.find((o) => o.id === id));
  useQuery({ queryKey: ['order', id], queryFn: async () => { await refreshOrder(id); return Date.now(); }, enabled: hasWoo() && !!order, refetchInterval: 60_000 });

  if (!order) {
    return <Screen><EmptyState title="لم نجد هذا الطلب." action={{ label: 'القطع', onPress: () => router.replace('/store') }} style={{ marginTop: space[16] }} /></Screen>;
  }
  const closed = order.status === 'cancelled' || order.status === 'pending-payment';

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={{ gap: space[8], paddingTop: space[4] }}>
        <View style={{ gap: space[1] }}>
          <Text variant="display" accessibilityRole="header">{fresh && !closed ? 'وصلنا طلبك.' : statusLabel[order.status]}</Text>
          <View style={styles.row}>
            <Text variant="caption" mute>الطلب</Text>
            <Num>{`#${order.number}`}</Num>
            <Text variant="caption" mute>·</Text>
            <Num>{fmtDate(order.createdAt)}</Num>
          </View>
        </View>

        {closed ? null : <OrderProgress status={order.status} detailed />}
        {order.trackingUrl ? <Button label="تتبّع الشحنة" variant="ghost" onPress={() => { WebBrowser.openBrowserAsync(order.trackingUrl!).catch(() => {}); }} /> : null}

        <View>
          {order.lines.map((l, i) => {
            const p = products[l.id];
            const note = personalNote(p, l.personal);
            return (
              <View key={l.key} style={[styles.line, i > 0 && styles.lineTop]}>
                <Image source={thumb(l.id)} style={styles.photo} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text variant="headline">{p.word}</Text>
                  <Text variant="caption" mute>{l.qty > 1 ? `${p.ar} × ${l.qty}` : p.ar}</Text>
                  {note ? <Text variant="caption">{note}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text variant="body">المجموع</Text>
          <Price amount={order.total} large />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  line: { flexDirection: 'row', gap: space[4], paddingVertical: space[4], alignItems: 'center' },
  lineTop: { borderTopWidth: 1, borderTopColor: color.line },
  photo: { width: 72, height: 54, borderRadius: radius.small, backgroundColor: color.stock },
});
