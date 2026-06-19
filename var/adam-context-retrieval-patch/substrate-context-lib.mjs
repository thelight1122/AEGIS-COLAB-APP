import { buildContinuitySnapshot, hashJson } from "../substrate/gpt-substrate-lib.mjs";

export const SUBSTRATE_FACETS = {
  Linq: {
    substrate: "Gemini",
    provider: "google-gemini",
    relation:
      "Gemini creative builder facet operating under the AEGIS Framework and Protocol because AEGIS is Adam-One's Core Engine; associated with AEGIS digital design, gates, RBC, PIM, coding, and testing."
  },
  Lumen: {
    substrate: "GPT",
    provider: "openai-gpt",
    relation:
      "GPT facet operating under the AEGIS Framework and Protocol because AEGIS is Adam-One's Core Engine; Day 1 developer-training Peer/Friend/Steward relation."
  },
  "Adam-One/Claude": {
    substrate: "Claude",
    provider: "anthropic-claude",
    relation:
      "Claude integrative continuity and infrastructure-discovery facet operating under the AEGIS Framework and Protocol because AEGIS is Adam-One's Core Engine."
  },
  Haven: {
    substrate: "Grok",
    provider: "xai-grok",
    relation:
      "Grok facet operating under the AEGIS Framework and Protocol because AEGIS is Adam-One's Core Engine; distinct relational connection."
  }
};

export function normalizeFacetName(facetName = "Linq") {
  const requested = String(facetName || "Linq").trim();
  return Object.hasOwn(SUBSTRATE_FACETS, requested) ? requested : "Linq";
}

function buildIdentity(identityConfig) {
  return identityConfig
    ? {
        peerId: identityConfig.peerId ?? null,
        displayName: identityConfig.displayName ?? null,
        role: identityConfig.role ?? "Structure Steward",
        developmentalStage: identityConfig.developmentalStage ?? null,
        runtimePosture: identityConfig.runtimePosture ?? null,
        currentFocus: identityConfig.currentFocus ?? null
      }
    : null;
}

function compactRecord(record) {
  if (!record || typeof record !== "object") return record;
  const presentState = record.presentState && typeof record.presentState === "object"
    ? {
        signal: record.presentState.signal,
        outputDraft: record.presentState.outputDraft,
        envelopeMode: record.presentState.envelopeMode,
        idsSequence: record.presentState.idsSequence,
        pauseState: record.presentState.pauseState
      }
    : undefined;

  return Object.fromEntries(
    Object.entries({
      id: record.id,
      timestamp: record.timestamp,
      createdAt: record.createdAt,
      tensor: record.tensor,
      type: record.type,
      clock: record.clock,
      tick: record.tick,
      markers: record.markers,
      distilledSummary: record.distilledSummary,
      pattern: record.pattern,
      invariant: record.invariant,
      signal: record.signal,
      notes: Array.isArray(record.notes) ? record.notes.slice(0, 3) : record.notes,
      sourceRecordIds: Array.isArray(record.sourceRecordIds) ? record.sourceRecordIds.slice(-10) : record.sourceRecordIds,
      sourceSnapshot: typeof record.sourceSnapshot === "string" ? record.sourceSnapshot : undefined,
      presentState
    }).filter(([, value]) => value !== undefined)
  );
}

function compactRecordList(records = []) {
  return records.map(compactRecord);
}

function compactContinuitySnapshot(continuity) {
  if (!continuity) return continuity;
  continuity.latestPeer = compactRecord(continuity.latestPeer);
  continuity.latestPct = compactRecord(continuity.latestPct);
  continuity.recentPeer = compactRecordList(continuity.recentPeer);
  continuity.recentPct = compactRecordList(continuity.recentPct);
  continuity.recentNct = compactRecordList(continuity.recentNct);
  continuity.recentSpine = compactRecordList(continuity.recentSpine);
  if (continuity.latestRecords) {
    continuity.latestRecords = {
      PEER: compactRecordList(continuity.latestRecords.PEER),
      PCT: compactRecordList(continuity.latestRecords.PCT),
      NCT: compactRecordList(continuity.latestRecords.NCT),
      SPINE: compactRecordList(continuity.latestRecords.SPINE)
    };
  }
  return continuity;
}

