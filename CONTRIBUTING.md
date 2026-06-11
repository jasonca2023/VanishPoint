# Contributing to VanishPoint

Thanks for helping people shrink their digital footprint. This doc covers how to get a
dev environment running, the rules the codebase holds itself to, and what a good PR
looks like here.

## Dev setup

Two processes: the Expo app and the scout agent.

```bash
# App (Node 20+)
npm install
npx expo start            # i / a for simulators, w for the web preview

# Scout (Python 3.12 via uv — torch has no wheel for newer system Pythons)
cd scout
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python train.py     # fine-tunes the classifier once (~2 min, CPU is fine)
.venv/bin/python server.py    # http://localhost:8787
```

Supabase auth works out of the box against the project baked into
`src/services/supabase.ts`; override with `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_KEY` to use your own.

## Before you open a PR

- `npx tsc --noEmit` — must be clean.
- `npx expo export --platform web` — every route must bundle.
- If you touched the scout: run `server.py` and check `GET /scan` against the bundled
  sample mailbox. Active senders (Dropbox, Spotify), the newsletter-only sender, and
  personal mail must **not** be flagged; the six dormant accounts must be.
- If you touched a screen, walk it in the web preview at both phone width and a wide
  desktop window (content stays in the centered 480px column).

## Product invariants — not up for debate in a PR

1. **The Scout never deletes.** It detects and suggests. Every destructive action goes
   through explicit user confirmation behind the biometric gate. No PR weakens this.
2. **Headers only, on your machine only.** The scout reads From/Subject/Date — never
   message bodies — and runs locally. Nothing about the user's mail or ghost list is
   sent to any server. Supabase carries identity, nothing else.
3. **Zero false vanishes beats more detections.** Precision over recall: an account
   signal only counts when the classifier is confident (`ACCOUNT_CONFIDENCE` in
   `scout/server.py`). If your change surfaces more ghosts, show what it does to the
   sample-mailbox negatives first.
4. **Secrets live in the vault.** Mail credentials and session tokens go through
   `src/services/vault.ts` (Keychain/Keystore) — never AsyncStorage, never logs,
   never query strings.

## Design system

The UI is governed by [`design.md`](design.md) — a locked system (dark "Ember" palette,
Geist/Geist Mono type, 4-pt spacing, single accent). Rules that bite:

- Use tokens from `src/constants/theme.ts`; no inline hex values or one-off font sizes.
- Geist Mono is reserved for machine data (domains, dates, scores, evidence). Not for
  buttons or headings.
- The ember accent stays under ~5% of any screen. Status is carried by labels and
  icons, not color-coding.
- Motion is fade-only; the swipe-to-vanish spring is the single sanctioned exception.
- If a change genuinely needs something the system doesn't allow, amend `design.md` in
  the same PR and say why — don't override locally.

## Improving the classifier

The model is trained entirely on synthetic headers (`scout/dataset.py`). The highest-value
contribution is the error-analysis loop:

1. Find a real-world header the model mislabels (`POST /scan` evidence, or probe it directly).
2. Add template variants covering that phrasing to the right class in `dataset.py`.
3. Retrain (`train.py`) and confirm the sample-mailbox detection set is unchanged.
4. Include the before/after label + confidence in the PR description.

Keep the model small — it has to classify thousands of headers per scan on modest CPUs.
A bigger base model needs benchmarks, not vibes.

## Commits & PRs

- Imperative subject line, body explains *why*. Small, focused PRs over omnibus ones.
- Don't commit: `scout/.env` (gitignored — credentials), `scout/checkpoints/`, `dist/`.
- The trained `scout/model/` weights **are** committed (18 MB) so the agent works
  out of the box — retrain and include them if you change the dataset.
- UI changes: include a screenshot from the web preview or a simulator.

## Reporting issues

Bug reports with a header that was misclassified (sender + subject, redact what you
like) or a service whose privacy/deletion endpoint is wrong in the directory are
especially useful — both are one-file fixes.
