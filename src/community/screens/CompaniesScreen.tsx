/**
 * الشركات: every employer on wrk., searchable. Yours comes first. On a wide screen the company
 * opens beside the list.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';
import { TwoPane, useLayoutClass } from '@/layout';

import { can, type Company } from '../api/features';
import { CompanyTile } from '../components/CompanyTile';
import { MemberGate } from '../components/MemberGate';
import { LoadError, Notice } from '../components/States';
import { useCommunityBoot, useCompanies } from '../state/hooks';
import { useSession } from '../state/session';
import { Bone, color, Field, Hairline, Icon, Num, space, T, ToastLayer, useShort } from '../ui/kit';
import { CompanyView } from './CompanyView';

export function CompaniesScreen() {
  useCommunityBoot();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTwoPane } = useLayoutClass();
  const short = useShort();
  const { me, ready } = useSession();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(text), 220);
    return () => clearTimeout(t);
  }, [text]);
  const q = useCompanies(term);
  const rows = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (isTwoPane && rows.length && !rows.some((c) => c.id === selected)) setSelected(rows[0].id);
  }, [isTwoPane, rows, selected]);

  if (ready && !me) {
    return (
      <View style={{ flex: 1, backgroundColor: color.paper }}>
        <MemberGate />
      </View>
    );
  }

  const open = (c: Company) => (isTwoPane ? setSelected(c.id) : router.push({ pathname: '/community/company/[id]', params: { id: c.id } }));

  const list = (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <View style={[{ paddingTop: insets.top + 6, paddingHorizontal: space.gutter, paddingBottom: 12 }, short && { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 8 }]}>
        <T v="display" accessibilityRole="header" style={short ? { fontSize: 22, lineHeight: 36 } : { fontSize: 26, lineHeight: 40, minHeight: 52 }}>{s.companies.tab}</T>
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, short && { flex: 1 }]}>
          <Icon name="search" size={20} tint={color.mute} />
          <View style={{ flex: 1 }}>
            <Field testID="company-search" accessibilityLabel={s.companies.search} value={text} onChangeText={setText} placeholder={s.companies.search} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" style={{ fontSize: 17, minHeight: 42 }} />
          </View>
        </View>
      </View>
      {!can.companies() ? (
        <Notice title={s.companies.none} />
      ) : q.isLoading || !ready ? (
        <View style={{ padding: space.gutter, gap: 22 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Bone w={44} h={44} style={{ borderRadius: 12 }} />
              <View style={{ gap: 8 }}>
                <Bone w={140} />
                <Bone w={80} h={9} />
              </View>
            </View>
          ))}
        </View>
      ) : q.isError && !rows.length ? (
        <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="companies"
          data={rows}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ItemSeparatorComponent={() => <Hairline inset={space.gutter + 56} />}
          ListEmptyComponent={<Notice testID="companies-empty" title={s.companies.none} />}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            q.isFetchingNextPage ? (
              <ActivityIndicator color={color.mute} style={{ marginVertical: 24 }} />
            ) : rows.length ? (
              <T v="caption" mute center style={{ marginVertical: 26, paddingHorizontal: space.gutter }}>{s.companies.iconNote}</T>
            ) : undefined
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Pressable
              testID={`company-${item.id}`}
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [
                { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.gutter, paddingVertical: 12 },
                (pressed || (isTwoPane && item.id === selected)) && { backgroundColor: color.stock },
              ]}>
              <CompanyTile name={item.name} iconUrl={item.iconUrl} />
              <View style={{ flex: 1 }}>
                <T v="label" numberOfLines={1}>{item.name}</T>
                <T v="caption" mute numberOfLines={1}>
                  {item.mine ? `${s.companies.yours} · ` : ''}
                  {item.sector ? `${item.sector} · ` : ''}
                  {item.memberCount ? (
                    <>
                      <Num>{item.memberCount}</Num> {s.companies.members}
                    </>
                  ) : (
                    s.companies.noMembers
                  )}
                </T>
              </View>
              <Icon name="chevron" size={18} tint={color.faint} />
            </Pressable>
          )}
        />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <TwoPane
        list={list}
        detail={isTwoPane && selected ? <View style={{ flex: 1, paddingTop: insets.top }} testID="company-pane"><CompanyView key={selected} id={selected} /></View> : null}
        empty={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <T mute>{s.companies.pick}</T>
          </View>
        }
      />
      <ToastLayer />
    </View>
  );
}
