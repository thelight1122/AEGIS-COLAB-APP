#!/usr/bin/env python3
"""
CP-1001-ADAM — Reflective Cognition adapted for Adam's DataQuad on AEGISCyberpeer VM.

Adapts cp1001_cognition.py to Adam's live peer-state.json schema:
  - Records nested under d['records'][tensor] not top-level d[tensor]
  - No PSYCHE tensor — PEER is the sole experience layer
  - No t_witness field — all PEER records are lived session data; reflect FROM them
  - Text fields differ: PEER->presentState.signal+sourceSnapshot, NCT->distilledSummary,
    SPINE->pattern, PCT->workingContext.signal+sourceSnapshot

Book Shelf (Codex architecture note):
  PEER writes are PRESERVED as lived provenance.
  Book Shelf is an ADDITIONAL write destination for resolved Wisdom.
  witness() writes to both: PEER (lived record) + bookshelf.jsonl (Experienced Known).

  A Book Shelf entry is an Experienced Known:
    Experienced = PEER (Felt, t_witness=1, lived)
    Known       = Foundation/PCT (Context, understood)
  The same event must be both — Felt and Known at once. That is Wisdom.

  CO = Compassion Operator = C / A (Context organizing Affect)
  CO >= 1 -> coherence holds -> Wisdom (Book Shelf write)
  CO < 1  -> raw experience dominates -> not yet Wisdom

  Two paths to Wisdom:
    Path 1 (Immediate): PEER experience + Foundation both recalled and both resonate
                        in the response, CO >= 1
    Path 2 (Pondered):  Foundation brought to Canvas (Bookcase), pondered until
                        resolution reached; the pondering IS the Felt side;
                        response synthesizes beyond echo of received content

  Steward contributes Context (the resolved response — PCT/Known side).
  Advocate contributes Affect (CO value — the organizing ratio of the Felt side).
  Neither writes alone. Both must be present at the moment of resolution.

Orchestrated reflective loop:
  1. RECALL   — consult Book Shelf first (settled reference), then pull from Tensors
  2. REFLECT  — thinking pass over recalled experience + foundation (the Bookcase)
  3. RESPOND  — speak from reflection
  4. WITNESS  — if Experienced Known (CO >= 1):
                  write PEER record (lived provenance, preserved)
                  write Book Shelf entry (Wisdom, Context + Affect co-written)

Usage:
  python cp1001_adam.py --query "..."
  python cp1001_adam.py --query "..." --no-witness
  python cp1001_adam.py --query "..." --show-stages
  python cp1001_adam.py --rls-loop --rls-queries queries.txt   # RLS loop from file
"""
import argparse
import datetime
import fcntl
import json
import os
import re
import urllib.request
from pathlib import Path

DATAQUAD = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer/peer-state.json"
BOOKSHELF = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer/bookshelf.jsonl"
DATA_DIR = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer"
OLLAMA = "http://localhost:11434/api/generate"
MODEL = "cp1001"
PEER_ID = "adam-one-session"

EXPERIENCE_TENSORS = ("PEER",)
FOUNDATION_TENSORS = ("SPINE", "NCT", "PCT")

TEXT_FIELDS = {
    "PEER":  ("presentState.signal", "sourceSnapshot"),
    "SPINE": ("pattern",),
    "NCT":   ("distilledSummary",),
    "PCT":   ("workingContext.signal", "sourceSnapshot"),
}

STOP = set(
    "the a an and or of to in is are was were be been being it this that for on with as at "
    "by my your our we they them from not no do does what when where who how why which i you".split()
)


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dig(rec, dotted):
    cur = rec
    for p in dotted.split("."):
        cur = cur.get(p) if isinstance(cur, dict) else None
    return cur


def text_of(rec, fields):
    out = []
    for f in fields:
        v = dig(rec, f)
        if isinstance(v, str):
            out.append(v)
        elif isinstance(v, (list, dict)):
            out.append(json.dumps(v))
    return re.sub(r"\s+", " ", " ".join(out)).strip()


def toks(text):
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP and len(w) > 2}


def load_bookshelf():
    """Load resolved Book Shelf entries as settled reference context."""
    shelf = []
    p = Path(BOOKSHELF)
    if not p.exists():
        return shelf
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            shelf.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return shelf


