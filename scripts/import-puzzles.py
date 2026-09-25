"""Select a curated subset of the Lichess puzzle database and split it into small JSON files.

Usage:
  python3 scripts/import-puzzles.py ~/Downloads/lichess_db_puzzle.csv.zst

Requires the `zstd` command-line tool (brew install zstd). The database is CC0:
https://database.lichess.org/#puzzles

Output (served statically and fetched on demand by the app):
  public/puzzles/index.json                    categories, rating bands and file names
  public/puzzles/<category>/<band>.json        [{"id", "fen", "moves", "rating"}, ...]

Each puzzle is assigned to the first matching category below, so there are no duplicates.
Within a category and rating band we keep the most popular, most played, well-established
puzzles. BAND_TOTALS sets how many puzzles each band gets in total, split evenly over the
categories; bands with a total of 0 are listed in the index without a file (shown disabled).
"""
import csv
import heapq
import io
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "puzzles"

# (slug, title, emoji-free description, matcher). Order sets the assignment priority.
CATEGORIES = [
    ("french-defence", "French Defence", "Tactics from French Defence games", lambda t, o: "French_Defense" in o),
    ("back-rank-mate", "Back-rank mate", "Mate on the back rank", lambda t, o: "backRankMate" in t),
    ("mate-in-1", "Mate in 1", "Find the checkmate in one move", lambda t, o: "mateIn1" in t),
    ("mate-in-2", "Mate in 2", "Force checkmate in two moves", lambda t, o: "mateIn2" in t),
    ("mate-in-3", "Mate in 3", "Force checkmate in three moves", lambda t, o: "mateIn3" in t),
    ("fork", "Fork", "Attack two pieces at once", lambda t, o: "fork" in t),
    ("pin", "Pin", "Pin a piece to something more valuable", lambda t, o: "pin" in t),
    ("skewer", "Skewer", "Attack through a valuable piece", lambda t, o: "skewer" in t),
    ("discovered-attack", "Discovered attack", "Move one piece to unleash another", lambda t, o: "discoveredAttack" in t),
    ("sacrifice", "Sacrifice", "Give up material to win more", lambda t, o: "sacrifice" in t),
]

BANDS = [
    ("beginner", "Beginner", 0, 1000),
    ("casual", "Casual", 1000, 1400),
    ("intermediate", "Intermediate", 1400, 1800),
    ("advanced", "Advanced", 1800, 2200),
    ("expert", "Expert", 2200, 10000),
]

# Total puzzles per band across all categories. A shortfall in one category is made up by
# the other categories in the same band, so the totals are always met when possible.
BAND_TOTALS = {
    "beginner": 0,
    "casual": 7000,
    "intermediate": 3000,
    "advanced": 0,
    "expert": 0,
}

# Quality filters: stable rating, liked by players, played enough times.
MAX_RATING_DEVIATION = 90
MIN_POPULARITY = 80
MIN_PLAYS = 300


def band_of(rating: int) -> int:
    for i, (_, _, low, high) in enumerate(BANDS):
        if low <= rating < high:
            return i
    return len(BANDS) - 1


