# wrk. app

iOS and Android app for wrk.: the store (المتجر), the work community (المجتمع) and the account (حسابي).
Arabic, right-to-left, light mode. Expo SDK 58, React Native 0.88, TypeScript, expo-router.

## Run it

```bash
npm install
cp .env.example .env        # optional: with an empty .env the app runs on bundled data and demo payment
npm run web                 # in the browser (quickest look)
npm run ios                 # iOS simulator or device, needs a Mac with Xcode
npm run android             # Android emulator or device, needs Android Studio
```

The app uses native modules (WebView for 3D and 3-D Secure, haptics, hinge sensor), so on a phone it needs a
development build, not Expo Go. Without a Mac: `npx eas-cli@latest build --profile development --platform ios`
(needs an Apple Developer account) or `--platform android`.

Checks: `npm run typecheck`, `npm test`, `npm run build:web`.

## What talks to what

| Part | Where | Needs |
|---|---|---|
| Catalogue | bundled in `src/store/catalogue.ts`; live prices and stock by SKU from the shop's public Store API | `EXPO_PUBLIC_WOO_BASE_URL` |
| Orders | `shop-bridge/wrk-app-bridge.php` on the shop: creates the order at the shop's prices, verifies the payment | plugin installed, `WRK_MOYASAR_SECRET` in wp-config.php |
| Payment | Moyasar REST API with the publishable key: card (mada, Visa, Mastercard) with 3-D Secure, STC Pay | `EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY` |
| 3D | `viewer-src/` (three.js + the wrk. product models) built into `src/store/viewer/viewerHtml.ts` | `npm run build:viewer` after changing models |
| Community | `src/community/` against Supabase (`backend/`), or an in-memory mock when no keys are set | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

With no payment key the checkout is in demo mode: any valid card number (for example 4111 1111 1111 1111) "pays",
a number ending 0002 is declined, and nothing is charged.

## Layout of the code

```
src/app/            routes (expo-router): (tabs)/index store, (tabs)/community, (tabs)/account, product/[id], cart, checkout, order/[id]
src/store/          catalogue, cart and personalisation state, shop client, Moyasar client, 3D viewer
src/community/      community screens, state and API client
src/ui, src/theme, src/layout   design system, tokens, foldable and large-screen layout
shop-bridge/        the WooCommerce plugin for app orders
viewer-src/         sources of the 3D viewer page
tests/              unit tests for the pure logic
```

## iOS build without a Mac

`.github/workflows/ios-unsigned.yml` builds an unsigned `wrk-unsigned.ipa` on a GitHub macOS runner (push this folder
to a GitHub repository, then run the "iOS unsigned ipa" workflow and download the artifact). Sign and install it with
Sideloadly or AltStore. That build sets `WRK_SIDELOAD=1`, which leaves out the widget and Live Activity extension
because a free Apple ID cannot sign its entitlements. For TestFlight use `npx eas-cli@latest build --platform ios`.

