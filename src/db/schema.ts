import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// All money columns are integer paise (₹1 = 100).

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─────────────────────────────────────────────── staff & audit
export const staffRole = pgEnum("staff_role", ["owner", "admin", "staff"]);

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: staffRole("role").notNull().default("staff"),
  /** Section keys this member may open, e.g. ["orders","products"]. Owners/admins ignore it. */
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    staffId: integer("staff_id").references(() => staff.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

// ─────────────────────────────────────────────── catalog
export const productStatus = pgEnum("product_status", ["active", "draft", "archived"]);

export type ProductOption = { name: string; values: string[] };

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    handle: varchar("handle", { length: 255 }).notNull().unique(),
    title: text("title").notNull(),
    descriptionHtml: text("description_html").notNull().default(""),
    status: productStatus("status").notNull().default("draft"),
    productType: text("product_type").notNull().default(""),
    vendor: text("vendor").notNull().default("Trumee"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    options: jsonb("options").$type<ProductOption[]>().notNull().default([]),
    fabric: text("fabric"),
    care: text("care"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    featured: boolean("featured").notNull().default(false),
    /** Vertical catwalk loop (9:16) shown in the gallery, reels and banners. */
    videoUrl: text("video_url"),
    videoPoster: text("video_poster"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("products_status_idx").on(t.status)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("images_product_idx").on(t.productId)],
);

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    costPrice: integer("cost_price"),
    option1: text("option1"),
    option2: text("option2"),
    option3: text("option3"),
    inventoryQty: integer("inventory_qty").notNull().default(0),
    trackInventory: boolean("track_inventory").notNull().default(true),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    weightGrams: integer("weight_grams").notNull().default(300),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  reason: text("reason").notNull(), // restock | correction | order | cancel | refund | damage
  orderId: integer("order_id"),
  staffId: integer("staff_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CollectionRule = {
  field: "tag" | "type" | "price" | "title";
  op: "equals" | "contains" | "gt" | "lt";
  value: string;
};

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  handle: varchar("handle", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  descriptionHtml: text("description_html").notNull().default(""),
  imageUrl: text("image_url"),
  /** manual = hand-picked; smart = products matching rules */
  kind: varchar("kind", { length: 10 }).notNull().default("manual"),
  rules: jsonb("rules").$type<CollectionRule[]>().notNull().default([]),
  rulesMatch: varchar("rules_match", { length: 3 }).notNull().default("all"),
  sortOrder: varchar("sort_order", { length: 20 }).notNull().default("manual"),
  /** category = shown in shop-by-category; edit = themed edit/moodboard */
  group: varchar("group", { length: 20 }).notNull().default("edit"),
  published: boolean("published").notNull().default(true),
  position: integer("position").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  /** Long-form buying/styling guide shown below the grid (H2/H3 HTML). */
  guideHtml: text("guide_html"),
  /** Q&A shown on the page and emitted as FAQPage structured data. */
  faqs: jsonb("faqs").$type<{ q: string; a: string }[]>().notNull().default([]),
  ...timestamps,
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.productId] })],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: varchar("status", { length: 10 }).notNull().default("pending"),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)],
);

// ─────────────────────────────────────────────── customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  passwordHash: text("password_hash"),
  acceptsMarketing: boolean("accepts_marketing").notNull().default(false),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  note: text("note"),
  storeCredit: integer("store_credit").notNull().default(0),
  wishlist: jsonb("wishlist").$type<number[]>().notNull().default([]),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export type Address = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<Address>().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  source: text("source").notNull().default("footer"),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── carts & checkouts
export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  referrer?: string;
  landingPath?: string;
  channel?: string;
};

export const carts = pgTable(
  "carts",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email"),
    phone: text("phone"),
    shippingAddress: jsonb("shipping_address").$type<Address>(),
    discountCode: text("discount_code"),
    sessionId: text("session_id"),
    attribution: jsonb("attribution").$type<Attribution>(),
    checkoutStartedAt: timestamp("checkout_started_at", { withTimezone: true }),
    recoveryEmailSentAt: timestamp("recovery_email_sent_at", { withTimezone: true }),
    completedOrderId: integer("completed_order_id"),
    ...timestamps,
  },
  (t) => [index("carts_checkout_idx").on(t.checkoutStartedAt)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: varchar("cart_id", { length: 32 })
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.variantId] })],
);

