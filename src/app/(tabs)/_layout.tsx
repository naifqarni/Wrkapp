/**
 * The tab bar is the system's own, on purpose:
 * - iOS 26 and later: the floating Liquid Glass bar. It shrinks while you scroll down, and on a wide
 *   window (iPad, iPhone Duo open in landscape) the system may move it to the top or the side rail.
 * - Android: the Material 3 navigation bar with the pill indicator and predictive back.
 * - Web: expo-router draws its own pill; `WEB_BAR` below moves it to the bottom, puts it in RTL order
 *   and gives it the brand surface, so the preview matches the phone.
 * No custom JS bar: an imitation cannot follow the Duo rail, Dynamic Type or the system's own animations.
 */
import { NativeTabs } from "expo-router/native-tabs";
import { Platform } from "react-native";

import { config } from "@/config";
import { ar } from "@/i18n/ar";
import { color, font } from "@/theme";
import { haptic } from "@/ui/haptics";

const android = Platform.OS === "android";

const WEB_BAR = `
div[dir="ltr"][data-orientation="horizontal"]{direction:rtl;background:${color.paper}}
[role="tabpanel"][data-state="active"]{box-sizing:border-box;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 78px)}
[role="tablist"][aria-label="Main"]{top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)!important;direction:rtl;
  height:54px!important;padding:5px!important;gap:4px;background:${color.stock}!important;border:1px solid ${color.line};
  box-shadow:0 8px 24px -10px rgba(17,17,18,.28)}
[role="tablist"][aria-label="Main"] [role="tab"]{padding:0 22px!important;border-radius:999px!important;outline-color:${color.ink}!important}
[role="tablist"][aria-label="Main"] [role="tab"][data-state="active"]{background:${color.paper}!important}
[role="tablist"][aria-label="Main"] [role="tab"] span{font-family:${font.body},system-ui,sans-serif!important;font-size:13px!important;font-weight:300!important;color:${color.mute}!important}
[role="tablist"][aria-label="Main"] [role="tab"][data-state="active"] span{font-family:${font.bodyMedium},system-ui,sans-serif!important;color:${color.ink}!important}
`;

export default function TabsLayout() {
  return (
    <>
      {Platform.OS === "web" ? <style>{WEB_BAR}</style> : null}
      <NativeTabs
        tintColor={color.ink}
        iconColor={{ default: color.mute, selected: color.ink }}
        labelStyle={{
          default: { fontFamily: font.body, fontSize: 11, color: color.mute },
          selected: {
            fontFamily: font.bodyMedium,
            fontSize: 11,
            color: color.ink,
          },
        }}
        // iOS: leave the background to the system so Liquid Glass shows the paper through it.
        backgroundColor={android ? color.stock : undefined}
        indicatorColor={android ? color.line : undefined}
        rippleColor={android ? color.pressOnPaper : undefined}
        labelVisibilityMode={android ? "labeled" : undefined}
        minimizeBehavior="onScrollDown"
        preferredPlacement="automatic"
        sidebarAdaptable
        screenListeners={{ tabPress: () => haptic.select() }}
      >
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{ar.tabs.store}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "shippingbox", selected: "shippingbox.fill" }}
            md="inventory_2"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="community" hidden={!config.communityEnabled}>
          <NativeTabs.Trigger.Label>
            {ar.tabs.community}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{
              default: "bubble.left.and.bubble.right",
              selected: "bubble.left.and.bubble.right.fill",
            }}
            md="forum"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Label>{ar.tabs.account}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: "person", selected: "person.fill" }}
            md="person"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    </>
  );
}
