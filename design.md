# Design — VanishPoint

A locked design system for this app. Every screen redesign reads this file before
emitting code. Do not regenerate per screen — extend or amend this file when the
system needs to grow. (React Native app: tokens live in `src/constants/theme.ts`;
OKLCH values are the source of truth, hex is the compiled form RN consumes.)

## Genre
atmospheric — a privacy tool you use after dark. Dark canvas, one warm accent,
the type does the work. No glassmorphism, no gradients, no hairline-on-paper.

## Screen families
- App screens (dashboard · account · settings): function carries the screen.
  No enrichment. Dense, data-forward, mono register for evidence.
- Threshold screens (auth · onboarding): typographic hero, one statement,
  generous space. Still no imagery — the wordmark and type are the design.

## Theme — "Ember" (custom · dark / grotesk-sans / warm)
- paper      oklch(13.5% 0.012 40)  → #0c0705
- paper-2    oklch(16.5% 0.014 40)  → #140c0a   (elevated card)
- paper-3    oklch(19.5% 0.016 40)  → #1b130f   (raised / pressed)
- rule       oklch(28%   0.014 40)  → #2f2724   (borders, meters)
- neutral    oklch(62%   0.018 40)  → #90837e   (muted text, captions)
- ink-2      oklch(76%   0.014 40)  → #b9aeaa   (secondary text)
- ink        oklch(94.5% 0.008 60)  → #f1ece8   (primary text)
- accent     oklch(68%   0.17  40)  → #ec6d3d   (ember — THE accent)
- accent-dim oklch(60%   0.15  40)  → #c85b32   (pressed accent)
- accent-ink oklch(16%   0.03  40)  → #180804   (text on accent fill)
- focus      oklch(72%   0.15  55)  → #eb883b   (focus ring)

One accent. Status is carried by labels, icons, and the mono register — never
by a traffic-light triad. Elevation = lighter paper, never shadows-on-dark.

## Typography (2+1)
- Display: Geist 600, tracking -0.02em (titles, statements)
- Body:    Geist 400 (prose, UI labels)
- Outlier: Geist Mono 400 — ONE role: machine data (domains, dates, counts,
  risk scores, evidence headers). Never on buttons or headings.
- Scale (major third, 16 base): 11 · 13 · 16 · 20 · 25 · 31 · 39
- Line-height: display 1.1–1.2, body 1.5. Tabular feel via mono for numbers.

## Spacing
4-pt named scale: xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48.
Screen gutter: lg (16). Card padding: xl (24) on threshold screens, lg in lists.

## Radii
card 16 · control 12 · pill 999. One radius language; no mixed 4/8/24 soup.

## Motion
- Fade-only reveals. No slide-ins, no bounce, no spring on UI state.
- The slide-to-vanish gesture keeps its spring — it's a physical control,
  not decoration.
- Reduced motion: everything collapses to opacity.

## Microinteractions stance
- Silent success (state changes in place; one confirmation push notification).
- Destructive flow = gesture + biometric, never a red confirm dialog stack.
- Pressed states: paper-3 fill shift + accent-dim on filled buttons. No scale pops.

## CTA voice
- Primary: ember fill, accent-ink text, pill radius, Geist 600, ≤ 3 words.
- Secondary: rule border, ink text, same pill.
- Quiet: bare text, neutral, underline on the actionable word only.
- Copy is imperative and specific: "Run scan", "Send request", "Keep it".

## What screens MUST share
- The wordmark: "VanishPoint" in Geist Mono 400, lowercase "vanishpoint",
  preceded by "◦" — the mono register IS the brand note.
- The ember accent and its ≤5%-of-viewport discipline.
- The mono-for-data rule.
- Section labels: 11px Geist Mono uppercase, 0.08em tracking, neutral.

## What screens MAY differ on
- Threshold screens may use the display face at 31–39px; app screens cap at 25.
- Dashboard may use one oversized mono stat (the footprint count) — the single
  outlier moment allowed per screen.
