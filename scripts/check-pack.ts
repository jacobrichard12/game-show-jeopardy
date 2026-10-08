// Validates custom content packs (src/data/custom/*.json) with the same rules
// the server uses, so a bad entry is caught before it's committed.
//   npm run check-pack            -> every pack
//   npm run check-pack -- family  -> just src/data/custom/family.json
import fs from "fs";
import path from "path";
import { loadPack, PACKS_DIR, slotKeyFor } from "../src/server/packs";

const all = (() => {
  try {
    return fs.readdirSync(PACKS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  } catch {
    return [];
  }
})();
const ids = process.argv.slice(2).map((a) => path.basename(a, ".json"));
const targets = ids.length ? ids : all;

if (targets.length === 0) {
  console.log(`No packs found in ${PACKS_DIR}.`);
  process.exit(0);
}

let failed = false;
targets.forEach((id) => {
  const pack = loadPack(id);
  if (!pack) {
    console.log(`✗ ${id}: no such pack (looked for ${path.join(PACKS_DIR, id + ".json")})`);
    failed = true;
    return;
  }
  console.log(`${pack.errors.length ? "✗" : "✓"} ${id} ("${pack.name}"): ${pack.columns.length} column(s)`);
  console.log(
    `    Title screen: "${pack.titleScreen.title}"` +
      (pack.titleScreen.subtitle ? ` / "${pack.titleScreen.subtitle}"` : " (usual welcome line)")
  );
  // Each column, and which of its 10 tiles fall back to normal questions.
  pack.columns.forEach((column) => {
    const tiles = (pack.tiles as Record<string, Record<string, unknown>>)[column.game] ?? {};
    const normal = ([1, 2] as const).flatMap((round) =>
      [1, 2, 3, 4, 5]
        .map((step) => step * (round === 1 ? 100 : 200))
        .filter((value) => tiles[String(slotKeyFor(round, value))] === undefined)
        .map((value) => `R${round} ${value}`)
    );
    const custom = 10 - normal.length;
    console.log(
      `    ${column.title} (${column.game}): ${custom}/10 custom` +
        (normal.length === 0 ? "" : custom === 0 ? ", all normal questions" : `; normal: ${normal.join(", ")}`)
    );
  });
  pack.errors.forEach((e) => console.log(`    - ${e}`));
  if (pack.errors.length) failed = true;
});
process.exit(failed ? 1 : 0);
