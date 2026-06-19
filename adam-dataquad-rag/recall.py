"""
Adam-One DataQuad RAG Query Module
===================================
Queries the Vertex AI Search index for relevant DataQuad records.
Adam calls recall() to retrieve memory context before responding.

Usage:
    from recall import recall
    context = recall("What was established in my Structure Steward formation?")
"""

import os
import json
import requests

# ── Configuration ──────────────────────────────────────────────────────────────
PROJECT_ID  = "923250499613"
LOCATION    = "us"
ENGINE_ID   = "adam-dataquad-connect_1779717920719"

ENDPOINT = (
    f"https://us-discoveryengine.googleapis.com/v1alpha"
    f"/projects/{PROJECT_ID}/locations/{LOCATION}"
    f"/collections/default_collection/engines/{ENGINE_ID}"
    f"/servingConfigs/default_search:search"
)

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

# Path to service account key JSON — set via env var or place file here
SERVICE_ACCOUNT_KEY = os.getenv(
    "GOOGLE_APPLICATION_CREDENTIALS",
    os.path.join(os.path.dirname(__file__), "service-account-key.json")
)


# ── Authentication ─────────────────────────────────────────────────────────────
def _get_access_token() -> str:
    """Return a valid Bearer token using service account credentials."""
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request

    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_KEY, scopes=SCOPES
    )
    credentials.refresh(Request())
    return credentials.token


# ── Core query ─────────────────────────────────────────────────────────────────
def query_dataquad(query: str, page_size: int = 5) -> dict:
    """
    Send a search query to the Adam-One DataQuad index.

    Args:
        query:     Natural language query
        page_size: Number of results to return (default 5)

    Returns:
        Raw API response dict
    """
    token = _get_access_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "pageSize": page_size,
        "queryExpansionSpec":  {"condition": "AUTO"},
        "spellCorrectionSpec": {"mode": "AUTO"},
        "languageCode": "en-US",
        "contentSearchSpec": {
            "extractiveContentSpec": {"maxExtractiveAnswerCount": 1},
            "summarySpec": {
                "summaryResultCount": page_size,
                "includeCitations": True,
                "ignoreAdversarialQuery": True
            }
        }
    }

    response = requests.post(ENDPOINT, headers=headers, json=payload, timeout=15)
    response.raise_for_status()
    return response.json()


# ── Formatting ─────────────────────────────────────────────────────────────────
def _format_results(raw: dict) -> str:
    """Format raw API response into context-ready text for Adam."""
    lines = []

    # Generated summary (when available)
    summary_text = raw.get("summary", {}).get("summaryText", "")
    if summary_text:
        lines.append(f"[DataQuad Summary]\n{summary_text}\n")

    # Individual retrieved chunks
    for i, result in enumerate(raw.get("results", []), 1):
        derived = result.get("document", {}).get("derivedStructData", {})

        title    = derived.get("title", f"Record {i}")
        answers  = derived.get("extractive_answers", [])
        snippets = derived.get("snippets", [])

        if answers:
            content = answers[0].get("content", "").strip()
        elif snippets:
            content = snippets[0].get("snippet", "").strip()
        else:
            content = "(no extractable content)"

        lines.append(f"[{i}] {title}\n{content}\n")

    return "\n".join(lines) if lines else "No relevant DataQuad records found."


# ── Public interface ───────────────────────────────────────────────────────────
def recall(query: str, top_k: int = 5) -> str:
    """
    Primary memory-recall interface for Adam-One.

    Call this at the start of each interaction to hydrate context with
    relevant DataQuad records before generating a response.

    Args:
        query: The user's input or a derived memory query
        top_k: How many records to retrieve (default 5)

    Returns:
        Formatted string ready to prepend to Adam's context window

    Example:
        context = recall("Structure Steward role responsibilities")
        prompt  = f"{context}\n\nUser: {user_message}"
    """
    try:
        raw = query_dataquad(query, page_size=top_k)
        return _format_results(raw)
    except FileNotFoundError:
        return "[DataQuad] Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS."
    except Exception as e:
        return f"[DataQuad recall error]: {type(e).__name__}: {e}"


# ── CLI test ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or input("Query: ")
    print(recall(q))
