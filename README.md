# VanishPoint

A mobile privacy assistant that finds forgotten digital footprints ("Ghost Accounts")
and helps you reclaim your data through guided, **permission-based** deletion.

**Augmented, not autonomous.** The Scout detects dormant accounts and suggests actions —
it never deletes anything without your explicit, biometric-gated confirmation.

## Features

### Accounts
Sign-in is passwordless: enter your email and **Supabase Auth** sends a one-time sign-in
link to your inbox — opening it lands you back in the app with a session, and first-time
addresses get an account automatically. No password to invent, reuse, or leak.
Identity is the only thing that lives in the cloud: each user's ghost list, decisions,
settings, and mail credential are stored encrypted in the **iOS Keychain / Android
Keystore**, namespaced per user — a shared phone never leaks one person's ghosts to
another, and signing out locks the vault.

### Smart Discovery (the Scout)
The Scan button talks to a real AI agent (`scout/`): a local service that walks the inbox
**you signed up with** over IMAP — sender, subject, and date headers only, never message
bodies — and classifies every message with a **fine-tuned Hugging Face transformer**
(bert-tiny, 5 footprint-signal classes: signup · security · transactional · marketing ·
personal). Senders with a confident account signal that have gone quiet past your dormancy
threshold (12/18/24/36 months) get flagged with a risk score; newsletters, personal mail,
and recently active services never do. The agent runs on your own machine, so mail
metadata never leaves it. The dashboard always says where a scan came from — live inbox,
the scout's demo mailbox, or offline fallback data.

### Connecting your inbox
During onboarding (or later in Settings → inbox) you paste a one-time
[app password](https://myaccount.google.com/apppasswords) for the address you registered
with. The app verifies it against the scout with a real IMAP login before accepting it,
keeps it only in the device vault, and sends it per-scan — the scout stores nothing.
Gmail, Outlook, iCloud, Yahoo, and AOL hosts are auto-detected from the address. Skip the
step and scans use a bundled sample mailbox so the whole flow stays demoable.

### Ask-First reminders
When a ghost is detected you get a push notification — *"You haven't used your 'vimeo.com'
account since Oct 2022. It contains your old profile data. Would you like VanishPoint to
delete it for you?"* — with three actions right on the notification:

- **Vanish** — opens the app to start the deletion flow
- **Keep** — whitelists the account for 12 months
- **Remind Me Later** — snoozes for 30 days

### The Vanish flow
Open the account, review the Scout's evidence (the actual email headers it based its call
on), and **swipe right to Vanish**. A FaceID/TouchID check confirms it's really you, then
VanishPoint generates a pre-filled **GDPR Article 17 / CCPA §1798.105** deletion request —
email it to the service's privacy officer in one tap where a DPO address is known, or
finalize it in the in-app browser on the service's own privacy portal. If the Scout ever
flags something you still use, *"I still use this account"* whitelists it and teaches the
detector.

### Built-in metrics
Settings shows how well the Scout is doing: **Permission Rate** (how often you accept its
suggestions), **Vanish Rate** (ghosts deleted), and a **Safety Score** that drops if it
ever flags an account you still use.

## Stack

- **React Native + Expo SDK 56** (TypeScript, expo-router) — iOS, Android, and a web dev preview
- **Supabase Auth** (`@supabase/supabase-js`), session token kept in the Keychain/Keystore
- **Scout agent**: Python + FastAPI + a fine-tuned `prajjwal1/bert-tiny`
  (Hugging Face `transformers`), IMAP headers-only inbox walker
- **zustand** for state, persisted via **expo-secure-store** (chunked JSON vault)
- **expo-local-authentication** for the FaceID/TouchID gate
- **expo-notifications** for actionable reminders
- **react-native-gesture-handler + reanimated** for the swipe-to-Vanish control
- **expo-web-browser** for the internal deletion-portal browser

## Design

The UI follows a locked design system — see [`design.md`](design.md). Dark warm-black
canvas, a single ember accent, Geist for display and body with Geist Mono reserved for
machine data (domains, dates, scores), a 4-pt spacing scale, and fade-only motion. The
swipe-to-vanish spring is the one deliberate physical exception. Content sits in a
centered 480px column so the web preview reads like a phone canvas at any window size.

## Project layout

```
src/
  app/                 expo-router screens (auth, onboarding, dashboard,
                       account/[id], settings)
  components/          ghost cards, risk meter, buttons, the swipe-to-Vanish slider
  constants/theme.ts   the locked design tokens (colors, type, spacing)
  services/
    scout.ts           client for the scan agent (/scan, /verify)
    supabase.ts        auth client, vault-backed session storage
    discovery.ts       offline fallback heuristic + shared date helpers
    notifications.ts   Vanish / Keep / Remind notification categories
    gdpr.ts            GDPR/CCPA deletion-request generator
    biometrics.ts      FaceID/TouchID confirmation
    vault.ts           encrypted Keychain/Keystore storage (chunked JSON)
  store/               zustand store: auth, per-user vault, scans, KPIs
  data/                bundled demo inbox + service privacy directory
scout/
  dataset.py           synthetic labeled headers (5 signal classes)
  train.py             fine-tunes bert-tiny, saves to model/ (~2 min on CPU)
  server.py            FastAPI agent: IMAP walk -> classify -> detect ghosts
  model/               committed trained weights so it works out of the box
```

## Run it

```bash
npm install
npx expo start        # then i / a for iOS / Android simulator, w for web preview
```

In a second terminal, start the scan agent (see [`scout/README.md`](scout/README.md)):

```bash
cd scout
uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python server.py    # http://localhost:8787 (model/ ships pre-trained)
```

Sign up, paste an app password when onboarding asks (or skip for the demo mailbox), and
scan. On a phone, point Settings → "Scout agent address" at your computer's LAN IP.
Notifications and biometrics need a real device or simulator; the web preview stubs them
so the full flow stays walkable end-to-end.

Contributions welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Current limitations

- The inbox connector is IMAP + app password; OAuth 2.0 (Gmail API metadata scope) is the
  next milestone.
- Reminders are scheduled locally rather than via a push backend.
- Encrypted cloud backup (zero-knowledge, passphrase-derived) is on the roadmap — today
  account data deliberately lives only on your devices.
- The classifier is trained on synthetic headers (`scout/dataset.py`); labelling a slice
  of real mail would tighten it further.
