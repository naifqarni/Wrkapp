/**
 * The review queue, for members with the moderator role only. Every report and every held item
 * lands here with a 24-hour clock. One decision per item: keep it, remove it, or remove it and
 * stop the author. Shown only when the backend offers the queue.
 */
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { community as s } from '@/i18n/community';

import { getCommunityApi } from '../api';
import type { ModerationAction, ModerationItem } from '../api/types';
import { Page } from '../components/Page';
import { Byline } from '../components/PostCard';
import { LoadError, Notice } from '../components/States';
import { errorText } from '../state/hooks';
import { useMe } from '../state/session';
import { Button, color, Hairline, Num, Row, Sheet, space, T, toast } from '../ui/kit';

const KEY = ['community', 'moderation'] as const;

export function ModerationScreen() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const qc = useQueryClient();
  const api = getCommunityApi();
  const allowed = me?.role === 'moderator' && typeof api.listModerationQueue === 'function';
  const q = useInfiniteQuery({
    queryKey: KEY,
    enabled: allowed,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.listModerationQueue!({ state: 'open', cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.nextCursor,
  });
  const resolve = useMutation({
    mutationFn: (v: { id: string; action: ModerationAction }) => api.resolveModerationItem!(v.id, v.action),
    onSuccess: () => {
      toast(s.moderation.done);
      qc.invalidateQueries({ queryKey: ['community'] });
    },
    onError: (e) => toast(errorText(e)),
  });
  const [picked, setPicked] = useState<ModerationItem | null>(null);
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);
  const head = q.data?.pages[0];
  const act = (action: ModerationAction) => {
    if (!picked) return;
    resolve.mutate({ id: picked.id, action });
    setPicked(null);
  };

  return (
    <Page title={s.moderation.title}>
      {!allowed ? (
        <Notice title={s.errors.forbidden} />
      ) : q.isError ? (
        <LoadError text={s.feed.loadError} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          testID="moderation"
          data={items}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={Hairline}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          ListEmptyComponent={q.isLoading ? undefined : <Notice testID="moderation-empty" title={s.moderation.empty} />}
          ListHeaderComponent={
            head && head.openCount ? (
              <View>
                <T v="caption" mute style={{ paddingHorizontal: space.gutter, paddingVertical: 12 }}>
                  <Num>{head.openCount}</Num> {s.moderation.open}
                  {head.overdueCount ? (
                    <T v="caption" danger>
                      {'  ·  '}
                      <Num>{head.overdueCount}</Num> {s.moderation.overdue}
                    </T>
                  ) : null}
                </T>
                <Hairline />
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View style={{ padding: space.gutter, gap: 10 }} testID={`mod-${item.id}`}>
              <T v="caption" danger={item.overdue} mute={!item.overdue}>
                {s.moderation.source[item.source] ?? item.source}
                {item.reportCount ? (
                  <>
                    {' · '}
                    <Num>{item.reportCount}</Num> {s.moderation.reports}
                  </>
                ) : null}
                {item.overdue ? ` · ${s.moderation.overdue}` : ''}
              </T>
              {item.author && item.content ? <Byline author={item.author} createdAt={item.content.createdAt} /> : null}
              {item.content ? <T>{item.content.body}</T> : null}
              {item.reports.map((r, i) => (
                <T key={i} v="caption" mute>
                  {s.report.reasons[r.reason] ?? r.reason}
                  {r.note ? `: ${r.note}` : ''}
                </T>
              ))}
              {item.aiNote ? <T v="caption" mute>{item.aiNote}</T> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Button testID={`mod-keep-${item.id}`} small variant="ghost" label={s.moderation.approve} onPress={() => resolve.mutate({ id: item.id, action: 'approve' })} />
                <Button testID={`mod-remove-${item.id}`} small label={s.moderation.remove} onPress={() => setPicked(item)} />
              </View>
            </View>
          )}
        />
      )}
      <Sheet visible={!!picked} onClose={() => setPicked(null)} testID="mod-sheet">
        <Row testID="mod-do-remove" label={s.moderation.remove} onPress={() => act('remove')} />
        <Hairline inset={space.gutter} />
        <Row label={s.moderation.suspend} onPress={() => act('suspend')} />
        <Hairline inset={space.gutter} />
        <Row label={s.moderation.ban} danger onPress={() => act('ban')} />
        <Hairline inset={space.gutter} />
        <Row label={s.actions.cancel} onPress={() => setPicked(null)} />
        <View style={{ height: 1, backgroundColor: color.stock }} />
      </Sheet>
    </Page>
  );
}
