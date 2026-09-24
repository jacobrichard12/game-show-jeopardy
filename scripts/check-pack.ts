// Validates custom content packs (src/data/custom/*.json) with the same rules
// the server uses, so a bad entry is caught before it's committed.
//   npm run check-pack            -> every pack
//   npm run check-pack -- family  -> just src/data/custom/family.json
import fs from "fs";
import path from "path";
import { loadPack, PACK_GAMES, PACKS_DIR } from "../src/server/packs";

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
  const counts = PACK_GAMES.map((g) => [g, Object.keys(pack.tiles[g] ?? {}).length] as const)
    .filter(([, n]) => n > 0)
    .map(([g, n]) => `${g} ${n}`)
    .join(", ");
  console.log(`${pack.errors.length ? "✗" : "✓"} ${id} ("${pack.name}"): ${counts || "no valid tiles"}`);
  pack.errors.forEach((e) => console.log(`    - ${e}`));
  if (pack.errors.length) failed = true;
});
process.exit(failed ? 1 : 0);
