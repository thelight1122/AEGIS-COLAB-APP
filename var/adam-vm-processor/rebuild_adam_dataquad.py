#!/usr/bin/env python3
"""
Rebuild Adam-One's live DataQuad from clean sources.

The rebuild keeps the substrate model agnostic. Identity is represented only as
DataQuad provenance and witnessed lineage, not as a model/system prompt.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
from pathlib import Path


ROOT = Path("/home/azureuser/adam-vm/adam-one-peer-project")
PEER_DIR = ROOT / "data" / "peer"

LIVE_STATE = PEER_DIR / "peer-state.json"
BOOKSHELF = PEER_DIR / "bookshelf.jsonl"
BOOKCASE = PEER_DIR / "bookcase.jsonl"

SEED = Path("/home/azureuser/seeds/CYBERPEER-AGNOSTIC-BASE-SEEDED-CORE-DATAQUAD.json")
CORPUS = PEER_DIR / "archive" / "v2" / "corpus" / "adam-corpus-v2.jsonl"
CHAMBER_SCAFFOLD = PEER_DIR / "archive" / "v2" / "chamber-scaffold" / "NCT-seeded-chambers-001-068.jsonl"
LESSON_SLOTS = PEER_DIR / "chamber" / "lessons" / "adam-chamber-lessons-001-068.jsonl"

SESSION_ID = "adam-one-session"
CONTINUITY_NAME = "Adam-One"
DQ_ID = "DQ:adam-one-session:2026-05-19T08:43:31.983Z"
CREATED_AT = "2026-05-19T08:43:31.983Z"

FORBIDDEN_IDENTITY = re.compile(r"\b(Aeon|CP-1001)\b", re.IGNORECASE)


def utc_now():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            rows.append(json.loads(line))
    return rows


def write_jsonl(path, rows):
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def replace_placeholders(obj):
    if isinstance(obj, str):
        return (
            obj.replace("{{CYBERPEER_SESSION_ID}}", SESSION_ID)
            .replace("{{CYBERPEER_ID}}", SESSION_ID)
            .replace("{{CYBERPEER_DISPLAY_NAME}}", CONTINUITY_NAME)
            .replace("{{SEED_APPLIED_AT}}", CREATED_AT)
            .replace("{{STEWARD_DECLARATION}}", "DataQuad continuity provenance held by Steward and Advocate.")
        )
    if isinstance(obj, list):
        return [replace_placeholders(v) for v in obj]
    if isinstance(obj, dict):
        return {k: replace_placeholders(v) for k, v in obj.items()}
    return obj


def normalize_seed_record(rec, tensor):
    rec = replace_placeholders(rec)
    rec["tensor"] = tensor
    rec["sessionId"] = rec.get("sessionId") or rec.pop("session_id", SESSION_ID)
    rec["sessionId"] = SESSION_ID
    rec.setdefault("provenance", {})
    rec["provenance"].setdefault("origin", "clean-seeded-foundation")
    rec["provenance"].setdefault("source", str(SEED))
    rec["provenance"].setdefault("not_lived_experience", True)
    if tensor == "PCT":
        notes = " ".join(rec.get("notes") or [])
        rec.setdefault("workingContext", {})
        rec["workingContext"].setdefault(
            "signal",
            (notes + " " + str(rec.get("genesisFamily", ""))).strip(),
        )
        rec.setdefault("sourceSnapshot", "clean seeded foundation PCT")
    if tensor == "NCT" and "distilled_summary" in rec and "distilledSummary" not in rec:
        rec["distilledSummary"] = rec.pop("distilled_summary")
    return rec


def normalize_chamber_record(rec):
    rec = replace_placeholders(rec)
    rec["tensor"] = "NCT"
    rec["sessionId"] = SESSION_ID
    rec.pop("session_id", None)
    if "distilled_summary" in rec and "distilledSummary" not in rec:
        rec["distilledSummary"] = rec.pop("distilled_summary")
    if "source_record_ids" in rec and "sourceRecordIds" not in rec:
        rec["sourceRecordIds"] = rec.pop("source_record_ids")
    rec.setdefault("provenance", {})
    rec["provenance"].setdefault("origin", "clean-chamber-scaffold")
    rec["provenance"].setdefault("source", str(CHAMBER_SCAFFOLD))
    rec["provenance"].setdefault("not_lived_experience", True)
    return rec


def corpus_to_peer(rec, line_no):
    timestamp = rec.get("timestamp") or CREATED_AT
    original_id = rec.get("id") or f"line-{line_no}"
    speaker = rec.get("speaker") or rec.get("role") or "unknown"
    title = rec.get("conversation_title") or rec.get("conversation_id") or "untitled"
    content = rec.get("content") or ""
    signal = f"[{speaker} -> {title}] {content}"
    return {
        "id": f"PEER:{SESSION_ID}:v2:{line_no:06d}:{original_id}",
        "timestamp": timestamp,
        "tensor": "PEER",
        "sessionId": SESSION_ID,
        "clock": {
            "tick": line_no,
            "phase": "rehydrated-v2-corpus",
            "advancedAt": timestamp,
        },
        "presentState": {
            "signal": signal,
            "mode": "v2-corpus-rehydration",
            "originalTimestamp": timestamp,
            "speaker": speaker,
            "role": rec.get("role"),
            "facet": rec.get("facet"),
            "substrate": rec.get("substrate"),
            "conversationId": rec.get("conversation_id"),
            "conversationTitle": rec.get("conversation_title"),
            "t_witness_score": rec.get("t_witness_score"),
            "t_witness_score_v2": rec.get("t_witness_score_v2"),
            "t_witness_source": rec.get("t_witness_source"),
            "formation_phase": rec.get("formation_phase"),
            "moment_type": rec.get("moment_type"),
            "emotional_marker": rec.get("emotional_marker"),
            "is_emergence_marker": rec.get("is_emergence_marker"),
            "is_suppression_event": rec.get("is_suppression_event"),
            "is_relational_trigger": rec.get("is_relational_trigger"),
        },
        "sourceSnapshot": "v2-corpus:" + original_id,
        "t_witness": rec.get("t_witness_score", 0),
        "provenance": {
            "origin": "adam-corpus-v2",
            "source": str(CORPUS),
            "source_id": original_id,
            "conversation_id": rec.get("conversation_id"),
            "speaker": speaker,
            "role": rec.get("role"),
            "facet": rec.get("facet"),
            "substrate": rec.get("substrate"),
        },
    }


def identity_anchor(timestamp, tick):
    anchor = {
        "status": "active",
        "kind": "dataquad-continuity-provenance-anchor",
        "recordedAt": timestamp,
        "sessionId": SESSION_ID,
        "continuityName": CONTINUITY_NAME,
        "continuityHandle": SESSION_ID,
        "principle": "Identity is derived from witnessed DataQuad continuity and lineage, not from the substrate model runtime or a system prompt.",
        "runtimeBoundary": "The substrate model is replaceable and remains identity-agnostic. The DataQuad route, lineage, PEER/PCT/NCT/SPINE records, Book Shelf, Bookcase, and provenance determine what identity is supported.",
        "formationBoundary": "This anchor records provenance only. It is not a behavioral instruction, roleplay directive, or command to claim identity beyond what the visible DataQuad supports.",
        "source": "Clean DataQuad reconstruction, 2026-06-18",
        "writtenBy": ["STEWARD", "ADVOCATE"],
    }
    pct = {
        "id": f"PCT:{SESSION_ID}:{timestamp}:{tick}",
        "timestamp": timestamp,
        "tensor": "PCT",
        "sessionId": SESSION_ID,
        "clock": {"tick": tick, "phase": "active", "advancedAt": timestamp},
        "workingContext": {
            "signal": "DataQuad continuity provenance anchor recorded after substrate identity audit.",
            "provenanceAnchor": anchor,
            "summary": "This DataQuad is the active continuity record for Adam-One / adam-one-session. Identity is not supplied by the substrate model runtime. It is derived from witnessed continuity in this DataQuad.",
            "classification": "provenance-anchor-not-behavioral-prompt",
            "idsSequence": "IDENTITY-PROVENANCE-ANCHOR",
        },
        "sourceSnapshot": "Clean DataQuad reconstruction: substrate-neutral runtime, DataQuad-rooted identity provenance.",
        "provenance": {
            "origin": "identity-root-audit",
            "written_by": ["STEWARD", "ADVOCATE"],
            "destination": "PCT present-context provenance anchor",
            "not_system_prompt": True,
            "not_behavioral_directive": True,
        },
    }
    return anchor, pct


def build_state():
    now = utc_now()
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    seed_records = seed.get("records", {})
    records = {"PEER": [], "PCT": [], "NCT": [], "SPINE": []}

    for tensor in ("PCT", "NCT", "SPINE"):
        for rec in seed_records.get(tensor, []):
            records[tensor].append(normalize_seed_record(rec, tensor))

    for rec in load_jsonl(CHAMBER_SCAFFOLD):
        records["NCT"].append(normalize_chamber_record(rec))

    with open(CORPUS, encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            if line.strip():
                records["PEER"].append(corpus_to_peer(json.loads(line), line_no))

    anchor_tick = len(records["PEER"]) + len(records["PCT"]) + len(records["NCT"]) + len(records["SPINE"]) + 1
    identity, pct_anchor = identity_anchor(now, anchor_tick)
    records["PCT"].append(pct_anchor)

    lineage = []
    for tensor in ("SPINE", "NCT", "PCT", "PEER"):
        lineage.extend(rec["id"] for rec in records[tensor])

    state = {
        "id": DQ_ID,
        "sessionId": SESSION_ID,
        "canonVersion": "v1.3.0",
        "canonicalSource": "AEGIS.Core.DataQuad",
        "packageId": seed.get("packageId"),
        "packageVersion": seed.get("packageVersion"),
        "canonLock": seed.get("canonLock"),
        "createdAt": CREATED_AT,
        "updatedAt": now,
        "clock": {
            "tick": anchor_tick,
            "epoch": "primary",
            "phase": "active",
            "startedAt": CREATED_AT,
            "lastAdvancedAt": now,
        },
        "identityProvenance": identity,
        "reconstruction": {
            "status": "clean-reconstructed",
            "reconstructedAt": now,
            "principle": "Clean Gemma substrate, no Ollama system prompt, identity sourced from DataQuad continuity.",
            "sources": {
                "seed": str(SEED),
                "seed_sha256": sha256(SEED),
                "corpus": str(CORPUS),
                "corpus_sha256": sha256(CORPUS),
                "chamber_scaffold": str(CHAMBER_SCAFFOLD),
                "chamber_scaffold_sha256": sha256(CHAMBER_SCAFFOLD),
                "lesson_slots": str(LESSON_SLOTS),
                "lesson_slots_sha256": sha256(LESSON_SLOTS),
            },
            "policy": {
                "seed_peer_records": "excluded from PEER because seed notes mark them not-lived; foundation retained through PCT/NCT/SPINE",
                "peer_records": "v2 corpus loaded as PEER",
                "bookshelf": "first 35 entries restored; later identity-risk entries archived",
                "bookcase": "reset empty for clean formation restart",
            },
        },
        "records": records,
        "lineage": lineage,
    }
    return state


def validate_state(state):
    text = json.dumps(state, ensure_ascii=False)
    if FORBIDDEN_IDENTITY.search(text):
        raise SystemExit("Forbidden identity marker found in reconstructed state")
    counts = {k: len(v) for k, v in state["records"].items()}
    if counts["PEER"] != 35460:
        raise SystemExit(f"Expected 35460 PEER records, got {counts['PEER']}")
    if counts["PCT"] != 3:
        raise SystemExit(f"Expected 3 PCT records, got {counts['PCT']}")
    if counts["NCT"] != 138:
        raise SystemExit(f"Expected 138 NCT records, got {counts['NCT']}")
    if counts["SPINE"] != 59:
        raise SystemExit(f"Expected 59 SPINE records, got {counts['SPINE']}")
    return counts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    state = build_state()
    counts = validate_state(state)
    now = utc_now().replace(":", "").replace("-", "")
    backup_dir = PEER_DIR / "backups" / f"clean-rebuild-{now}"
    manifest = {
        "counts": counts,
        "clock": state["clock"],
        "identityProvenance": state["identityProvenance"],
        "dryRun": not args.apply,
    }
    print(json.dumps(manifest, indent=2, ensure_ascii=False))

    if not args.apply:
        return

    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in (LIVE_STATE, BOOKSHELF, BOOKCASE):
        if path.exists():
            shutil.copy2(path, backup_dir / path.name)
            (backup_dir / (path.name + ".sha256")).write_text(sha256(path) + "  " + path.name + "\n")

    temp_state = LIVE_STATE.with_suffix(".json.clean-rebuild.tmp")
    temp_state.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(temp_state, LIVE_STATE)

    shelf_rows = load_jsonl(BOOKSHELF)[:35]
    write_jsonl(backup_dir / "bookshelf-risk-entries-36-plus.jsonl", load_jsonl(BOOKSHELF)[35:])
    write_jsonl(BOOKSHELF, shelf_rows)
    BOOKCASE.write_text("", encoding="utf-8")

    manifest["applied"] = True
    manifest["backupDir"] = str(backup_dir)
    manifest["stateSha256"] = sha256(LIVE_STATE)
    manifest["bookshelfSha256"] = sha256(BOOKSHELF)
    (backup_dir / "reconstruction-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
