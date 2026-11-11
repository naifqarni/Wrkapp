/**
 * The community part of the account tab. Mount it anywhere inside the account screen:
 *
 *   import { CommunityAccountSection } from '@/community/AccountSection';
 *   {config.communityEnabled ? <CommunityAccountSection /> : null}
 *
 * It shows the verification state, and links to the pseudonym, the blocked list, the rules and
 * account deletion (which lives on the profile screen, one tap away, as the stores require).
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { community as s } from '@/i18n/community';

import { canAddWorkEmail } from './api/access';
import { BadgeMark } from './components/BadgeMark';
import { useBlocked, useCommunityBoot } from './state/hooks';
import { useSession } from './state/session';
import { color, Hairline, Icon, Num, Row, space, T } from './ui/kit';

const Chevron = () => <Icon name="chevron" size={18} tint={color.faint} />;

export function CommunityAccountSection({ title = s.tab }: { title?: string | null }) {
  useCommunityBoot();
  const router = useRouter();
  const { me, ready } = useSession();
  const blocked = useBlocked();
  if (!ready) return null;
  return (
    <View testID="community-account">
      {title ? <T v="caption" mute style={{ paddingHorizontal: space.gutter, paddingBottom: 8 }}>{title}</T> : null}
      <Hairline />
      {me ? (
        <>
          <Row
            testID="account-identity"
            label={me.handle}
            detail={me.companyName ? (me.showCompany ? me.companyName : s.verify.showCompanyOff) : s.profile.noCompany}
            onPress={() => router.push('/community/profile')}
            end={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BadgeMark seed={me.handle} height={30} />
                <Chevron />
              </View>
            }
          />
          {!me.companyName && canAddWorkEmail() ? (
            <>
              <Hairline inset={space.gutter} />
              <Row testID="account-add-work" label={s.profile.addWork} detail={s.profile.addWorkDetail} onPress={() => router.push({ pathname: '/community/verify', params: { mode: 'work' } })} end={<Chevron />} />
            </>
          ) : null}
          <Hairline inset={space.gutter} />
          <Row
            testID="account-blocked"
            label={s.profile.blocked}
            onPress={() => router.push('/community/blocked')}
            end={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {blocked.data?.length ? <T v="caption" mute><Num>{blocked.data.length}</Num></T> : null}
                <Chevron />
              </View>
            }
          />
          <Hairline inset={space.gutter} />
          <Row testID="account-rules" label={s.profile.rules} onPress={() => router.push('/community/rules')} end={<Chevron />} />
          <Hairline inset={space.gutter} />
          <Row testID="account-delete" label={s.profile.deleteFromAccount} danger onPress={() => router.push('/community/profile')} end={<Chevron />} />
        </>
      ) : (
        <>
          <Row testID="account-verify" label={s.profile.notVerified} detail={s.profile.notVerifiedBody} onPress={() => router.push('/')} end={<Chevron />} />
          <Hairline inset={space.gutter} />
          <Row testID="account-rules" label={s.profile.rules} onPress={() => router.push('/community/rules')} end={<Chevron />} />
        </>
      )}
      <Hairline />
    </View>
  );
}

export default CommunityAccountSection;
