import React from 'react';

import { community as s } from '@/i18n/community';

import { Page } from '../components/Page';
import { PostListView } from '../components/PostListView';
import { useSavedPosts } from '../state/hooks';

export function SavedScreen() {
  const q = useSavedPosts();
  return (
    <Page title={s.profile.saved}>
      <PostListView testID="saved" query={q} empty={s.profile.savedEmpty} />
    </Page>
  );
}
