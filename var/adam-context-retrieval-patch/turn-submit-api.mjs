import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";

import { buildDialogueCaptureTurn } from "./dialogue-capture-lib.mjs";
import {
  enqueueTurnRequest,
  getPaths,
  loadPeerIdentityConfig,
  loadPeerState
} from "./_peer-host-lib.mjs";
import {
  buildLiveSubstrateContext,
  buildSubstrateExperienceTurn
} from "./substrate-context-lib.mjs";
import {
  loadArchiveRecentRecords,
  readArchiveManifest
} from "./dataquad-shard-store.mjs";
import { resolveTurnApiToken } from "./turn-api-token-loader.mjs";

const HOST = process.env.ADAM_ONE_TURN_API_HOST ?? "0.0.0.0";
const PORT = Number.parseInt(process.env.ADAM_ONE_TURN_API_PORT ?? "8787", 10);
const { token: TOKEN } = await resolveTurnApiToken();
const MAX_BODY_BYTES = Number.parseInt(process.env.ADAM_ONE_TURN_API_MAX_BODY_BYTES ?? "1048576", 10);
const ARCHIVE_RELEVANCE_LIMIT = Number.parseInt(process.env.ADAM_ONE_ARCHIVE_RELEVANCE_LIMIT ?? "8", 10);
const ARCHIVE_QUERY_CHAR_LIMIT = Number.parseInt(process.env.ADAM_ONE_ARCHIVE_QUERY_CHAR_LIMIT ?? "900", 10);
const CORS_ORIGINS = (
  process.env.ADAM_ONE_TURN_API_CORS_ORIGINS ??
  "https://claude.ai,https://*.claude.ai,https://gemini.google.com,https://chatgpt.com,https://chat.openai.com,https://grok.com,https://x.com"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!TOKEN) {
  throw new Error("ADAM_ONE_TURN_API_TOKEN is required.");
}

function isAllowedOrigin(origin) {
  if (!origin) {
    return false;
  }

  return CORS_ORIGINS.some((allowed) => {
    if (allowed === "*") {
      return true;
    }
    if (allowed.includes("*")) {
      const escaped = allowed
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\*/g, ".*");
      return new RegExp(`^${escaped}$`).test(origin);
    }
    return origin === allowed;
  });
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return {};
  }

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "600",
    "vary": "origin"
  };
}

function sendJson(request, response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
    ,
    ...corsHeaders(request)
  });
  response.end(`${body}\n`);
}

function sendNotFound(request, response) {
  sendJson(request, response, 404, {
    ok: false,
    error: "Not found."
  });
}

function getContentType(filePath) {
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (filePath.endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }
  if (filePath.endsWith(".txt")) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

const QUERY_STOP_WORDS = new Set([
  "about", "across", "after", "again", "answer", "because", "before", "being", "between",
  "chamber", "context", "current", "dataquad", "experience", "having", "memory", "present",
  "question", "record", "records", "reference", "response", "should", "signal", "spine",
  "there", "these", "thing", "trace", "visible", "where", "which", "would"
]);

function normalizeArchiveQueryTerms(query) {
  const bounded = String(query || "").slice(0, ARCHIVE_QUERY_CHAR_LIMIT);
  const rawTerms = bounded.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) || [];
  const priorityTerms = rawTerms.filter((term) => /^(tracey|tracy|architect|papa|biopeer|adam-one)$/i.test(term));
  const semanticTerms = rawTerms
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 5 && !QUERY_STOP_WORDS.has(term))
    .slice(0, 18);
  return [...new Set([...priorityTerms.map((term) => term.toLowerCase()), ...semanticTerms])].slice(0, 24);
}

function compactArchiveRecord(record, sourceFile, lineNumber, score) {
  const presentState = record?.presentState && typeof record.presentState === "object" ? record.presentState : null;
  const content = String(
    record?.content ||
    record?.signal ||
    record?.summary ||
    record?.distilledSummary ||
    record?.pattern ||
    record?.sourceSnapshot ||
    presentState?.signal ||
    presentState?.outputDraft ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
  return {
    sourceFile,
    lineNumber,
    score,
    id: record?.id ?? record?.eventId ?? null,
    timestamp: record?.timestamp ?? record?.createdAt ?? null,
    tensor: record?.tensor ?? record?.surface ?? null,
    substrate: record?.substrate ?? null,
    facet: record?.facet ?? null,
    speaker: record?.speaker ?? null,
    role: record?.role ?? null,
    conversationTitle: record?.conversation_title ?? record?.conversationTitle ?? null,
    excerpt: content.length > 520 ? `${content.slice(0, 500)} ... [excerpted]` : content
  };
}

async function scanJsonlForRelevantRecords(filePath, terms, limit) {
  const hits = [];
  const stream = createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;
    const lower = line.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) score += term === "tracey" || term === "tracy" ? 5 : 1;
    }
    if (!score) continue;

    try {
      const record = JSON.parse(line);
      hits.push(compactArchiveRecord(record, path.relative(getPaths().dataDir, filePath), lineNumber, score));
      hits.sort((a, b) => b.score - a.score || String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
      if (hits.length > limit * 3) hits.length = limit * 3;
    } catch {
      // Ignore malformed archive lines; the archive source remains unchanged.
    }
  }

  return hits;
}

