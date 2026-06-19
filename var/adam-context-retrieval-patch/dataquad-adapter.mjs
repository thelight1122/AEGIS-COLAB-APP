import { CONFIG } from "./config.mjs";

let _contextCache = null;

export async function fetchDataQuadContext(facet = CONFIG.daemon.facet, relevanceQuery = "") {
  const queryKey = String(relevanceQuery || "").slice(0, 900);
  if (_contextCache && Date.now() - _contextCache.at < 10000 && _contextCache.facet === facet && _contextCache.queryKey === queryKey) {
    return _contextCache.data;
  }
  const recentLimit = Number.isFinite(CONFIG.daemon.recentContextLimit) ? CONFIG.daemon.recentContextLimit : 5;
  const url = new URL(`${CONFIG.dataquad.url}/api/substrate/context`);
  url.searchParams.set("facet", facet);
  url.searchParams.set("recentLimit", String(recentLimit));
  if (queryKey.trim()) url.searchParams.set("q", queryKey);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch DataQuad context: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  _contextCache = { at: Date.now(), facet, queryKey, data };
  return data;
}

export async function submitTurnToDataQuad(turnPayload) {
  const url = `${CONFIG.dataquad.url}/api/substrate/experience`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.dataquad.token}`
    },
    body: JSON.stringify(turnPayload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit turn to DataQuad: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  return response.json();
}

export async function checkDataQuadHealth() {
  try {
    const response = await fetch(`${CONFIG.dataquad.url}/health`);
    if (response.ok) {
      const data = await response.json();
      return { status: "connected", ...data };
    }
    return { status: "error", code: response.status };
  } catch (error) {
    return { status: "disconnected", error: error.message };
  }
}
