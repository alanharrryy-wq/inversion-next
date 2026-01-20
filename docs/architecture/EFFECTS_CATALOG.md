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

Status: PASS (10 entries, 0 errors, 0 warnings).

## Summary

| ID | Category | Status | Level | Allowed surfaces | Activation |
| --- | --- | --- | --- | --- | --- |
| chartInk | material | active | L0 | stage, ui, overlay, inspector | `data-material="chartInk"` |
| chartSurfaceHighlight | effect | active | L4 | none | `data-chart-highlight="on"` |
| contactOcclusion | effect | active | L2 | stage, ui, overlay, inspector | `data-material^="glass"` |
| dustField | effect | active | L4 | none | `.hi-stage::before`, `.hi-stage::after` |
| glassCold | material | active | L3 | ui, overlay, inspector | `data-material="glassCold"` |
| glassCritical | material | active | L3 | ui, overlay, inspector | `data-material="glassCritical"` |
| glintSlow | effect | active | L4 | none | `data-material="glassCritical"`, `data-glint="silver|gold|emerald|cyan|red"`, `data-glint-blend="screen"` |
| metalFrame | material | active | L0 | stage, ui, overlay, inspector | `data-material="metalFrame"` |
| mirrorCine | effect | active | L3 | ui, overlay, inspector | `data-mirror="on"` |
| rimDynamic | effect | active | L4 | none | `data-material^="glass"` |

## Entries

### chartInk

- Description: Chart ink material tokens.
- Category: material
- Tags: `chart`, `ink`
- Status: active
- Paths: `src/shared/render/materials/materials.css`
- Activation: `data-material="chartInk"`, `[data-material="chartInk"]`
- Estimated level: L0
- Cost signals: none
- Score notes: Token-only material with no overlays.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: `--hi-ink-contrast`, `--hi-glow-strength`, `--hi-grain-amount`
- Observed signals: cost `filter`, `mix-blend-mode`; tokens `--hi-accent-cyan`, `--hi-accent-pink`, `--hi-glass-frost`, `--hi-glass-opacity`, `--hi-glint-opacity`, `--hi-glow-strength`, `--hi-grain-amount`, `--hi-ink-contrast`, `--hi-rim-strength`, `--hi-spec-strength`; selectors `[data-material="chartInk"]`, `[data-material]`; attributes `data-material`, `data-material="chartInk"`; usage `src/slides/slide-02/ui/Slide02.tsx`
- Risks: No inherent rendering risks; token-only.
- Examples: `src/shared/render/materials/materials.css:164` (Material tokens)
- Notes: Chart-specific token set.

### chartSurfaceHighlight

