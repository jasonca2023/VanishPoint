# ◌ VanishPoint

A mobile privacy assistant that finds forgotten digital footprints ("Ghost Accounts")
and helps you reclaim your data through guided, **permission-based** deletion.

**Augmented, not autonomous.** The Scout detects dormant accounts and suggests actions —
it never deletes anything without your explicit, biometric-gated confirmation.

## Features

### 🔍 Smart Discovery (the Scout)
The Scan button talks to a real AI agent (`scout/`): a local service that walks your inbox
over IMAP — sender, subject, and date headers only, never message bodies — and classifies
every message with a **fine-tuned Hugging Face transformer** into footprint signals
(signup · security · transactional · marketing · personal). Senders with a confident
account signal that have gone quiet past your dormancy threshold (12/18/24/36 months) get
flagged with a risk score; newsletters, personal mail, and recently active services never
do. The agent runs on your own machine, so mail metadata never leaves it. When the agent
is unreachable the app falls back to bundled demo data and says so on the dashboard.

### 🔔 Ask-First reminders
When a ghost is detected you get a push notification — *"You haven't used your 'vimeo.com'
account since Oct 2022. It contains your old profile data. Would you like VanishPoint to
delete it for you?"* — with three actions right on the notification:

- **Vanish** — opens the app to start the deletion flow
- **Keep** — whitelists the account for 12 months
- **Remind Me Later** — snoozes for 30 days

### 💨 The Vanish flow
Open the account, review the Scout's evidence (the email headers it based its call on),
and **swipe right to Vanish**. A FaceID/TouchID check confirms it's really you, then
VanishPoint generates a pre-filled **GDPR Article 17 / CCPA §1798.105** deletion request
you can send to the service's privacy officer in one tap, or finalize in the in-app
browser on the service's own privacy portal. Mark it done and watch your footprint shrink.

### 🔐 Accounts & security
- **Sign up / sign in with Supabase Auth** (email + password, confirmation emails included) —
  identity lives in the cloud, your data doesn't
- Ghost-account list stored encrypted in the **iOS Keychain / Android Keystore**, namespaced
  per signed-in user, so a shared phone never leaks one person's ghosts to another
- The Supabase session token itself is kept in the Keychain/Keystore too
- Biometric authentication required before any Vanish action
- All analysis, storage, and decision history stay on the phone

### 📊 Built-in metrics
Settings shows how well the Scout is doing: **Permission Rate** (how often you accept its
suggestions), **Vanish Rate** (ghosts deleted), and a **Safety Score** that drops if it
ever flags an account you still use — tap *"I still use this account"* to teach it.

## Stack

- **React Native + Expo SDK 56** (TypeScript, expo-router) — iOS, Android, and a web dev preview
- **Supabase Auth** (`@supabase/supabase-js`) for sign up / sign in
- **zustand** for state, persisted via **expo-secure-store**
- **expo-local-authentication** for the FaceID/TouchID gate
- **expo-notifications** for actionable reminders
- **react-native-gesture-handler + reanimated** for the swipe-to-Vanish control
- **expo-web-browser** for the internal deletion-portal browser

## Design

The UI follows a locked design system — see [`design.md`](design.md). Dark warm-black canvas,
a single ember accent, Geist for display and body with Geist Mono reserved for machine data
(domains, dates, scores), a 4-pt spacing scale, and fade-only motion. The swipe-to-vanish
spring is the one deliberate physical exception.

## Project layout

```
src/
  app/                 expo-router screens (onboarding, dashboard, account/[id], settings)
  components/          ghost cards, risk badges, the swipe-to-Vanish slider
  services/
    discovery.ts       on-device dormancy heuristic + risk scoring
    notifications.ts   Vanish / Keep / Remind notification categories
    gdpr.ts            GDPR/CCPA deletion-request generator
    biometrics.ts      FaceID/TouchID confirmation
    vault.ts           encrypted Keychain/Keystore storage
  store/               zustand store + KPI tracking
  data/                demo inbox + service privacy directory
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
.venv/bin/python train.py     # fine-tune the model once (~2 min on CPU)
.venv/bin/python server.py    # http://localhost:8787
```

To scan your **real inbox**: the scout searches the email you signed up with. During
onboarding (or in Settings → inbox) paste a one-time
[app password](https://myaccount.google.com/apppasswords) — the app verifies it against
the scout, stores it in the device Keychain under your account, and sends it per-scan;
the scout itself stores nothing. Skip the step and scans use a bundled sample mailbox.
On a phone, point Settings → "Scout agent address" at your computer's LAN IP.
(`scout/.env` still works as a dev-only fallback for credential-less GET scans.)

Notifications and biometrics need a real device or simulator; the web preview stubs them
so the full flow stays walkable end-to-end.

## Current limitations

- The inbox connector is IMAP + app password; OAuth 2.0 (Gmail API metadata scope) is the
  next milestone.
- Reminders are scheduled locally rather than via a push backend.
- Encrypted cloud backup (zero-knowledge, passphrase-derived) is on the roadmap — today
  account data deliberately lives only on your devices.
- The classifier is trained on synthetic headers (`scout/dataset.py`); labelling a slice
  of real mail would tighten it further.
