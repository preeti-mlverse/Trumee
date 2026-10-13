# Move the store from new.trumee.in to trumee.in (and leave Shopify)

The same server, code and database keep running — only the address changes. Plan ~1 hour,
ideally at a quiet time (late night). Keep Shopify active until step 8 is done.

## 0. Before the switch (on new.trumee.in)

```bash
cd /var/www/trumee && git pull && npm ci \
  && npx tsx scripts/setup-invoicing.ts \
  && npx tsx scripts/apply-pricing-policy.ts \
  && npx tsx scripts/tag-colour-families.ts \
  && npm run build && pm2 restart trumee
```
- Admin → Settings → Payments (Razorpay) → **Test connection** must say connected (live keys).
- Admin → Settings → Shiprocket → **Test connection** with a pincode must return a courier and dates.
- Place one real order to yourself (pay online with UPI, the cheapest item): check the Razorpay
  payment shows in Admin as Paid, open its **GST invoice**, send it to Shiprocket, then cancel and
  refund it from the Admin order page.
- Backup: `sudo -u postgres pg_dump -Fc trumee > ~/trumee-before-golive.dump`

## 1. DNS (Hostinger / wherever trumee.in's DNS is)

| Record | Name | Points to |
|---|---|---|
| A | `@` (trumee.in) | your VPS IP (same as new.trumee.in) |
| CNAME or A | `www` | `trumee.in` / VPS IP |

Remove the old Shopify A record (`23.227.38.65`) and the `shops.myshopify.com` CNAME for `www`.
Keep any **MX / TXT** (email, Google verification) records exactly as they are.
Check: `nslookup trumee.in` shows the VPS IP (can take 5–60 minutes).

## 2. Nginx + HTTPS on the VPS

In `/etc/nginx/sites-available/trumee` change the `server_name` line to:
```
server_name trumee.in www.trumee.in new.trumee.in;
```
Then:
```bash
nginx -t && systemctl reload nginx
certbot --nginx -d trumee.in -d www.trumee.in     # choose "redirect"
```

## 3. Environment (`/var/www/trumee/.env`)

```
NEXT_PUBLIC_SITE_URL=https://trumee.in
NOINDEX=            # empty or delete the line — lets Google index the site
```
Then rebuild (the site URL is baked into the build): `npm run build && pm2 restart trumee`

## 4. Razorpay — what changes

The **API keys stay the same** (they aren't tied to a domain). Update in the Razorpay dashboard:
1. **Account & Settings → Business website** → `https://trumee.in` (Razorpay may ask to re-verify the website; keep the policy pages live).
2. **Settings → Webhooks** → edit the webhook URL to `https://trumee.in/api/razorpay/webhook`
   (same secret as `RAZORPAY_WEBHOOK_SECRET`; events: payment.captured, payment.failed, refund.processed, refund.failed).
   Shopify's own Razorpay app/webhooks can be removed once Shopify is closed.

## 5. Shiprocket — what changes

The **API user and password stay the same**. Update:
1. **Settings → API → Webhooks** → URL `https://trumee.in/api/webhooks/courier-updates`, same token as `SHIPROCKET_WEBHOOK_TOKEN`.
2. **Channels**: the Shopify channel can be **disconnected** after the switch so Shopify orders stop syncing.
   Our orders arrive as "Custom" channel orders prefixed `TRM` — they don't depend on the Shopify channel.
3. Pickup address and wallet: unchanged.

## 6. Google sign-in, Search Console, Merchant Center

- Google Cloud → Credentials → your OAuth client → add `https://trumee.in` to *Authorised JavaScript origins*
  and `https://trumee.in/api/auth/google/callback` to *Authorised redirect URIs*.
- Search Console: the `trumee.in` property already exists (from Shopify) — submit `https://trumee.in/sitemap.xml`.
  Old Shopify URLs (`/products/...`, `/collections/...`, `/policies/...`, `/blogs/...`) already redirect (301) to the new pages.
- Merchant Center (Google + Bing): change the feed URL to `https://trumee.in/feeds/google-merchant.xml`; shipping = free.
- Meta Pixel / GA4: Admin → Settings → Analytics (IDs unchanged; add trumee.in as an allowed domain in Meta if domain verification is on).

## 7. Email (Resend)

If `EMAIL_FROM` uses `@trumee.in`, nothing changes. Make sure the Resend DNS (DKIM/SPF TXT) records survived step 1.

## 8. Test on trumee.in, then close Shopify

```bash
node scripts/e2e-full.mjs https://trumee.in        # from your PC; places 2 test orders → cancel them in Admin
node scripts/seo-audit.mjs https://trumee.in
node scripts/check-links.mjs https://trumee.in
```
Then in Shopify: export your orders/customers CSV for records, **remove the custom domain**, and choose
*Settings → Plan → Deactivate store*. Cancel paid Shopify apps first so they stop billing.

## 9. Make new.trumee.in point to trumee.in (optional)

Add to the nginx server block (or a separate block for `new.trumee.in`): `return 301 https://trumee.in$request_uri;`
