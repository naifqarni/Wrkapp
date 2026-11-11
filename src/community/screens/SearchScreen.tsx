import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { community as s } from '@/i18n/community';

import { Page } from '../components/Page';
import { PostListView } from '../components/PostListView';
import { Notice } from '../components/States';
import { useSearchPosts } from '../state/hooks';
import { Field, Hairline, space } from '../ui/kit';

export function SearchScreen() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  // Ask once the person pauses, not on every key.
  useEffect(() => {
    const t = setTimeout(() => setTerm(text), 280);
    return () => clearTimeout(t);
  }, [text]);
  const q = useSearchPosts(term);
  return (
    <Page title={s.search.title}>
      <View style={{ paddingHorizontal: space.gutter, paddingTop: 6, paddingBottom: 12 }}>
        <Field
          testID="search-input"
          accessibilityLabel={s.search.placeholder}
          value={text}
          onChangeText={setText}
          placeholder={s.search.placeholder}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={{ fontSize: 18 }}
        />
      </View>
      <Hairline />
      <PostListView testID="search-results" query={q} empty={s.search.none} idle={<Notice title={s.search.hint} />} />
    </Page>
  );
}
