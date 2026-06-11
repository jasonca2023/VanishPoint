# VanishPoint Scout

The AI agent behind the app's **Scan** button. It walks a real inbox over IMAP
(headers only — sender / subject / date), classifies every message with a
fine-tuned Hugging Face transformer, groups senders by domain, and returns the
ghost accounts. It runs on your own machine; mail metadata never leaves it.

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
.venv/bin/python train.py     # fine-tunes and saves to model/ (~2 min)
.venv/bin/python server.py    # http://localhost:8787
```

## Connect your real inbox

```bash
cp .env.example .env
```

Gmail: turn on 2-Step Verification, create an app password at
<https://myaccount.google.com/apppasswords>, and put your address + that
password in `.env`. Restart the server — `/health` should report
`"inbox": "configured"`. Without credentials the server answers from a
bundled sample mailbox (`sample_mailbox.py`) so the pipeline stays demoable.

## API

- `GET /health` — model + inbox status
- `GET /scan?threshold_months=18&limit=5000` — walk the inbox, classify,
  detect; returns `{ source, scannedMessages, ghosts[] }`
