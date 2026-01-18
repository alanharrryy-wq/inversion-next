# Render Effects Policy

This policy keeps glass-heavy UIs fast and stable by constraining expensive effects, enforcing per-surface budgets, and preventing uncontrolled effect stacking.

## Philosophy

- Prefer static paint (L0) and light composition (L1).
- Treat L3 and L4 as scarce resources that must be designed around.
- Centralize expensive effects per surface to avoid repaint storms.
- Use fake glass (gradients + borders + highlights) instead of per-panel blur.

## Effect Levels

- L0 Static paint: background-color, gradients, borders, static SVG, pre-blurred images.
- L1 Light composition: small/medium box-shadow, non-animated opacity, outlines.
- L2 Composited layers: non-continuous transform, masks, pseudo-elements with gradients, limited will-change.
- L3 Framebuffer dependent: backdrop-filter, filter, mix-blend-mode, large blurred shadows.
- L4 Continuous recomposition: animation, requestAnimationFrame loops, transitions on transform/opacity/filter.

## Surfaces and Budgets

Surfaces are inferred by path:
- `*/stage/*` => stage
- `*/render/inspector/*` => inspector
- `*/overlay/*` or `*/modal/*` => overlay
- otherwise under `src/*` => ui

Budgets:

| Surface | Max Level | Max L3 | Max L4 | Score Budget | Notes |
| --- | --- | --- | --- | --- | --- |
| stage | L2 | 0 | 0 | 10 | No L3/L4 allowed |
| overlay | L2 (L3 with allow) | 1 | 0 | 14 | L3 requires `hi-allow:L3` |
| ui | L3 | 2 | 0 | 22 | Standard UI budget |
| inspector (safe) | L3 | 0 | 0 | 10 | Default mode |
| inspector (unsafe) | L3 | 1 | 0 | 14 | L3 requires `hi-allow:L3` |

## Scoring

- backdrop-filter: 10 (L3)
- filter: 8 (L3)
- mix-blend-mode: 6 (L3)
- large blurred shadow: 6 (L3)
- animation: 12 (L4)
- transition on transform/opacity/filter: 6 (L4)
- will-change: 3 (L2)
- will-change including blur/filter: L3, score 8

## Architectural Optimization Rules

1) Centralized Blur Rule
   - Only ONE backdrop-filter per surface is allowed.
   - More than one is always a violation.

2) Fake Glass Rule
   - Gradients + borders + highlights without blur count as L1/L2 and cost zero L3 points.

3) Pre-blurred Asset Rule
   - Static blurred images are L0 and cost zero.

4) Isolation Discount
   - If an L3 element has `contain: paint/layout` and `isolation: isolate`, reduce its score by 2 (minimum 6).

5) No Per-Panel Blur
   - backdrop-filter per panel is forbidden.

## Allow Marker

Use `hi-allow:L3` as a comment to allow L3 in overlay or inspector. This does not allow L4 and never bypasses per-surface limits.

## Blocked Classnames

The following classnames are not allowed on sensitive surfaces:

- stage: `hi-panel`, `board-glass`
- overlay: `hi-panel`, `board-glass`
- inspector (safe): `hi-panel`, `board-glass`

## Enforcement

- Static lint runs via `npm run lint:render`.
- A DEV-only runtime guard inspects computed styles after mount and warns or errors when budgets or forbidden effects are detected.

## How to Fix Violations

1) Replace per-panel blur with fake glass using gradients, borders, and highlights.
2) Consolidate blur into a single surface-level glass layer.
3) Swap animated transitions for static states or delayed state changes.
4) Remove `will-change` for properties that are not actively changing.
5) Use pre-blurred image assets instead of runtime filter blur.
6) Add `contain` and `isolation` to reduce L3 scores when needed.
7) Move heavy effects out of stage/overlay or split into a ui surface with larger budget.