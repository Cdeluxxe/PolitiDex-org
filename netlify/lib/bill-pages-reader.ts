// Wires share-target.ts's generated-bill-page lookup to Blobs "bill-pages" (the
// records the scheduled bill job writes — see vote-actions-pages.ts), and its
// provisions lookup to Blobs "bill-provisions" (the plain-language "What this
// bill does" records — see bill-provisions-core.ts). Imported by the edge
// functions that resolve /b/ addresses; kept out of share-target.ts so that
// module (and the tests that bundle it) carries no Blobs import. Any failure —
// no Blobs context, a missing key — reads as "no generated page" / "no section".
import { getStore } from "@netlify/blobs";
import { setGeneratedBillPageReader, setBillProvisionsReader } from "./share-target.ts";

export const BILL_PAGES_STORE = "bill-pages";
export const BILL_PROVISIONS_STORE = "bill-provisions";

export function installBillPagesReader(): void {
  setGeneratedBillPageReader(async (key: string) => {
    try { return await getStore(BILL_PAGES_STORE).get(key, { type: "json" }); }
    catch { return null; }
  });
  setBillProvisionsReader(async (key: string) => {
    try { return await getStore(BILL_PROVISIONS_STORE).get(key, { type: "json" }); }
    catch { return null; }
  });
}
