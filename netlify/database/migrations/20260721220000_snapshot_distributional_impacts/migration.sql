-- ─────────────────────────────────────────────────────────────────────────────
-- Distributional Impact Ledger — Drizzle snapshot sync (schema baseline roll-forward)
-- ─────────────────────────────────────────────────────────────────────────────
-- The vr_distributional_impacts table (and its seed) was created by the applied
-- migration 20260721210000_create_vr_distributional_impacts.sql. That file is a flat
-- SQL migration with NO Drizzle snapshot, so `drizzle-kit generate` kept diffing
-- db/schema.ts against the last snapshot that predates the table and re-emitting a
-- brand-new "create" migration on every run — each stamped with the current
-- wall-clock time, which sorts BEFORE the seed migrations' later timestamps and is
-- therefore rejected as out-of-order on deploy.
--
-- This migration carries the accompanying snapshot.json (the full, current schema,
-- chained from 20260720053826) so the Drizzle baseline now INCLUDES the table and
-- `drizzle-kit generate` produces no further changes. It never edits an applied
-- migration — it only rolls the snapshot chain forward.
--
-- The SQL below is a fully idempotent no-op wherever the table already exists (its
-- creation migration has already run), and correctly (re)creates it on a fresh
-- database. Inline REFERENCES + IF NOT EXISTS keep every statement safe to re-run.

CREATE TABLE IF NOT EXISTS "vr_distributional_impacts" (
  "id" serial PRIMARY KEY,
  "measure_id" integer NOT NULL REFERENCES "vr_measures"("id") ON DELETE CASCADE,
  "provision_id" integer REFERENCES "vr_measure_provisions"("id") ON DELETE SET NULL,
  "cohort" text NOT NULL,
  "direction" text DEFAULT 'mixed' NOT NULL,
  "magnitude_value" numeric,
  "magnitude_unit" text,
  "magnitude_label" text,
  "metric" text DEFAULT '' NOT NULL,
  "source_label" text NOT NULL,
  "source_url" text NOT NULL,
  "methodology" text DEFAULT '',
  "evidence_strength" text DEFAULT 'moderate' NOT NULL,
  "as_of" timestamp with time zone,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_distributional_impacts_measure_idx" ON "vr_distributional_impacts" ("measure_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vr_distributional_impacts_cohort_idx" ON "vr_distributional_impacts" ("cohort");
