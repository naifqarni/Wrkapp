/**
 * A member's invite codes. Each one lets one person in. A used code stays on the list, struck
 * through, so the member can see what is left.
 */
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { Share, View } from 'react-native';

import { community as s } from '@/i18n/community';
import { ltr } from '@/layout';

import { hasInvites, listMyInvites, type Invite } from '../api/access';
import { useMe } from '../state/session';
import { Bone, Button, color, Hairline, haptic, Num, space, T, toast } from '../ui/kit';

export function InviteList() {
  const me = useMe();
  const q = useQuery({ queryKey: ['community', 'invites'], enabled: !!me && hasInvites(), queryFn: listMyInvites });
  if (!hasInvites() || q.isError) return null;
  const rows = q.data ?? [];
  if (q.isSuccess && !rows.length) return null;

  const copy = async (i: Invite) => {
    await Clipboard.setStringAsync(i.code);
    haptic.setDown();
    toast(s.invites.copied);
  };
  const share = async (i: Invite) => {
    try {
      await Share.share({ message: `${s.invites.shareText} ${ltr(i.code)}` });
    } catch {
      // No share sheet on this platform: the code on the clipboard is the next best thing.
      copy(i);
    }
  };

  return (
    <View testID="invites">
      <View style={{ paddingHorizontal: space.gutter, paddingBottom: 10, gap: 2 }}>
        <T v="label">{s.invites.title}</T>
        <T v="caption" mute>{s.invites.body}</T>
      </View>
      <Hairline />
      {q.isLoading
        ? [0, 1, 2].map((i) => (
            <View key={i} style={{ height: 58, justifyContent: 'center', paddingHorizontal: space.gutter }}>
              <Bone w={150} h={14} />
            </View>
          ))
        : rows.map((i, n) => {
            const used = !!i.usedAt;
            return (
              <View key={i.code}>
                {n ? <Hairline inset={space.gutter} /> : null}
                <View testID={`invite-${n}`} style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, paddingStart: space.gutter, paddingEnd: 10 }}>
                  <View style={{ flex: 1 }}>
                    <T selectable={!used} style={{ color: used ? color.faint : color.ink, textDecorationLine: used ? 'line-through' : 'none' }}>
                      <Num style={{ fontSize: 19, letterSpacing: 1.5 }}>{i.code}</Num>
                    </T>
                  </View>
                  {used ? (
                    <T v="caption" mute style={{ paddingEnd: 8 }}>{s.invites.used}</T>
                  ) : (
                    <>
                      <Button testID={`invite-copy-${n}`} small variant="quiet" label={s.invites.copy} onPress={() => copy(i)} />
                      <Button testID={`invite-share-${n}`} small variant="ghost" label={s.invites.share} onPress={() => share(i)} />
                    </>
                  )}
                </View>
              </View>
            );
          })}
      <View style={{ height: 28 }} />
    </View>
  );
}