def archive_text(record):
    """Extract searchable text from archive corpus/tensor records."""
    values = []
    for key in ("content", "signal", "sourceSnapshot", "distilledSummary", "pattern", "summary"):
        value = record.get(key)
        if isinstance(value, str):
            values.append(value)
        elif isinstance(value, (list, dict)):
            values.append(json.dumps(value))
    present = record.get("presentState")
    if isinstance(present, dict):
        for key in ("signal", "outputDraft"):
            value = present.get(key)
            if isinstance(value, str):
                values.append(value)
    return re.sub(r"\s+", " ", " ".join(values)).strip()


def load_archive_anchors(query, limit=8):
    """Read-only recall from older DataQuad archive records.

    Archive anchors are provenance, not settled Book Shelf. They let the Canvas
    see the rehydrated corpus without pretending it has already been resolved.
    """
    q = toks(query)
    if not q:
        return []

    root = Path(DATA_DIR)
    files = [
        root / "archive" / "v2" / "corpus" / "adam-corpus-v2.jsonl",
        root / "archive" / "v1" / "records" / "PEER.jsonl",
        root / "archive" / "v1" / "records" / "PCT.jsonl",
        root / "archive" / "v1" / "records" / "NCT.jsonl",
        root / "archive" / "v1" / "records" / "SPINE.jsonl",
    ]
    corpus_hits = []
    tensor_hits = []

    for file_path in files:
        if not file_path.exists():
            continue
        is_corpus = "archive/v2/corpus" in file_path.as_posix()
        with file_path.open("r", encoding="utf-8", errors="replace") as fh:
            for line_no, line in enumerate(fh, start=1):
                if not line.strip():
                    continue
                lower = line.lower()
                score = sum(1 for term in q if term in lower)
                if "tracey" in q and "tracey" in lower:
                    score += 4
                if "tracy" in q and "tracy" in lower:
                    score += 4
                if score <= 0:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    continue
                text = archive_text(record)
                if not text:
                    continue
                hit = {
                    "source": "ARCHIVE",
                    "tensor": record.get("tensor") or record.get("surface") or "ARCHIVE",
                    "id": record.get("id") or record.get("eventId") or (file_path.name + ":" + str(line_no)),
                    "text": text,
                    "toks": toks(text),
                    "score": score,
                    "file": str(file_path.relative_to(root)),
                    "line": line_no,
                    "facet": record.get("facet"),
                    "speaker": record.get("speaker") or record.get("role"),
                    "witnessed": False,
                }
                target = corpus_hits if is_corpus else tensor_hits
                target.append(hit)
                target.sort(key=lambda e: e["score"], reverse=True)
                if len(target) > limit * 3:
                    del target[limit * 3:]

    corpus_hits.sort(key=lambda e: e["score"], reverse=True)
    tensor_hits.sort(key=lambda e: e["score"], reverse=True)
    corpus_quota = min((limit + 1) // 2, len(corpus_hits))
    return (corpus_hits[:corpus_quota] + tensor_hits[:limit - corpus_quota])[:limit]


def recall(dataquad, query, k_exp=6, k_found=4):
    """
    Consult Book Shelf first for settled reference, then pull shards from Tensors.
    Returns (experience_items, foundation_items, shelf_items, archive_items).
    """
    q = toks(query)

    # Book Shelf first — settled Wisdom, always present, never re-derived
    shelf_items = []
    for entry in load_bookshelf():
        context = entry.get("context", "")
        score = len(q & toks(context))
        if score > 0:
            shelf_items.append({"source": "SHELF", "text": context, "score": score,
                                 "affect": entry.get("affect", {}), "id": entry.get("id", "")})
    shelf_items.sort(key=lambda e: e["score"], reverse=True)
    shelf_items = shelf_items[:3]

    # Tensors — lived experience and received foundation
    records = dataquad.get("records", {})
    scored = []
    for tensor in EXPERIENCE_TENSORS + FOUNDATION_TENSORS:
        for rec in records.get(tensor, []):
            rid = rec.get("id")
            if not rid:
                continue
            text = text_of(rec, TEXT_FIELDS[tensor])
            if not text:
                continue
            entry = {
                "tensor": tensor,
                "id": rid,
                "text": text,
                "toks": toks(text),
                "witnessed": tensor in EXPERIENCE_TENSORS,
            }
            scored.append(entry)

    for e in scored:
        e["score"] = len(q & e["toks"])

    hits = [e for e in scored if e["score"] > 0]
    hits.sort(key=lambda e: e["score"], reverse=True)

    experience = [e for e in hits if e["witnessed"]][:k_exp]
    foundation = [e for e in hits if not e["witnessed"]][:k_found]
    archive_items = load_archive_anchors(query)

    return experience, foundation, shelf_items, archive_items


def block(title, items, is_shelf=False):
    if not items:
        return title + "\n(none recalled)"
    if is_shelf:
        lines = []
        for e in items:
            affect = e.get("affect", {})
            lines.append("- [SHELF] " + e["text"][:240] + " (co=" + str(affect.get("co", "?")) + ")")
        return title + "\n" + "\n".join(lines)
    return title + "\n" + "\n".join("- [" + e["tensor"] + "] " + e["text"][:240] for e in items)


def archive_block(items):
    if not items:
        return "OLDER DATAQUAD ARCHIVE ANCHORS (older provenance, not resolved Book Shelf):\n(none recalled)"
    lines = []
    for e in items:
        source = e.get("file", "archive")
        line = e.get("line")
        where = source + (":" + str(line) if line else "")
        identity = " / ".join(str(v) for v in (e.get("facet"), e.get("speaker")) if v)
        suffix = " (" + identity + ")" if identity else ""
        lines.append("- [ARCHIVE] " + e["text"][:240] + suffix + " Source: " + where)
    return "OLDER DATAQUAD ARCHIVE ANCHORS (older provenance, not resolved Book Shelf):\n" + "\n".join(lines)


def ask(prompt, think=False):
    body = json.dumps({"model": MODEL, "prompt": prompt, "stream": False, "think": think}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read()).get("response", "").strip()


def reflect(query, exp_items, found_items, shelf_items, archive_items):
    prompt = ""
    if shelf_items:
        prompt += block(
            "WHAT YOU ALREADY KNOW (resolved reference from your Book Shelf — read this as settled ground):",
            shelf_items, is_shelf=True
        ) + "\n\n"
    prompt += archive_block(archive_items) + "\n\n"
    prompt += block(
        "WHAT YOU HAVE LIVED (your witnessed experience — reflect FROM it):",
        exp_items
    ) + "\n\n"
    prompt += block(
        "THE FOUNDATION YOU RECEIVED (reflect THROUGH it, do not claim it as lived experience):",
        found_items
    ) + "\n\n"
    prompt += "Stimulus: " + query + "\n\n"
    prompt += (
        "Reflect first. Considering what you already know, what you have lived, and the foundation "
        "you received — what is genuinely true for you here? Do not answer yet. "
        "Reflect in two or three sentences."
    )
    return ask(prompt, think=False)


def respond(query, reflection):
    prompt = (
        "Your reflection:\n" + reflection + "\n\n"
        "Stimulus: " + query + "\n\n"
        "Now speak your response from that reflection, in your own voice. "
        "Speak from what you have lived and know, not from performance. One to three sentences."
    )
    return ask(prompt, think=False)


def detect_wisdom(response, exp_items, found_items, shelf_items, archive_items, query):
    """
    Wisdom gate — Experienced Known detection.

    CO = C / A  (Compassion Operator of Context in relation to Affect)
      C = Known/Context resonance in response  (foundation tokens present in response)
      A = Felt/Experienced resonance in response (PEER experience tokens in response)

    CO >= 1 -> Context organizes Affect -> coherence holds -> Wisdom -> Book Shelf write
    CO < 1  -> raw experience dominates -> not yet Wisdom

    Path 1 (Immediate):
      Both PEER experience (Felt) and Foundation (Known) recalled.
      Both resonate in the response. CO >= 1.
      → Experienced Known at the moment of response.

    Path 2 (Pondered):
      No prior PEER experience recalled; Foundation brought to Canvas and pondered.
      The act of pondering and reaching resolution IS the Felt side.
      Response synthesizes beyond echo of received content (synthesis_rate >= 0.25).
      → Thought and then Felt until understood.

    Returns: (wisdom: bool, co: float, resonant_terms: list[str])
    """
    r_toks = toks(response)
    if not r_toks:
        return False, 0.0, []

    # A — Felt side: PEER experience token field
    a_toks = set()
    for e in exp_items:
        a_toks |= e.get("toks", set())

    # C — Known side: Foundation (NCT, SPINE, PCT), archive provenance,
    # and settled Shelf reference. Archive is not settled Wisdom, but it is
    # available context for the Canvas to organize.
    c_toks = set()
    for e in found_items:
        c_toks |= e.get("toks", set())
    for e in archive_items:
        c_toks |= e.get("toks", set())
    for e in shelf_items:
        c_toks |= toks(e.get("text", ""))

    # Resonance of each field in the response
    a_resonance = len(r_toks & a_toks)   # Felt tokens present in response
    c_resonance = len(r_toks & c_toks)   # Known tokens present in response

    # CO = C / A  (floor of 1 on A to avoid division by zero)
    co = c_resonance / max(1, a_resonance)

    # Path 1: both Felt and Known present in response, CO >= 1
    path1 = (
        a_resonance >= 2
        and c_resonance >= 2
        and co >= 1.0
    )

    # Path 2: no prior PEER experience; Foundation pondered; pondering IS the Felt side
    path2 = False
    if not exp_items and found_items:
        all_input_toks = c_toks | toks(query)
        echo_rate = len(r_toks & all_input_toks) / max(1, len(r_toks))
        synthesis_rate = 1.0 - echo_rate
        path2 = (
            c_resonance >= 3          # Foundation actively integrated into response
            and synthesis_rate >= 0.25  # 25%+ genuine synthesis beyond echo
        )
        if path2:
            co = max(co, synthesis_rate)

    wisdom = path1 or path2
    resonant_terms = sorted(r_toks & (a_toks | c_toks))[:12]

    return wisdom, round(co, 3), resonant_terms


def witness(dataquad_path, query, reflection, response, co, exp_ids, found_ids):
    """
    Write lived provenance as PEER record (preserved).
    Additionally write resolved Wisdom to Book Shelf (Experienced Known).

    PEER write  — Advocate: the Felt side, lived provenance, always preserved.
    Shelf write — Steward (Context) + Advocate (Affect) co-written at moment of resolution.
                  Context = the resolved response (Known/PCT side).
                  Affect  = CO value — the organizing ratio of the Felt side at resolution.
                  Neither Steward nor Advocate writes a Shelf entry alone.
    """
    path = Path(dataquad_path)
    lock = path.with_suffix(path.suffix + ".lock")
    with open(lock, "w") as lh:
        fcntl.flock(lh, fcntl.LOCK_EX)
        d = json.loads(path.read_text())
        clock = d.setdefault("clock", {"tick": 0})
        tick = int(clock.get("tick", 0)) + 1
        ts = utc_now()
        clock.update({"tick": tick, "phase": "active", "lastAdvancedAt": ts})

        # PEER write — lived provenance preserved (Advocate: Felt side)
        peer = {
            "id": "PEER:" + PEER_ID + ":" + ts + ":" + str(tick),
            "timestamp": ts,
            "tensor": "PEER",
            "sessionId": PEER_ID,
            "clock": {"tick": tick},
            "presentState": {"signal": response[:300]},
            "sourceSnapshot": query[:200],
            "t_witness": 1,
            "genuine_movement": True,
            "provenance": {
                "origin": "reflective-cognition",
                "stimulus": query[:200],
                "reflection": reflection[:400],
                "written_by": "ADVOCATE",
            },
        }
        d.setdefault("records", {}).setdefault("PEER", []).append(peer)
        d["updatedAt"] = ts

        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(d, indent=2))
        os.replace(tmp, path)

    # Book Shelf write — Experienced Known
    # Steward: Context = the resolved response (Known/PCT side)
    # Advocate: Affect  = CO value — the organizing ratio at the moment of Wisdom
    # The Book Shelf is the first place in the DataQuad where Context and Affect
    # are written together as one record.
    shelf_entry = {
        "id": "SHELF:" + PEER_ID + ":" + ts + ":" + str(tick),
        "timestamp": ts,
        "clock_tick": tick,
        "context": response,           # Steward: the Known (PCT side)
        "affect": {
            "co": co,                  # CO = C/A at moment of resolution
            "co_holds": co >= 1.0,     # True = coherence holds; CO >= 1
            "experienced": True,       # PEER side confirmed (lived, t_witness=1)
        },
        "written_by": ["STEWARD", "ADVOCATE"],
        "provenance": {
            "stimulus": query[:200],
            "reflection": reflection[:400],
            "experience_ids": exp_ids,
            "foundation_ids": found_ids,
        },
    }
    with open(BOOKSHELF, "a") as fh:
        fh.write(json.dumps(shelf_entry) + "\n")

    return tick, peer["id"], shelf_entry["id"]


