// GET /committee/<code> — PUBLIC. One congressional committee's page.
//
// netlify.toml rewrites /committee/<code> here. Server-rendered from
// db/person-committees.json (scripts/gen-committees.mjs, from the House Clerk's
// and the Senate's own membership files) and the share index's names — both
// committed files bundled with the function, so the page reads no database and
// no network. It shows the committee's name, its members with a PolitiDex file
// (each linked to /p/<pid>, with the title the House Clerk's file prints) and
// its subcommittees (each linked to its own page). A code the file does not
// hold gets an honest 404 page.
import type { Config } from "@netlify/functions";
import committeesFile from "../../db/person-committees.json" with { type: "json" };
import shareIndex from "../../db/share-index.json" with { type: "json" };
import { parseCommitteePath, committeeData } from "../lib/committee-index.mjs";
import { committeePageHtml, committeeNotFoundHtml } from "../lib/coverage-pages.js";

const html = (status: number, body: string, cache: string) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": cache } });

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  // Reached by rewrite: the function's own path carries the same code.
  const path = url.pathname.replace(/^\/api\/committee-page/, "/committee");
  const code = parseCommitteePath(path);
  if (!code) return html(404, committeeNotFoundHtml(null), "public, max-age=300");
  const data = committeeData(code, committeesFile, (shareIndex as any).people || {});
  if (!data) return html(404, committeeNotFoundHtml(code), "public, max-age=300");
  return html(200, committeePageHtml(data), "public, max-age=600");
};

export const config: Config = {
  path: "/api/committee-page/:code",
  method: ["GET"],
};
