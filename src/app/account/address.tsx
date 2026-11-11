import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useProfile } from '@/store/state';
import { space } from '@/theme';
import { Button, Field, Screen } from '@/ui';

export default function AddressScreen() {
  const router = useRouter();
  const p = useProfile();
  return (
    <Screen edges={['left', 'right']} footer={<Button label="تم" full onPress={() => router.back()} />}>
      <View style={{ gap: space[5], paddingTop: space[4] }}>
        <Field label="الاسم الكامل" value={p.fullName} onChangeText={(v) => p.set({ fullName: v })} autoComplete="name" maxLength={60} />
        <Field label="الجوال" ltr value={p.mobile} onChangeText={(v) => p.set({ mobile: v })} placeholder="05XXXXXXXX" keyboardType="phone-pad" autoComplete="tel" maxLength={16} />
        <Field label="المدينة" value={p.city} onChangeText={(v) => p.set({ city: v })} maxLength={40} />
        <Field label="الحي" value={p.district} onChangeText={(v) => p.set({ district: v })} maxLength={40} />
        <Field label="الشارع ورقم المبنى" value={p.street} onChangeText={(v) => p.set({ street: v })} maxLength={80} />
        <Field label="العنوان الوطني المختصر (اختياري)" ltr value={p.extra} onChangeText={(v) => p.set({ extra: v.toUpperCase() })} placeholder="RRRD2929" autoCapitalize="characters" autoCorrect={false} maxLength={8} />
      </View>
    </Screen>
  );
}
