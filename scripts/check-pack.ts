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
  console.log(
    `${pack.errors.length ? "✗" : "✓"} ${id} ("${pack.name}"): ${pack.columns.length} column(s) × ${pack.rows} row(s)` +
      (pack.doubleJeopardy ? "" : ", no Double Jeopardy")
  );
  console.log(
    `    Title screen: "${pack.titleScreen.title}"` +
      (pack.titleScreen.subtitle ? ` / "${pack.titleScreen.subtitle}"` : " (usual welcome line)") +
      (pack.titleScreen.decor ? `, decor: ${pack.titleScreen.decor}` : "")
  );
  // Each column, and which of its 10 tiles fall back to normal questions.
  pack.columns.forEach((column) => {
    // A tile is custom if the column's game, or a mixed-in type, has it.
    const own = (pack.tiles as Record<string, Record<string, unknown>>)[column.game] ?? {};
    const tiles: Record<string, unknown> = { ...own, ...(column.tiles ?? {}) };
    const steps = Array.from({ length: pack.rows }, (_, i) => i + 1);
    const rounds = pack.doubleJeopardy ? ([1, 2] as const) : ([1] as const);
    const total = pack.rows * rounds.length;
    const normal = rounds.flatMap((round) =>
      steps
        .map((step) => step * (round === 1 ? 100 : 200))
        .filter((value) => tiles[String(slotKeyFor(round, value))] === undefined)
        .map((value) => `R${round} ${value}`)
    );
    const custom = total - normal.length;
    console.log(
      `    ${column.title} (${column.game}): ${custom}/${total} custom` +
        (column.tiles
          ? ` [mixed: ${Object.entries(column.tiles)
              .map(([slot, game]) => `${Number(slot) % 100 === 1 ? `R2 ${(Number(slot) - 1) * 2}` : `R1 ${slot}`} ${game}`)
              .join(", ")}]`
          : "") +
        (normal.length === 0 ? "" : custom === 0 ? ", all normal questions" : `; normal: ${normal.join(", ")}`)
    );
  });
  pack.errors.forEach((e) => console.log(`    - ${e}`));
  if (pack.errors.length) failed = true;
});
process.exit(failed ? 1 : 0);
