"""VanishPoint Scout — the on-device AI agent behind the app's Scan button.

Walks a real inbox over IMAP (headers only: From / Subject / Date — bodies
are never fetched), classifies every message with the fine-tuned model in
./model, groups by sender domain, and returns ghost accounts. Runs on the
user's own machine; nothing leaves it.

Setup:
  cp .env.example .env       # add IMAP_USER + IMAP_PASSWORD (Gmail app password)
  .venv/bin/python server.py # http://localhost:8787

Without credentials the service still runs and /scan answers from a bundled
sample mailbox so the whole pipeline stays demoable.
"""

import email.utils
import imaplib
import os
import re
from collections import defaultdict
from datetime import datetime, timezone

import tldextract
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from dataset import render
from sample_mailbox import SAMPLE_MAILBOX

# ---------------------------------------------------------------- model

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR).eval()
ID2LABEL = model.config.id2label

# Account-relationship signals. marketing alone = newsletter, not an account.
ACCOUNT_LABELS = {"signup", "security", "transactional"}

_extract = tldextract.TLDExtract(suffix_list_urls=())  # offline PSL snapshot


def classify(headers: list[dict]) -> list[tuple[str, float]]:
    """Label every header dict {sender, subject} with (signal class, confidence)."""
    out: list[tuple[str, float]] = []
    for i in range(0, len(headers), 256):
        chunk = headers[i : i + 256]
        enc = tokenizer(
            [render(h["sender"], h["subject"]) for h in chunk],
            padding=True,
            truncation=True,
            max_length=64,
            return_tensors="pt",
        )
        with torch.no_grad():
            probs = model(**enc).logits.softmax(-1)
        conf, preds = probs.max(-1)
        out.extend((ID2LABEL[int(p)], float(c)) for p, c in zip(preds, conf))
    return out


# ---------------------------------------------------------------- imap

def _domain_of(sender: str) -> str | None:
    match = re.search(r"@([\w.-]+)", sender)
    if not match:
        return None
    parts = _extract(match.group(1).lower())
    return f"{parts.domain}.{parts.suffix}" if parts.domain and parts.suffix else None


