# Put the new store on new.trumee.in (step by step)

The live store at **trumee.in stays on Shopify** the whole time. We add a subdomain, `new.trumee.in`,
that points at your VPS, collect feedback there, and switch the main domain only when you're happy.

You need: the VPS **IP address**, its **root (or sudo) login**, and your **Hostinger** login
(trumee.in's DNS is managed at Hostinger — nameservers `ns1/ns2.dns-parking.com`).

---

## Step 1 — Point new.trumee.in at the VPS (Hostinger, 2 minutes)

1. Log in to **hpanel.hostinger.com** → **Domains** → **trumee.in** → **DNS / Nameservers**.
2. Under **Manage DNS records**, add:

   | Type | Name | Points to | TTL |
   |---|---|---|---|
   | **A** | `new` | `YOUR_VPS_IP` | 300 |

3. Save. Do **not** change or delete the existing `@` and `www` records — those keep Shopify running.
4. Check it (usually 5–30 minutes) from Windows PowerShell:
   ```powershell
   nslookup new.trumee.in
   ```
   It should show your VPS IP.

## Step 2 — Log in to the VPS

From Windows PowerShell (or Hostinger's browser terminal if the VPS is from Hostinger):

```powershell
ssh root@YOUR_VPS_IP
```

Everything below in grey boxes marked **(server)** is typed into this SSH window.

## Step 3 — Install the software (server, once)

Paste **one line at a time** and wait for the prompt to come back before the next one.

```bash
export DEBIAN_FRONTEND=noninteractive
apt update && apt -o Dpkg::Options::="--force-confold" upgrade -y
reboot
```

The upgrade keeps your server's existing settings files without asking (a question about `sshd_config`
otherwise appears mid-install and can drop the connection). After `reboot`, wait a minute and log in again.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git nginx postgresql certbot python3-certbot-nginx
npm i -g pm2
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
node -v && psql --version && nginx -v
```

The last line should print three version numbers.

Swap is only needed on servers with 2 GB of memory or less (`free -h` shows it). With 4 GB or more, skip it;
otherwise: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab`

## Step 4 — Copy your products and settings (database)

**On your PC** (PowerShell, in the trumee-store folder):

```powershell
docker exec trumee-db pg_dump -U trumee -Fc -f /tmp/trumee.dump trumee
docker cp trumee-db:/tmp/trumee.dump .\trumee.dump
scp .\trumee.dump root@YOUR_VPS_IP:/tmp/
```

(Don't use `>` to save the dump in PowerShell — it corrupts the file.)

**On the server:**

```bash
sudo -u postgres psql -c "CREATE USER trumee WITH PASSWORD 'PICK_A_STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE trumee OWNER trumee;"
sudo -u postgres pg_restore -d trumee --no-owner --role=trumee /tmp/trumee.dump
```

## Step 5 — Get the code from GitHub (server)

```bash
git clone -b storefront-redesign-seo-shiprocket https://github.com/preeti-mlverse/Trumee.git /var/www/trumee
cd /var/www/trumee
npm ci
cp .env.example .env
nano .env
```

Fill in `.env` (Ctrl+O, Enter to save, Ctrl+X to exit):

Where each value comes from:

| Line | What to put |
|---|---|
| `DATABASE_URL` | Same password you chose in Step 4 (`CREATE USER … PASSWORD`). Use **letters and numbers only** — `@ : / # %` break the address. |
| `NEXT_PUBLIC_SITE_URL`, `NOINDEX` | Exactly as shown |
| `AUTH_SECRET` | Run `openssl rand -hex 32` on the server and paste the result (keeps admin logins secure) |
| `CRON_SECRET` | Run `openssl rand -hex 24` and paste the result |
| `ADMIN_EMAIL` | `admin@trumee.in` — the admin account that came with the database copy (or any email to create a new one) |
| `ADMIN_PASSWORD` | A new password you make up, at least 10 characters |

```
DATABASE_URL=postgres://trumee:PICK_A_STRONG_PASSWORD@localhost:5432/trumee
NEXT_PUBLIC_SITE_URL=https://new.trumee.in
NOINDEX=1
AUTH_SECRET=<paste output of: openssl rand -hex 32>
ADMIN_EMAIL=<your admin email>
ADMIN_PASSWORD=<a strong password>
CRON_SECRET=<paste output of: openssl rand -hex 24>
```

- `NOINDEX=1` hides the test site from Google so it never competes with trumee.in. **Remove it at launch.**
- Razorpay: put **test** keys (`rzp_test_…`) here for now. Leave empty to keep the simulated payment mode.
- Shiprocket / Resend: optional for the test site (see docs/SHIPROCKET_SETUP.md).

Set the admin login from those two lines (run it again any time to reset the password):

```bash
npm run admin:set
```

Build and start:

```bash
npm run build
pm2 start npm --name trumee -- start -- -p 3000
pm2 save && pm2 startup      # run the command it prints, so the site restarts after a reboot
curl -I http://localhost:3000  # should say 200
```

## Step 6 — Connect the subdomain (Nginx) and turn on HTTPS (server)

```bash
cat > /etc/nginx/sites-available/trumee <<'EOF'
server {
    server_name new.trumee.in;
    client_max_body_size 60m;
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
EOF
ln -s /etc/nginx/sites-available/trumee /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

certbot --nginx -d new.trumee.in    # enter your email, agree, choose redirect to HTTPS
```

Open **https://new.trumee.in** — the store should load with a padlock. Admin: https://new.trumee.in/admin

## Step 7 — Check it

From your PC (in the trumee-store folder):

```powershell
node scripts/check-links.mjs https://new.trumee.in
```

Then on the site: open a few products, add to cart, place a **COD test order**, and look at Admin → Orders.
Delete the old e2e test orders (#1001, #1002) in Admin.

---

## Updating the test site after new changes

1. On the PC, changes are committed and pushed to GitHub (branch `storefront-redesign-seo-shiprocket`).
2. On the server:
   ```bash
   cd /var/www/trumee && git pull && npm ci && npm run build && pm2 restart trumee
   ```

Products, prices or settings edited in **new.trumee.in/admin** live on the server's database — they are not
overwritten by `git pull`. (Only re-copy the database from your PC if you want to start over.)

## Going live later (moving trumee.in off Shopify)

1. In `.env`: `NEXT_PUBLIC_SITE_URL=https://trumee.in`, delete the `NOINDEX=1` line, swap in live Razorpay keys.
2. Nginx: change `server_name` to `trumee.in www.trumee.in`, run `certbot --nginx -d trumee.in -d www.trumee.in`.
3. Hostinger DNS: change the `@` A record to the VPS IP and `www` to a CNAME → `trumee.in` (this is the moment Shopify stops serving).
4. `npm run build && pm2 restart trumee`, then set up the Razorpay/Shiprocket webhooks and the cron job (docs/DEPLOY_VPS.md).
5. Google Search Console: submit `https://trumee.in/sitemap.xml`. Old Shopify URLs already redirect.

## If something goes wrong

| Problem | Fix |
|---|---|
| `nslookup` doesn't show the IP | Wait up to an hour; re-check the A record name is exactly `new` |
| certbot fails | DNS isn't pointing yet, or port 80 is blocked — `ufw status` |
| 502 Bad Gateway | The app isn't running: `pm2 logs trumee` |
| Build killed / out of memory | Swap missing: `free -h` should show 2 GB swap |
| Install stopped at "configuration file sshd_config … 1. install 2. keep" or the connection dropped mid-install | Log in again and run `dpkg --configure -a`; if asked, choose **2 (keep the local version)**. Then continue. |
| Forgot the admin password | Change `ADMIN_PASSWORD` in `.env`, run `npm run admin:set` |
| Changes not showing | Forgot `npm run build && pm2 restart trumee` after `git pull` |
