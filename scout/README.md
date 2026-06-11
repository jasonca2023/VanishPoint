# VanishPoint Scout

The AI agent behind the app's **Scan** button. It walks a real inbox — the
Gmail API (OAuth, metadata scope) or IMAP — headers only: sender / subject /
date. Every message is classified with a fine-tuned Hugging Face transformer,
senders are grouped by domain, and the ghost accounts come back. It runs on
your own machine; mail metadata never leaves it.

## The model

`prajjwal1/bert-tiny` (4.4M params) fine-tuned for 5-way classification of
email headers into footprint signals:

| label | meaning |
| --- | --- |
| `signup` | welcome / verify / activate — proves an account exists |
| `security` | login alerts, password resets, 2FA codes |
| `transactional` | receipts, renewals, reports — account was alive that day |
| `marketing` | newsletters, win-back blasts — dormant accounts keep emitting these |
| `personal` | human mail — never counts as an account signal |

Trained on ~4,700 synthetic labeled headers (`dataset.py`), ~2 minutes on CPU,
~900 headers/sec at inference. A sender domain only becomes a candidate ghost
when the model is **confident** (p ≥ 0.6) it saw a non-marketing account
signal — a shaky read must not turn a newsletter into a deletable account.

## Run it

```bash
cd scout
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python server.py    # http://localhost:8787 (model/ ships pre-trained)
```

## Inbox access

Three modes, in the order the server picks them per request:

1. **Gmail API (OAuth)** — the app sends the user's Google access token with
   each `POST /scan`. The `gmail.metadata` scope can never return message
   bodies (enforced by Google). Put the OAuth client in `.env`
   (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) so the scout can refresh
   expired tokens mid-scan; it's the same client the Supabase Google provider
   uses.
2. **IMAP** — for non-Google inboxes the app sends an address + app password
   per request. `POST /verify` lets the app check a credential up front.
3. **Demo mailbox** — no credentials at all answers from
   `sample_mailbox.py`, so the pipeline stays demoable.

The scout stores nothing in any mode.

## API

- `GET /health` — model + inbox status
- `GET /scan?threshold_months=18&limit=5000` — credential-less scan (`.env`
  IMAP inbox if configured, else the demo mailbox)
- `POST /scan` — per-request credentials: `{ google_access_token,
  google_refresh_token?, threshold_months }` or `{ user, password,
  threshold_months }`; returns `{ source, scannedMessages, ghosts[],
  refreshedAccessToken? }`
- `POST /verify` — IMAP login check
- `POST /verify-google` — Gmail token check; returns the inbox address
