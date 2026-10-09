# Trumee admin — feature map

What the admin needs, drawn from three sources: the **Shiprocket API** (apidocs.shiprocket.in — the full
endpoint list), the **Razorpay API** (payments, refunds, payment links, webhooks) and the **Shopify admin**
(the screens a Shopify store owner is used to). ✅ = built · ⬜ = later phase.

## 1. Settings (Shopify: Settings)

| Area | What it holds | Status |
|---|---|---|
| Store details | Name, tagline, legal name, GSTIN, support email/phone/WhatsApp, address, support hours, social links | ✅ |
| Announcement bar | On/off, text, link | ✅ |
| Payments — Razorpay | Connection status (keys, test/live mode, webhook secret), **Test connection**, webhook URL to copy, payment methods shown at checkout (UPI, cards, netbanking, wallets, EMI, pay later), checkout brand name, default refund speed (normal 5–7 days / instant) | ✅ |
| Payments — prepaid discount | % off for paying online, cap, minimum order | ✅ |
| Cash on delivery | On/off, COD fee, COD order limit | ✅ |
| Shipping & delivery | Flat rate, free-shipping threshold, dispatch time, delivery estimates | ✅ |
| Shiprocket | Connection status + test, **wallet balance**, **pickup locations pulled from Shiprocket**, courier choice (Shiprocket's recommendation / cheapest / fastest), schedule pickup automatically, auto-send orders, default parcel, webhook URL | ✅ |
| Taxes | Prices include GST, GST slab threshold, low/high rate | ✅ |
| Analytics & tracking | GA4, Meta Pixel, Microsoft Clarity, Google site verification | ✅ |
| Navigation menus | Header/footer menus | ⬜ |
| Homepage | Hero slides, featured collections, testimonials | ⬜ |
| Notifications | Order/shipping email templates, sender | ⬜ |
| Users & permissions | Staff accounts with section permissions | ⬜ |
| Policies | Shipping/returns/privacy/terms pages | ⬜ (editable as pages) |

## 2. Orders (Shopify: Orders)

| Feature | Source API | Status |
|---|---|---|
| Order list with search (number, name, email, phone) and filters (payment, fulfilment, status) | — | ✅ |
| Order detail page: items, totals, customer, address, payment, timeline | — | ✅ |
| Internal notes on the timeline | — | ✅ |
| Mark COD order as paid | — | ✅ |
| Cancel order (cancels in Shiprocket too; optional refund) | Shiprocket `orders/cancel`, `orders/cancel/shipment/awbs` | ✅ |
| Refund — full or partial, reason, normal/instant | Razorpay `payments/{id}/refund` (speed `optimum`) | ✅ |
| Refund status updates | Razorpay webhooks `refund.processed` / `refund.failed` | ✅ |
| Send to Shiprocket · Ship now (AWB + pickup) · Refresh tracking | `orders/create/adhoc`, `courier/assign/awb`, `courier/generate/pickup`, `courier/track/awb` | ✅ |
| Shipping label PDF | `courier/generate/label` | ✅ |
| Invoice PDF | `orders/print/invoice` | ✅ |
| Cancel shipment (AWB) | `orders/cancel/shipment/awbs` | ✅ |
| Update delivery address before shipping | `orders/address/update` | ⬜ |
| Manifest for a day's pickups | `manifests/generate` / `print` | ⬜ |
| Payment link for unpaid / COD-to-prepaid orders | Razorpay `payment_links` + `payment_link.paid` webhook | ⬜ |
| Abandoned checkouts | carts table | ⬜ |
| Draft / manual orders | — | ⬜ |

## 3. Shipping operations (Shiprocket)

| Feature | Endpoint | Status |
|---|---|---|
| NDR (failed delivery) list — re-attempt or return to origin | `ndr/all`, `ndr/{awb}/action` | ⬜ |
| Return pickup for an approved return request | `orders/create/return` + `courier/assign/awb` | ⬜ |
| Exchange orders | `orders/create/exchange` | ⬜ |
| Pincode blocklist | `blocked-pincodes/upload` | ⬜ |
| Shipping cost statement / weight discrepancies | `account/details/statement`, `billing/discrepancy` | ⬜ |

## 4. Products & inventory (Shopify: Products)

| Feature | Status |
|---|---|
| Product list: search (title/handle/SKU), status filter, stock and sold-out sizes at a glance | ✅ |
| Add / edit product: title, description, fabric, care, category, tags, status (active/draft/archived), SEO, URL handle, catwalk video | ✅ |
| Sizes: price, MRP (crossed-out), cost, SKU, stock, track stock, sell when out of stock | ✅ |
| Photos: upload (auto WebP, 2000px), reorder, choose main photo, alt text, delete | ✅ |
| Collections membership from the product page | ✅ |
| Inventory page: all sizes, low/sold-out views, bulk stock edit with a reason, change history, stock value at cost | ✅ |
| Stock auto-adjusts on orders (down) and cancellations (back up) | ✅ |
| Collection editor (create/edit collections, rules, banner image, FAQs) | ⬜ |
| Bulk import/export (CSV) | ⬜ |
| Low-stock email alert | ⬜ |
| Gift cards | ⬜ |

## 5. Customers (Shopify: Customers)

| Feature | Status |
|---|---|
| Customer list: search, orders, amount spent, last order, email consent | ✅ |
| Customer profile: stats, orders, saved addresses, staff notes and tags | ✅ |
| Shopper "My account": orders, details, **address book** (add/edit/delete/default; checkout saves new addresses and pre-fills the default) | ✅ |
| Segments, export, newsletter subscriber list | ⬜ |

## 6. Discounts (Shopify: Discounts)

Codes (percent / fixed / free shipping), minimums, usage limits, dates — ⬜ (table exists)

## 7. Content (Shopify: Online store / Content)

Pages, blog posts, redirects, reviews moderation, contact messages — ⬜

## 8. Analytics (Shopify: Analytics)

Sales, sessions, conversion funnel, top products, traffic sources (first-party collector already records
these) — ⬜ beyond the current overview.

## 9. Returns

Customer return requests → approve/reject → Shiprocket reverse pickup → refund on receipt — ⬜

---

**Built so far:** Settings, Orders (detail, refunds, cancel, Shiprocket documents), Products & inventory,
Customers. **Next:** Returns & NDR → Discounts → Collections editor → Content (pages, blog, menus,
homepage) → Analytics dashboards → Staff & permissions → Abandoned checkouts & payment links.

## Where data lives (database tables)

| Area | Tables |
|---|---|
| Shoppers | `customers` (profile, consent, notes, tags, wishlist), `addresses` (address book), `subscribers` (newsletter) |
| Orders | `orders`, `order_items`, `order_events` (timeline), `refunds`, `fulfillments` (shipments), `return_requests` |
| Catalog | `products`, `variants` (sizes, price, stock), `product_images`, `collections`, `collection_products`, `inventory_adjustments` (every stock change) |
| Activity & analytics | `analytics_sessions`, `analytics_events` (page views, add to cart, checkout, purchase…), `search_queries`, `audit_log` (every admin action, by whom) |
| Admin | `staff`, `settings`, `discounts`, `gift_cards`, `pages`, `blog_posts`, `redirects`, `reviews`, `contact_messages` |
