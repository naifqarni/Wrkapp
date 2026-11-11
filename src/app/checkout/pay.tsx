/** 3-D Secure: the bank's page inside the app. When Moyasar redirects to the callback, we close it and finish. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { finishPaid, markFailed } from '@/store/checkout';
import { parseCallback } from '@/store/moyasar';
import { WV } from '@/store/webview';
import { color, space } from '@/theme';
import { Button, Header, Screen, Text, haptic } from '@/ui';

export default function PayScreen() {
  const { url, orderId, callback } = useLocalSearchParams<{ url: string; orderId: string; callback: string }>();
  const router = useRouter();
  const handled = useRef(false);
  const [state, setState] = useState<'bank' | 'confirming' | 'failed'>('bank');
  const [message, setMessage] = useState('');

  const onUrl = (next: string): boolean => {
    const r = callback ? parseCallback(next, callback) : null;
    if (!r) return true;
    if (handled.current) return false;
    handled.current = true;
    if (!r.paid) {
      markFailed(orderId);
      haptic.error();
      setMessage('لم تُقبل العملية.');
      setState('failed');
      return false;
    }
    setState('confirming');
    finishPaid(orderId, r.paymentId)
      .then(() => {
        haptic.success();
        router.dismissTo('/store');
        router.push({ pathname: '/order/[id]', params: { id: orderId, fresh: '1' } });
      })
      .catch(() => {
        // Paid at the bank but the shop did not answer: keep the order, show it as paid, the shop reconciles by payment id.
        setMessage('تم الدفع. تعذّر تحديث الطلب الآن، وسنحدّثه تلقائياً.');
        setState('failed');
      });
    return false;
  };

  return (
    <Screen scroll={false} padded={false} header={<Header title="التحقق من البنك" onBack={() => router.back()} backLabel="إلغاء" divider />} edges={['left', 'right', 'bottom']}>
      {state === 'bank' && url ? (
        <WV
          source={{ uri: url }}
          onShouldStartLoadWithRequest={(req) => onUrl(req.url)}
          onNavigationStateChange={(nav) => { onUrl(nav.url); }}
          startInLoadingState
          renderLoading={() => <View style={styles.center}><ActivityIndicator color={color.ink} /></View>}
          style={{ flex: 1, backgroundColor: color.paper }}
        />
      ) : state === 'confirming' ? (
        <View style={styles.center}><ActivityIndicator color={color.ink} /></View>
      ) : (
        <View style={[styles.center, { padding: space[6], gap: space[5] }]}>
          <Text variant="body" center>{message || 'تعذّر فتح صفحة البنك.'}</Text>
          <Button label="رجوع" variant="ghost" onPress={() => router.back()} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ center: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: color.paper } });
