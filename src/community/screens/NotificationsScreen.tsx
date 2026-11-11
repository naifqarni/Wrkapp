import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { community as s } from '@/i18n/community';

import type { AppNotification } from '../api/types';
import { Page } from '../components/Page';
import { LoadError, Notice } from '../components/States';
import { useMarkNotificationsRead, useNotifications } from '../state/hooks';
import { Ago } from '../time';
import { Button, color, Hairline, space, T } from '../ui/kit';

/** In-app list of what happened to things you wrote. Quiet: no counts, no streaks. */
export function NotificationsScreen() {
  const router = useRouter();
  const q = useNotifications();
  const mark = useMarkNotificationsRead();
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const anyUnread = items.some((n) => !n.read);

  const open = (n: AppNotification) => {
    if (!n.read) mark.mutate([n.id]);
    if (n.postId && n.type !== 'removed') router.push({ pathname: '/community/post/[id]', params: { id: n.postId } });
    else if (n.type === 'removed') router.push('/community/rules');
  };

  return (
    <Page title={s.notifications.title}>
      {q.isError ? (
        <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="notifications"
          data={items}
          keyExtractor={(n) => n.id}
          ItemSeparatorComponent={() => <Hairline inset={space.gutter + 22} />}
          ListEmptyComponent={q.isLoading ? undefined : <Notice testID="notifications-empty" title={s.notifications.empty} />}
          ListHeaderComponent={
            anyUnread ? (
              <View style={{ alignItems: 'flex-end', paddingHorizontal: space.gutter, paddingTop: 8 }}>
                <Button testID="mark-all" small variant="quiet" label={s.notifications.markAll} onPress={() => mark.mutate(undefined)} />
              </View>
            ) : undefined
          }
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          renderItem={({ item }) => (
            <Pressable
              testID={`notification-${item.id}`}
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space.gutter, paddingVertical: 16 }, pressed && { backgroundColor: color.stock }]}>
              {/* unread = the filled dot */}
              <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: item.read ? color.faint : color.ink, backgroundColor: item.read ? 'transparent' : color.ink }} />
              <View style={{ flex: 1 }}>
                <T v={item.read ? 'body' : 'bodyStrong'} mute={item.read}>{s.notifications[item.type]}</T>
              </View>
              <T v="caption" mute>
                <Ago iso={item.createdAt} />
              </T>
            </Pressable>
          )}
        />
      )}
    </Page>
  );
}
