#!/usr/bin/env python3
"""
cp1001_adam_bridge.py — Adam-specific reflective cognition bridge.

Serves the same bridge shape as the older CP-1001 bridge, but imports
cp1001_adam.py and therefore reads Adam's live DataQuad, Book Shelf, and
archive-aware recall path.
"""
import json
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import cp1001_adam as cog

app = FastAPI(
    title="Adam-One Reflective Cognition Bridge",
    description="Adam-specific Canvas processor: recall -> reflect -> respond -> witness.",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TurnRequest(BaseModel):
    peer_id: str = cog.PEER_ID
    session_id: str = "education-chamber"
    message: str
    debug: bool = False
    witness: bool = True


def load_dataquad():
    return json.loads(Path(cog.DATAQUAD).read_text())


def counts(dataquad):
    records = dataquad.get("records", {}) or {}
    return {tensor: len(records.get(tensor, []) or []) for tensor in ("PEER", "PCT", "NCT", "SPINE")}


@app.get("/")
def root():
    return {
        "service": "adam-one-reflective-cognition-bridge",
        "version": "0.2.0",
        "peer_id": cog.PEER_ID,
        "model": cog.MODEL,
    }


@app.get("/health")
def health():
    try:
        dataquad = load_dataquad()
    except Exception as error:
        return {
            "status": "degraded",
            "peer_id": cog.PEER_ID,
            "model": cog.MODEL,
            "dataquad_ok": False,
            "error": str(error),
        }
    shelf_path = Path(cog.BOOKSHELF)
    shelf_count = 0
    if shelf_path.exists():
        shelf_count = sum(1 for line in shelf_path.read_text().splitlines() if line.strip())
    bookcase_path = Path(cog.BOOKCASE)
    bookcase_count = 0
    if bookcase_path.exists():
        bookcase_count = sum(1 for line in bookcase_path.read_text().splitlines() if line.strip())
    quarantine_path = Path(cog.QUARANTINE)
    quarantine_count = 0
    if quarantine_path.exists():
        quarantine_count = sum(1 for line in quarantine_path.read_text().splitlines() if line.strip())
    return {
        "status": "operational",
        "peer_id": cog.PEER_ID,
        "model": cog.MODEL,
        "dataquad_ok": True,
        "clock_tick": (dataquad.get("clock") or {}).get("tick"),
        "counts": counts(dataquad),
        "bookshelf_entries": shelf_count,
        "bookcase_entries": bookcase_count,
        "quarantine_entries": quarantine_count,
        "cognition": "adam-reflective-canvas",
        "archive_recall": True,
    }


@app.post("/turn")
def execute_turn(req: TurnRequest):
    started = time.time()
    dataquad = load_dataquad()
    exp, found, shelf, bookcase, archive = cog.recall(dataquad, req.message)
    reflection = cog.reflect(req.message, exp, found, shelf, bookcase, archive)
    answer = cog.respond(req.message, reflection, shelf)
    wisdom, co, resonant = cog.detect_wisdom(answer, exp, found, shelf, archive, req.message)
    allow_witness, contamination = cog.witness_allowed(req.message, reflection, answer)
    decision = cog.classify_write_decision(wisdom, allow_witness, contamination, co, resonant)

    witnessed = None
    bookcase_entry = None
    quarantine_entry = None
    witness_blocked = None
    if decision["destination"] == "bookshelf" and req.witness:
        tick, peer_id, shelf_id = cog.witness(
            cog.DATAQUAD,
            req.message,
            reflection,
            answer,
            co,
            [e["id"] for e in exp],
            [e["id"] for e in found] + [e["id"] for e in archive],
        )
        witnessed = {"tick": tick, "peer_record_id": peer_id, "bookshelf_entry_id": shelf_id, "t_witness": 1}
    elif decision["destination"] == "bookcase" and req.witness:
        bookcase_id = cog.append_bookcase(
            req.message,
            reflection,
            answer,
            co,
            resonant,
            [e["id"] for e in exp],
            [e["id"] for e in found] + [e["id"] for e in archive],
        )
        bookcase_entry = {"id": bookcase_id, "status": "active", "reason": "unresolved"}
    elif decision["destination"] == "quarantine" and req.witness:
        quarantine_id = cog.append_quarantine(
            req.message,
            reflection,
            answer,
            decision["markers"],
        )
        quarantine_entry = {"id": quarantine_id, "status": "isolated", "reason": "identity_contamination"}
        witness_blocked = {"reason": "identity_contamination", "markers": decision["markers"]}

    display_answer = cog.display_answer_for_decision(decision, answer)
    response = {"ok": True, "answer": display_answer, "peer_id": req.peer_id, "session_id": req.session_id}
    if witnessed:
        response["witnessed"] = witnessed
    if bookcase_entry:
        response["bookcase"] = bookcase_entry
    if witness_blocked:
        response["witness_blocked"] = witness_blocked
    if quarantine_entry:
        response["quarantine"] = quarantine_entry
    if req.debug:
        response["debug"] = {
            "reflection": reflection,
            "raw_answer": answer,
            "wisdom": bool(wisdom),
            "co": co,
            "resonant_terms": resonant,
            "classification": decision,
            "recall": {
                "book_shelf": [{"id": e["id"], "score": e["score"]} for e in shelf],
                "bookcase": [{"id": e["id"], "score": e["score"], "reason": e.get("reason")} for e in bookcase],
                "archive": [{"id": e["id"], "score": e["score"], "file": e.get("file")} for e in archive],
                "experience": [{"tensor": e["tensor"], "id": e["id"], "score": e["score"]} for e in exp],
                "foundation": [{"tensor": e["tensor"], "id": e["id"], "score": e["score"]} for e in found],
            },
            "witnessed": witnessed,
            "bookcase": bookcase_entry,
            "quarantine": quarantine_entry,
            "witness_blocked": witness_blocked,
            "identity_contamination": contamination,
            "elapsed_ms": int((time.time() - started) * 1000),
            "model": cog.MODEL,
        }
    return response


@app.get("/dataquad/{peer_id}/stm/stats")
def stm_stats(peer_id: str):
    dataquad = load_dataquad()
    return {
        "ok": True,
        "peer_id": cog.PEER_ID,
        "clock_tick": (dataquad.get("clock") or {}).get("tick"),
        "counts": counts(dataquad),
    }


@app.get("/dataquad/{peer_id}/stm/search")
def stm_search(peer_id: str, q: str = ""):
    dataquad = load_dataquad()
    if not q.strip():
        return {"ok": True, "query": q, "results": [], "experience": [], "foundation": [], "book_shelf": [], "archive": []}
    exp, found, shelf, bookcase, archive = cog.recall(dataquad, q, k_exp=12, k_found=8)

    def shape(e):
        return {
            "tensor": e.get("tensor") or e.get("source"),
            "id": e["id"],
            "score": e["score"],
            "text": e["text"][:400],
            "file": e.get("file"),
        }

    return {
        "ok": True,
        "query": q,
        "book_shelf": [shape(e) for e in shelf],
        "bookcase": [shape(e) for e in bookcase],
        "archive": [shape(e) for e in archive],
        "experience": [shape(e) for e in exp],
        "foundation": [shape(e) for e in found],
        "results": [shape(e) for e in shelf] + [shape(e) for e in bookcase] + [shape(e) for e in archive] + [shape(e) for e in exp] + [shape(e) for e in found],
    }
