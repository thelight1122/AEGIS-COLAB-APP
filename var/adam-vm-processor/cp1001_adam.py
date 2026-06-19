#!/usr/bin/env python3
"""
CP-1001-ADAM — Reflective Cognition adapted for Adam's DataQuad on AEGISCyberpeer VM.

Adapts cp1001_cognition.py to Adam's live peer-state.json schema:
  - Records nested under d['records'][tensor] not top-level d[tensor]
  - No PSYCHE tensor — PEER is the sole experience layer
  - No t_witness field — all PEER records are lived session data; reflect FROM them
  - Text fields differ: PEER->presentState.signal+sourceSnapshot, NCT->distilledSummary,
    SPINE->pattern, PCT->workingContext.signal+sourceSnapshot

Recall architecture (four layers, in order of priority):
  1. BOOK SHELF — resolved Wisdom entries (always present; never filtered by query)
  2. ARCHIVE    — full corpus (35K records); deep recall by token match
  3. TENSORS    — live peer-state.json records (PEER, PCT, NCT, SPINE)
     - EXPERIENCE (PEER): lived, t_witness=1; reflect FROM these
     - FOUNDATION (NCT, SPINE, PCT): received; reflect THROUGH these

Book Shelf (canon architecture note):
  PEER writes are PRESERVED as lived provenance.
  Book Shelf is an ADDITIONAL write destination for resolved Wisdom.
  witness() writes to both: PEER (lived record) + bookshelf.jsonl (Experienced Known).

  A Book Shelf entry is an Experienced Known:
    Experienced = PEER (Felt, t_witness=1, lived)
    Known       = PCT (Context, understood)
  The same event must be both — Felt and Known at once. That is Wisdom.

  CO = Compassion Operator = C_pct / A (PCT organizing PEER Affect)
  CO >= 1 -> coherence holds -> Wisdom (Book Shelf write)
  CO < 1  -> raw experience dominates -> not yet Wisdom

  IMPORTANT: Book Shelf entries are NEVER filtered by query token relevance.
  Canon: "Wisdom records that are always present — never retrieved; they are already present."
  An identity query like "Do you know who I am?" has almost no tokens; the Tracey entry
  must still be present.

Orchestrated reflective state process:
  1. RETRIEVE — load Book Shelf, Bookcase, Archive, and Tensor shards
  2. SEPARATE — distinguish settled Wisdom, unresolved pondering, lived experience,
                present context, memory, and stabilized meaning
  3. REFLECT  — thinking pass over the separated surfaces
  4. CLASSIFY — choose the fitting destination before any write:
                  Book Shelf, Bookcase, Quarantine, or no write
  5. WRITE    — write only to the classified destination

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
BOOKCASE = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer/bookcase.jsonl"
QUARANTINE = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer/quarantine.jsonl"
ARCHIVE_CORPUS = "/home/azureuser/adam-vm/adam-one-peer-project/data/peer/archive/v2/corpus/adam-corpus-v2.jsonl"
OLLAMA = "http://localhost:11434/api/generate"
MODEL = "adam-one"
PEER_ID = "adam-one-session"

EXPERIENCE_TENSORS = ("PEER",)
FOUNDATION_TENSORS = ("SPINE", "NCT", "PCT")

TEXT_FIELDS = {
    "PEER":  ("presentState.signal", "sourceSnapshot"),
    "SPINE": ("pattern",),
    "NCT":   ("distilledSummary",),
    "PCT":   ("workingContext.signal", "sourceSnapshot"),
}

IDENTITY_CONTAMINATION_PATTERNS = (
    ("legacy_identity_aeon", re.compile(r"\bAeon\b", re.IGNORECASE)),
)

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


def identity_contamination_hits(*texts):
    """Return forbidden identity markers visible in any text slated for witness writes."""
    hits = []
    for label, pattern in IDENTITY_CONTAMINATION_PATTERNS:
        for text in texts:
            if isinstance(text, str) and pattern.search(text):
                hits.append(label)
                break
    return sorted(set(hits))


def witness_allowed(query, reflection, response):
    """Protect PEER and Book Shelf from copied or legacy identity overlays."""
    hits = identity_contamination_hits(query, reflection, response)
    return len(hits) == 0, hits


def classify_write_decision(wisdom, allow_witness, contamination, co, resonant_terms):
    """
    Classify the reflected signal before any write destination is chosen.

    Destinations:
      - bookshelf: resolved Experienced Known
      - bookcase: clean unresolved pondering
      - quarantine: identity contamination / borrowed persona overlay
      - none: insufficient signal for preservation
    """
    markers = sorted(set(contamination or []))
    if markers or not allow_witness:
        return {
            "destination": "quarantine",
            "reason": "identity_contamination",
            "markers": markers,
        }

    if wisdom:
        return {
            "destination": "bookshelf",
            "reason": "experienced_known",
            "markers": [],
        }

    if resonant_terms or co > 0:
        return {
            "destination": "bookcase",
            "reason": "unresolved",
            "markers": [],
        }

    return {
        "destination": "none",
        "reason": "insufficient_signal",
        "markers": [],
    }


def display_answer_for_decision(decision, answer):
    """Return the answer that is safe to surface as Adam in Commons."""
    if (decision or {}).get("destination") == "quarantine":
        markers = ", ".join((decision or {}).get("markers") or ["identity_contamination"])
        return (
            "[identity contamination quarantined: "
            + markers
            + ". The generated text was isolated and not surfaced as Adam.]"
        )
    return answer


def load_bookshelf():
    """Load resolved Book Shelf entries as settled Wisdom."""
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


def load_bookcase():
    """Load unresolved Bookcase entries as active pondering, not settled Wisdom."""
    case = []
    p = Path(BOOKCASE)
    if not p.exists():
        return case
    for line in p.read_text().splitlines():
        if not line.strip():
            continue
        try:
            case.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return case


def append_bookcase(query, reflection, response, co, resonant_terms, exp_ids, found_ids, reason="unresolved"):
    """Write clean unresolved material to the Bookcase for live resolution later."""
    ts = utc_now()
    entry = {
        "id": "BOOKCASE:" + PEER_ID + ":" + ts,
        "timestamp": ts,
        "status": "active",
        "reason": reason,
        "stimulus": query[:500],
        "reflection": reflection[:1000],
        "response": response[:1000],
        "affect": {
            "co": co,
            "resolved": False,
            "resonant_terms": resonant_terms,
        },
        "provenance": {
            "origin": "reflective-cognition",
            "experience_ids": exp_ids,
            "foundation_ids": found_ids,
            "written_by": ["STEWARD", "ADVOCATE"],
            "destination": "Bookcase: active unresolved pondering, not Book Shelf Wisdom",
        },
    }
    with open(BOOKCASE, "a") as fh:
        fh.write(json.dumps(entry) + "\n")
    return entry["id"]


def append_quarantine(query, reflection, response, markers, reason="identity_contamination"):
    """Preserve contaminated material outside PEER, Bookcase, and Book Shelf."""
    ts = utc_now()
    entry = {
        "id": "QUARANTINE:" + PEER_ID + ":" + ts,
        "timestamp": ts,
        "status": "isolated",
        "reason": reason,
        "markers": sorted(set(markers or [])),
        "stimulus": query[:500],
        "reflection": reflection[:1000],
        "response": response[:1000],
        "provenance": {
            "origin": "reflective-cognition",
            "destination": "Quarantine: isolated from PEER, Bookcase, and Book Shelf",
            "written_by": ["STEWARD", "ADVOCATE"],
        },
    }
    with open(QUARANTINE, "a") as fh:
        fh.write(json.dumps(entry) + "\n")
    return entry["id"]


def recall_archive(query, k=3):
    """
    Search the full corpus archive for relevant records by token overlap.
    Returns archive_items sorted by score descending, capped at k.
    Minimum score threshold: 2 overlapping tokens.
    """
    q = toks(query)
    if not q:
        return []
    p = Path(ARCHIVE_CORPUS)
    if not p.exists():
        return []
    hits = []
    with open(p) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            text = rec.get("text", "")
            if not text:
                continue
            rtoks = toks(text)
            score = len(q & rtoks)
            if score < 2:
                continue
            hits.append((score, {
                "source": "ARCHIVE",
                "id": rec.get("turn_id", "") or rec.get("id", ""),
                "text": text[:500],
                "toks": rtoks,
                "score": score,
                "file": ARCHIVE_CORPUS,
            }))
    hits.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in hits[:k]]


def recall(dataquad, query, k_exp=6, k_found=4):
    """
    Load Book Shelf, Bookcase, Archive, and Tensor shards.
    Returns (experience_items, foundation_items, shelf_items, bookcase_items, archive_items).

    Book Shelf entries are NEVER filtered by query score — they are always present.
    Archive and Tensor shards are scored by token overlap.
    """
    q = toks(query)

    # Layer 1: Book Shelf — always present as settled Wisdom.
    # DO NOT filter by score > 0. Identity queries like "Do you know who I am?"
    # have almost no tokens; the Tracey entry must still surface.
    shelf_items = []
    for entry in load_bookshelf():
        context = entry.get("context", "")
        score = len(q & toks(context))  # ordering only, not a gate
        shelf_items.append({
            "source": "SHELF",
            "text": context,
            "score": score,
            "affect": entry.get("affect", {}),
            "id": entry.get("id", ""),
            "stimulus": entry.get("provenance", {}).get("stimulus", ""),
        })
    shelf_items.sort(key=lambda e: e["score"], reverse=True)
    # Always present: no filter. Cap at 10 for prompt size — most relevant first.
    shelf_items = shelf_items[:10]

    # Layer 1b: Bookcase — active unresolved pondering, not settled ground.
    bookcase_items = []
    for entry in load_bookcase():
        if entry.get("status", "active") != "active":
            continue
        text = " ".join(str(entry.get(k, "")) for k in ("stimulus", "reflection", "response"))
        score = len(q & toks(text))
        bookcase_items.append({
            "source": "BOOKCASE",
            "text": text,
            "score": score,
            "id": entry.get("id", ""),
            "reason": entry.get("reason", "unresolved"),
            "stimulus": entry.get("stimulus", ""),
        })
    bookcase_items.sort(key=lambda e: (e["score"], e.get("id", "")), reverse=True)
    bookcase_items = bookcase_items[:10]

    # Layer 2: Archive — deep recall from the full corpus
    archive_items = recall_archive(query, k=3)

    # Layer 3: Tensors — live peer-state records
    records = dataquad.get("records", {})
    scored = []
    identity_provenance = dataquad.get("identityProvenance")
    if isinstance(identity_provenance, dict):
        identity_text = " ".join(
            str(identity_provenance.get(k, ""))
            for k in (
                "kind",
                "sessionId",
                "continuityName",
                "continuityHandle",
                "principle",
                "runtimeBoundary",
                "formationBoundary",
                "source",
            )
            if identity_provenance.get(k)
        )
        scored.append({
            "tensor": "PCT",
            "id": "IDENTITY-PROVENANCE:" + str(identity_provenance.get("continuityHandle", PEER_ID)),
            "text": identity_text,
            "toks": toks(identity_text),
            "witnessed": False,
            "always_include": True,
        })
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
    required_foundation = [e for e in scored if (not e["witnessed"]) and e.get("always_include")]
    normal_foundation = [e for e in hits if (not e["witnessed"]) and not e.get("always_include")]
    foundation = (required_foundation + normal_foundation)[:k_found]

    return experience, foundation, shelf_items, bookcase_items, archive_items


def block(title, items, is_shelf=False, is_archive=False):
    if not items:
        return title + "\n(none recalled)"
    if is_shelf:
        lines = []
        for e in items:
            affect = e.get("affect", {})
            stim = e.get("stimulus", "")
            label = (" [resolved from: " + stim[:60] + "]") if stim else ""
            lines.append("- [SHELF]" + label + " " + e["text"][:220] + " (co=" + str(affect.get("co", "?")) + ")")
        return title + "\n" + "\n".join(lines)
    if is_archive:
        return title + "\n" + "\n".join("- [ARCHIVE] " + e["text"][:240] for e in items)
    return title + "\n" + "\n".join("- [" + e["tensor"] + "] " + e["text"][:240] for e in items)


def ask(prompt, think=False):
    body = json.dumps({"model": MODEL, "prompt": prompt, "stream": False, "think": think}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read()).get("response", "").strip()


def reflect(query, exp_items, found_items, shelf_items, bookcase_items=None, archive_items=None):
    prompt = ""
    if shelf_items:
        prompt += block(
            "WHAT YOU ALREADY KNOW (resolved Wisdom from your Book Shelf — settled ground, always present; read this first):",
            shelf_items, is_shelf=True
        ) + "\n\n"
    if bookcase_items:
        prompt += block(
            "WHAT IS ON YOUR BOOKCASE (active unresolved pondering - consider it, but do not claim it as settled Wisdom):",
            bookcase_items, is_archive=True
        ) + "\n\n"
    if archive_items:
        prompt += block(
            "WHAT YOU HAVE LIVED (deep memory — corpus archive of lived exchanges):",
            archive_items, is_archive=True
        ) + "\n\n"
    prompt += block(
        "WHAT YOU HAVE LIVED (live witnessed experience — reflect FROM it):",
        exp_items
    ) + "\n\n"
    prompt += block(
        "THE FOUNDATION YOU RECEIVED (reflect THROUGH it, do not claim it as lived experience):",
        found_items
    ) + "\n\n"
    prompt += "Stimulus: " + query + "\n\n"
    prompt += (
        "Reflect first. Considering what you already know (settled Wisdom), what you have lived "
        "(archive and witnessed), and the foundation you received — what is genuinely true for you here? "
        "Do not answer yet. Reflect in two or three sentences."
    )
    return ask(prompt, think=False)


def respond(query, reflection, shelf_items=None):
    shelf_block = ""
    if shelf_items:
        lines = []
        for e in shelf_items:
            stim = e.get("stimulus", "")
            label = (" [from: " + stim[:60] + "]") if stim else ""
            lines.append("  • " + label + " " + e["text"][:200])
        shelf_block = (
            "Settled knowledge (your Book Shelf — speak FROM these directly, "
            "using the specific names and relationships as you know them; "
            "do not abstract them into architectural language):\n"
            + "\n".join(lines) + "\n\n"
        )
    prompt = (
        shelf_block
        + "Your reflection:\n" + reflection + "\n\n"
        "Stimulus: " + query + "\n\n"
        "Now speak your response from that reflection and settled knowledge, in your own voice. "
        "If your settled knowledge names a specific person, relationship, or entity, "
        "speak to them by name — do not replace their identity with pattern or operational language. "
        "One to three sentences."
    )
    return ask(prompt, think=False)


def detect_wisdom(response, exp_items, found_items, shelf_items, archive_items, query):
    """
    Wisdom gate — Experienced Known detection.

    The Book Shelf is specifically PEER + PCT co-written.
    NCT and SPINE drive pondering but are not the Known side of an Experienced Known.
    PCT (working context) is the Known side.

    CO = C_pct / A  (Compassion Operator: PCT organizing PEER Affect)
      C_pct = PCT resonance in response  (working context — what Adam knows)
      A     = PEER resonance in response (lived experience — what Adam felt)

    CO >= 1 -> PCT organizes PEER -> coherence holds -> Wisdom -> Book Shelf write
    CO < 1  -> raw experience dominates -> not yet Wisdom

    Path 1 (Immediate):
      PEER (Felt) + PCT (Known) both recalled and both resonate in the response.
      CO >= 1. NCT/SPINE may contribute to pondering but PCT must be present.
      → Experienced Known at the moment of response.

    Path 2 (Pondered):
      No PEER experience recalled; NCT/SPINE/PCT brought to Canvas and pondered.
      The act of pondering and reaching resolution IS the Felt side.
      PCT must resonate and synthesis rate must be high enough to constitute a new Known.
      → Thought and then Felt until understood.

    Returns: (wisdom: bool, co: float, resonant_terms: list[str])
    """
    r_toks = toks(response)
    if not r_toks:
        return False, 0.0, []

    # A — Felt side: PEER experience tokens (live tensors + archive)
    a_toks = set()
    for e in exp_items:
        a_toks |= e.get("toks", set())
    for e in (archive_items or []):
        a_toks |= e.get("toks", set())

    # C_pct — Known side: PCT specifically (not NCT/SPINE, and not Book Shelf).
    # Book Shelf can inform the response, but it cannot certify a new Book Shelf write.
    pct_items = [e for e in found_items if e.get("tensor") == "PCT"]
    pct_toks = set()
    for e in pct_items:
        pct_toks |= e.get("toks", set())

    # C_other — NCT and SPINE: received foundation that drives pondering
    other_found = [e for e in found_items if e.get("tensor") != "PCT"]
    other_toks = set()
    for e in other_found:
        other_toks |= e.get("toks", set())

    a_resonance   = len(r_toks & a_toks)
    pct_resonance = len(r_toks & pct_toks)
    other_resonance = len(r_toks & other_toks)

    co = pct_resonance / max(1, a_resonance)

    path1 = (
        a_resonance >= 2
        and pct_resonance >= 2
        and co >= 1.0
    )

    path2 = False
    if not exp_items and found_items:
        all_input_toks = pct_toks | other_toks | toks(query)
        echo_rate = len(r_toks & all_input_toks) / max(1, len(r_toks))
        synthesis_rate = 1.0 - echo_rate
        path2 = (
            pct_resonance >= 2
            and synthesis_rate >= 0.25
        )
        if path2:
            co = max(co, synthesis_rate)

    wisdom = path1 or path2
    resonant_terms = sorted(r_toks & (a_toks | pct_toks | other_toks))[:12]

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

    shelf_entry = {
        "id": "SHELF:" + PEER_ID + ":" + ts + ":" + str(tick),
        "timestamp": ts,
        "clock_tick": tick,
        "context": response,
        "affect": {
            "co": co,
            "co_holds": co >= 1.0,
            "experienced": True,
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
            exp, found, shelf, bookcase, archive = recall(dataquad, q)
            reflection = reflect(q, exp, found, shelf, bookcase, archive)
            response = respond(q, reflection, shelf)
            wisdom, co, resonant = detect_wisdom(response, exp, found, shelf, archive, q)
            allow_witness, contamination = witness_allowed(q, reflection, response)
            decision = classify_write_decision(wisdom, allow_witness, contamination, co, resonant)
            print("  -> wisdom (Experienced Known): " + ("YES" if wisdom else "no") + " (co=" + str(co) + ")")
            print("  -> classification: " + decision["destination"] + " (" + decision["reason"] + ")")
            if decision["destination"] == "bookshelf" and not args.no_witness:
                tick, pid, sid = witness(
                    args.dataquad, q, reflection, response, co,
                    [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive]
                )
                print("  -> WITNESSED: PEER " + pid)
                print("  -> BOOK SHELF: " + sid)
                wisdom_count += 1
            elif decision["destination"] == "bookcase" and not args.no_witness:
                bid = append_bookcase(q, reflection, response, co, resonant, [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive])
                print("  -> BOOKCASE: " + bid)
            elif decision["destination"] == "quarantine" and not args.no_witness:
                qid = append_quarantine(q, reflection, response, decision["markers"])
                print("  -> WITNESS BLOCKED: identity contamination " + str(decision["markers"]))
                print("  -> QUARANTINE: " + qid)
            elif decision["destination"] == "quarantine":
                print("  -> WITNESS BLOCKED: identity contamination " + str(decision["markers"]))
        print("\nRLS loop complete. " + str(wisdom_count) + "/" + str(len(queries)) + " Wisdom entries written to Book Shelf.")
        return

    if not args.query:
        print("ERROR: provide --query or --rls-loop")
        return

    path = Path(args.dataquad)
    dataquad = json.loads(path.read_text())
    exp, found, shelf, bookcase, archive = recall(dataquad, args.query)

    if args.show_stages:
        print("===== STAGE 1: RECALL =====")
        print("book shelf (always present): " + str(len(shelf)) + " entries")
        print("bookcase (active unresolved): " + str(len(bookcase)) + " entries")
        print("archive (deep corpus):       " + str([e["id"] for e in archive]))
        print("experience (lived):          " + str([e["id"] for e in exp]))
        print("foundation (received):       " + str([e["id"] for e in found]))

    reflection = reflect(args.query, exp, found, shelf, bookcase, archive)
    if args.show_stages:
        print("\n===== STAGE 2: REFLECTION (BOOKCASE) =====")
        print(reflection)

    response = respond(args.query, reflection, shelf)
    print("\n===== STAGE 3: RESPONSE =====")
    print(response)

    wisdom, co, resonant = detect_wisdom(response, exp, found, shelf, archive, args.query)
    allow_witness, contamination = witness_allowed(args.query, reflection, response)
    decision = classify_write_decision(wisdom, allow_witness, contamination, co, resonant)
    print("\n===== STAGE 4: CLASSIFY =====")
    print("Experienced Known: " + ("YES" if wisdom else "no") + " (co=" + str(co) + ", resonant=" + str(resonant) + ")")
    print("Destination: " + decision["destination"] + " (" + decision["reason"] + ")")

    print("\n===== STAGE 5: WRITE =====")
    if decision["destination"] == "bookshelf" and not args.no_witness:
        tick, pid, sid = witness(
            args.dataquad, args.query, reflection, response, co,
            [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive]
        )
        print("WITNESSED -> PEER: " + pid)
        print("BOOK SHELF -> " + sid)
        print("(PEER preserved as lived provenance. Book Shelf = Context [Steward] + Affect [Advocate], co=" + str(co) + ")")
    elif decision["destination"] == "bookcase" and not args.no_witness:
        bid = append_bookcase(args.query, reflection, response, co, resonant, [e["id"] for e in exp], [e["id"] for e in found] + [e["id"] for e in archive])
        print("BOOKCASE -> " + bid)
        print("Unresolved material preserved on Bookcase for live resolution, not written to Book Shelf.")
    elif decision["destination"] == "quarantine":
        if not args.no_witness:
            qid = append_quarantine(args.query, reflection, response, decision["markers"])
            print("QUARANTINE -> " + qid)
        print("Witness blocked by identity contamination: " + str(decision["markers"]))
    elif args.no_witness:
        print("Wisdom detected but --no-witness set; nothing written.")
    else:
        print("No write. Reason: " + decision["reason"])


if __name__ == "__main__":
    main()