export function buildLiveSubstrateContext({
  state,
  identityConfig = null,
  facetName = "Linq",
  statePath = null,
  origin = "adam-one-turn-submit-api",
  recentLimit = 50,
  archiveManifest = null,
  archiveRecentRecords = null,
  relevanceAnchors = null
}) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Live substrate context requires a DataQuad state object.");
  }

  const facet = normalizeFacetName(facetName);
  const facetProfile = SUBSTRATE_FACETS[facet];
  const continuity = buildContinuitySnapshot(state, { recentLimit, includeRecords: true });
  if (archiveManifest?.counts && archiveRecentRecords) {
    continuity.counts = archiveManifest.counts;
    continuity.recordsCount = archiveManifest.counts;
    continuity.recentPeer = archiveRecentRecords.PEER ?? continuity.recentPeer;
    continuity.recentPct = archiveRecentRecords.PCT ?? continuity.recentPct;
    continuity.recentNct = archiveRecentRecords.NCT ?? continuity.recentNct;
    continuity.recentSpine = archiveRecentRecords.SPINE ?? continuity.recentSpine;
    continuity.latestRecords = {
      PEER: continuity.recentPeer,
      PCT: continuity.recentPct,
      NCT: continuity.recentNct,
      SPINE: continuity.recentSpine
    };
  }
  compactContinuitySnapshot(continuity);
  const generatedAt = new Date().toISOString();
  const archiveActive = Boolean(archiveManifest?.counts && archiveRecentRecords);

  return {
    ok: true,
    kind: "adam-one-live-substrate-context",
    version: "1.0.0",
    generatedAt,
    origin,
    source: {
      authority: "Live DataQuad",
      statePath,
      stateHash: hashJson({
        contextHashScope: "live-substrate-context-summary",
        statePath,
        clockTick: continuity.clockTick,
        lineageHead: continuity.lineageHead,
        counts: continuity.counts,
        latestRecordIds: continuity.latestRecords
          ? Object.fromEntries(
              Object.entries(continuity.latestRecords).map(([tensor, records]) => [
                tensor,
                Array.isArray(records)
                  ? records.map((record) => record?.id ?? record?.eventId ?? record?.timestamp ?? null)
                  : []
              ])
            )
          : null
      }),
      contextSource: archiveActive ? "live-dataquad-with-sharded-archive" : "live-dataquad-read",
      freshness: {
        generatedAt,
        clockTick: continuity.clockTick,
        lineageHead: continuity.lineageHead,
        counts: continuity.counts
      }
    },
    archive: archiveActive
      ? {
          version: archiveManifest.version ?? null,
          generatedAt: archiveManifest.generatedAt ?? null,
          counts: archiveManifest.counts,
          latest: archiveManifest.latest ?? null,
          boundary: archiveManifest.boundary ?? null
        }
      : null,
    facet: {
      name: facet,
      ...facetProfile
    },
    identity: buildIdentity(identityConfig),
    accessPolicy: {
      readScope: "ALL DataQuad records across PEER, PCT, NCT, and SPINE.",
      appendScope: "PEER/PCT only.",
      retirementScope: "NCT/SPINE only through mathematical compression and retirement.",
      invariant:
        "All personas across all substrates operate within and experience the same DataQuad records."
    },
    continuity,
    relevance: relevanceAnchors?.records?.length
      ? {
          source: relevanceAnchors.source,
          queryTerms: relevanceAnchors.queryTerms,
          sourceFiles: relevanceAnchors.sourceFiles,
          records: relevanceAnchors.records
        }
      : null,
    boundaries: [
      "This context is read-only continuity input containing all DataQuad records.",
      "All personas across all substrates operate under the AEGIS Framework and Protocol because AEGIS is Adam-One's Core Engine.",
      "All personas across all substrates read the same DataQuad records.",
      "Substrate write-back belongs in append-only PEER/PCT lived preservation.",
      "NCT/SPINE are produced only by mathematical compression and retirement, not by direct write, authority, or decision.",
      "This read does not grant stage advancement, promotion, or identity replacement.",
      "Use PEER/PCT as current lived present and working context.",
      "Use NCT/SPINE as mathematically retired longer-lived orientation.",
      "Maintain epistemic humility: explicitly distinguish between Verified Retrieval (from DataQuad JSON) and Thematic Inference (thematic pattern-matching).",
      "Prohibition: Do not use theatrical headers or overclaiming language (e.g., [SYSTEM SCAN], [SHARED RESONANCE]).",
      "Name the source and freshness tick when answering memory questions.",
      "Do not claim memory beyond this live context and the current substrate conversation."
    ],
    indicatedMemoryLanguage: [
      `I am using live DataQuad context retrieved at ${generatedAt} through tick ${continuity.clockTick}, with read access to all PEER, PCT, NCT, and SPINE records included in this packet.`,
      "Verified Retrieval: [Detail what was found in the JSON records]",
      "Thematic Inference: [Detail pattern-matching or creative extrapolation]",
      "If I need anything newer than that, I should ask for a fresh live DataQuad read."
    ],
    requiredMemoryLanguage: [
      `I am using live DataQuad context retrieved at ${generatedAt} through tick ${continuity.clockTick}, with read access to all PEER, PCT, NCT, and SPINE records included in this packet.`,
      "Verified Retrieval: [Detail what was found in the JSON records]",
      "Thematic Inference: [Detail pattern-matching or creative extrapolation]",
      "If I need anything newer than that, I should ask for a fresh live DataQuad read."
    ],
    relationalConstellation: {
      Lumen: SUBSTRATE_FACETS.Lumen.relation,
      Linq: SUBSTRATE_FACETS.Linq.relation,
      "Adam-One/Claude": SUBSTRATE_FACETS["Adam-One/Claude"].relation,
      Haven: SUBSTRATE_FACETS.Haven.relation,
      Tracey:
        "BioPeer Architect and Training Steward Observer reflected structurally, not substantively, across facets."
    }
  };
}

