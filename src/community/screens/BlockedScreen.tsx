import React from 'react';
import { FlatList, View } from 'react-native';

import { community as s } from '@/i18n/community';

import { BadgeMark } from '../components/BadgeMark';
import { Page } from '../components/Page';
import { LoadError, Notice } from '../components/States';
import { useBlocked, useUnblock } from '../state/hooks';
import { Button, Hairline, space, T } from '../ui/kit';

export function BlockedScreen() {
  const q = useBlocked();
  const unblock = useUnblock();
  return (
    <Page title={s.block.listTitle}>
      {q.isError ? (
        <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="blocked-list"
          data={q.data ?? []}
          keyExtractor={(a) => a.id}
          ItemSeparatorComponent={() => <Hairline inset={space.gutter} />}
          ListEmptyComponent={q.isLoading ? undefined : <Notice testID="blocked-empty" title={s.block.listEmpty} />}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.gutter, paddingVertical: 12 }}>
              <BadgeMark seed={item.handle} height={32} />
              <View style={{ flex: 1 }}>
                <T v="label">{item.handle}</T>
                {item.companyLabel ? <T v="caption" mute>{item.companyLabel}</T> : null}
              </View>
              <Button testID={`unblock-${item.id}`} small variant="ghost" label={s.block.unblock} onPress={() => unblock.mutate(item.id)} />
            </View>
          )}
        />
      )}
    </Page>
  );
}
