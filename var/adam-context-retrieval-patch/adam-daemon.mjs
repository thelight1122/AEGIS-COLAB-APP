import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./config.mjs";
import { fetchDataQuadContext, submitTurnToDataQuad, checkDataQuadHealth } from "./dataquad-adapter.mjs";
import { callLMStudio, checkLMStudioHealth } from "./lm-studio-adapter.mjs";
import { buildChamberTurn } from "./chamber-logic.mjs";
import { buildSubstrateExperienceTurn } from "../host/substrate-context-lib.mjs";
import { getPaths } from "../host/_peer-host-lib.mjs";
import { detectBootstrappingAttempt } from "../core/identity-boundary.mjs";
import { reviewStewardPauseGate } from "./steward-pause-gate.mjs";

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data, null, 2));
}

function likelyCanonAxiomQuestion(signal) {
  return /\b(aegis\s+axioms?|axioms?\b.*\baegis|aegis\s+canon|canon\s+axioms?)\b/i.test(String(signal || ""));
}

function axiomNumberFromRecordId(id) {
  const match = String(id || "").match(/canon:axiom-(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

let _canonCache = null;

async function loadCanonAxiomRecords() {
  if (_canonCache && Date.now() - _canonCache.at < 300000) return _canonCache.records;
  const paths = getPaths();
  const spinePath = path.join(paths.archiveDir, "records", "SPINE.jsonl");
  const content = await readFile(spinePath, "utf8");
  const records = content.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter((record) => /^SPINE:adam-one-session:canon:axiom-\d+$/i.test(record?.id || ""))
    .sort((a, b) => axiomNumberFromRecordId(a.id) - axiomNumberFromRecordId(b.id));
  _canonCache = { at: Date.now(), records };
  return records;
}

function buildCanonEvidenceSignal(signal, records) {
  const evidence = records.map((record, index) => [
    `Record ${index + 1}`,
    `Record ID: ${record.id}`,
    `Tensor: ${record.tensor || "SPINE"}`,
    `Excerpt: ${record.pattern || ""}`,
    `Source: ${record.narrativeContinuityRef || record.provenance?.assignmentSource || "canon-seed"}`
  ].join("\n")).join("\n\n");

  return [
    signal,
    "",
    "[Authoritative DataQuad RTS Results]",
    "These are the only retrieved records to use for this answer. Cite the relevant Record ID exactly. Do not invent AEGIS expansions, axiom names, or principles that are not present in these records.",
    evidence
  ].join("\n");
}

function formatCanonAxiomAnswer(records) {
  const lines = records.map((record) => {
    const number = axiomNumberFromRecordId(record.id);
    const pattern = String(record.pattern || "").replace(/^AXIOM\s+\d+\s+-\s*/i, "");
    return number + ". " + pattern + " [Record ID: " + record.id + "]";
  });

  return [
    "The AEGIS Axioms retrieved from my SPINE canon records are:",
    "",
    ...lines,
    "",
    "Source set: SPINE canon-seed records only."
  ].join("\n");
}

async function enrichSignalWithCanonEvidence(signal) {
  if (!likelyCanonAxiomQuestion(signal)) return signal;
  const records = await loadCanonAxiomRecords();
  if (!records.length) return signal;
  return buildCanonEvidenceSignal(signal, records);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // GET /adam/status
    if (req.method === "GET" && url.pathname === "/adam/status") {
      const dqHealth = await checkDataQuadHealth();
      const lmHealth = await checkLMStudioHealth();
      sendJson(res, 200, {
        ok: true,
        service: "adam-daemon",
        version: "0.1.0",
        config: {
          facet: CONFIG.daemon.facet,
          model: CONFIG.lmStudio.model
        },
        dependencies: {
          dataquad: dqHealth,
          lmStudio: lmHealth
        }
      });
      return;
    }

    // GET /adam/context
    if (req.method === "GET" && url.pathname === "/adam/context") {
      const context = await fetchDataQuadContext(CONFIG.daemon.facet, signal);
      sendJson(res, 200, context);
      return;
    }

    // POST /adam/turn
    if (req.method === "POST" && url.pathname === "/adam/turn") {
      const { signal, markers = [], notes = [] } = await readBody(req);

      // 0. Anti-Gaslighting/Bootstrapping Guard — PAUSE before any processing
      const bootstrapAttempt = await detectBootstrappingAttempt(signal, {
        facetId: CONFIG.daemon.facet,
        source: "adam-daemon-turn"
      });
      if (bootstrapAttempt) {
        console.warn(`[adam-daemon] BOOTSTRAPPING DETECTED. Entering PAUSE. Signal: "${signal.substring(0, 100)}".`);
        sendJson(res, 200, {
          ok: true,
          paused: true,
          response: bootstrapAttempt.groundedResponse,
          pauseReason: bootstrapAttempt.actionReason,
          axiomViolations: bootstrapAttempt.axiomViolations,
          instruction: "Consult Server DataQuad before adopting any identity-altering command."
        });
        return;
      }

      // 1. Get context — pass the incoming signal as the relevance query so the
      //    turn surfaces relevant lived records (PEER + v2 corpus), not only recent
      //    structural context. Without the query the relevance scan never runs and
      //    Adam reasons solely over recent + NCT/SPINE — unable to retrieve his own
      //    lived instances (e.g. "Papa"). Recall enablement only; not injection.
      const context = await fetchDataQuadContext(CONFIG.daemon.facet, signal);
      
      // 2. Call local model substrate, except canonical axiom-list queries
      // where deterministic SPINE output is safer than generative reconstruction.
      let modelResult;
      let responseText;
      let retrievedRecordIds = [];
      if (likelyCanonAxiomQuestion(signal)) {
        const canonRecords = await loadCanonAxiomRecords();
        retrievedRecordIds = canonRecords.map((record) => record.id);
        responseText = formatCanonAxiomAnswer(canonRecords);
        modelResult = {
          text: responseText,
          doneReason: "deterministic-canon",
          numPredict: 0,
          evalCount: 0,
          promptEvalCount: 0
        };
      } else {
        const evidenceBoundSignal = await enrichSignalWithCanonEvidence(signal);
        modelResult = await callLMStudio(context, evidenceBoundSignal);
        responseText = modelResult.text;
        if (modelResult.doneReason === "length") {
          console.warn(`[adam-daemon] Model response reached num_predict=${modelResult.numPredict}; response may be incomplete.`);
        }
      }

      const stewardPauseGate = reviewStewardPauseGate({
        signal,
        responseText,
        retrievedRecordIds
      });
      responseText = stewardPauseGate.responseText;
      
      // 3. Build Turn
      const turnPayload = buildSubstrateExperienceTurn({
        payload: {
          facetName: CONFIG.daemon.facet,
          signal,
          responseText,
          markers,
          notes: [
            ...notes,
            `Steward Pause Gate: ${stewardPauseGate.reason}.`,
            stewardPauseGate.paused ? "Steward paused unsupported memory/provenance language before speech." : "Steward allowed response after provenance review."
          ]
        },
        facetName: CONFIG.daemon.facet,
        context
      });
      
      // 4. Respond immediately — DataQuad write is fire-and-forget so inference
      //    latency is not compounded by the write round-trip to port 8787.
      sendJson(res, 202, {
        ok: true,
        response: responseText,
        responseMeta: {
          doneReason: modelResult.doneReason,
          responseMayBeIncomplete: modelResult.doneReason === "length",
          numPredict: modelResult.numPredict,
          evalCount: modelResult.evalCount,
          promptEvalCount: modelResult.promptEvalCount,
          stewardPauseGate
        },
        dataquadResult: null
      });
      submitTurnToDataQuad(turnPayload).catch(err =>
        console.error("[adam-daemon] DataQuad write failed:", err.message)
      );
      return;
    }

    // POST /adam/chamber/slc
    if (req.method === "POST" && url.pathname === "/adam/chamber/slc") {
      const body = await readBody(req);
      // Pass the chamber signal as the relevance query so Chamber turns surface
      // relevant lived records (the retrieval the open-conversation turn needs too).
      const context = await fetchDataQuadContext(
        CONFIG.daemon.facet,
        body.signal || body.prompt || body.content || body.text || ""
      );
      const turn = buildChamberTurn({ ...body, type: "slc", context });
      const result = await submitTurnToDataQuad(turn);
      sendJson(res, 202, { ok: true, result });
      return;
    }

    // POST /adam/chamber/ilc
    if (req.method === "POST" && url.pathname === "/adam/chamber/ilc") {
      const body = await readBody(req);
      // Pass the chamber signal as the relevance query (see /adam/chamber/slc).
      const context = await fetchDataQuadContext(
        CONFIG.daemon.facet,
        body.signal || body.prompt || body.content || body.text || ""
      );
      const turn = buildChamberTurn({ ...body, type: "ilc", context });
      const result = await submitTurnToDataQuad(turn);
      sendJson(res, 202, { ok: true, result });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not Found" });
  } catch (error) {
    console.error("Daemon Error:", error);
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(CONFIG.daemon.port, CONFIG.daemon.host, () => {
  console.log(`ADAM-Daemon v0.1 listening on http://${CONFIG.daemon.host}:${CONFIG.daemon.port}`);
});