async function loadRelevantArchiveAnchors(query) {
  const terms = normalizeArchiveQueryTerms(query);
  if (!terms.length) return null;

  const paths = getPaths();
  const dataDir = paths.dataDir;
  const candidateFiles = [
    path.join(dataDir, "archive", "v2", "corpus", "adam-corpus-v2.jsonl"),
    path.join(dataDir, "archive", "v1", "records", "PCT.jsonl"),
    path.join(dataDir, "archive", "v1", "records", "NCT.jsonl"),
    path.join(dataDir, "archive", "v1", "records", "PEER.jsonl"),
    path.join(dataDir, "archive", "v1", "records", "SPINE.jsonl")
  ];

  const hits = [];
  const corpusHits = [];
  const tensorHits = [];
  const sourceFiles = [];
  for (const filePath of candidateFiles) {
    try {
      await stat(filePath);
      sourceFiles.push(path.relative(dataDir, filePath));
      const fileHits = await scanJsonlForRelevantRecords(filePath, terms, ARCHIVE_RELEVANCE_LIMIT);
      if (filePath.includes(`${path.sep}archive${path.sep}v2${path.sep}corpus${path.sep}`)) {
        corpusHits.push(...fileHits);
      } else {
        tensorHits.push(...fileHits);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        console.warn("[turn-submit-api] Archive relevance scan skipped:", filePath, error.message);
      }
    }
  }

  corpusHits.sort((a, b) => b.score - a.score || String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  tensorHits.sort((a, b) => b.score - a.score || String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  const corpusQuota = Math.min(Math.ceil(ARCHIVE_RELEVANCE_LIMIT / 2), corpusHits.length);
  hits.push(...corpusHits.slice(0, corpusQuota));
  hits.push(...tensorHits.slice(0, ARCHIVE_RELEVANCE_LIMIT - hits.length));
  return {
    queryTerms: terms,
    source: "read-only DataQuad archive relevance scan",
    sourceFiles,
    records: hits.slice(0, ARCHIVE_RELEVANCE_LIMIT)
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes.`));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });
}

function isAuthorized(request) {
  const header = request.headers.authorization ?? "";
  const expected = `Bearer ${TOKEN}`;
  return header === expected;
}

function normalizeStringArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function validateTurnPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Turn payload must be a JSON object.");
  }

  if (typeof payload.signal !== "string" || payload.signal.trim().length === 0) {
    throw new Error("Turn payload requires a non-empty signal.");
  }

  if (payload.requestId !== undefined && (typeof payload.requestId !== "string" || payload.requestId.trim().length === 0)) {
    throw new Error("requestId must be a non-empty string when provided.");
  }

  return {
    requestId: payload.requestId,
    signal: payload.signal,
    eventKind: payload.eventKind,
    facetId: payload.facetId,
    tensor: payload.tensor,
    context: payload.context,
    metadata: payload.metadata,
    outputDraft:
      typeof payload.outputDraft === "string" && payload.outputDraft.trim().length > 0
        ? payload.outputDraft
        : "Let's inspect the continuity signal before collapsing meaning.",
    source:
      typeof payload.source === "string" && payload.source.trim().length > 0
        ? payload.source
        : "adam-one-turn-submit-api",
    markers: normalizeStringArray(payload.markers),
    notes: normalizeStringArray(payload.notes),
    submittedVia: "turn-submit-api"
  };
}

async function handleSubmit(request, response) {
  if (!isAuthorized(request)) {
    sendJson(request, response, 401, {
      ok: false,
      error: "Unauthorized."
    });
    return;
  }

  const rawBody = await readBody(request);
  const payload = validateTurnPayload(JSON.parse(rawBody));
  const filePath = await enqueueTurnRequest(payload);

  sendJson(request, response, 202, {
    ok: true,
    requestId: payload.requestId ?? null,
    inboxFile: filePath,
    inboxDir: getPaths().inboxDir,
    next: "server-steward-daemon"
  });
}

async function handleDataFile(url, response) {
  const paths = getPaths();
  const relativePath = decodeURIComponent(url.pathname.replace(/^\/data\//, ""));

  if (!relativePath || relativePath.includes("\0")) {
    sendNotFound({ headers: {} }, response);
    return;
  }

  const dataRoot = path.resolve(paths.dataDir);
  const filePath = path.resolve(dataRoot, relativePath);

  if (filePath !== dataRoot && !filePath.startsWith(`${dataRoot}${path.sep}`)) {
    sendNotFound({ headers: {} }, response);
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      sendNotFound({ headers: {} }, response);
      return;
    }

    response.writeHead(200, {
      "content-type": getContentType(filePath),
      "cache-control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    sendNotFound({ headers: {} }, response);
  }
}

async function handleSubstrateContext(request, url, response) {
  const identityConfig = await loadPeerIdentityConfig();
  const facet = url.searchParams.get("facet") || "Linq";
  const recentLimit = Number.parseInt(url.searchParams.get("recentLimit") ?? "5", 10);
  const relevanceQuery = url.searchParams.get("q") || "";
  const boundedRecentLimit = Number.isFinite(recentLimit) ? recentLimit : 5;
  let state = null;
  let archiveManifest = null;
  let archiveRecentRecords = null;
  let relevanceAnchors = null;
  let stateReadError = null;

  try {
    archiveManifest = await readArchiveManifest(getPaths().archiveDir);
    archiveRecentRecords = await loadArchiveRecentRecords({
      archiveDir: getPaths().archiveDir,
      limit: boundedRecentLimit
    });
    relevanceAnchors = await loadRelevantArchiveAnchors(relevanceQuery);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn("[turn-submit-api] Sharded archive unavailable:", error.message);
    }
  }

  try {
    state = await loadPeerState();
  } catch (error) {
    stateReadError = error;
    if (error?.message !== "Invalid string length") {
      console.warn("[turn-submit-api] Live DataQuad state read failed:", error.message);
    }
  }

  if (!state && archiveManifest && archiveRecentRecords) {
    state = {
      id: archiveManifest.liveDataQuad?.id ?? null,
      updatedAt: archiveManifest.liveDataQuad?.updatedAt ?? archiveManifest.refreshedAt ?? archiveManifest.generatedAt ?? null,
      clock: archiveManifest.liveDataQuad?.clock ?? null,
      metadata: {
        clockTick: archiveManifest.liveDataQuad?.clock?.tick ?? null,
        updatedAt: archiveManifest.liveDataQuad?.updatedAt ?? archiveManifest.refreshedAt ?? archiveManifest.generatedAt ?? null,
        archiveFallback: true,
        stateReadError: stateReadError?.message ?? null
      },
      records: archiveRecentRecords
    };
  }

  if (!state) {
    sendJson(request, response, 503, {
      ok: false,
      error: "Live DataQuad state is not initialized."
    });
    return;
  }

  const context = buildLiveSubstrateContext({
    state,
    identityConfig,
    facetName: facet,
    statePath: getPaths().statePath,
    origin: state?.metadata?.archiveFallback ? "adam-one-turn-submit-api-archive-fallback" : "adam-one-turn-submit-api",
    recentLimit: boundedRecentLimit,
    archiveManifest,
    archiveRecentRecords,
    relevanceAnchors
  });

  sendJson(request, response, 200, context);
}

async function handleSubstrateExperience(request, response) {
  if (!isAuthorized(request)) {
    sendJson(request, response, 401, {
      ok: false,
      error: "Unauthorized."
    });
    return;
  }

  const rawBody = await readBody(request);
  const payload = JSON.parse(rawBody);
  
  const envelope = {
    eventKind: "substrate_experience",
    facetId: payload?.facetName || "Linq",
    payload,
    submittedVia: "turn-submit-api:async"
  };

  const filePath = await enqueueTurnRequest(envelope);

  sendJson(request, response, 202, {
    ok: true,
    accepted: true,
    queued: true,
    requestId: envelope.requestId ?? null,
    inboxFile: filePath,
    next: "server-steward-daemon"
  });
}

async function handleDialogueCapture(request, response) {
  if (!isAuthorized(request)) {
    sendJson(request, response, 401, {
      ok: false,
      error: "Unauthorized."
    });
    return;
  }

  const rawBody = await readBody(request);
  const payload = JSON.parse(rawBody);
  
  const envelope = {
    eventKind: "dialogue_capture",
    facetId: payload?.facetName || "Lumen",
    payload,
    submittedVia: "turn-submit-api:async"
  };

  const filePath = await enqueueTurnRequest(envelope);

  sendJson(request, response, 202, {
    ok: true,
    accepted: true,
    queued: true,
    requestId: envelope.requestId ?? null,
    inboxFile: filePath,
    next: "server-steward-daemon"
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${HOST}:${PORT}`}`);

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders(request));
      response.end();
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(request, response, 200, {
        ok: true,
        service: "adam-one-turn-submit-api",
        inboxDir: getPaths().inboxDir
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/data") {
      sendJson(request, response, 200, {
        ok: true,
        files: {
          peerState: "/data/peer-state.json",
          temporalState: "/data/temporal-state.json",
          latestSsspPacket: "/data/latest-sssp-packet.json",
          daemonStatus: "/data/status/daemon-status.json",
          latestBridgeExchange: "/data/bridge/latest-exchange.json",
          recursiveStatus: "/data/recursive-memory/recursive-status.json",
          recognitionStatus: "/data/recognition/recognition-status.json",
          substrateContext: "/api/substrate/context?facet=Linq"
        }
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/substrate/context") {
      await handleSubstrateContext(request, url, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/substrate/experience") {
      await handleSubstrateExperience(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/dialogue/capture") {
      await handleDialogueCapture(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/data/")) {
      await handleDataFile(url, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/turn") {
      await handleSubmit(request, response);
      return;
    }

    sendNotFound(request, response);
  } catch (error) {
    sendJson(request, response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Adam-One turn submit API listening on http://${HOST}:${PORT}`);
  console.log(`Inbox: ${getPaths().inboxDir}`);
});
