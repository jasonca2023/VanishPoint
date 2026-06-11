# ◌ VanishPoint

A mobile-centric privacy assistant that finds forgotten digital footprints ("Ghost Accounts")
and helps you reclaim your data through guided, **permission-based** deletion.

**AI philosophy: Augmented, not Autonomous.** The Scout detects and suggests; it never deletes
anything without your explicit, biometric-gated confirmation.

## Stack

- **React Native + Expo SDK 56** (TypeScript, expo-router) — iOS, Android, and a web dev preview
- **zustand** for state, persisted to **expo-secure-store** (iOS Keychain / Android Keystore)
- **expo-local-authentication** — FaceID/TouchID gate on every Vanish action
- **expo-notifications** — Ask-First push reminders with Vanish / Keep / Remind Me Later actions
- **react-native-gesture-handler + reanimated** — the swipe-right-to-Vanish confirmation control
- **expo-web-browser** — internal browser for finalizing deletion on the service's privacy portal

## How it maps to the PRD

| PRD requirement | Implementation |
| --- | --- |
| 2.1 Smart Discovery Engine | `src/services/discovery.ts` — on-device heuristic over email-header metadata: groups by sender domain, requires a signup signal, flags domains silent past the dormancy threshold, scores risk by data categories held. The OAuth mail connector is **mocked** (`src/data/mock-inbox.ts`) so the whole pipeline runs with zero network. |
| 2.2 Ask-First Protocol | `src/services/notifications.ts` — local notification per new ghost with PRD copy ("You haven't used your 'vimeo.com' account since Oct 2022…") and three action buttons. Keep = whitelist 12 months, Remind = snooze 30 days, Vanish = opens the app for the biometric flow. |
| 2.3 The Killswitch | `src/services/gdpr.ts` — pre-filled GDPR Art. 17 / CCPA §1798.105 deletion request; one-tap DPO email (`mailto:`) or internal browser to the service's privacy portal. |
| 3.1 Biometric auth | `src/services/biometrics.ts` — `authenticateAsync` (strong class) before any Vanish. |
| 3.2 Encrypted local storage | `src/services/vault.ts` — chunked JSON in SecureStore; nothing syncs anywhere. |
| 4 User flow | Onboarding → first scan → notification → review evidence → **swipe right to Vanish** (`src/components/slide-to-vanish.tsx`) → FaceID → request sent → success notification. |
| 5 KPIs | `src/store/use-vault-store.ts` — every suggestion→decision pair is logged on-device; Settings shows Permission Rate, Vanish Rate, and Safety Score (drops 25 pts per false positive the user reports via "I still use this account"). |

## Run it

```bash
npm install
npx expo start        # then i / a for iOS / Android simulator, w for web preview
```

Notifications and biometrics need a real device or simulator (the web preview stubs them
so the flow stays testable end-to-end).

## Honest deviations from the PRD

- **OAuth 2.0 / bank connectors** are mocked with a deterministic demo inbox — wiring Gmail
  metadata scope is a backend + app-review project; the discovery interface is ready for it.
- **FCM** is replaced by *local* scheduled notifications (no backend required); the
  category/action plumbing is identical to what FCM payloads would trigger.
- **Zero-knowledge sync** is roadmap — there is deliberately no cloud at all in this build,
  which is the strongest version of "raw data doesn't stay on the server."
- **TF-Lite/CoreML** — detection is a transparent heuristic today; the scoring functions in
  `discovery.ts` are where a learned model would slot in.
