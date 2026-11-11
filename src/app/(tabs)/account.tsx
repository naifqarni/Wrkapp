/** Account: orders from this device, where to deliver, and the quiet rows every app needs. */
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { CommunityAccountSection } from '@/community/AccountSection';
import { config } from '@/config';
import { fmtDate, piecesLabel, statusLabel } from '@/store/format';
import { Section, useCartHeader } from '@/store/parts';
import { useOrders, useProfile } from '@/store/state';
import { space } from '@/theme';
import { Header, ListRow, Num, Screen, Text } from '@/ui';

export default function AccountScreen() {
  const router = useRouter();
  const orders = useOrders((s) => s.orders).filter((o) => o.status !== 'pending-payment');
  const profile = useProfile();
  const header = useCartHeader();
  const address = [profile.city, profile.district, profile.street].filter(Boolean).join('، ');

  return (
    <Screen header={<Header title="حسابي" trailing={undefined} />} edges={['left', 'right']}>
      <View style={{ paddingBottom: space[16] }}>
        <Section title="طلباتي" gap={0}>
          {orders.length === 0 ? <Text variant="body" mute style={{ paddingVertical: space[3] }}>لا طلبات بعد.</Text> : orders.map((o) => (
            <ListRow key={o.id} padded={false} chevron title={statusLabel[o.status]} subtitle={`${piecesLabel(o.itemCount)} · ${fmtDate(o.createdAt)}`}
              trailing={<Num>{`#${o.number}`}</Num>} onPress={() => router.push({ pathname: '/order/[id]', params: { id: o.id } })} />
          ))}
        </Section>

        <Section title="التوصيل" gap={0}>
          <ListRow padded={false} chevron title={profile.fullName || 'العنوان'} subtitle={address || 'أضف عنوان التوصيل'} onPress={() => router.push('/account/address')} />
          {header.cartCount > 0 ? <ListRow padded={false} chevron title="السلة" trailing={<Num>{String(header.cartCount)}</Num>} onPress={header.onPressCart} /> : null}
        </Section>

        {config.communityEnabled ? <CommunityAccountSection /> : null}

        <Section title="wrk." gap={0}>
          <ListRow padded={false} chevron title="للشركات" subtitle="طقم لكل موظف جديد" onPress={() => { WebBrowser.openBrowserAsync('https://shop.ranlab.dev/business').catch(() => {}); }} />
          <ListRow padded={false} chevron title="تواصل معنا" subtitle={config.supportEmail} onPress={() => { WebBrowser.openBrowserAsync(`mailto:${config.supportEmail}`).catch(() => {}); }} />
          <ListRow padded={false} chevron title="الخصوصية" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
          <ListRow padded={false} chevron title="الشروط والاسترجاع" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
        </Section>

        <Num style={{ marginTop: space[8] }} mute>{`wrk. ${Constants.expoConfig?.version ?? ''}`}</Num>
      </View>
    </Screen>
  );
}
