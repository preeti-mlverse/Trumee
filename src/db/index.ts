import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// Reuse one pool across hot reloads in dev.
const client =
  globalForDb.pg ??
  postgres(process.env.DATABASE_URL!, { max: process.env.NODE_ENV === "production" ? 5 : 10, prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema, casing: undefined });
export { schema };
export type DB = typeof db;
