import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, ThemeProvider, type NativeStackNavigationOptions } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { syncOrders } from '@/native';
import { CartMark, useCartHeader } from '@/store/parts';
import { useOrders } from '@/store/state';
import { color, useWrkFonts } from '@/theme';
import { LayoutProvider, ToastProvider, cartHeaderItem, modalRoute as modalRouteRaw, stackBase as stackBaseRaw, stackHeader as stackHeaderRaw } from '@/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Arabic first: the whole app is right-to-left on every platform.
if (Platform.OS === 'web') {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  }
} else if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, primary: color.ink, background: color.paper, card: color.paper, text: color.ink, border: color.line, notification: color.black },
};

const stackBase = stackBaseRaw as NativeStackNavigationOptions;
const stackHeader = stackHeaderRaw as NativeStackNavigationOptions;
const modalRoute = modalRouteRaw as NativeStackNavigationOptions;
const cart = () => <CartMark />;

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }));
  const fontsReady = useWrkFonts();

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady]);

  // Live Activity, widget and Android progress notification follow the orders. No-op where unsupported.
  const orders = useOrders((s) => s.orders);
  useEffect(() => { void syncOrders(orders); }, [orders]);

  // The cart in the product header. iOS gets a native item, so the system can move it into the iPhone Duo side rail.
  const cartHeader = useCartHeader();
  const cartOptions = (Platform.OS === 'ios'
    ? cartHeaderItem({ count: cartHeader.cartCount, onPress: cartHeader.onPressCart, label: cartHeader.cartLabel })
    : { headerRight: cart }) as NativeStackNavigationOptions;

  if (!fontsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.paper }}>
      <SafeAreaProvider>
        <LayoutProvider style={{ flex: 1 }}>
          <ToastProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider value={theme}>
                <StatusBar style="dark" />
                <Stack screenOptions={stackBase}>
                  <Stack.Screen name="(tabs)" />
                  {/* store (lead) */}
                  <Stack.Screen name="store" options={{ ...stackHeader, title: '', ...cartOptions }} />
                  <Stack.Screen name="product/[id]" options={{ ...stackHeader, title: '', ...cartOptions }} />
                  <Stack.Screen name="cart" options={{ ...stackHeader, title: 'السلة', presentation: 'modal' }} />
                  <Stack.Screen name="checkout/index" options={{ ...stackHeader, title: 'الدفع' }} />
                  <Stack.Screen name="checkout/pay" options={modalRoute} />
                  <Stack.Screen name="checkout/return" options={stackBase} />
                  <Stack.Screen name="order/[id]" options={{ ...stackHeader, title: '' }} />
                  <Stack.Screen name="account/address" options={{ ...stackHeader, title: 'العنوان' }} />
                  <Stack.Screen name="legal/[doc]" options={{ ...stackHeader, title: '' }} />
                </Stack>
              </ThemeProvider>
            </QueryClientProvider>
          </ToastProvider>
        </LayoutProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
