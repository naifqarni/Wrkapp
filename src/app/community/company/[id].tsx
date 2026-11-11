import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { Page } from '@/community/components/Page';
import { CompanyView } from '@/community/screens/CompanyView';
import { community as s } from '@/i18n/community';

export default function CompanyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Page title={s.companies.tab}>
      <CompanyView id={String(id)} />
    </Page>
  );
}
