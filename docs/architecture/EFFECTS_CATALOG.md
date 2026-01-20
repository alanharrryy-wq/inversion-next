# Effects Catalog

Canonical list of render effects and materials.
Inclusion here is not a promise to use an effect; it is the approved options list.

Generated from `docs/architecture/effects.catalog.json`.
Auto signals from `docs/architecture/effects.catalog.auto.json`.

## Levels and Budgets (Brief)

- L0: Static paint or token-only styling.
- L1: Light composition (small shadows/opacity).
- L2: Composited layers, masks, pseudo-elements.
- L3: Framebuffer-dependent (filter, mix-blend-mode, backdrop-filter).
- L4: Continuous recomposition (animation/transitions).

Surface budgets (see render policy):
- stage: max L2, no L3/L4.
- ui: max L3 within budget.
- overlay/inspector: L3 only with hi-allow:L3.
- L4: forbidden on all surfaces.

## Policy validation

Status: PASS (0 entries, 0 errors, 0 warnings).

## Summary

| ID | Category | Status | Level | Allowed surfaces | Activation |
| --- | --- | --- | --- | --- | --- |

## Entries

## Discovered (unregistered)

Auto-scan found CSS sources that are not referenced in the curated catalog.

| Path | Cost signals | Data attributes | Tokens |
| --- | --- | --- | --- |
| src/app/styles/hi-materials.css | `animation`, `backdrop-filter`, `filter`, `mix-blend-mode` | `data-chart-highlight="on"` | `--hi-bg-0`, `--hi-bg-1`, `--hi-bg-2`, `--hi-blur`, `--hi-blur-soft`, `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period`, `--hi-cyan`, `--hi-cyan-soft`, `--hi-edge-inner`, `--hi-edge-outer`, `--hi-glint-a`, `--hi-glint-b`, `--hi-grain-url`, `--hi-panel-core`, `--hi-panel-deep`, `--hi-radius-lg`, `--hi-radius-xl`, `--hi-shadow-in`, `--hi-shadow-mid`, `--hi-shadow-out`, `--hi-spec-fade`, `--hi-spec-stop`, `--hi-spec-top-a`, `--hi-spec-top-b`, `--hi-steel-a`, `--hi-steel-b`, `--hi-steel-c`, `--hi-text`, `--hi-text-dim` |
| src/shared/render/effects/chartSurfaceHighlight.css | `animation`, `mix-blend-mode` | `data-chart-highlight="on"` | `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period` |
| src/shared/render/effects/contactOcclusion.css | none | `data-material^="glass"` | `--hi-contact-occlusion` |
| src/shared/render/effects/dustField.css | `animation` | none | `--hi-dust-opacity-a`, `--hi-dust-opacity-b`, `--hi-dust-period-a`, `--hi-dust-period-b` |
| src/shared/render/effects/glintSlow.css | `animation`, `filter`, `mix-blend-mode` | `data-glint-blend="screen"`, `data-glint="cyan"`, `data-glint="emerald"`, `data-glint="gold"`, `data-glint="red"`, `data-glint="silver"`, `data-material="glassCritical"` | `--hi-glint-blend`, `--hi-glint-opacity`, `--hi-glint-period`, `--hi-glint-rgb` |
| src/shared/render/effects/mirrorCine.css | `filter` | `data-mirror="on"` | `--hi-mirror-blur`, `--hi-mirror-fade`, `--hi-mirror-strength` |
| src/shared/render/effects/rimDynamic.css | `animation` | `data-material^="glass"` | `--hi-rim-jitter-a`, `--hi-rim-jitter-b`, `--hi-rim-period-a`, `--hi-rim-period-b`, `--hi-rim-strength` |
| src/shared/render/materials/materials.css | `filter`, `mix-blend-mode` | `data-material`, `data-material="chartInk"`, `data-material="glassCold"`, `data-material="glassCritical"`, `data-material="metalFrame"` | `--hi-accent-cyan`, `--hi-accent-pink`, `--hi-glass-frost`, `--hi-glass-opacity`, `--hi-glint-opacity`, `--hi-glow-strength`, `--hi-grain-amount`, `--hi-ink-contrast`, `--hi-rim-strength`, `--hi-spec-strength` |

