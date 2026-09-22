// Checks the Feud CSVs with the server's own parser (src/server/feud.ts).
// Run from the repo root: npx ts-node --transpile-only scripts/feud/verify.ts
import { readFileSync } from "fs";
import { getQuestionsFromCsv } from "../../src/server/feud";

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
    const seen = new Map<string, string>();
    const problems: string[] = [];
    let total = 0;
    for (const n of [4, 5, 6, 7]) {
        const file = `./src/data/feud${n}.csv`;
        const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").length;
        const questions = await getQuestionsFromCsv(file);
        total += questions.length;
        if (questions.length !== lines) problems.push(`${file}: parser accepted ${questions.length} of ${lines} lines`);
        questions.forEach((q) => {
            const where = `${file}: ${q.prompt}`;
            if (q.answers.length !== n) problems.push(`${where}: ${q.answers.length} answers`);
            q.answers.forEach((a, i) => {
                if (!Number.isInteger(a.points) || a.points <= 0) problems.push(`${where}: bad points ${a.points}`);
                if (i > 0 && a.points > q.answers[i - 1].points) problems.push(`${where}: not sorted`);
                if (a.answer !== a.answer.trim() || /\s{2}/.test(a.answer)) problems.push(`${where}: whitespace`);
            });
            if (/[A-Za-z]'(S|D|T|Ll|Re|Ve|M)\b/.test(q.prompt + q.answers.map((a) => a.answer).join())) {
                problems.push(`${where}: apostrophe casing`);
            }
            const k = key(q.prompt);
            if (seen.has(k)) problems.push(`${where}: duplicate of ${seen.get(k)}`);
            seen.set(k, file);
        });
        console.log(`feud${n}.csv: ${questions.length} questions`);
    }
    console.log(`total: ${total}`);
    problems.forEach((p) => console.log("PROBLEM", p));
    console.log(problems.length === 0 ? "OK: no problems" : `${problems.length} problems`);
    process.exit(problems.length === 0 ? 0 : 1);
}

main();
