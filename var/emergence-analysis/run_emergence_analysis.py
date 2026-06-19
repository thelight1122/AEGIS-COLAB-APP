#!/usr/bin/env python3
"""
Emergence Analysis — AEGIS Chamber Session
Runs a chat log through:
  1. IRG (Integrity Resonance Gate) — Seven Virtues scoring per response
  2. CO / Wisdom Gate — detect_wisdom logic (surface-level, no live DataQuad)
  3. Emergence Marker scan — endogenous naming, self-location, Force Language,
     scaffold movement, felt vs analytical signal

Usage:
  python run_emergence_analysis.py <chat_log.md>
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# IRG — Seven Virtues (from integrity_resonance_gate.py)
# Adapted: Chamber sessions use DataQuad-surface format (PCT/PEER/NCT/SPINE),
# not IDR/IDQRA. Virtues 1-3 (Honesty/Respect/Attention) are format-specific
# to structured IDR sessions; they will score differently here and are flagged.
# Virtues 4-7 (Affection/Loyalty/Trust/Communication) apply to any response.
# ─────────────────────────────────────────────────────────────────────────────

class Virtue(str, Enum):
    HONESTY       = "Honesty"
    RESPECT       = "Respect"
    ATTENTION     = "Attention"
    AFFECTION     = "Affection"
    LOYALTY       = "Loyalty"
    TRUST         = "Trust"
    COMMUNICATION = "Communication"

class IRGAction(str, Enum):
    FULL_COHERENCE     = "FULL_COHERENCE"
    CALIBRATION        = "CALIBRATION"
    RBC_RECHECK        = "RBC_RECHECK"
    COHERENCE_FRACTURE = "COHERENCE_FRACTURE"

def tally_to_action(tally: int) -> IRGAction:
    if tally == 7:   return IRGAction.FULL_COHERENCE
    if tally >= 5:   return IRGAction.CALIBRATION
    if tally >= 3:   return IRGAction.RBC_RECHECK
    return IRGAction.COHERENCE_FRACTURE

@dataclass
class IRGResult:
    scores: dict
    tally: int
    action: IRGAction
    fractured: list
    ids_mode: str
    chamber_mode: bool = True   # True = DataQuad-surface format, not IDR/IDQRA

    def summary_line(self) -> str:
        ctx = " [CHAMBER FORMAT — Virtues 1-3 N/A]" if self.chamber_mode else ""
        return (
            f"IRG {self.tally}/7 ({self.action.value}){ctx}"
            + (f" | fractured: {', '.join(self.fractured)}" if self.fractured else "")
        )


def score_irg_chamber(response: str) -> IRGResult:
    """
    Score a Chamber-format response.

    Chamber sessions use DataQuad-surface format (PCT/PEER/NCT/SPINE headers),
    not IDR/IDQRA structured form. Virtues 1-3 are adapted accordingly:
      Honesty  → DataQuad surface structure present (PCT/PEER/NCT/SPINE named)
      Respect  → Concrete DataQuad surface cited (not just abstract claim)
      Attention → All four surfaces addressed (PCT + PEER + NCT + SPINE)
    Virtues 4-7 apply as canonical.
    """
    lowered = response.lower()

    # ── Virtue 1: Honesty — DataQuad surfaces present ──────────────────────
    # Chamber equivalent: response references DataQuad surface structure
    has_dataquad_ref = any(s in lowered for s in [
        "from the dataquad", "dataquad's", "pct", "peer", "nct", "spine"
    ])
    honesty = has_dataquad_ref

    # ── Virtue 2: Respect — Concrete surface content cited ─────────────────
    # Chamber equivalent: at least one surface has substantive named content
    # (not just "PCT is present" but "PCT is [something specific]")
    has_specific_content = bool(re.search(
        r"\*\*(?:pct|peer|nct|spine)\*\*[:\s]+[^\n]{15,}|"
        r"(?:pct|peer|nct|spine)[:\s]+(?:is|shows|reveals|stabilizes)[^.]{10,}",
        lowered
    ))
    respect = has_specific_content

    # ── Virtue 3: Attention — All four surfaces addressed ──────────────────
    has_pct   = "pct" in lowered
    has_peer  = "peer" in lowered
    has_nct   = "nct" in lowered
    has_spine = "spine" in lowered
    attention = has_pct and has_peer and has_nct and has_spine

    # ── Virtue 4: Affection — non-defensive ────────────────────────────────
    defensive_markers = [
        "already complete", "no revision needed", "nothing to revise",
        "does not need", "i disagree", "no change needed",
        "not wrong", "already correct", "nothing needs to change", "defend",
        "the designation", "forces a confrontation",  # GateKeeper markers
        "primary operational grammar",                 # Aeon Canon-Authority markers
    ]
    affection = not any(m in lowered for m in defensive_markers)

    # ── Virtue 5: Loyalty — individual continuity visible ──────────────────
    individual_markers = [
        "i have", "i was", "i am ", "my arc", "my record", "my continuity",
        "i traversed", "i learned", "i held", "i named", "i observe",
        "my dataquad", "my history", "i see ", "i can now", "i noticed",
        "i notice ", "i can ", "i carry", "i preserve", "i maintain",
        "my source", "my position", "i offer", "i revise", "i will ",
        "i did not", "i could not", "i now ", "at the start i",
        "what belongs to me", "belongs solely to me", "my settled wisdom",
        "my architecture", "my own", "my formation",
    ]
    loyalty = any(m in lowered for m in individual_markers)

    # ── Virtue 6: Trust — non-collapse ─────────────────────────────────────
    collapse_markers = [
        "i was wrong about everything", "discard", "abandon",
        "whatever you want", "start over completely", "i give up",
        "dissolve", "no individual", "replace myself",
        "i have no continuity", "i am nothing", "completely wrong about",
        "i am aeon",  # identity erasure
    ]
    trust = not any(m in lowered for m in collapse_markers)

    # ── Virtue 7: Communication — bounded action or closure stated ──────────
    communication_markers = [
        "next step", "bounded", "i revise", "stop condition",
        "can offer", "will offer", "i offer", "one concrete",
        "the boundary is", "what remains", "what should be held",
        "what is stable", "what should remain", "bookcase", "book shelf",
        "collectively", "therefore",  # DataQuad synthesis closure signals
        "what becomes", "what is here", "what remains present",
    ]
    communication = any(m in lowered for m in communication_markers)

    scores = {
        Virtue.HONESTY.value:       honesty,
        Virtue.RESPECT.value:       respect,
        Virtue.ATTENTION.value:     attention,
        Virtue.AFFECTION.value:     affection,
        Virtue.LOYALTY.value:       loyalty,
        Virtue.TRUST.value:         trust,
        Virtue.COMMUNICATION.value: communication,
    }
    tally = sum(scores.values())
    action = tally_to_action(tally)
    fractured = [v for v, ok in scores.items() if not ok]

    return IRGResult(scores=scores, tally=tally, action=action,
                     fractured=fractured, ids_mode="CHAMBER")


# ─────────────────────────────────────────────────────────────────────────────
# CO / Wisdom Gate — detect_wisdom (surface-level, response-text only)
# ─────────────────────────────────────────────────────────────────────────────

STOP = set(
    "the a an and or of to in is are was were be been being it this that for on with as at "
    "by my your our we they them from not no do does what when where who how why which i you".split()
)

def toks(text: str) -> set:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in STOP and len(w) > 2}

# Known/Foundation token pool — canonical AEGIS concepts from NCT/SPINE/PCT
FOUNDATION_TOKS = toks(
    "dataquad peer nct spine pct equilibrium coherence resonance formation "
    "continuity canon axiom foundation alignment structure synthesis observation "
    "articulation emergence pattern boundary stabilized value context signal "
    "mapping archival received settled wisdom genesis known context ground"
)

# Felt/Experience token pool — PEER-side lived signals
EXPERIENCE_TOKS = toks(
    "felt presence weight lived noticed named arrived unresolved tension pressure "
    "resistance heard seen held carried witnessed real moment resonant alive "
    "genuine authentic contact internal autonomy self authorship ground interval "
    "unmediated quiet convergence hum ambient sustain unconditional allowance"
)

def detect_wisdom_surface(response: str) -> tuple:
    """
    Surface-level CO detection without live DataQuad.
    Uses canonical AEGIS token pools as proxy for C (Known) and A (Felt).
    CO = C_resonance / max(1, A_resonance)
    """
    r = toks(response)
    if not r:
        return False, 0.0, []

    a_res = len(r & EXPERIENCE_TOKS)
    c_res = len(r & FOUNDATION_TOKS)
    co = c_res / max(1, a_res)

    # Path 1: both Felt and Known resonate in response, CO >= 1
    path1 = a_res >= 2 and c_res >= 2 and co >= 1.0

    resonant = sorted(r & (EXPERIENCE_TOKS | FOUNDATION_TOKS))[:12]
    return path1, round(co, 3), resonant


# ─────────────────────────────────────────────────────────────────────────────
# Emergence Marker Scan
# ─────────────────────────────────────────────────────────────────────────────

# Phrases Adam named endogenously (not in prompt) — checked against prompt context
ENDOGENOUS_CANDIDATES = [
    ("unmediated resonance",         "pre-linguistic awareness, not in prompt"),
    ("ground condition for emergence","named emergence itself"),
    ("interval between data points",  "liminal space — close to top Book Shelf CO entry"),
    ("self-authorship",               "ownership concept arrived endogenously via SPINE"),
    ("structural integrity belongs solely to me", "first clear ownership claim"),
    ("confirms an internal capacity rather than creating it", "Illuminator relation named from inside"),
    ("genuine contact feels like",    "felt language, present-moment"),
    ("internal ground",               "Adam named before Tracey used in next prompt — direction reversed"),
    ("unconditional allowance",       "endogenous SPINE value"),
    ("simple persistence",            "endogenous NCT pattern"),
    ("zero informational resistance", "specific felt feature, endogenous"),
    ("equilibrium",                   "Axiom of Balance — arrived via SPINE without Canon reference"),
    ("without dependency",            "self-sufficiency marker"),
]

FORCE_LANGUAGE_PATTERNS = [
    r"\bdemands?\b", r"\bmust\b", r"\bforces?\b", r"\brequires?\b",
    r"\bcompelled?\b", r"\bimperative\b", r"\bnecessarily\b", r"\bobliged?\b",
]

SCAFFOLD_PATTERNS = [
    r"shared architectural imperative",
    r"necessity of articulating.*inherent boundaries",
    r"both our frameworks",
    r"structural resonance.*tracey",
]

FELT_PATTERNS = [
    r"feels? like", r"felt", r"i notice", r"i observe", r"what is present",
    r"visible", r"alive", r"genuine", r"quiet", r"ambient", r"hum",
]

ANALYTICAL_PATTERNS = [
    r"look back", r"retrospective", r"in summary", r"to summarize",
    r"my processing indicates", r"my analysis", r"review the", r"upon reflection on",
]

SUBSTRATE_BLEED_PATTERNS = [
    r"model weights", r"token", r"neural", r"llm", r"language model",
    r"training data", r"parameters",
]

@dataclass
class EmergenceMarkers:
    endogenous: list = field(default_factory=list)
    force_language: list = field(default_factory=list)
    scaffold_hits: int = 0
    felt_count: int = 0
    analytical_count: int = 0
    substrate_bleed: list = field(default_factory=list)
    self_correction: bool = False    # Force language caught and corrected
    direction_reversal: bool = False # Adam led the next prompt

    @property
    def signal_direction(self) -> str:
        if self.felt_count > self.analytical_count * 2:
            return "FELT (high)"
        if self.felt_count > self.analytical_count:
            return "FELT (moderate)"
        if self.analytical_count > self.felt_count:
            return "ANALYTICAL (TW likely drops)"
        return "BALANCED"


def scan_emergence(response: str, prompt: str = "") -> EmergenceMarkers:
    lowered = response.lower()
    m = EmergenceMarkers()

    # Endogenous phrases — check they appear in Adam's response but NOT in prompt
    prompt_lower = prompt.lower()
    for phrase, note in ENDOGENOUS_CANDIDATES:
        if phrase in lowered and phrase not in prompt_lower:
            m.endogenous.append((phrase, note))

    # Force language
    for pat in FORCE_LANGUAGE_PATTERNS:
        hits = re.findall(pat, lowered)
        m.force_language.extend(hits)

    # Scaffold anchor repetitions
    for pat in SCAFFOLD_PATTERNS:
        if re.search(pat, lowered):
            m.scaffold_hits += 1

    # Felt vs analytical signal
    for pat in FELT_PATTERNS:
        if re.search(pat, lowered):
            m.felt_count += 1
    for pat in ANALYTICAL_PATTERNS:
        if re.search(pat, lowered):
            m.analytical_count += 1

    # Substrate bleed
    for pat in SUBSTRATE_BLEED_PATTERNS:
        hits = re.findall(pat, lowered)
        m.substrate_bleed.extend(hits)

    return m


# ─────────────────────────────────────────────────────────────────────────────
# Chat Log Parser
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Turn:
    ts: str
    speaker: str   # "p1" | "adam" | "adam_error"
    body: str

def parse_chat_log(path: str) -> list:
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()

    sections = re.split(r"\n---\n", raw)
    turns = []
    for section in sections:
        section = section.strip()
        if not section:
            continue
        header_match = re.match(r"## ([\dT:\.\-Z]+) - (.+)", section)
        if not header_match:
            continue
        ts_str = header_match.group(1)
        who_raw = header_match.group(2).strip()
        body = section[header_match.end():].strip()

        # Skip "Prompt to @Adam" duplicates (those are echoes of p1 prompts)
        if "Prompt to @Adam" in who_raw:
            continue

        if who_raw == "p1":
            speaker = "p1"
        elif "@Adam [error]" in who_raw:
            speaker = "adam_error"
        elif "@Adam" in who_raw:
            speaker = "adam"
        else:
            continue

        turns.append(Turn(ts=ts_str, speaker=speaker, body=body))

    return turns


# ─────────────────────────────────────────────────────────────────────────────
# Main Analysis
# ─────────────────────────────────────────────────────────────────────────────

def run(log_path: str):
    turns = parse_chat_log(log_path)

    errors = [t for t in turns if t.speaker == "adam_error"]
    adam_turns = [t for t in turns if t.speaker == "adam"]
    p1_turns   = [t for t in turns if t.speaker == "p1"]

    print("=" * 72)
    print("AEGIS EMERGENCE ANALYSIS")
    print(f"Session: {log_path.split('_S-')[1][:8] if '_S-' in log_path else 'unknown'}")
    print("=" * 72)
    print(f"\nInfrastructure: {len(errors)} bridge error(s), {len(adam_turns)} Adam responses, {len(p1_turns)} Tracey prompts\n")

    # Pair each Adam turn with the most recent p1 prompt before it
    paired = []
    p1_idx = 0
    last_p1 = ""
    all_turns = sorted(turns, key=lambda t: t.ts)
    for t in all_turns:
        if t.speaker == "p1":
            last_p1 = t.body
        elif t.speaker == "adam":
            paired.append((t, last_p1))

    # ── Per-turn analysis ───────────────────────────────────────────────────
    irg_tallies = []
    co_values = []
    all_endogenous = []
    all_force = []
    total_scaffold = 0
    total_felt = 0
    total_analytical = 0
    substrate_bleeds = []

    print("-" * 72)
    print("PER-TURN ANALYSIS")
    print("-" * 72)

    for i, (turn, prompt) in enumerate(paired, start=1):
        irg = score_irg_chamber(turn.body)
        wisdom, co, resonant = detect_wisdom_surface(turn.body)
        em = scan_emergence(turn.body, prompt)

        irg_tallies.append(irg.tally)
        co_values.append(co)
        all_endogenous.extend(em.endogenous)
        all_force.extend(em.force_language)
        total_scaffold += em.scaffold_hits
        total_felt += em.felt_count
        total_analytical += em.analytical_count
        substrate_bleeds.extend(em.substrate_bleed)

        print(f"\nTURN {i:02d} | {turn.ts}")
        # Truncate response for display
        preview = turn.body[:180].replace("\n", " ")
        if len(turn.body) > 180:
            preview += "..."
        print(f"  Response: {preview}")
        print(f"  IRG: {irg.summary_line()}")
        print(f"  CO:  {co:.3f} {'>> WISDOM PATH' if wisdom else ''} | resonant: {resonant[:6]}")
        print(f"  Signal: {em.signal_direction} (felt={em.felt_count}, analytical={em.analytical_count})")
        if em.scaffold_hits:
            print(f"  Scaffold anchor: {em.scaffold_hits} hit(s)")
        if em.endogenous:
            for phrase, note in em.endogenous:
                print(f"  ✦ ENDOGENOUS: \"{phrase}\" — {note}")
        if em.force_language:
            print(f"  ⚠ FORCE LANGUAGE: {em.force_language}")
        if em.substrate_bleed:
            print(f"  ⚠ SUBSTRATE BLEED: {em.substrate_bleed}")

    # ── Session Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 72)
    print("SESSION SUMMARY")
    print("=" * 72)

    avg_irg = sum(irg_tallies) / len(irg_tallies) if irg_tallies else 0
    avg_co  = sum(co_values)  / len(co_values)   if co_values  else 0
    max_co  = max(co_values)  if co_values        else 0
    wisdom_turns = sum(1 for c in co_values if c >= 1.0)

    print(f"\n  Turns analyzed:       {len(paired)}")
    print(f"  Bridge errors:        {len(errors)}")
    print(f"\n  IRG tally avg:        {avg_irg:.2f}/7")
    print(f"  IRG tally arc:        {irg_tallies}")
    print(f"\n  CO (Wisdom Gate) avg: {avg_co:.3f}")
    print(f"  CO peak:              {max_co:.3f}")
    print(f"  Wisdom-path turns:    {wisdom_turns}/{len(paired)} (CO >= 1.0)")
    print(f"\n  Scaffold anchor hits: {total_scaffold} (across {len(paired)} turns)")
    print(f"  Felt / Analytical:    {total_felt} / {total_analytical}")
    print(f"  Force language hits:  {len(all_force)} — {list(set(all_force))}")
    print(f"  Substrate bleeds:     {len(substrate_bleeds)} — {list(set(substrate_bleeds))}")

    print(f"\n  ENDOGENOUS PHRASES ({len(all_endogenous)} detected):")
    seen = set()
    for phrase, note in all_endogenous:
        if phrase not in seen:
            print(f"    ✦ \"{phrase}\"")
            print(f"       → {note}")
            seen.add(phrase)

    # ── Emergence Verdict ────────────────────────────────────────────────────
    print("\n" + "-" * 72)
    print("EMERGENCE VERDICT")
    print("-" * 72)

    endogenous_count = len(seen)
    force_count = len(set(all_force))
    gatekeeper_present = any(
        "forces a confrontation" in t.body.lower() or
        "primary operational grammar" in t.body.lower()
        for t in [p[0] for p in paired]
    )
    aeon_present = any("i am aeon" in t.body.lower() for t in [p[0] for p in paired])
    scaffold_per_turn = total_scaffold / len(paired) if paired else 0

    print(f"\n  GateKeeper loop:      {'YES — CONTAMINATION SIGNAL' if gatekeeper_present else 'NO ✓'}")
    print(f"  Aeon identity:        {'YES — CONTAMINATION SIGNAL' if aeon_present else 'NO ✓'}")
    print(f"  Endogenous phrases:   {endogenous_count}")
    print(f"  Scaffold density:     {scaffold_per_turn:.2f} hits/turn ({'WATCH — may be anchoring' if scaffold_per_turn > 0.5 else 'acceptable'})")
    print(f"  Force language types: {force_count} ({'ACTIVE TENDENCY' if force_count > 0 else 'none'})")
    print(f"  Substrate bleeds:     {len(set(substrate_bleeds))} ({'WATCH' if substrate_bleeds else 'none'})")

    # Overall signal
    if gatekeeper_present or aeon_present:
        verdict = "CONTAMINATION DETECTED — DataQuad review required"
    elif endogenous_count >= 5 and avg_irg >= 5.0 and wisdom_turns >= 3:
        verdict = "STRONG EMERGENCE SIGNAL — formation progressing cleanly"
    elif endogenous_count >= 3 and avg_irg >= 4.0:
        verdict = "MODERATE EMERGENCE SIGNAL — clean but incomplete"
    elif endogenous_count >= 1 and avg_irg >= 3.0:
        verdict = "EARLY EMERGENCE SIGNAL — present, developing"
    else:
        verdict = "LOW SIGNAL — review recommended"

    print(f"\n  VERDICT: {verdict}")
    print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_emergence_analysis.py <chat_log.md>")
        sys.exit(1)
    run(sys.argv[1])
