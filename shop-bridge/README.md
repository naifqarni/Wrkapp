# wrk. app bridge (WooCommerce side)

One small plugin that lets the app place real orders on shop.ranlab.dev.

Why it exists: the app must not hold WooCommerce keys or decide prices. The app sends SKUs, quantities and the
personalisation text; the shop creates the order at its own prices, and marks it paid only after it has asked
Moyasar (with the secret key, on the server) whether that payment is real, for the right amount, for that order.

## Install
1. Copy `wrk-app-bridge.php` to `wp-content/plugins/wrk-app-bridge/wrk-app-bridge.php` and activate "wrk. app bridge".
2. In `wp-config.php` add `define('WRK_MOYASAR_SECRET', 'sk_test_...');` (the Moyasar secret key; test key first).
3. Optional: `WRK_APP_SHIPPING_FEE` and `WRK_APP_FREE_SHIPPING_FROM` (both default 0: delivery is included in the price).
4. In the app's `.env`: `EXPO_PUBLIC_WOO_BASE_URL=https://shop.ranlab.dev` and `EXPO_PUBLIC_MOYASAR_PUBLISHABLE_KEY=pk_test_...`.

## Community sign-up by purchase
The community lets buyers in by their order email. Its backend (never the app) asks the shop:
`POST /wp-json/wrk/v1/app/buyer` with header `X-Wrk-Bridge-Secret` and body `{"email":"..."}` -> `{"buyer":true}`.
Add `define('WRK_APP_BRIDGE_SECRET', '<long random string, 24+ chars>');` to wp-config.php and give the same value to the
community backend as `SHOP_BRIDGE_SECRET`. Without the define the route refuses every call.

## Check
```
curl -s -X POST https://shop.ranlab.dev/wp-json/wrk/v1/app/order -H 'Content-Type: application/json' -d '{
  "items":[{"sku":"WRK-PEN","quantity":1,"fields":{"الاسم":"سارة"}}],
  "customer":{"name":"Test Test","mobile":"0551234567","email":""},
  "address":{"city":"الرياض","district":"الملقا","street":"1"}}'
```
It should answer with `id`, `number`, `key`, `total`. The order appears in WooCommerce as "Pending payment".

## Order stages in the app
The app shows: paid, personalising, shipped, out for delivery, delivered. WooCommerce "processing" shows as paid and
"completed" as shipped. To show the in-between stages, set the order meta `_wrk_stage` to `personalising`, `shipped`,
`out-for-delivery` or `delivered`, and `_wrk_tracking_url` to the carrier link.

Not run against the live shop yet: it was written and syntax-checked (`php -l`) only.
