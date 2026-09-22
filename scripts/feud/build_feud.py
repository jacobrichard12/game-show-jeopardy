#!/usr/bin/env python3
"""Rebuild src/data/feud{4,5,6,7}.csv from the current CSVs plus ProtoQA.

Usage (from the repo root):
    python3 scripts/feud/build_feud.py                 # dry run: print a summary only
    python3 scripts/feud/build_feud.py --write         # rewrite the four CSVs
    python3 scripts/feud/build_feud.py --report DIR    # also dump review lists to DIR

Options:
    --protoqa PATH   ProtoQA train.jsonl (downloaded there if missing).
                     Default: $TMPDIR/protoqa-train.jsonl (outside the repo).
    --no-import      Only clean the existing rows; skip ProtoQA.

The script is idempotent: running it on its own output gives the same files.
Curated decisions (spelling fixes, removed prompts, casing) live in curation.py.
"""
import argparse
import collections
import csv
import json
import os
import re
import sys
import tempfile
import unicodedata
import urllib.request

sys.dont_write_bytecode = True  # keep __pycache__ out of the repo
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import curation  # noqa: E402

PROTOQA_URL = "https://raw.githubusercontent.com/iesl/protoqa-data/master/data/train/train.jsonl"
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(REPO, "src", "data")
COUNTS = (4, 5, 6, 7)
MIN_SUM, MAX_SUM = 85, 100  # ProtoQA filter: total survey count per question


# ---------------------------------------------------------------- text helpers

