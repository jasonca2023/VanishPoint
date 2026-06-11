# ◌ VanishPoint

A mobile privacy assistant that finds forgotten digital footprints ("Ghost Accounts")
and helps you reclaim your data through guided, **permission-based** deletion.

**Augmented, not autonomous.** The Scout detects dormant accounts and suggests actions —
it never deletes anything without your explicit, biometric-gated confirmation.

## Features

### 🔍 Smart Discovery (the Scout)
Scans your inbox metadata **entirely on-device** — sender and date headers only, never
message bodies, and nothing is uploaded anywhere. Accounts that have gone quiet past your
dormancy threshold (12/18/24/36 months) get flagged, with a risk score based on what kind
of data the service likely holds (payment details, photos, documents, location…). A single
recent email from a service vetoes detection, so active accounts are never flagged.

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

### 🔐 Security
- Ghost-account list stored encrypted in the **iOS Keychain / Android Keystore**
- Biometric authentication required before any Vanish action
- Zero cloud: all analysis, storage, and decision history stay on the phone

### 📊 Built-in metrics
Settings shows how well the Scout is doing: **Permission Rate** (how often you accept its
suggestions), **Vanish Rate** (ghosts deleted), and a **Safety Score** that drops if it
ever flags an account you still use — tap *"I still use this account"* to teach it.

## Stack

- **React Native + Expo SDK 56** (TypeScript, expo-router) — iOS, Android, and a web dev preview
- **zustand** for state, persisted via **expo-secure-store**
- **expo-local-authentication** for the FaceID/TouchID gate
- **expo-notifications** for actionable reminders
- **react-native-gesture-handler + reanimated** for the swipe-to-Vanish control
- **expo-web-browser** for the internal deletion-portal browser

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

Notifications and biometrics need a real device or simulator; the web preview stubs them
so the full flow stays walkable end-to-end.

## Current limitations

- The email connector is a deterministic **demo inbox** — real OAuth 2.0 (Gmail/Outlook
  metadata scope) is the next milestone; the discovery interface is ready for it.
- Reminders are scheduled locally rather than via a push backend.
- Encrypted cloud backup (zero-knowledge, passphrase-derived) is on the roadmap — today
  there is deliberately no cloud at all.
- Detection is a transparent heuristic; the scoring functions in `discovery.ts` are where
  an on-device ML model would slot in.