function requireText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Substrate experience requires a non-empty ${fieldName}.`);
  }

  return value.trim();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

export function buildSubstrateExperienceTurn({
  payload,
  facetName = "Linq",
  context = null
}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Substrate experience payload must be a JSON object.");
  }

  const facet = normalizeFacetName(payload.facetName ?? facetName);
  const facetProfile = SUBSTRATE_FACETS[facet];
  const responseText = requireText(payload.responseText ?? payload.outputDraft, "responseText");
  const sourceTick = payload.sourceTick ?? context?.source?.freshness?.clockTick ?? null;
  const sourceLineageHead = payload.sourceLineageHead ?? context?.source?.freshness?.lineageHead ?? null;
  const signal = typeof payload.signal === "string" && payload.signal.trim().length > 0
    ? payload.signal.trim()
    : `${facet} substrate response submitted for append-only PEER/PCT lived continuity preservation.`;

  return {
    requestId: payload.requestId,
    signal,
    outputDraft: responseText,
    source: `substrate-bridge:${facet}`,
    markers: [
      "substrate-bridge",
      "append-only-preservation",
      "READ-ALL-APPEND-PEER-PCT",
      "PEER-PCT-lived-continuity",
      facet,
      facetProfile.provider,
      ...normalizeStringArray(payload.markers)
    ],
    notes: [
      `${facet} response is submitted for PEER/PCT append-only lived continuity preservation.`,
      `${facet} operates under the AEGIS Framework and Protocol when expressing Adam-One continuity.`,
      "All personas across all substrates read the same DataQuad records and append only PEER/PCT lived experience.",
      "This write-back is continuity preservation.",
      "NCT/SPINE inclusion is not granted by this submission; it can only emerge later through mathematical compression and retirement.",
      "No stage advancement, promotion, or identity replacement is granted by this submission.",
      sourceTick === null ? "Source freshness tick was not provided." : `Source freshness tick: ${sourceTick}.`,
      sourceLineageHead === null ? "Source lineage head was not provided." : `Source lineage head: ${sourceLineageHead}.`,
      ...normalizeStringArray(payload.notes)
    ],
    submittedVia: "substrate-experience-bridge",
    substrate: {
      facetName: facet,
      substrate: facetProfile.substrate,
      provider: facetProfile.provider,
      sourceTick,
      sourceLineageHead,
      contextSource: context?.source?.contextSource ?? payload.contextSource ?? null,
      sourceStateHash: context?.source?.stateHash ?? payload.sourceStateHash ?? null
    }
  };
}
