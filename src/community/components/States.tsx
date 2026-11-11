import React from 'react';
import { View } from 'react-native';

import { community as s } from '@/i18n/community';

import { Bone, Button, Hairline, space, T, useShort } from '../ui/kit';

export function PostSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View accessibilityLabel="…" style={{ opacity: 0.9 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>
          <View style={{ padding: space.gutter, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Bone w={20} h={32} />
              <View style={{ gap: 8 }}>
                <Bone w={110} />
                <Bone w={70} h={9} />
              </View>
            </View>
            <Bone w="94%" />
            <Bone w="78%" />
            <Bone w={i % 2 ? '40%' : '62%'} />
          </View>
          <Hairline />
        </View>
      ))}
    </View>
  );
}

export function Notice({ title, body, action, onAction, testID }: { title: string; body?: string; action?: string; onAction?: () => void; testID?: string }) {
  const short = useShort();
  return (
    <View testID={testID} style={{ paddingHorizontal: space.xl, paddingVertical: short ? 22 : 56, alignItems: 'center', gap: 8 }}>
      <T v="title" center>{title}</T>
      {body ? <T mute center style={{ maxWidth: 320 }}>{body}</T> : null}
      {action ? <Button label={action} onPress={onAction} variant="ghost" style={{ marginTop: 14 }} testID={testID ? `${testID}-action` : undefined} /> : null}
    </View>
  );
}

export function LoadError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return <Notice title={text} action={s.feed.retry} onAction={onRetry} testID="load-error" />;
}
