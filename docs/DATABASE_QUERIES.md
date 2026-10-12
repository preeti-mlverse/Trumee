# Querying the production database

Day-to-day you shouldn't need this — **Admin → Inbox** shows contact messages, return requests,
newsletter sign-ups and shopper searches; Orders, Customers and Inventory cover the rest.
Use SQL only for one-off questions.

## Open a SQL prompt on the VPS

```bash
ssh root@YOUR_VPS_IP
cd /var/www/trumee
psql "$(grep ^DATABASE_URL .env | cut -d= -f2- | tr -d '"')"
```

You'll see `trumee=>`. Type `\q` to leave. Every query ends with `;`.

> Read-only habits: start with `select`. Before any `update`/`delete`, take a backup:
> `sudo -u postgres pg_dump -Fc trumee > ~/trumee-$(date +%F).dump`

## Useful queries

```sql
-- Contact-form messages (newest first)
select created_at, name, email, phone, status, left(message, 80) from contact_messages order by created_at desc limit 20;

-- Newsletter sign-ups
select created_at, email, source from subscribers where not unsubscribed order by created_at desc;

-- What shoppers searched, and searches that found nothing
select query, count(*) as times, min(results) as results from search_queries group by query order by times desc limit 30;
select query, count(*) from search_queries where results = 0 group by query order by 2 desc;

-- Orders today (IST) by payment type
select payment_method, count(*), sum(total)/100 as rupees from orders
where created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' and status <> 'cancelled'
group by payment_method;

-- One order with its items
select o.number, o.email, o.total/100 as total, i.title, i.variant_title, i.quantity from orders o join order_items i on i.order_id = o.id where o.number = 1006;

-- Low stock
select p.title, v.option1 as size, v.inventory_qty from variants v join products p on p.id = v.product_id where p.status = 'active' and v.track_inventory and v.inventory_qty <= 3 order by v.inventory_qty;

-- Current store settings (shipping, payments, …)
select key, value from settings;
```

## Export to a spreadsheet

```bash
psql "$(grep ^DATABASE_URL .env | cut -d= -f2- | tr -d '"')" -c "\copy (select created_at, name, email, phone, message from contact_messages order by created_at desc) to '/root/messages.csv' csv header"
```
Then download it from your PC: `scp root@YOUR_VPS_IP:/root/messages.csv .`

## From your PC with a desktop app (optional)

Use an SSH tunnel so the database is never exposed to the internet:
```bash
ssh -L 5433:localhost:5432 root@YOUR_VPS_IP
```
Leave that window open, then connect DBeaver / TablePlus / pgAdmin to `localhost:5433`, database
`trumee`, user `trumee`, with the password from `DATABASE_URL` in the server's `.env`.
