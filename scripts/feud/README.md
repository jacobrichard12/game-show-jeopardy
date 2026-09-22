# Family Feud question import and cleanup

`build_feud.py` rebuilds `src/data/feud4.csv` … `feud7.csv` (headerless rows
`prompt,answer1,points1,…`; the file number is the answer count, see
`PROJECT_CONTEXT.md` §10). It:

1. Reads the current CSVs and the ProtoQA training set (`train.jsonl`,
   downloaded to `$TMPDIR/protoqa-train.jsonl` if missing, outside the repo).
2. Keeps ProtoQA questions with 4–7 answer clusters whose counts sum to 85–100,
   using each cluster's representative answer and its count as points.
3. Cleans every row: fixes mis-decoded curly quotes, normalizes whitespace, applies
   the spelling/phrase fixes in `curation.py`, Title Cases text without apostrophe
   artifacts (`You'd`, `It's`, keeps `TV`, `McDonald's`, …), parses points as
   integers, merges answers that repeat within a row, sorts answers by points
   (descending), and drops rows with blank or invalid fields or a count outside 4–7.
4. Removes the prompts listed in `curation.REMOVE_PROMPT_KEYS` (explicit, hateful
   or broken).
5. Dedupes by normalized prompt (lowercase, letters/digits only), and also by an
   identical answer board, since the same survey sometimes appears under a reworded
   prompt. The better-formed copy wins: integer points, then sorted, then a total of
   85–100, then the existing hand-curated row over ProtoQA, then the longer
   (less truncated) answers.
6. Writes each question to the CSV that matches its answer count. Existing rows
   stay first, in their original order.

Rerunning it on its own output gives the same files.

## Rerun

```sh
python3 scripts/feud/build_feud.py                      # dry run, prints counts
python3 scripts/feud/build_feud.py --write              # rewrite the CSVs
python3 scripts/feud/build_feud.py --report /tmp/feud   # review lists (see below)
npx ts-node --transpile-only scripts/feud/verify.ts     # check with the server's parser
```

Only the Python 3 standard library is needed. `--report` writes `words.json` (word
frequencies), `fixes.txt`, `removed.txt`, `content_review.txt` and `dated.txt`
(keyword hits for a person to read; nothing is removed automatically) and
`questions.tsv`. The spelling list came from running `pyspellchecker`
(`pip install pyspellchecker`) over `words.json`, reading each unknown word in
context, and keeping only unambiguous typos. Proper nouns, slang and brand names
were left as they were. To add a fix or a removal, edit `curation.py` and rerun
with `--write`.

`verify.ts` loads each file with `getQuestionsFromCsv` from `src/server/feud.ts`.
It checks that every line is accepted, that each row has the file's answer count,
that points are positive integers sorted in descending order, and that no prompt
appears twice.

`src/data/sandboxFeud.json` is a separate hand-copied sample and is not regenerated
by this script.

## Source and license

- **ProtoQA** (Boratko et al., "ProtoQA: A Question Answering Dataset for Prototypical
  Common-Sense Reasoning", EMNLP 2020), <https://github.com/iesl/protoqa-data>.
  The dataset compilation is released under **CC BY 4.0**. Attribution:
  data from ProtoQA by the UMass Amherst IESL, licensed CC BY 4.0
  (<https://creativecommons.org/licenses/by/4.0/>). Modified: filtered, deduplicated,
  re-cased, and corrected for spelling.
- About 85% of the pre-existing CSV rows also came from ProtoQA. ProtoQA compiled its
  questions from fan sites (familyfeudinfo.com, familyfeudfriends.arjdesigns.com),
  which transcribed survey questions and answers from the *Family Feud* TV show. The
  underlying questions and answers may be copyrighted by the show's owners. They are
  fine for this private party app, but do not redistribute them or use them commercially.
