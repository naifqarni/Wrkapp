import { Redirect, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { community as s } from '@/i18n/community';

import { useCommunityBoot } from '../state/hooks';
import { useSession } from '../state/session';
import { color, font, size, T, Tap, ToastLayer } from '../ui/kit';

/**
 * Root of every pushed community screen: paper background, the platform's own navigation bar
 * (native stack header, so back swipe, large-screen placement and the system look come for free),
 * and the toast layer. `modal` screens get a text "close" button, because a modal has no back arrow.
 */
export function Page({
  title,
  modal,
  sheet,
  onClose,
  children,
  style,
  narrow = true,
  open,
}: {
  title: string;
  modal?: boolean;
  /** Present as a form sheet on tablets and foldables, full modal on phones. */
  sheet?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Keep content in a readable column on wide screens. */
  narrow?: boolean;
  /** Reachable without being a member (joining, the rules). Everything else sends a visitor to the door. */
  open?: boolean;
}) {
  useCommunityBoot();
  const { me, ready } = useSession();
  const router = useRouter();
  const close = onClose ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  if (!open && ready && !me) return <Redirect href="/" />;
  return (
    <View style={[{ flex: 1, backgroundColor: color.paper }, style]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: font.display, fontSize: 17, color: color.ink },
          headerStyle: { backgroundColor: color.paper },
          headerShadowVisible: false,
          headerTintColor: color.ink,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: color.paper },
          ...(modal
            ? {
                presentation: sheet && Platform.OS === 'ios' ? ('formSheet' as const) : ('modal' as const),
                headerBackVisible: false,
                headerLeft: () => (
                  <Tap testID="page-close" onPress={close} hitSlop={10} style={{ paddingHorizontal: Platform.OS === 'web' ? 16 : 4, minHeight: 36, justifyContent: 'center' }}>
                    <T v="label">{s.actions.close}</T>
                  </Tap>
                ),
              }
            : null),
        }}
      />
      <View style={[{ flex: 1 }, narrow && { width: '100%', maxWidth: size.twoPaneMin, alignSelf: 'center' }]}>{children}</View>
      <ToastLayer />
    </View>
  );
}
