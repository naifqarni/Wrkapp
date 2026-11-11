import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Page } from '@/community/components/Page';
import { PostThread } from '@/community/screens/PostThread';
import { community as s } from '@/i18n/community';

export default function PostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <Page title={s.post.title}>
      <PostThread postId={String(id)} onGone={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Page>
  );
}
