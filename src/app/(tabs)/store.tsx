/** The store. Paper, the name typed once, the box, then the pieces. Nothing else. */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { fromPrice, pieces, products, sample, thumb } from '@/store/catalogue';
import { useCartHeader } from '@/store/parts';
import { usePersonal } from '@/store/state';
import type { ProductId } from '@/store/types';
import { useLive } from '@/store/useLive';
import { color, gutter, radius, space } from '@/theme';
import { Field, Header, Press, Price, Screen, Text, useLayoutClass } from '@/ui';

export default function StoreTab() {
  const router = useRouter();
  const live = useLive();
  const { isTwoPane } = useLayoutClass();
  const name = usePersonal((s) => s.name);
  const setPersonal = usePersonal((s) => s.set);
  const header = useCartHeader();
  const open = (id: ProductId) => router.push({ pathname: '/product/[id]', params: { id } });

  const intro = (
    <View style={{ gap: space[6] }}>
      <Text variant="display" accessibilityRole="header" style={styles.opener}>{'أول يوم.\nباسمك.'}</Text>
      <Field
        label="الاسم"
        value={name}
        onChangeText={(v) => setPersonal('name', v)}
        placeholder={sample.name}
        hint="اكتبه مرة، ويظهر على كل قطعة."
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={40}
      />
    </View>
  );

  const kit = (
    <Press onPress={() => open('kit')} accessibilityRole="link" accessibilityLabel={`${products.kit.word}، ${products.kit.ar}`} pressScale={0.99} style={{ gap: space[3] }}>
      <Image source={thumb('kit')} style={[styles.kitPhoto, !isTwoPane && styles.bleed]} contentFit="cover" transition={200} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{products.kit.word}</Text>
          <Text variant="caption" mute>{products.kit.sub}</Text>
        </View>
        <Price amount={fromPrice('kit', live?.price).price} />
      </View>
    </Press>
  );

  const list = (
    <View>
      {pieces.map((id, i) => {
        const p = products[id];
        return (
          <Press key={id} onPress={() => open(id)} accessibilityRole="link" accessibilityLabel={`${p.word}، ${p.ar}`} pressScale={0.99}
            style={[styles.piece, i > 0 && styles.pieceLine]}>
            <Image source={thumb(id)} style={styles.piecePhoto} contentFit="cover" transition={200} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">{p.word}</Text>
              <Text variant="caption" mute>{p.ar}</Text>
            </View>
            <Price amount={fromPrice(id, live?.price).price} />
          </Press>
        );
      })}
    </View>
  );

  return (
    <Screen header={<Header {...header} />} edges={['left', 'right']} maxWidth={isTwoPane ? 1120 : 720}>
      {isTwoPane ? (
        <View style={styles.two}>
          <View style={{ flex: 1.1, gap: space[10] }}>{intro}{kit}</View>
          <View style={{ flex: 1 }}>{list}</View>
        </View>
      ) : (
        <View style={{ gap: space[10], paddingTop: space[6], paddingBottom: space[16] }}>
          {intro}
          {kit}
          {list}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  opener: { fontSize: 40, lineHeight: 58 },
  bleed: { marginHorizontal: -gutter, borderRadius: 0 },
  kitPhoto: { aspectRatio: 4 / 3, borderRadius: radius.panel, backgroundColor: color.stock },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  two: { flexDirection: 'row', gap: space[12], paddingTop: space[8], paddingBottom: space[16], alignItems: 'flex-start' },
  piece: { flexDirection: 'row', alignItems: 'center', gap: space[4], paddingVertical: space[3] },
  pieceLine: { borderTopWidth: 1, borderTopColor: color.line },
  piecePhoto: { width: 104, height: 78, borderRadius: radius.small, backgroundColor: color.stock },
});