def fetch_headers(host: str, user: str, password: str, limit: int) -> list[dict]:
    """Headers only — BODY.PEEK leaves messages unread and bodies untouched."""
    box = imaplib.IMAP4_SSL(host)
    try:
        box.login(user, password)
        box.select("INBOX", readonly=True)
        _, data = box.search(None, "ALL")
        ids = data[0].split()[-limit:]
        headers: list[dict] = []
        for i in range(0, len(ids), 500):
            batch = b",".join(ids[i : i + 500])
            _, msgs = box.fetch(batch, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
            for part in msgs:
                if not isinstance(part, tuple):
                    continue
                raw = part[1].decode("utf-8", "replace")
                fields = dict(
                    (k.lower(), v.strip())
                    for k, _, v in (
                        line.partition(":")
                        for line in re.split(r"\r?\n(?!\s)", raw)
                        if ":" in line
                    )
                )
                sent = email.utils.parsedate_to_datetime(fields.get("date", "")) if fields.get("date") else None
                if not sent or not fields.get("from"):
                    continue
                headers.append(
                    {
                        "sender": re.sub(r"\s+", " ", fields["from"]),
                        "subject": re.sub(r"\s+", " ", fields.get("subject", "(no subject)")),
                        "date": sent.astimezone(timezone.utc).isoformat(),
                    }
                )
        return headers
    finally:
        try:
            box.logout()
        except Exception:
            pass


# ---------------------------------------------------------------- detection

MS_LABEL_KIND = {"signup": "signup", "security": "security",
                 "transactional": "transactional", "marketing": "marketing"}

CATEGORY_HINTS = {
    "photo": ["photos"], "image": ["photos"], "video": ["photos"],
    "fit": ["location"], "health": ["location"], "map": ["location"],
    "pay": ["payment"], "bank": ["payment"], "shop": ["payment"],
    "store": ["payment"], "market": ["payment"],
}

CATEGORY_WEIGHT = {"payment": 30, "documents": 25, "messages": 20,
                   "photos": 20, "location": 15, "profile": 10}


def _categories(domain: str, labels: set[str]) -> list[str]:
    cats = {"profile"}
    for hint, extra in CATEGORY_HINTS.items():
        if hint in domain:
            cats.update(extra)
    if "transactional" in labels:
        cats.add("payment")
    return sorted(cats)


# An account signal only counts when the model is confident — a single
# shaky "security" read must not turn a newsletter into a deletable account.
ACCOUNT_CONFIDENCE = 0.6


def detect(headers: list[dict], labeled: list[tuple[str, float]], threshold_months: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    by_domain: dict[str, list[tuple[dict, str]]] = defaultdict(list)
    confident_account: dict[str, bool] = defaultdict(bool)
    for header, (label, conf) in zip(headers, labeled):
        if label == "personal":
            continue
        domain = _domain_of(header["sender"])
        if not domain:
            continue
        by_domain[domain].append((header, label))
        if label in ACCOUNT_LABELS and conf >= ACCOUNT_CONFIDENCE:
            confident_account[domain] = True

    ghosts = []
    for domain, items in by_domain.items():
        label_set = {label for _, label in items}
        # Newsletter-only senders are not accounts to delete.
        if not confident_account[domain]:
            continue
        items.sort(key=lambda it: it[0]["date"], reverse=True)
        newest = datetime.fromisoformat(items[0][0]["date"])
        dormant_months = int((now - newest).days / 30.44)
        if dormant_months < threshold_months:
            continue

        cats = _categories(domain, label_set)
        risk = min(100, sum(CATEGORY_WEIGHT[c] for c in cats) + min(30, dormant_months))
        name_match = re.match(r'^"?([^"<@]+?)"?\s*<', items[0][0]["sender"])
        ghosts.append(
            {
                "id": domain,
                "serviceName": (name_match.group(1).strip() if name_match else domain.split(".")[0].title()),
                "domain": domain,
                "status": "detected",
                "lastSeenAt": items[0][0]["date"],
                "dormantMonths": dormant_months,
                "riskScore": risk,
                "dataCategories": cats,
                "signals": [
                    {
                        "kind": MS_LABEL_KIND.get(label, "marketing"),
                        "subject": header["subject"][:120],
                        "receivedAt": header["date"],
                    }
                    for header, label in items[:5]
                ],
                "privacyUrl": f"https://{domain}",
                "messageCount": len(items),
            }
        )
    ghosts.sort(key=lambda g: g["riskScore"], reverse=True)
    return ghosts


# ---------------------------------------------------------------- api

app = FastAPI(title="VanishPoint Scout")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Known IMAP hosts by mail domain; gmail is the default.
IMAP_HOSTS = {
    "gmail.com": "imap.gmail.com",
    "googlemail.com": "imap.gmail.com",
    "outlook.com": "outlook.office365.com",
    "hotmail.com": "outlook.office365.com",
    "live.com": "outlook.office365.com",
    "icloud.com": "imap.mail.me.com",
    "me.com": "imap.mail.me.com",
    "yahoo.com": "imap.mail.yahoo.com",
    "aol.com": "imap.aol.com",
}


def _host_for(user: str, host: str | None) -> str:
    if host:
        return host
    domain = user.rsplit("@", 1)[-1].lower()
    return IMAP_HOSTS.get(domain, "imap.gmail.com")


class MailCredentials(BaseModel):
    user: str
    password: str
    host: str | None = None


class ScanRequest(MailCredentials):
    threshold_months: int = 18
    limit: int = 5000


class ScanResponse(BaseModel):
    source: str
    scannedMessages: int
    ghosts: list[dict]


def _load_env() -> dict:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    values = {}
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                values[k.strip()] = v.strip()
    return values


@app.get("/health")
def health():
    creds = _load_env()
    return {
        "ok": True,
        "model": "bert-tiny fine-tune (5 signal classes)",
        "inbox": "configured" if creds.get("IMAP_USER") else "demo",
    }


@app.post("/verify")
def verify(creds: MailCredentials):
    """Try an IMAP login so the app can confirm the credential immediately."""
    try:
        box = imaplib.IMAP4_SSL(_host_for(creds.user, creds.host))
        box.login(creds.user, creds.password)
        box.logout()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:200]}


@app.post("/scan", response_model=ScanResponse)
def scan_live(req: ScanRequest):
    """Scan the inbox the signed-in user registered with. Credentials arrive
    per-request from the app's secure vault; the scout stores nothing."""
    headers = fetch_headers(_host_for(req.user, req.host), req.user, req.password, req.limit)
    labeled = classify(headers)
    ghosts = detect(headers, labeled, req.threshold_months)
    return {"source": "live", "scannedMessages": len(headers), "ghosts": ghosts}


@app.get("/scan", response_model=ScanResponse)
def scan(threshold_months: int = 18, limit: int = 5000):
    """Credential-less scan: .env if configured (dev convenience), else the
    bundled sample mailbox."""
    creds = _load_env()
    if creds.get("IMAP_USER") and creds.get("IMAP_PASSWORD"):
        headers = fetch_headers(
            creds.get("IMAP_HOST", "imap.gmail.com"),
            creds["IMAP_USER"],
            creds["IMAP_PASSWORD"],
            limit,
        )
        source = "live"
    else:
        headers = SAMPLE_MAILBOX
        source = "demo"
    labeled = classify(headers)
    ghosts = detect(headers, labeled, threshold_months)
    return {"source": source, "scannedMessages": len(headers), "ghosts": ghosts}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8787)