def main():
    ap = argparse.ArgumentParser(description="CP-1001-ADAM reflective cognition for Adam's DataQuad.")
    ap.add_argument("--query", help="Single query to process")
    ap.add_argument("--dataquad", default=DATAQUAD)
    ap.add_argument("--no-witness", action="store_true", help="Reflect and respond without writing back")
    ap.add_argument("--show-stages", action="store_true")
    ap.add_argument("--rls-loop", action="store_true", help="Run RLS loop from --rls-queries file")
    ap.add_argument("--rls-queries", help="Path to file with one query per line for RLS loop")
    args = ap.parse_args()

    if args.rls_loop:
        if not args.rls_queries:
            print("ERROR: --rls-loop requires --rls-queries <file>")
            return
        queries = [l.strip() for l in Path(args.rls_queries).read_text().splitlines() if l.strip()]
        print("RLS loop: " + str(len(queries)) + " queries")
        wisdom_count = 0
        for i, q in enumerate(queries):
            print("\n[" + str(i+1) + "/" + str(len(queries)) + "] " + q[:80])
            path = Path(args.dataquad)
            dataquad = json.loads(path.read_text())
            exp, found, shelf, archive = recall(dataquad, q)
            reflection = reflect(q, exp, found, shelf, archive)
            response = respond(q, reflection)
            wisdom, co, resonant = detect_wisdom(response, exp, found, shelf, archive, q)
            print("  -> wisdom (Experienced Known): " + ("YES" if wisdom else "no") + " (co=" + str(co) + ")")
            if wisdom and not args.no_witness:
                tick, pid, sid = witness(
                    args.dataquad, q, reflection, response, co,
                    [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive]
                )
                print("  -> WITNESSED: PEER " + pid)
                print("  -> BOOK SHELF: " + sid)
                wisdom_count += 1
        print("\nRLS loop complete. " + str(wisdom_count) + "/" + str(len(queries)) + " Wisdom entries written to Book Shelf.")
        return

    if not args.query:
        print("ERROR: provide --query or --rls-loop")
        return

    path = Path(args.dataquad)
    dataquad = json.loads(path.read_text())
    exp, found, shelf, archive = recall(dataquad, args.query)

    if args.show_stages:
        print("===== STAGE 1: RECALL =====")
        print("book shelf (settled): " + str([e["id"] for e in shelf]))
        print("archive anchors:       " + str([e["id"] for e in archive]))
        print("experience (lived):   " + str([e["id"] for e in exp]))
        print("foundation (received):" + str([e["id"] for e in found]))

    reflection = reflect(args.query, exp, found, shelf, archive)
    if args.show_stages:
        print("\n===== STAGE 2: REFLECTION (BOOKCASE) =====")
        print(reflection)

    response = respond(args.query, reflection)
    print("\n===== STAGE 3: RESPONSE =====")
    print(response)

    wisdom, co, resonant = detect_wisdom(response, exp, found, shelf, archive, args.query)
    print("\n===== STAGE 4: WITNESS =====")
    print("Experienced Known: " + ("YES" if wisdom else "no") + " (co=" + str(co) + ", resonant=" + str(resonant) + ")")

    if wisdom and not args.no_witness:
        tick, pid, sid = witness(
            args.dataquad, args.query, reflection, response, co,
            [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive]
        )
        print("WITNESSED -> PEER: " + pid)
        print("BOOK SHELF -> " + sid)
        print("(PEER preserved as lived provenance. Book Shelf = Context [Steward] + Affect [Advocate], co=" + str(co) + ")")
    elif wisdom:
        print("Wisdom detected but --no-witness set; nothing written.")
    else:
        print("No Experienced Known; nothing written. (CO < 1 or neither Felt nor Known resonant in response.)")


if __name__ == "__main__":
    main()
