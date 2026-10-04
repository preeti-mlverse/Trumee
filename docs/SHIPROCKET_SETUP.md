# Shiprocket setup

The store is already wired to Shiprocket. Until you add credentials it runs on the
delivery estimates in **Admin → Settings → Shipping**, so nothing breaks in the meantime.

## What you need to send / set

| What | Where you get it | Where it goes |
|---|---|---|
| **API user email + password** | Shiprocket → **Settings → API → Configure → Create an API user**. Use a *new* email (Shiprocket requires it to differ from your login). | Server env: `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` |
| **Webhook token** | Make up a long random string (e.g. `openssl rand -hex 24`) | Server env: `SHIPROCKET_WEBHOOK_TOKEN` **and** Shiprocket webhook settings (below) |
| **Pickup location nickname** | Shiprocket → **Settings → Pickup Addresses** (e.g. `Primary`) — must match exactly | Admin → Settings → Shiprocket |
| **Pickup pincode** | Your warehouse/studio pincode (currently `122017`) | Admin → Settings → Shiprocket |
| **Typical parcel** | Weigh one packed piece; measure the courier bag | Admin → Settings → Shiprocket (weight per piece, L × B × H) |

Restart the server after changing env variables (on Vercel: redeploy).

## Turn on tracking updates (webhook)

Shiprocket → **Settings → API → Webhooks**

- **URL:** `https://trumee.in/api/webhooks/courier-updates`
  (Shiprocket rejects URLs containing words like “shiprocket”, “kartrocket”, “sr”, “kr”, so the endpoint is named neutrally.)
- **Token / x-api-key:** the same value as `SHIPROCKET_WEBHOOK_TOKEN`
- Enable the webhook.

Every scan (picked up, in transit, out for delivery, delivered, RTO) then updates the order
automatically: the customer's order page shows the courier, AWB, live status and expected date.

## What each part does

- **Live delivery dates** (Admin toggle *Live delivery dates*): product pages and checkout call
  Shiprocket's courier-serviceability API for the shopper's pincode and show
  *“Get it by Thu, 9 Oct – Mon, 13 Oct”* = your dispatch time + the recommended courier's transit days.
  Pincodes no courier serves are blocked at checkout; COD is hidden where couriers can't collect cash.
  Results are cached per pincode for 6 hours; if Shiprocket is unreachable the estimate is used instead.
- **Send orders automatically** (toggle): every confirmed order (COD at placement, prepaid once paid)
  is created in Shiprocket as **NEW** with the customer, items, amounts, COD/prepaid flag, discounts and parcel size.
- **Admin → Orders → Ship now**: books Shiprocket's recommended courier (AWB) and schedules pickup in one click.
  Needs enough balance in your Shiprocket wallet. *Refresh tracking* pulls the latest scan on demand.
- Order reference in Shiprocket is `TRM<order number>` (e.g. `TRM1005`).

## Test it

1. Add the env variables and restart.
2. Admin → Settings → Shiprocket → **Test connection** with any pincode — you should see the courier, transit days and COD availability.
3. Place a COD test order, then Admin → Orders → **Send to Shiprocket** — it appears in Shiprocket under *Orders → New*.
   Cancel it in Shiprocket afterwards.

## Code map

- `src/lib/shiprocket.ts` — API client (login/token cache, serviceability, create order, AWB, pickup, tracking, cancel)
- `src/lib/delivery.ts` — delivery date + COD quote used by product pages, checkout and admin
- `src/lib/fulfilment.ts` — push order, ship now, tracking updates → order + fulfilment records
- `src/app/api/webhooks/courier-updates/route.ts` — tracking webhook
- `src/app/admin/(panel)/settings` and `orders` — configuration and actions
