# Deploying Trumee on your own VPS

> First time? Start with **docs/TEST_SITE_SETUP.md** — the same steps for a test copy on new.trumee.in.

Tested setup: Ubuntu 22.04/24.04, **2 GB RAM minimum** (4 GB recommended), Node 22, PostgreSQL 16, Nginx.

## 1. Server basics

```bash
# Node 22 + build tools
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx postgresql
sudo npm i -g pm2

# 2 GB swap so the build never runs out of memory
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Database (copy your local data across)

All products, collections, pages, settings and orders live in the local database, so copy it — don't start empty.

On **your PC** (PowerShell — don't use `>` to save the dump, it corrupts the file):

```powershell
docker exec trumee-db pg_dump -U trumee -Fc -f /tmp/trumee.dump trumee
docker cp trumee-db:/tmp/trumee.dump trumee.dump
scp trumee.dump root@YOUR_SERVER:/tmp/
```

On the **server**:

```bash
sudo -u postgres psql -c "CREATE USER trumee WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE trumee OWNER trumee;"
sudo -u postgres pg_restore -d trumee --no-owner --role=trumee /tmp/trumee.dump
```

Before launch, delete the test orders from the e2e runs (#1001, #1002 — e2e-test@example.com) in Admin → Orders.

## 3. App

```bash
git clone https://github.com/preeti-mlverse/Trumee.git /var/www/trumee
cd /var/www/trumee
git checkout storefront-redesign-seo-shiprocket   # or main once merged
npm ci
cp .env.example .env && nano .env
```

`.env` on the server:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgres://trumee:PASSWORD@localhost:5432/trumee` |
| `NEXT_PUBLIC_SITE_URL` | `https://trumee.in` (used in sitemap, SEO tags, emails — must be the live domain) |
| `AUTH_SECRET` | new random value: `openssl rand -hex 32` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | your admin login (use a strong password) |
| `RAZORPAY_*` | see "Payments" below — leave empty to keep the simulated mode |
| `SHIPROCKET_*` | see docs/SHIPROCKET_SETUP.md |
| `RESEND_API_KEY`, `EMAIL_FROM` | order emails (Resend) |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `NOINDEX` | `1` on test copies (hides them from Google); leave empty on the live site |

```bash
npm run build
pm2 start npm --name trumee -- start -- -p 3000
pm2 save && pm2 startup     # restart automatically after a reboot
```

## 4. Nginx + HTTPS

`/etc/nginx/sites-available/trumee`:

```nginx
server {
    server_name trumee.in www.trumee.in;
    client_max_body_size 20m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/trumee /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d trumee.in -d www.trumee.in
```

Point the domain's **A record** (trumee.in and www) to the server IP first. To test before switching the domain away from Shopify, use the server IP or a subdomain such as `new.trumee.in` (and set `NEXT_PUBLIC_SITE_URL` to it).

## 5. Daily job (review-request emails)

Vercel ran this automatically; on a VPS add it to cron (`crontab -e`):

```
30 4 * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://trumee.in/api/cron/review-requests > /dev/null
```

## 6. Payments and shipping webhooks (once live)

- Razorpay → Webhooks: `https://trumee.in/api/razorpay/webhook`, events `payment.captured`, `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
- Shiprocket → Webhooks: `https://trumee.in/api/webhooks/courier-updates`, token = `SHIPROCKET_WEBHOOK_TOKEN`.

## Updating after changes

```bash
cd /var/www/trumee && git pull && npm ci && npm run build && pm2 restart trumee
```

## Adding new photos and videos

- **Photos:** save as WebP, about 1600 px on the long side (2000 px for full-width backdrops). The site makes
  smaller sizes for phones automatically. To tidy up heavy files: `python scripts/optimize-images.py --write`.
- **Videos:** keep clips short (6–10 s), 720 px wide, no sound. Put the normal MP4 in `public/videos/`, then make
  the smaller AV1 copy next to it (the site uses it automatically where the browser supports it):

  ```bash
  ffmpeg -i public/videos/NAME.mp4 -c:v libsvtav1 -preset 5 -crf 42 -g 125 -pix_fmt yuv420p -an -movflags +faststart public/videos/NAME.av1.mp4
  ```

  The MP4 itself should also be "faststart" so it can play before it has fully downloaded:
  `ffmpeg -i in.mp4 -c:v libx264 -preset slow -crf 23 -an -movflags +faststart public/videos/NAME.mp4`

## Checks after deploying

```bash
node scripts/check-links.mjs https://trumee.in
```

Then place one COD test order and one prepaid test order, and open Admin → Orders.
