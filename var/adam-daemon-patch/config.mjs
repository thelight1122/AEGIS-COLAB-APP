import { resolveTurnApiToken } from "../host/turn-api-token-loader.mjs";

const { token: DATAQUAD_TOKEN } = await resolveTurnApiToken();

export const CONFIG = {
  daemon: {
    port: Number.parseInt(process.env.ADAM_DAEMON_PORT ?? "8788", 10),
    host: process.env.ADAM_DAEMON_HOST ?? "127.0.0.1",
    facet: process.env.ADAM_LOCAL_FACET ?? "adam-local-facet",
    recentContextLimit: Number.parseInt(process.env.ADAM_DAEMON_CONTEXT_RECENT_LIMIT ?? "5", 10)
  },
  lmStudio: {
    url: process.env.LM_STUDIO_URL ?? "http://127.0.0.1:1234/v1",
    model: process.env.LM_STUDIO_MODEL ?? "Qwen3 4B Thinking 2507",
    temperature: Number.parseFloat(process.env.ADAM_DAEMON_TEMPERATURE ?? "0.85"),
    numPredict: Number.parseInt(process.env.ADAM_DAEMON_NUM_PREDICT ?? "2048", 10),
    numCtx: Number.parseInt(process.env.ADAM_DAEMON_NUM_CTX ?? "8192", 10),
    recordCharLimit: Number.parseInt(process.env.ADAM_DAEMON_RECORD_CHAR_LIMIT ?? "420", 10),
    signalCharLimit: Number.parseInt(process.env.ADAM_DAEMON_SIGNAL_CHAR_LIMIT ?? "3200", 10)
  },
  dataquad: {
    url: process.env.DATAQUAD_URL ?? "http://127.0.0.1:8787",
    token: DATAQUAD_TOKEN
  }
};

if (!CONFIG.dataquad.token) {
  console.warn("WARNING: No DataQuad token found. ADAM-Daemon will operate in read-only mode if allowed, or fail on write.");
}
