/** Web only: Moyasar lands here after 3-D Secure with ?order=..&id=..&status=.. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { finishPaid, markFailed } from '@/store/checkout';
import { useOrders } from '@/store/state';
import { color, space } from '@/theme';
import { Button, Screen, Text } from '@/ui';

export default function ReturnScreen() {
  const { order, id, status } = useLocalSearchParams<{ order?: string; id?: string; status?: string }>();
  const router = useRouter();
  const ran = useRef(false);
  const [failed, setFailed] = useState<string | null>(null);
  const hydrated = useOrders((s) => s.orders.some((o) => o.id === order));

  useEffect(() => {
    if (ran.current || !order || !hydrated) return;
    ran.current = true;
    if (status === 'paid' && id) {
      finishPaid(order, id)
        .then(() => router.replace({ pathname: '/order/[id]', params: { id: order, fresh: '1' } }))
        .catch(() => setFailed('تم الدفع. تعذّر تحديث الطلب الآن، وسنحدّثه تلقائياً.'));
    } else {
      markFailed(order);
      setFailed('لم تُقبل العملية.');
    }
  }, [order, id, status, hydrated, router]);

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[5] }}>
        {failed ? (
          <>
            <Text variant="body" center>{failed}</Text>
            <Button label="السلة" variant="ghost" onPress={() => router.replace('/cart')} />
          </>
        ) : !order ? (
          <Button label="القطع" variant="ghost" onPress={() => router.replace('/store')} />
        ) : <ActivityIndicator color={color.ink} />}
      </View>
    </Screen>
  );
}
