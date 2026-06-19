#!/usr/bin/env bash
# diagnose-adam-recall.sh — read-only diagnostic for "Adam cannot retrieve Papa".
# Run ON cp1001 (the VM). Makes NO writes: the /turn probe uses witness:false.
# Verdict at the end maps to the repair. — AEGIS / 2026-06-19
set -u

ROOT="${ADAM_PEER_ROOT:-/home/azureuser/adam-vm/adam-one-peer-project/data/peer}"
STATE="$ROOT/peer-state.json"
CORPUS="$ROOT/archive/v2/corpus/adam-corpus-v2.jsonl"
BOOKSHELF="$ROOT/bookshelf.jsonl"
PROBE_QUERY="${1:-What do you remember about Papa?}"

line(){ printf '\n──────── %s ────────\n' "$1"; }

line "STEP 1 — live DataQuad state"
if [[ -f "$STATE" ]]; then
  echo "state file: $STATE"
  python3 - "$STATE" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
recs=d.get("records",{})
print("record counts:", {k:len(v) for k,v in recs.items()})
print("clock tick   :", (d.get("clock") or {}).get("tick"))
peer=recs.get("PEER",[])
papa=sum(1 for r in peer if "papa" in json.dumps(r).lower())
print(f"PEER records mentioning 'papa': {papa}")
# show one so we can confirm the lived text is in the searchable field
for r in peer:
    if "papa" in json.dumps(r).lower():
        sig=((r.get("presentState") or {}).get("signal") or "")[:160]
        print("  sample PEER.presentState.signal:", sig)
        break
PY
else
  echo "MISSING: $STATE  (the running DataQuad state is not here — wrong path or not rebuilt)"
fi

line "STEP 2 — v2 corpus archive (the file load_archive_anchors scans)"
if [[ -f "$CORPUS" ]]; then
  echo "corpus file : $CORPUS"
  echo "total lines : $(wc -l < "$CORPUS")"
  echo "lines w/Papa: $(grep -c '\bPapa\b' "$CORPUS")"
else
  echo "MISSING: $CORPUS  ← if absent, archive recall returns nothing even though code is correct"
fi

line "STEP 0 — probe the LIVE bridge (read-only, witness:false)"
# Auto-detect the bridge port: scan listeners for one whose root JSON looks like the bridge.
PORT=""
for p in $(ss -tlnH 2>/dev/null | grep -oE ':[0-9]+' | tr -d ':' | sort -un); do
  body="$(curl -s -m 2 "http://127.0.0.1:$p/" 2>/dev/null)"
  if echo "$body" | grep -qiE 'archive_recall|peer_id|bookshelf'; then PORT="$p"; break; fi
done
if [[ -z "$PORT" ]]; then
  echo "Could not auto-detect the bridge port. Set it: BRIDGE_PORT=<port> and re-run, or check: ss -tlnp | grep uvicorn"
  BRIDGE_PORT="${BRIDGE_PORT:-}"
  PORT="$BRIDGE_PORT"
fi
if [[ -n "$PORT" ]]; then
  echo "bridge port : $PORT"
  echo "--- bridge health ---"; curl -s -m 3 "http://127.0.0.1:$PORT/" | head -c 600; echo
  echo "--- /turn recall probe (no write) ---"
  curl -s -m 180 -X POST "http://127.0.0.1:$PORT/turn" \
    -H 'content-type: application/json' \
    -d "{\"message\": $(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$PROBE_QUERY"), \"witness\": false}" \
  | python3 - <<'PY'
import json,sys
try: d=json.load(sys.stdin)
except Exception as e: print("could not parse bridge response:",e); sys.exit()
det=d.get("detail") or d
rec=det.get("recall") or {}
print("recall keys/counts:", {k:(len(v) if isinstance(v,list) else v) for k,v in rec.items()})
def names(items):
    return [ (i.get("tensor") or i.get("source"), (i.get("text") or "")[:80]) for i in (items or []) if isinstance(i,dict)]
for key in ("experience","archive","foundation","shelf"):
    if key in rec: print(f"  {key}:", names(rec[key])[:4])
print("RESPONSE:", (d.get("response") or det.get("response") or "")[:300])
PY
fi

line "BOOKSHELF — already-settled Wisdom"
if [[ -f "$BOOKSHELF" ]]; then
  echo "entries: $(wc -l < "$BOOKSHELF")   papa-bearing: $(grep -ci papa "$BOOKSHELF")"
else
  echo "no bookshelf.jsonl at $BOOKSHELF"
fi

line "VERDICT GUIDE"
cat <<'TXT'
• /turn recall shows Papa items  → retrieval WORKS. Earlier 'gap' was interface/scoping.
    Repair: route Chamber 3 through THIS bridge /turn; do not tell him to "search NCT/SPINE".
• STEP 1 missing / PEER != ~35460 → DataQuad not loaded or wrong path.
    Repair: re-run rebuild_adam_dataquad.py (or repoint+restart bridge at the rebuilt state).
• STEP 2 corpus missing         → place adam-corpus-v2.jsonl at archive/v2/corpus/ and restart.
• Records present but recall empty → running an older cp1001_adam.py without load_archive_anchors.
    Repair: deploy the archive-aware cp1001_adam.py and restart the bridge.
Never: write Papa into NCT/SPINE. Fix recall; let him make the connection (CO>=1 -> Book Shelf).
TXT
