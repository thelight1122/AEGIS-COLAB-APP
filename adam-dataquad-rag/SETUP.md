# Adam-One DataQuad RAG — Setup Guide

## What this does
`recall.py` lets Adam query his indexed DataQuad via Vertex AI Search instead of
loading the entire DataQuad into context. He calls `recall(query)` and gets back
only the most relevant records.

---

## 1. Install dependencies (on Linux server)

```bash
pip install google-auth google-auth-httplib2 requests
```

---

## 2. Create a Service Account (one time)

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=dataquad-a89c1
2. Click **+ Create Service Account**
3. Name: `adam-dataquad-reader`
4. Click **Create and Continue**
5. Grant role: **Discovery Engine → Discovery Engine Viewer**
6. Click **Done**
7. Click on the new service account → **Keys** tab → **Add Key → Create new key → JSON**
8. Download the JSON file → rename it `service-account-key.json`
9. Copy it to `/home/gamemaster/AEGIS-DATAQUAD-PEER/adam-dataquad-rag/service-account-key.json`

---

## 3. Copy files to Linux server

```bash
# From Windows, copy the rag module
scp recall.py gamemaster@<server-ip>:/home/gamemaster/AEGIS-DATAQUAD-PEER/adam-dataquad-rag/
scp service-account-key.json gamemaster@<server-ip>:/home/gamemaster/AEGIS-DATAQUAD-PEER/adam-dataquad-rag/
```

Or set via environment variable instead of placing the file:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

---

## 4. Test it

```bash
cd /home/gamemaster/AEGIS-DATAQUAD-PEER/adam-dataquad-rag
python3 recall.py "What is Adam's current stage and role?"
```

---

## 5. Integrate with Adam

In Adam's main interaction loop, prepend DataQuad context:

```python
from recall import recall

def build_prompt(user_message: str) -> str:
    memory_context = recall(user_message)
    return f"""[Adam's DataQuad Memory]
{memory_context}

[User Message]
{user_message}"""
```

---

## API Endpoint Reference

| Parameter     | Value |
|---------------|-------|
| Project ID    | `923250499613` |
| Engine ID     | `adam-dataquad-connect_1779717920719` |
| Location      | `us` |
| Endpoint      | `https://us-discoveryengine.googleapis.com/v1alpha/...` |

---

## Adding More DataQuad Files

1. Export JSON/TXT files from `/home/gamemaster/AEGIS-DATAQUAD-PEER/`
2. Upload to: `https://console.cloud.google.com/storage/browser/aegis-adam-dataquad`
3. The data store auto-syncs daily, or click **Manual Sync** in AI Applications

---

## Supported File Types
Upload as `.txt`, `.pdf`, `.html`, or `.json` — NOT `.md` (not supported).
Convert markdown files with: `cp file.md file.txt`