- Description: Slow chart highlight sweep with blend.
- Category: effect
- Tags: `animation`, `blend`, `chart`
- Status: active
- Paths: `src/shared/render/effects/chartSurfaceHighlight.css`
- Activation: `data-chart-highlight="on"`, `[data-chart-highlight="on"]`, `[data-chart-highlight="on"]::after`
- Estimated level: L4
- Cost signals: `animation`, `mix-blend-mode`
- Score notes: Animation drives L4; mix-blend-mode is an L3 signal.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period`
- Observed signals: cost `animation`, `mix-blend-mode`; tokens `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period`; selectors `[data-chart-highlight="on"]`, `[data-chart-highlight="on"]::after`; attributes `data-chart-highlight="on"`; usage `src/slides/slide-02/ui/Slide02.tsx`
- Risks: L4 animation is forbidden on all surfaces.
- Examples: `src/shared/render/effects/chartSurfaceHighlight.css:17` (Highlight pseudo-element); `src/slides/slide-02/ui/Slide02.tsx:50` (Wrapper activation)
- Notes: Wrapper opt-in via data-chart-highlight="on".

### contactOcclusion

- Description: Contact occlusion gradients for glass materials.
- Category: effect
- Tags: `glass`, `occlusion`
- Status: active
- Paths: `src/shared/render/effects/contactOcclusion.css`
- Activation: `data-material^="glass"`, `[data-material^="glass"]`, `[data-material^="glass"]::after`
- Estimated level: L2
- Cost signals: none
- Score notes: Static gradient layers on pseudo-elements.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: `--hi-contact-occlusion`
- Observed signals: tokens `--hi-contact-occlusion`; selectors `[data-material^="glass"]`, `[data-material^="glass"]::after`; attributes `data-material^="glass"`; usage `src/slides/slide-01/ui/Slide01.tsx`, `src/slides/slide-02/ui/Slide02.tsx`
- Risks: Stacks with other glass overlays; watch layer count.
- Examples: `src/shared/render/effects/contactOcclusion.css:16` (Glass material selector)
- Notes: Applies automatically to any glass material prefix.

### dustField

- Description: Micro dust field layered over the stage.
- Category: effect
- Tags: `animation`, `stage`
- Status: active
- Paths: `src/shared/render/effects/dustField.css`
- Activation: `.hi-stage::before`, `.hi-stage::after`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Keyframe animation on pseudo-elements triggers L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: `--hi-dust-opacity-a`, `--hi-dust-opacity-b`, `--hi-dust-period-a`, `--hi-dust-period-b`
- Observed signals: cost `animation`; tokens `--hi-dust-opacity-a`, `--hi-dust-opacity-b`, `--hi-dust-period-a`, `--hi-dust-period-b`; selectors `.hi-stage::after`, `.hi-stage::before`
- Risks: Continuous animation is L4 and forbidden on all surfaces.
- Examples: `src/shared/render/effects/dustField.css:15` (.hi-stage::before animation layer)
- Notes: Applied globally to .hi-stage when the stylesheet is loaded.

### glassCold

- Description: Default glass material for panels.
- Category: material
- Tags: `glass`, `panel`
- Status: active
- Paths: `src/shared/render/materials/materials.css`
- Activation: `data-material="glassCold"`, `[data-material="glassCold"]`, `[data-material="glassCold"]::before`, `[data-material="glassCold"]::after`
- Estimated level: L3
- Cost signals: `filter`, `mix-blend-mode`
- Score notes: Glass overlays use filter and mix-blend-mode.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: `--hi-glass-opacity`, `--hi-glass-frost`, `--hi-rim-strength`, `--hi-spec-strength`, `--hi-grain-amount`, `--hi-glow-strength`, `--hi-glint-opacity`, `--hi-accent-cyan`, `--hi-accent-pink`
- Observed signals: cost `filter`, `mix-blend-mode`; tokens `--hi-accent-cyan`, `--hi-accent-pink`, `--hi-glass-frost`, `--hi-glass-opacity`, `--hi-glint-opacity`, `--hi-glow-strength`, `--hi-grain-amount`, `--hi-ink-contrast`, `--hi-rim-strength`, `--hi-spec-strength`; selectors `[data-material="glassCold"]`, `[data-material="glassCold"] .hi-grain`, `[data-material="glassCold"]::after`, `[data-material="glassCold"]::before`, `[data-material="glassCold"]>*`, `[data-material]`; attributes `data-material`, `data-material="glassCold"`; usage `src/slides/slide-02/ui/Slide02.tsx`
- Risks: L3 blend and filter effects consume budget; overlay/inspector require hi-allow:L3.
- Examples: `src/shared/render/materials/materials.css:115` (Material tokens); `src/shared/ui/slide/SlideShell.tsx:44` (Default material usage)
- Notes: Default glass material; overlays render inside the panel.

### glassCritical

- Description: Premium glass material for KPI panels.
- Category: material
- Tags: `glass`, `kpi`
- Status: active
- Paths: `src/shared/render/materials/materials.css`
- Activation: `data-material="glassCritical"`, `[data-material="glassCritical"]`, `[data-material="glassCritical"]::before`, `[data-material="glassCritical"]::after`
- Estimated level: L3
- Cost signals: `filter`, `mix-blend-mode`
- Score notes: Glass overlays use filter and mix-blend-mode.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: `--hi-glass-opacity`, `--hi-glass-frost`, `--hi-rim-strength`, `--hi-spec-strength`, `--hi-grain-amount`, `--hi-glow-strength`, `--hi-glint-opacity`, `--hi-accent-cyan`, `--hi-accent-pink`
- Observed signals: cost `filter`, `mix-blend-mode`; tokens `--hi-accent-cyan`, `--hi-accent-pink`, `--hi-glass-frost`, `--hi-glass-opacity`, `--hi-glint-opacity`, `--hi-glow-strength`, `--hi-grain-amount`, `--hi-ink-contrast`, `--hi-rim-strength`, `--hi-spec-strength`; selectors `[data-material="glassCritical"]`, `[data-material="glassCritical"] .hi-grain`, `[data-material="glassCritical"]::after`, `[data-material="glassCritical"]::before`, `[data-material="glassCritical"]>*`, `[data-material]`; attributes `data-material`, `data-material="glassCritical"`; usage `src/slides/slide-01/ui/Slide01.tsx`, `src/slides/slide-02/ui/Slide02.tsx`
- Risks: L3 blend and filter effects consume budget; overlay/inspector require hi-allow:L3.
- Examples: `src/shared/render/materials/materials.css:133` (Material tokens); `src/slides/slide-01/ui/Slide01.tsx:8` (Material usage)
- Notes: Premium glass for KPI panels; pairs with glintSlow.

### glintSlow

- Description: Slow animated glint for glassCritical.
- Category: effect
- Tags: `animation`, `glass`, `glint`
- Status: active
- Paths: `src/shared/render/effects/glintSlow.css`
- Activation: `data-material="glassCritical"`, `data-glint="silver|gold|emerald|cyan|red"`, `data-glint-blend="screen"`, `[data-material="glassCritical"]`, `[data-material="glassCritical"]::after`, `[data-material="glassCritical"][data-glint="silver"]`, `[data-material="glassCritical"][data-glint="gold"]`, `[data-material="glassCritical"][data-glint="emerald"]`, `[data-material="glassCritical"][data-glint="cyan"]`, `[data-material="glassCritical"][data-glint="red"]`, `[data-material="glassCritical"][data-glint-blend="screen"]`
- Estimated level: L4
- Cost signals: `animation`, `filter`, `mix-blend-mode`
- Score notes: Animation drives L4; filter and mix-blend-mode add L3 cost.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: `--hi-glint-opacity`, `--hi-glint-period`, `--hi-glint-rgb`, `--hi-glint-blend`
- Observed signals: cost `animation`, `filter`, `mix-blend-mode`; tokens `--hi-glint-blend`, `--hi-glint-opacity`, `--hi-glint-period`, `--hi-glint-rgb`; selectors `[data-material="glassCritical"]`, `[data-material="glassCritical"]::after`, `[data-material="glassCritical"][data-glint-blend="screen"]`, `[data-material="glassCritical"][data-glint="cyan"]`, `[data-material="glassCritical"][data-glint="emerald"]`, `[data-material="glassCritical"][data-glint="gold"]`, `[data-material="glassCritical"][data-glint="red"]`, `[data-material="glassCritical"][data-glint="silver"]`; attributes `data-glint-blend="screen"`, `data-glint="cyan"`, `data-glint="emerald"`, `data-glint="gold"`, `data-glint="red"`, `data-glint="silver"`, `data-material="glassCritical"`; usage `src/slides/slide-01/ui/Slide01.tsx`, `src/slides/slide-02/ui/Slide02.tsx`
- Risks: L4 animation is forbidden on all surfaces.
- Examples: `src/shared/render/effects/glintSlow.css:37` (Glint layer); `src/slides/slide-01/ui/Slide01.tsx:8` (Activation with data-glint)
- Notes: Intended only for glassCritical with optional color variants.

### metalFrame

- Description: Metal frame material tokens.
- Category: material
- Tags: `frame`, `metal`
- Status: active
- Paths: `src/shared/render/materials/materials.css`
- Activation: `data-material="metalFrame"`, `[data-material="metalFrame"]`
- Estimated level: L0
- Cost signals: none
- Score notes: Token-only material with no overlays.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: `--hi-rim-strength`, `--hi-spec-strength`, `--hi-glass-opacity`, `--hi-glass-frost`, `--hi-grain-amount`, `--hi-glow-strength`, `--hi-glint-opacity`
- Observed signals: cost `filter`, `mix-blend-mode`; tokens `--hi-accent-cyan`, `--hi-accent-pink`, `--hi-glass-frost`, `--hi-glass-opacity`, `--hi-glint-opacity`, `--hi-glow-strength`, `--hi-grain-amount`, `--hi-ink-contrast`, `--hi-rim-strength`, `--hi-spec-strength`; selectors `[data-material="metalFrame"]`, `[data-material]`; attributes `data-material`, `data-material="metalFrame"`; usage `src/slides/slide-02/ui/Slide02.tsx`
- Risks: No inherent rendering risks; token-only.
- Examples: `src/shared/render/materials/materials.css:149` (Material tokens)
- Notes: Metal trim material; relies on consumer styles.

### mirrorCine

- Description: Cinematic mirror reflection under a wrapper.
- Category: effect
- Tags: `blur`, `reflection`
- Status: active
- Paths: `src/shared/render/effects/mirrorCine.css`
- Activation: `data-mirror="on"`, `[data-mirror="on"]`, `[data-mirror="on"]::after`
- Estimated level: L3
- Cost signals: `filter`
- Score notes: Filter blur requires framebuffer read (L3).
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: `--hi-mirror-strength`, `--hi-mirror-blur`, `--hi-mirror-fade`
- Observed signals: cost `filter`; tokens `--hi-mirror-blur`, `--hi-mirror-fade`, `--hi-mirror-strength`; selectors `[data-mirror="on"]`, `[data-mirror="on"]::after`; attributes `data-mirror="on"`
- Risks: Filter blur consumes L3 budget; overlay/inspector require hi-allow:L3.
- Examples: `src/shared/render/effects/mirrorCine.css:19` (Mirror pseudo-element)
- Notes: Wrapper-level reflection using background: inherit.

### rimDynamic

- Description: Animated rim shimmer for glass materials.
- Category: effect
- Tags: `animation`, `glass`, `rim`
- Status: active
- Paths: `src/shared/render/effects/rimDynamic.css`
- Activation: `data-material^="glass"`, `[data-material^="glass"]`, `[data-material^="glass"]::before`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Dual keyframe animations trigger L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: `--hi-rim-strength`, `--hi-rim-jitter-a`, `--hi-rim-jitter-b`, `--hi-rim-period-a`, `--hi-rim-period-b`
- Observed signals: cost `animation`; tokens `--hi-rim-jitter-a`, `--hi-rim-jitter-b`, `--hi-rim-period-a`, `--hi-rim-period-b`, `--hi-rim-strength`; selectors `[data-material^="glass"]`, `[data-material^="glass"]::before`; attributes `data-material^="glass"`; usage `src/slides/slide-01/ui/Slide01.tsx`, `src/slides/slide-02/ui/Slide02.tsx`
- Risks: L4 animation is forbidden on all surfaces.
- Examples: `src/shared/render/effects/rimDynamic.css:21` (Rim pseudo-element)
- Notes: Applied to glass materials via prefix selector.

## Discovered (unregistered)

Auto-scan found CSS sources that are not referenced in the curated catalog.

| Path | Cost signals | Data attributes | Tokens |
| --- | --- | --- | --- |
| src/app/styles/hi-materials.css | `animation`, `backdrop-filter`, `filter`, `mix-blend-mode` | `data-chart-highlight="on"` | `--hi-bg-0`, `--hi-bg-1`, `--hi-bg-2`, `--hi-blur`, `--hi-blur-soft`, `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period`, `--hi-cyan`, `--hi-cyan-soft`, `--hi-edge-inner`, `--hi-edge-outer`, `--hi-glint-a`, `--hi-glint-b`, `--hi-grain-url`, `--hi-panel-core`, `--hi-panel-deep`, `--hi-radius-lg`, `--hi-radius-xl`, `--hi-shadow-in`, `--hi-shadow-mid`, `--hi-shadow-out`, `--hi-spec-fade`, `--hi-spec-stop`, `--hi-spec-top-a`, `--hi-spec-top-b`, `--hi-steel-a`, `--hi-steel-b`, `--hi-steel-c`, `--hi-text`, `--hi-text-dim` |

