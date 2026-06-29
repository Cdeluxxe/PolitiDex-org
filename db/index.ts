// Drizzle client for the Netlify Database (managed Postgres). The connection is
// configured automatically by the Netlify Database adapter — no connection string
// is needed. Import `db` from here in any Netlify Function.
import { drizzle } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

export const db = drizzle({ schema });