def read_rows(path: str):
    proc = subprocess.Popen(["zstdcat", path], stdout=subprocess.PIPE)
    assert proc.stdout is not None
    yield from csv.DictReader(io.TextIOWrapper(proc.stdout, encoding="utf-8"))
    proc.wait()


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    # buckets[category][band] = min-heap of (score, puzzle) keeping the best candidates.
    # Keeping up to the full band total per bucket lets any category cover a shortfall.
    limits = [BAND_TOTALS[slug] for slug, *_ in BANDS]
    buckets = [[[] for _ in BANDS] for _ in CATEGORIES]
    scanned = 0

    for row in read_rows(sys.argv[1]):
        scanned += 1
        if scanned % 1_000_000 == 0:
            print(f"  scanned {scanned:,} puzzles", file=sys.stderr)
        if int(row["RatingDeviation"]) > MAX_RATING_DEVIATION:
            continue
        popularity, plays = int(row["Popularity"]), int(row["NbPlays"])
        if popularity < MIN_POPULARITY or plays < MIN_PLAYS:
            continue
        themes = set(row["Themes"].split())
        openings = set(row["OpeningTags"].split())
        category = next((i for i, c in enumerate(CATEGORIES) if c[3](themes, openings)), None)
        if category is None:
            continue
        rating = int(row["Rating"])
        band = band_of(rating)
        if limits[band] == 0:
            continue
        puzzle = {"id": row["PuzzleId"], "fen": row["FEN"], "moves": row["Moves"], "rating": rating}
        heap = buckets[category][band]
        entry = ((popularity, plays), row["PuzzleId"], puzzle)
        if len(heap) < limits[band]:
            heapq.heappush(heap, entry)
        elif entry > heap[0]:
            heapq.heapreplace(heap, entry)

    print(f"scanned {scanned:,} puzzles", file=sys.stderr)

    # Split each band's total over the categories, moving shortfalls to categories with spare.
    ranked = [[sorted(heap, reverse=True) for heap in bands] for bands in buckets]
    quotas = [[0] * len(BANDS) for _ in CATEGORIES]
    for b, total in enumerate(limits):
        per_category = allocate([len(ranked[c][b]) for c in range(len(CATEGORIES))], total)
        for c, quota in enumerate(per_category):
            quotas[c][b] = quota
        if sum(per_category) < total:
            print(f"warning: only {sum(per_category)} of {total} {BANDS[b][0]} puzzles available", file=sys.stderr)

    # Start from a clean folder so files of bands that are now disabled disappear.
    shutil.rmtree(OUT, ignore_errors=True)
    OUT.mkdir(parents=True)
    index = {"source": "Lichess puzzle database (CC0), https://database.lichess.org/#puzzles", "categories": []}
    grand_total = 0

    for c, (slug, title, description, _) in enumerate(CATEGORIES):
        (OUT / slug).mkdir()
        band_entries = []
        for b, (band_slug, band_title, low, high) in enumerate(BANDS):
            quota = quotas[c][b]
            entry = {"slug": band_slug, "title": band_title, "min": low, "max": high if high < 10000 else None,
                     "count": quota, "file": None}
            if quota > 0:
                puzzles = sorted((p for _, _, p in ranked[c][b][:quota]), key=lambda p: p["rating"])
                (OUT / slug / f"{band_slug}.json").write_text(json.dumps(puzzles, separators=(",", ":")))
                entry["file"] = f"{slug}/{band_slug}.json"
                grand_total += quota
            band_entries.append(entry)
        index["categories"].append({"slug": slug, "title": title, "description": description, "bands": band_entries})
        print(f"{title:18} " + "  ".join(f"{e['slug']}={e['count']}" for e in band_entries if e["count"]), file=sys.stderr)

    (OUT / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    band_summary = ", ".join(f"{BANDS[b][0]}={sum(q[b] for q in quotas)}" for b in range(len(BANDS)) if limits[b])
    print(f"wrote {grand_total:,} puzzles to {OUT.relative_to(ROOT)} ({band_summary})", file=sys.stderr)


def allocate(available: list[int], total: int) -> list[int]:
    """Split `total` evenly over buckets, moving any shortfall to buckets with spare puzzles."""
    quotas = [0] * len(available)
    remaining = total
    open_bands = [i for i, n in enumerate(available) if n > 0]
    while remaining > 0 and open_bands:
        share = max(1, remaining // len(open_bands))
        for i in list(open_bands):
            take = min(share, available[i] - quotas[i], remaining)
            quotas[i] += take
            remaining -= take
            if quotas[i] >= available[i]:
                open_bands.remove(i)
            if remaining == 0:
                break
    return quotas


if __name__ == "__main__":
    main()