def prompt_key(text):
    """Dedupe key: lowercase, letters and digits only."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


def answer_key(text):
    return re.sub(r"[^a-z0-9]", "", text.lower())


MOJIBAKE = (  # UTF-8 curly punctuation that was decoded as Windows-1252 upstream
    (re.compile("\u00e2\u20ac(?:\u2122|tm)", re.I), "'"),
    (re.compile("\u00e2\u20ac\u0153"), '"'),
    (re.compile("\u00e2\u20ac\u00a6"), "..."),
    (re.compile("\u00e2\u20ac[\u009d\u201d]?"), '"'),
)


def normalize_chars(text):
    for rx, rep in MOJIBAKE:
        text = rx.sub(rep, text)
    text = unicodedata.normalize("NFKC", text)
    for a, b in (("\u2018", "'"), ("\u2019", "'"), ("\u201c", '"'), ("\u201d", '"'),
                 ("\u2013", "-"), ("\u2014", "-"), ("\u00a0", " "), ("`", "'"),
                 ("\u2032", "'"), ("_", "-")):
        text = text.replace(a, b)
    return text


def normalize_space(text):
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*/\s*", "/", text)          # "Work/ School" -> "Work/School"
    text = re.sub(r"\s+([,.?!:;])", r"\1", text)   # no space before punctuation
    text = re.sub(r"([,:;])(?=[A-Za-z])", r"\1 ", text)  # but one after , : ;
    text = re.sub(r"([?!.])\1+$", r"\1", text)     # "??" -> "?"
    text = re.sub(r"\(\s+", "(", text)
    text = re.sub(r"\s+\)", ")", text)
    return text.strip()


WORD_RE = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z]+)*")
CONTRACTION_TAILS = {"s", "d", "t", "ll", "re", "ve", "m"}


def fix_word_case(word, special):
    """Title-case one word, keeping known special casing (TV, McDonald's)."""
    low = word.lower()
    if low in special:
        return special[low]
    parts = word.split("'")
    head = parts[0]
    if head.islower() or (head.isupper() and len(head) > 1 and low not in special):
        head = head[:1].upper() + head[1:].lower()
    elif head[:1].islower():
        head = head[:1].upper() + head[1:]
    if re.fullmatch(r"Mc[a-z]{2,}", head):          # Mcdonald -> McDonald
        head = "Mc" + head[2].upper() + head[3:]
    if re.fullmatch(r"\d+(St|Nd|Rd|Th|S)", head):     # 1St -> 1st, 50S -> 50s
        head = head.lower()
    out = [head]
    for tail in parts[1:]:
        if tail.lower() in CONTRACTION_TAILS:
            out.append(tail.lower())      # You'D -> You'd, It'S -> It's
        elif len(head) == 1 and head in "ODL":  # O'Neal, D'Angelo, L'Oreal
            out.append(tail[:1].upper() + tail[1:])
        else:
            out.append(tail.lower() if tail.isupper() else tail)
    return "'".join(out)


def title_case(text, special):
    # Whole field shouted in caps (e.g. "TOWEL") -> treat as lowercase first.
    letters = [c for c in text if c.isalpha()]
    if len(letters) > 3 and all(c.isupper() for c in letters):
        text = text.lower()
    return WORD_RE.sub(lambda m: fix_word_case(m.group(0), special), text)


def apply_spelling(text, fixes_applied):
    def sub(m):
        word = m.group(0)
        fix = curation.SPELLING.get(word.lower())
        if fix is None:
            return word
        fixes_applied[(word.lower(), fix)] += 1
        if word[:1].isupper():
            fix = fix[:1].upper() + fix[1:]
        return fix
    text = WORD_RE.sub(sub, text)
    for bad, good in curation.PHRASES.items():
        if bad.lower() in text.lower():
            text = re.sub(re.escape(bad), good, text, flags=re.I)
            fixes_applied[(bad.lower(), good)] += 1
    return text


def clean_text(text, special, fixes_applied):
    text = normalize_space(normalize_chars(text or ""))
    text = apply_spelling(text, fixes_applied)
    return title_case(text, special)


def parse_points(raw):
    """Integer points; tolerates '9+' (parseInt semantics). None if invalid."""
    m = re.match(r"\s*(\d+)", raw or "")
    return int(m.group(1)) if m else None


# ---------------------------------------------------------------- loading

def load_existing():
    rows = []
    for n in COUNTS:
        path = os.path.join(DATA, f"feud{n}.csv")
        with open(path, newline="", encoding="utf-8") as f:
            for i, r in enumerate(csv.reader(f)):
                rows.append({"source": f"feud{n}.csv:{i + 1}", "origin": "existing",
                             "prompt": r[0] if r else "",
                             "pairs": [(r[j], r[j + 1] if j + 1 < len(r) else "")
                                       for j in range(1, len(r), 2)]})
    return rows


def load_protoqa(path):
    if not os.path.exists(path):
        print(f"Downloading {PROTOQA_URL} -> {path}", file=sys.stderr)
        urllib.request.urlretrieve(PROTOQA_URL, path)
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            q = json.loads(line)
            clusters = list(q["answers"]["clusters"].values())
            total = sum(c["count"] for c in clusters)
            if not (4 <= len(clusters) <= 7 and MIN_SUM <= total <= MAX_SUM):
                continue
            rows.append({"source": q["metadata"]["id"], "origin": "protoqa",
                         "prompt": q["question"]["original"],
                         "pairs": [(c["answers"][0], str(c["count"])) for c in clusters]})
    return rows


def build_special_casing(existing):
    """Words whose preferred casing isn't plain Capitalized (TV, DVD, McDonald's),
    learned from the existing hand-cased CSVs plus curation.CASING."""
    seen = collections.defaultdict(collections.Counter)
    for r in existing:
        fields = [r["prompt"]] + [a for a, _ in r["pairs"]]
        for field in fields:
            letters = [c for c in field if c.isalpha()]
            if letters and all(c.isupper() for c in letters):
                continue  # shouted field, not evidence
            for w in WORD_RE.findall(normalize_chars(field)):
                seen[w.lower()][w] += 1
    special = {}
    for low, variants in seen.items():
        form, n = variants.most_common(1)[0]
        plain = low[:1].upper() + low[1:]
        if n >= 2 and form not in (plain, low) and "'" not in form and len(low) > 1:
            special[low] = form
    for w in curation.NOT_SPECIAL:
        special.pop(w, None)
    special.update({w.lower(): w for w in curation.CASING})
    return special


# ---------------------------------------------------------------- cleaning

def clean_row(row, special, fixes_applied):
    """Return (question, None) or (None, reason)."""
    prompt = clean_text(row["prompt"], special, fixes_applied)
    prompt = curation.PROMPT_FIXES.get(prompt, prompt)
    if not prompt:
        return None, "blank prompt"
    answers = []
    for text, pts in row["pairs"]:
        if not (text or "").strip() and not (pts or "").strip():
            continue  # trailing empty cells
        a = clean_text(text, special, fixes_applied)
        p = parse_points(pts)
        if not a or p is None or p <= 0:
            return None, f"invalid answer/points ({text!r}, {pts!r})"
        answers.append([a, p])
    # Merge answers that normalize identically (keeps the first spelling).
    merged = collections.OrderedDict()
    for a, p in answers:
        k = answer_key(a)
        if k in merged:
            merged[k][1] += p
        else:
            merged[k] = [a, p]
    answers = sorted(merged.values(), key=lambda ap: -ap[1])  # stable: ties keep order
    if len(answers) not in COUNTS:
        return None, f"{len(answers)} answers (need 4-7)"
    return {"prompt": prompt, "answers": [tuple(a) for a in answers],
            "source": row["source"], "origin": row["origin"],
            "was_sorted": [int(parse_points(p) or 0) for _, p in row["pairs"] if p]
            == sorted([int(parse_points(p) or 0) for _, p in row["pairs"] if p], reverse=True),
            "raw_points_ok": all(re.fullmatch(r"\d+", (p or "").strip()) for t, p in row["pairs"] if t or p),
            }, None


def quality(q):
    """Higher is better-formed; used to pick between duplicate prompts."""
    total = sum(p for _, p in q["answers"])
    return (
        q["raw_points_ok"],
        q["was_sorted"],
        MIN_SUM <= total <= MAX_SUM,
        q["origin"] == "existing",  # prefer the hand-curated row over ProtoQA
        sum(len(a) for a, _ in q["answers"]),  # then the less-truncated answers
    )


def blocked(prompt):
    return "curated removal" if prompt_key(prompt) in curation.REMOVE_PROMPT_KEYS else None


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--protoqa", default=os.path.join(tempfile.gettempdir(), "protoqa-train.jsonl"))
    ap.add_argument("--no-import", action="store_true")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--report")
    args = ap.parse_args()

    existing = load_existing()
    before = collections.Counter(r["source"].split(":")[0] for r in existing)
    imported = [] if args.no_import else load_protoqa(args.protoqa)
    special = build_special_casing(existing)
    fixes = collections.Counter()

    dropped, removed = [], []
    by_key, by_sig = {}, {}
    dup_count = dup_existing = dup_board = 0
    for row in existing + imported:
        q, reason = clean_row(row, special, fixes)
        if q is None:
            if row["origin"] == "existing":
                dropped.append((row["source"], row["prompt"], reason))
            continue
        why = blocked(q["prompt"])
        if why:
            removed.append((q["source"], q["prompt"], why))
            continue
        # Same prompt, or a reworded prompt with the identical answer board.
        k = prompt_key(q["prompt"])
        sig = tuple((answer_key(a), p) for a, p in q["answers"])
        if k not in by_key and sig in by_sig:
            k = by_sig[sig]
            dup_board += 1
        if k in by_key:
            dup_count += 1
            if row["origin"] == "existing":
                dup_existing += 1
            if quality(q) > quality(by_key[k]):
                by_key[k] = q
                by_sig[sig] = k
        else:
            by_key[k] = q
            by_sig[sig] = k

    out = {n: [] for n in COUNTS}
    for q in by_key.values():
        out[len(q["answers"])].append(q)
    # Stable order: existing rows first in their original order, then ProtoQA order.
    def order(q):
        src = q["source"]
        if q["origin"] == "existing":
            f, line = src.split(":")
            return (0, f, int(line))
        return (1, "", int(src.split("_q")[1]))
    for n in COUNTS:
        out[n].sort(key=order)

    origin_counts = collections.Counter(q["origin"] for q in by_key.values())
    print(f"Before: " + ", ".join(f"feud{n}={before[f'feud{n}.csv']}" for n in COUNTS))
    print(f"After:  " + ", ".join(f"feud{n}={len(out[n])}" for n in COUNTS)
          + f"  (total {sum(len(v) for v in out.values())})")
    print(f"Kept {origin_counts['existing']} existing rows, imported {origin_counts['protoqa']} from ProtoQA")
    print(f"Duplicates collapsed: {dup_count} ({dup_existing} were repeats inside the existing CSVs; "
          f"{dup_board} matched on an identical answer board rather than the prompt)")
    print(f"Existing rows dropped as invalid: {len(dropped)}")
    for d in dropped:
        print("   ", d)
    print(f"Rows removed by content filter: {len(removed)} "
          f"({sum(1 for r in removed if not r[0].startswith('train_'))} existing)")
    print(f"Spelling/phrase fixes applied: {sum(fixes.values())} across {len(fixes)} words")

    if args.report:
        os.makedirs(args.report, exist_ok=True)
        write_report(args.report, by_key.values(), removed, fixes, special)

    if args.write:
        for n in COUNTS:
            path = os.path.join(DATA, f"feud{n}.csv")
            with open(path, "w", newline="", encoding="utf-8") as f:
                w = csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
                for q in out[n]:
                    cells = [q["prompt"]]
                    for a, p in q["answers"]:
                        cells += [a, str(p)]
                    w.writerow(cells)
        print("Wrote", ", ".join(f"feud{n}.csv" for n in COUNTS))
    else:
        print("Dry run (pass --write to rewrite the CSVs)")


def write_report(outdir, questions, removed, fixes, special):
    from collections import Counter
    words = Counter()
    for q in questions:
        for field in [q["prompt"]] + [a for a, _ in q["answers"]]:
            for w in WORD_RE.findall(field):
                words[w.lower()] += 1
    with open(os.path.join(outdir, "words.json"), "w") as f:
        json.dump(words, f)
    with open(os.path.join(outdir, "fixes.txt"), "w") as f:
        for (bad, good), n in fixes.most_common():
            f.write(f"{bad} -> {good}  x{n}\n")
    with open(os.path.join(outdir, "removed.txt"), "w") as f:
        for r in removed:
            f.write(" | ".join(r) + "\n")

    def hits(patterns, name):
        rx = re.compile(r"\b(" + "|".join(patterns) + r")\b", re.I)
        with open(os.path.join(outdir, name), "w") as f:
            for q in questions:
                line = q["prompt"] + " || " + "; ".join(f"{a} {p}" for a, p in q["answers"])
                if rx.search(line):
                    f.write(f"{q['source']} | {prompt_key(q['prompt'])} | {line}\n")
    hits(curation.REVIEW_KEYWORDS, "content_review.txt")
    hits(curation.DATED_KEYWORDS, "dated.txt")
    with open(os.path.join(outdir, "questions.tsv"), "w") as f:
        for q in questions:
            f.write(f"{q['source']}\t{prompt_key(q['prompt'])}\t{q['prompt']}\t"
                    + "; ".join(f"{a} {p}" for a, p in q["answers"]) + "\n")


if __name__ == "__main__":
    main()