// ─────────────────────────────────────────────── orders
export const financialStatus = pgEnum("financial_status", [
  "pending",
  "authorized",
  "paid",
  "partially_refunded",
  "refunded",
  "voided",
]);
export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
  "returned",
]);
export const orderStatus = pgEnum("order_status", ["open", "archived", "cancelled"]);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: integer("number").notNull().unique(),
    /** Unguessable id for guest order-status links (/orders/<token>). */
    token: varchar("token", { length: 32 }).notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    phone: text("phone"),
    status: orderStatus("status").notNull().default("open"),
    financialStatus: financialStatus("financial_status").notNull().default("pending"),
    fulfillmentStatus: fulfillmentStatus("fulfillment_status").notNull().default("unfulfilled"),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // razorpay | cod | manual
    paymentGatewayOrderId: text("payment_gateway_order_id"),
    paymentId: text("payment_id"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    codFee: integer("cod_fee").notNull().default(0),
    /** GST contained in the (tax-inclusive) prices, for reporting and invoices. */
    taxTotal: integer("tax_total").notNull().default(0),
    total: integer("total").notNull(),
    refundedTotal: integer("refunded_total").notNull().default(0),
    discountCode: text("discount_code"),
    shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
    billingAddress: jsonb("billing_address").$type<Address>(),
    note: text("note"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    source: varchar("source", { length: 20 }).notNull().default("web"), // web | admin | draft
    attribution: jsonb("attribution").$type<Attribution>(),
    sessionId: text("session_id"),
    cartId: text("cart_id"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("orders_created_idx").on(t.createdAt), index("orders_customer_idx").on(t.customerId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: integer("variant_id").references(() => variants.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    imageUrl: text("image_url"),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
    discount: integer("discount").notNull().default(0),
    taxRate: integer("tax_rate").notNull().default(5), // percent
    fulfilledQty: integer("fulfilled_qty").notNull().default(0),
    refundedQty: integer("refunded_qty").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const fulfillments = pgTable("fulfillments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("in_transit"), // in_transit | delivered | returned
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  items: jsonb("items").$type<{ orderItemId: number; quantity: number }[]>().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const refunds = pgTable("refunds", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  restock: boolean("restock").notNull().default(true),
  items: jsonb("items").$type<{ orderItemId: number; quantity: number }[]>().notNull().default([]),
  gatewayRefundId: text("gateway_refund_id"),
  staffId: integer("staff_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderEvents = pgTable(
  "order_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 30 }).notNull(), // placed | paid | fulfilled | comment | ...
    message: text("message").notNull(),
    staffId: integer("staff_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

export const returnRequests = pgTable("return_requests", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull().default("return"), // return | exchange
  reason: text("reason").notNull(),
  items: jsonb("items").$type<{ orderItemId: number; quantity: number }[]>().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("requested"), // requested | approved | rejected | received | closed
  note: text("note"),
  ...timestamps,
});

// ─────────────────────────────────────────────── discounts & gift cards
export const discounts = pgTable("discounts", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  title: text("title"),
  /** percentage | fixed | free_shipping | bxgy */
  kind: varchar("kind", { length: 20 }).notNull(),
  /** percentage: 0-100; fixed: paise */
  value: integer("value").notNull().default(0),
  /** bxgy: buy X get Y free (cheapest items) */
  buyQty: integer("buy_qty"),
  getQty: integer("get_qty"),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  appliesTo: varchar("applies_to", { length: 20 }).notNull().default("all"), // all | collections | products
  targetIds: jsonb("target_ids").$type<number[]>().notNull().default([]),
  usageLimit: integer("usage_limit"),
  oncePerCustomer: boolean("once_per_customer").notNull().default(false),
  usedCount: integer("used_count").notNull().default(0),
  automatic: boolean("automatic").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  initialValue: integer("initial_value").notNull(),
  balance: integer("balance").notNull(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  note: text("note"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── content
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  handle: varchar("handle", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  coverUrl: text("cover_url"),
  author: text("author").notNull().default("Team Trumee"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  published: boolean("published").notNull().default(true),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ...timestamps,
});

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  handle: varchar("handle", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull().default(""),
  published: boolean("published").notNull().default(true),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ...timestamps,
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: varchar("status", { length: 10 }).notNull().default("new"), // new | read | replied
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** URL redirects (301), e.g. old Shopify product handles → new ones. */
export const redirects = pgTable("redirects", {
  id: serial("id").primaryKey(),
  fromPath: varchar("from_path", { length: 500 }).notNull().unique(),
  toPath: varchar("to_path", { length: 500 }).notNull(),
  hits: integer("hits").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Key/value store for store settings, navigation, homepage layout, integrations. */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── analytics (first-party, GA4-style)
export const analyticsSessions = pgTable(
  "analytics_sessions",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    visitorId: varchar("visitor_id", { length: 32 }).notNull(),
    isNewVisitor: boolean("is_new_visitor").notNull().default(true),
    customerId: integer("customer_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    landingPath: text("landing_path"),
    exitPath: text("exit_path"),
    referrer: text("referrer"),
    referrerHost: text("referrer_host"),
    source: text("source"),
    medium: text("medium"),
    campaign: text("campaign"),
    term: text("term"),
    content: text("content"),
    channel: varchar("channel", { length: 30 }).notNull().default("Direct"),
    deviceType: varchar("device_type", { length: 10 }),
    browser: text("browser"),
    os: text("os"),
    screen: varchar("screen", { length: 20 }),
    language: varchar("language", { length: 20 }),
    country: varchar("country", { length: 60 }),
    region: text("region"),
    city: text("city"),
    pageviews: integer("pageviews").notNull().default(0),
    events: integer("events").notNull().default(0),
    engagementMs: integer("engagement_ms").notNull().default(0),
    engaged: boolean("engaged").notNull().default(false),
    revenue: integer("revenue").notNull().default(0),
    converted: boolean("converted").notNull().default(false),
  },
  (t) => [
    index("sessions_started_idx").on(t.startedAt),
    index("sessions_visitor_idx").on(t.visitorId),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: varchar("session_id", { length: 32 }).notNull(),
    visitorId: varchar("visitor_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    path: text("path"),
    title: text("title"),
    productId: integer("product_id"),
    value: integer("value"),
    props: jsonb("props").$type<Record<string, unknown>>(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_ts_idx").on(t.ts),
    index("events_name_ts_idx").on(t.name, t.ts),
    index("events_session_idx").on(t.sessionId),
  ],
);

export const searchQueries = pgTable("search_queries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  query: text("query").notNull(),
  results: integer("results").notNull(),
  sessionId: text("session_id"),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────── relations
export const productsRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  variants: many(variants),
  collections: many(collectionProducts),
  reviews: many(reviews),
}));
export const imagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));
export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));
export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, { fields: [collectionProducts.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionProducts.productId], references: [products.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  addresses: many(addresses),
}));
export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, { fields: [addresses.customerId], references: [customers.id] }),
}));
export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  customer: one(customers, { fields: [carts.customerId], references: [customers.id] }),
}));
export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(variants, { fields: [cartItems.variantId], references: [variants.id] }),
}));
export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  fulfillments: many(fulfillments),
  refunds: many(refunds),
  events: many(orderEvents),
  returns: many(returnRequests),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
export const fulfillmentsRelations = relations(fulfillments, ({ one }) => ({
  order: one(orders, { fields: [fulfillments.orderId], references: [orders.id] }),
}));
export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, { fields: [refunds.orderId], references: [orders.id] }),
}));
export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));
export const returnRequestsRelations = relations(returnRequests, ({ one }) => ({
  order: one(orders, { fields: [returnRequests.orderId], references: [orders.id] }),
}));
