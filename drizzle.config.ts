import { defineConfig } from "drizzle-kit";

// `out` MUST point at netlify/database/migrations so Netlify applies migrations
// automatically during deploy. Do not change this path.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",
});
