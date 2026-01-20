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

Status: PASS (64 entries, 0 errors, 0 warnings).

## Summary

| ID | Category | Status | Level | Allowed surfaces | Activation |
| --- | --- | --- | --- | --- | --- |
| activeRegionTint | effect | planned | L1 | stage, ui, overlay, inspector | `data-active-region="on"` |
| ambientGradientField | effect | planned | L1 | stage, ui, overlay, inspector | `data-ambient-gradient="on"` |
| ambientHighlightWash | effect | planned | L1 | stage, ui, overlay, inspector | `data-ambient-highlight="on"` |
| ambientOcclusionFake | effect | planned | L2 | stage, ui, overlay, inspector | `data-ambient-occlusion="on"` |
| backdropGlassLayer | effect | planned | L3 | ui, overlay, inspector | `data-backdrop-glass="on"` |
| backgroundSuppression | effect | planned | L1 | stage, ui, overlay, inspector | `data-background-suppression="on"` |
| blendScreenOverlay | effect | planned | L3 | ui, overlay, inspector | `data-blend-screen="on"` |
| bloomFilterSoft | effect | planned | L3 | ui, overlay, inspector | `data-bloom-filter="soft|medium"` |
| chartGridGlow | effect | planned | L2 | stage, ui, overlay, inspector | `data-chart-grid="glow"` |
| chartInk | material | active | L0 | stage, ui, overlay, inspector | `data-material="chartInk"` |
| chartInkBoost | effect | planned | L1 | stage, ui, overlay, inspector | `data-chart-ink="boost"` |
| chartPeakEmphasis | effect | planned | L1 | stage, ui, overlay, inspector | `data-chart-peak="emphasis"` |
| chartSurfaceHighlight | effect | active | L4 | none | `data-chart-highlight="on"` |
| cinematicDesatFilter | effect | planned | L3 | ui, overlay, inspector | `data-cinematic-desat="on"` |
| colorCastAtmosphere | effect | planned | L1 | stage, ui, overlay, inspector | `data-color-cast="cool|warm|neutral"` |
| contactOcclusion | effect | active | L2 | stage, ui, overlay, inspector | `data-material^="glass"` |
| contactShadowSoft | effect | planned | L1 | stage, ui, overlay, inspector | `data-contact-shadow="soft"` |
| contourOutlineStatic | effect | planned | L1 | stage, ui, overlay, inspector | `data-contour-outline="on"` |
| contrastLift | material | planned | L1 | stage, ui, overlay, inspector | `data-contrast-lift="on"` |
| cornerBloomFake | effect | planned | L2 | stage, ui, overlay, inspector | `data-corner-bloom="on"` |
| depthTintGradient | effect | planned | L1 | stage, ui, overlay, inspector | `data-depth-tint="on"` |
| directionalGrain | material | planned | L2 | stage, ui, overlay, inspector | `data-directional-grain="on"` |
| directionalHighlight | effect | planned | L2 | stage, ui, overlay, inspector | `data-directional-highlight="on"` |
| dustDriftAnimated | effect | planned | L4 | none | `data-dust-drift="on"` |
| dustField | effect | active | L4 | none | `.hi-stage::before`, `.hi-stage::after` |
| dustOverlayStatic | effect | planned | L1 | stage, ui, overlay, inspector | `data-dust-overlay="on"` |
| edgeGlowStatic | effect | planned | L2 | stage, ui, overlay, inspector | `data-edge-glow="on"` |
| edgeLift | effect | planned | L1 | stage, ui, overlay, inspector | `data-edge-lift="on"` |
| edgeNoiseStatic | effect | planned | L2 | stage, ui, overlay, inspector | `data-edge-noise="on"` |
| filmGrainStatic | effect | planned | L1 | stage, ui, overlay, inspector | `data-film-grain="on"` |
| focusEmphasis | effect | planned | L1 | stage, ui, overlay, inspector | `data-focus-emphasis="on"` |
| frostedSurfaceFake | material | planned | L2 | stage, ui, overlay, inspector | `data-frosted-surface="on"` |
| glassBlurLayerCentral | effect | planned | L3 | ui, overlay, inspector | `data-glass-blur="central"` |
| glassCold | material | active | L3 | ui, overlay, inspector | `data-material="glassCold"` |
| glassCritical | material | active | L3 | ui, overlay, inspector | `data-material="glassCritical"` |
| glassEdgeFrostFake | material | planned | L2 | stage, ui, overlay, inspector | `data-glass-edge-frost="on"` |
| glintSlow | effect | active | L4 | none | `data-material="glassCritical"`, `data-glint="silver|gold|emerald|cyan|red"`, `data-glint-blend="screen"` |
| glowHalo | effect | planned | L2 | stage, ui, overlay, inspector | `data-glow-halo="on"` |
| gridMaskSoft | effect | planned | L1 | stage, ui, overlay, inspector | `data-grid-mask="soft"` |
| hierarchyAccent | effect | planned | L1 | stage, ui, overlay, inspector | `data-hierarchy-accent="on"` |
| insetDepthCue | effect | planned | L2 | stage, ui, overlay, inspector | `data-inset-depth="on"` |
| layerElevationCue | effect | planned | L2 | stage, ui, overlay, inspector | `data-layer-elevation="low|mid|high"` |
| lightLeak | effect | planned | L2 | stage, ui, overlay, inspector | `data-light-leak="on"` |
| markerEmphasis | effect | planned | L1 | stage, ui, overlay, inspector | `data-marker-emphasis="on"` |
| materialTintGradient | material | planned | L1 | stage, ui, overlay, inspector | `data-material-tint="cool|warm|neutral"` |
| metalFrame | material | active | L0 | stage, ui, overlay, inspector | `data-material="metalFrame"` |
| microGrainStatic | material | planned | L1 | stage, ui, overlay, inspector | `data-micro-grain="on"` |
| microScratches | material | planned | L2 | stage, ui, overlay, inspector | `data-micro-scratches="on"` |
| mirrorCine | effect | active | L3 | ui, overlay, inspector | `data-mirror="on"` |
| mutedContextLayer | effect | planned | L1 | stage, ui, overlay, inspector | `data-muted-context="on"` |
| noiseCloudStatic | effect | planned | L2 | stage, ui, overlay, inspector | `data-noise-cloud="on"` |
| parallaxShiftTracked | effect | planned | L4 | none | `data-parallax-shift="on"` |
| pulseGlow | effect | planned | L4 | none | `data-pulse-glow="on"` |
| rimDynamic | effect | active | L4 | none | `data-material^="glass"` |
| rimStatic | effect | planned | L2 | stage, ui, overlay, inspector | `data-rim-static="on"` |
| selectionHalo | effect | planned | L1 | stage, ui, overlay, inspector | `data-selection-halo="on"` |
| shimmerSweep | effect | planned | L4 | none | `data-shimmer-sweep="on"` |
| specularAccent | effect | planned | L2 | stage, ui, overlay, inspector | `data-specular-accent="on"` |
| temperatureShift | material | planned | L1 | stage, ui, overlay, inspector | `data-temperature-shift="cool|warm"` |
| trackedOpacityFade | effect | planned | L4 | none | `data-tracked-opacity="fade"` |
| trackedTransformSlide | effect | planned | L4 | none | `data-tracked-transform="slide"` |
| vignetteSoft | effect | planned | L1 | stage, ui, overlay, inspector | `data-vignette="soft"` |
| wearPatina | material | planned | L2 | stage, ui, overlay, inspector | `data-wear-patina="on"` |
| zFogFake | effect | planned | L2 | stage, ui, overlay, inspector | `data-z-fog="on"` |

## Entries

### activeRegionTint

- Description: Subtle active-region tint for focusable areas.
- Category: effect
- Tags: `ux`, `tint`
- Status: planned
- Paths: none
- Activation: `data-active-region="on"`, `[data-active-region="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static tint overlay.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Ensure contrast remains readable.
- Examples: none
- Notes: Use for gentle active region emphasis without motion.

### ambientGradientField

- Description: Static ambient gradient field behind content.
- Category: effect
- Tags: `atmosphere`, `gradient`
- Status: planned
- Paths: none
- Activation: `data-ambient-gradient="on"`, `[data-ambient-gradient="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static paint gradients.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep contrast stable across content.
- Examples: none
- Notes: Static background field; avoid over-saturation.

### ambientHighlightWash

- Description: Soft ambient highlight wash in corners.
- Category: effect
- Tags: `lighting`, `wash`
- Status: planned
- Paths: none
- Activation: `data-ambient-highlight="on"`, `[data-ambient-highlight="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static overlay wash.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid flattening dark areas.
- Examples: none
- Notes: Static overlay for gentle illumination.

### ambientOcclusionFake

- Description: Fake ambient occlusion using gradients.
- Category: effect
- Tags: `depth`, `occlusion`
- Status: planned
- Paths: none
- Activation: `data-ambient-occlusion="on"`, `[data-ambient-occlusion="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited gradient layers.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid stacking too many depth layers.
- Examples: none
- Notes: Composited gradient layers for depth.

### backdropGlassLayer

- Description: Centralized backdrop blur glass layer.
- Category: effect
- Tags: `blur`, `glass`, `l3`
- Status: planned
- Paths: none
- Activation: `data-backdrop-glass="on"`, `[data-backdrop-glass="on"]`
- Estimated level: L3
- Cost signals: `backdrop-filter`
- Score notes: Backdrop filter is L3.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: none
- Observed signals: none
- Risks: Centralized Blur rule: only one backdrop-filter per surface; no per-panel blur.
- Examples: none
- Notes: L3 option; requires hi-allow:L3 on overlay/inspector.

### backgroundSuppression

- Description: Background suppression tint for focus.
- Category: effect
- Tags: `ux`, `focus`
- Status: planned
- Paths: none
- Activation: `data-background-suppression="on"`, `[data-background-suppression="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static overlay tint.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Watch readability for de-emphasized content.
- Examples: none
- Notes: Use to reduce background noise.

### blendScreenOverlay

- Description: Screen blend overlay for highlights.
- Category: effect
- Tags: `blend`, `overlay`, `l3`
- Status: planned
- Paths: none
- Activation: `data-blend-screen="on"`, `[data-blend-screen="on"]`
- Estimated level: L3
- Cost signals: `mix-blend-mode`
- Score notes: Blend modes are L3.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: none
- Observed signals: none
- Risks: L3 budget impact; avoid stacking blend layers.
- Examples: none
- Notes: L3 option; requires hi-allow:L3 on overlay/inspector.

### bloomFilterSoft

- Description: Soft bloom via filter on a centralized layer.
- Category: effect
- Tags: `filter`, `bloom`, `l3`
- Status: planned
- Paths: none
- Activation: `data-bloom-filter="soft|medium"`, `[data-bloom-filter="soft"]`, `[data-bloom-filter="medium"]`
- Estimated level: L3
- Cost signals: `filter`
- Score notes: Filter-based bloom is L3.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: none
- Observed signals: none
- Risks: L3 budget impact; avoid stacking filters.
- Examples: none
- Notes: L3 option; requires hi-allow:L3 on overlay/inspector.

### chartGridGlow

- Description: Chart grid glow overlay.
- Category: effect
- Tags: `chart`, `grid`, `glow`
- Status: planned
- Paths: none
- Activation: `data-chart-grid="glow"`, `[data-chart-grid="glow"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited overlay for grid accent.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep grid legible.
- Examples: none
- Notes: Static overlay for chart grids.

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

### chartInkBoost

- Description: Boost chart ink contrast.
- Category: effect
- Tags: `chart`, `contrast`
- Status: planned
- Paths: none
- Activation: `data-chart-ink="boost"`, `[data-chart-ink="boost"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static paint adjustment.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid clipping thin strokes.
- Examples: none
- Notes: Use sparingly for dense charts.

### chartPeakEmphasis

- Description: Emphasize chart peaks with static accent.
- Category: effect
- Tags: `chart`, `emphasis`
- Status: planned
- Paths: none
- Activation: `data-chart-peak="emphasis"`, `[data-chart-peak="emphasis"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static accent for peaks.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid over-highlighting.
- Examples: none
- Notes: Static accent for peak markers.

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

### cinematicDesatFilter

- Description: Cinematic desaturation filter layer.
- Category: effect
- Tags: `filter`, `cinematic`, `l3`
- Status: planned
- Paths: none
- Activation: `data-cinematic-desat="on"`, `[data-cinematic-desat="on"]`
- Estimated level: L3
- Cost signals: `filter`
- Score notes: Filter is L3.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: none
- Observed signals: none
- Risks: L3 budget impact; avoid stacking filters.
- Examples: none
- Notes: L3 option; requires hi-allow:L3 on overlay/inspector.

### colorCastAtmosphere

- Description: Atmospheric color cast overlay.
- Category: effect
- Tags: `atmosphere`, `color`
- Status: planned
- Paths: none
- Activation: `data-color-cast="cool|warm|neutral"`, `[data-color-cast="cool"]`, `[data-color-cast="warm"]`, `[data-color-cast="neutral"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static color wash.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep UI colors consistent.
- Examples: none
- Notes: Static color wash for mood.

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

### contactShadowSoft

- Description: Soft contact shadow under elements.
- Category: effect
- Tags: `depth`, `shadow`
- Status: planned
- Paths: none
- Activation: `data-contact-shadow="soft"`, `[data-contact-shadow="soft"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Small shadow only.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Large blur upgrades to L3.
- Examples: none
- Notes: Small shadow only; keep radius modest.

### contourOutlineStatic

- Description: Static contour outline for separation.
- Category: effect
- Tags: `outline`, `ux`
- Status: planned
- Paths: none
- Activation: `data-contour-outline="on"`, `[data-contour-outline="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static outline.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid heavy stroke width.
- Examples: none
- Notes: Use for subtle separation lines.

### contrastLift

- Description: Lift overall contrast slightly.
- Category: material
- Tags: `contrast`, `material`
- Status: planned
- Paths: none
- Activation: `data-contrast-lift="on"`, `[data-contrast-lift="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static contrast tweak.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Check accessibility contrast.
- Examples: none
- Notes: Static contrast tweak; no motion.

### cornerBloomFake

- Description: Corner bloom using gradients (no blur).
- Category: effect
- Tags: `lighting`, `corner`
- Status: planned
- Paths: none
- Activation: `data-corner-bloom="on"`, `[data-corner-bloom="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Gradient-only bloom.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Do not use filter blur; keep L2.
- Examples: none
- Notes: Avoid real blur; use gradients only.

### depthTintGradient

- Description: Depth tint gradient for stack separation.
- Category: effect
- Tags: `depth`, `gradient`
- Status: planned
- Paths: none
- Activation: `data-depth-tint="on"`, `[data-depth-tint="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static depth gradient.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Ensure content legibility.
- Examples: none
- Notes: Static gradient for depth cue.

### directionalGrain

- Description: Directional grain texture overlay.
- Category: material
- Tags: `material`, `grain`
- Status: planned
- Paths: none
- Activation: `data-directional-grain="on"`, `[data-directional-grain="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited grain texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep texture subtle.
- Examples: none
- Notes: Static grain; align with material.

### directionalHighlight

- Description: Directional highlight band.
- Category: effect
- Tags: `lighting`, `highlight`
- Status: planned
- Paths: none
- Activation: `data-directional-highlight="on"`, `[data-directional-highlight="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited highlight layer.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Overuse can reduce contrast.
- Examples: none
- Notes: Static highlight; avoid animation.

### dustDriftAnimated

- Description: Animated dust drift overlay.
- Category: effect
- Tags: `animation`, `atmosphere`
- Status: planned
- Paths: none
- Activation: `data-dust-drift="on"`, `[data-dust-drift="on"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Animation is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Animated drift; policy forbids L4.

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

### dustOverlayStatic

- Description: Static dust overlay (no motion).
- Category: effect
- Tags: `atmosphere`, `dust`
- Status: planned
- Paths: none
- Activation: `data-dust-overlay="on"`, `[data-dust-overlay="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static texture overlay.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep opacity low.
- Examples: none
- Notes: Static dust texture; no animation.

### edgeGlowStatic

- Description: Static edge glow without blur.
- Category: effect
- Tags: `lighting`, `edge`
- Status: planned
- Paths: none
- Activation: `data-edge-glow="on"`, `[data-edge-glow="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited glow layer.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid heavy glow.
- Examples: none
- Notes: Use gradients; avoid filter blur.

### edgeLift

- Description: Edge lift using subtle light band.
- Category: effect
- Tags: `depth`, `edge`
- Status: planned
- Paths: none
- Activation: `data-edge-lift="on"`, `[data-edge-lift="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Light composition band.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Do not over-brighten edges.
- Examples: none
- Notes: Small highlight to lift edges.

### edgeNoiseStatic

- Description: Static edge noise texture.
- Category: effect
- Tags: `texture`, `edge`
- Status: planned
- Paths: none
- Activation: `data-edge-noise="on"`, `[data-edge-noise="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Composited edge texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid visible banding.
- Examples: none
- Notes: Static noise for edges; keep subtle.

### filmGrainStatic

- Description: Static film grain texture overlay.
- Category: effect
- Tags: `atmosphere`, `grain`
- Status: planned
- Paths: none
- Activation: `data-film-grain="on"`, `[data-film-grain="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static texture overlay.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep grain subtle to avoid visual noise.
- Examples: none
- Notes: Static grain; avoid animation.

### focusEmphasis

- Description: Focus emphasis ring or halo.
- Category: effect
- Tags: `ux`, `focus`
- Status: planned
- Paths: none
- Activation: `data-focus-emphasis="on"`, `[data-focus-emphasis="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static focus emphasis.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid overpowering primary content.
- Examples: none
- Notes: Use for focus emphasis without motion.

### frostedSurfaceFake

- Description: Faux frosted surface using gradients.
- Category: material
- Tags: `material`, `frost`
- Status: planned
- Paths: none
- Activation: `data-frosted-surface="on"`, `[data-frosted-surface="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Gradient-based frost without blur.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Real blur would move this to L3.
- Examples: none
- Notes: Use gradients/noise; avoid filter or backdrop-filter.

### glassBlurLayerCentral

- Description: Centralized glass blur layer.
- Category: effect
- Tags: `blur`, `glass`, `l3`
- Status: planned
- Paths: none
- Activation: `data-glass-blur="central"`, `[data-glass-blur="central"]`
- Estimated level: L3
- Cost signals: `backdrop-filter`
- Score notes: Backdrop blur is L3.
- Allowed surfaces: ui, overlay, inspector
- Allow marker required: yes
- Tokens: none
- Observed signals: none
- Risks: Centralized Blur rule: only one backdrop-filter per surface; no per-panel blur.
- Examples: none
- Notes: L3 option; requires hi-allow:L3 on overlay/inspector.

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

### glassEdgeFrostFake

- Description: Edge-only frost using gradients.
- Category: material
- Tags: `glass`, `material`
- Status: planned
- Paths: none
- Activation: `data-glass-edge-frost="on"`, `[data-glass-edge-frost="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Gradient-based edge frost.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Backdrop-filter would raise to L3.
- Examples: none
- Notes: Edge-only frost via gradients; avoid filter blur.

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

### glowHalo

- Description: Static halo glow around elements.
- Category: effect
- Tags: `optical`, `glow`
- Status: planned
- Paths: none
- Activation: `data-glow-halo="on"`, `[data-glow-halo="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Gradient-only halo.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Filter blur would move to L3.
- Examples: none
- Notes: Use gradients; avoid filter blur.

### gridMaskSoft

- Description: Soft grid mask to reduce clutter.
- Category: effect
- Tags: `readability`, `mask`
- Status: planned
- Paths: none
- Activation: `data-grid-mask="soft"`, `[data-grid-mask="soft"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static mask layer.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid hiding key data.
- Examples: none
- Notes: Use for readability on dense grids.

### hierarchyAccent

- Description: Hierarchy accent for structured layouts.
- Category: effect
- Tags: `ux`, `hierarchy`
- Status: planned
- Paths: none
- Activation: `data-hierarchy-accent="on"`, `[data-hierarchy-accent="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static hierarchy accent.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid competing accents.
- Examples: none
- Notes: Use for hierarchy cues without motion.

### insetDepthCue

- Description: Inset depth cue using gradients.
- Category: effect
- Tags: `depth`, `inset`
- Status: planned
- Paths: none
- Activation: `data-inset-depth="on"`, `[data-inset-depth="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Inset gradients for depth.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Heavy blur would move to L3.
- Examples: none
- Notes: Inset depth via gradients; avoid blur.

### layerElevationCue

- Description: Layer elevation cue for stacked content.
- Category: effect
- Tags: `depth`, `elevation`
- Status: planned
- Paths: none
- Activation: `data-layer-elevation="low|mid|high"`, `[data-layer-elevation="low"]`, `[data-layer-elevation="mid"]`, `[data-layer-elevation="high"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static elevation cues.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Large blur shadows would move to L3.
- Examples: none
- Notes: Use static cues for layer separation.

### lightLeak

- Description: Static light leak overlay.
- Category: effect
- Tags: `lighting`, `atmosphere`
- Status: planned
- Paths: none
- Activation: `data-light-leak="on"`, `[data-light-leak="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static light leak overlay.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid filter blur to keep L2.
- Examples: none
- Notes: Static light leak; avoid animation.

### markerEmphasis

- Description: Marker emphasis for key points.
- Category: effect
- Tags: `ux`, `marker`
- Status: planned
- Paths: none
- Activation: `data-marker-emphasis="on"`, `[data-marker-emphasis="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static marker emphasis.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid over-saturation.
- Examples: none
- Notes: Use to highlight key markers.

### materialTintGradient

- Description: Material tint gradient options.
- Category: material
- Tags: `material`, `tint`
- Status: planned
- Paths: none
- Activation: `data-material-tint="cool|warm|neutral"`, `[data-material-tint="cool"]`, `[data-material-tint="warm"]`, `[data-material-tint="neutral"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static tint gradient.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep contrast stable.
- Examples: none
- Notes: Static tint gradient for materials.

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

### microGrainStatic

- Description: Micro grain texture for materials.
- Category: material
- Tags: `material`, `grain`
- Status: planned
- Paths: none
- Activation: `data-micro-grain="on"`, `[data-micro-grain="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Fine grain texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep texture subtle to avoid aliasing.
- Examples: none
- Notes: Fine grain for material finish.

### microScratches

- Description: Micro scratch texture overlay.
- Category: material
- Tags: `material`, `texture`
- Status: planned
- Paths: none
- Activation: `data-micro-scratches="on"`, `[data-micro-scratches="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static scratch texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid high-frequency aliasing.
- Examples: none
- Notes: Static scratch texture; avoid motion.

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

### mutedContextLayer

- Description: Muted context layer for de-emphasis.
- Category: effect
- Tags: `ux`, `context`
- Status: planned
- Paths: none
- Activation: `data-muted-context="on"`, `[data-muted-context="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static context suppression.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Ensure key content remains readable.
- Examples: none
- Notes: Use to de-emphasize surrounding context.

### noiseCloudStatic

- Description: Static noise cloud overlay.
- Category: effect
- Tags: `atmosphere`, `noise`
- Status: planned
- Paths: none
- Activation: `data-noise-cloud="on"`, `[data-noise-cloud="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static noise texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep opacity low.
- Examples: none
- Notes: Static noise cloud; no animation.

### parallaxShiftTracked

- Description: Tracked parallax shift for depth.
- Category: effect
- Tags: `animation`, `parallax`
- Status: planned
- Paths: none
- Activation: `data-parallax-shift="on"`, `[data-parallax-shift="on"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Tracked motion is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Tracked parallax; policy forbids L4.

### pulseGlow

- Description: Animated pulse glow effect.
- Category: effect
- Tags: `animation`, `glow`
- Status: planned
- Paths: none
- Activation: `data-pulse-glow="on"`, `[data-pulse-glow="on"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Animation is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Animated glow; policy forbids L4.

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

### rimStatic

- Description: Static rim light accent.
- Category: effect
- Tags: `lighting`, `rim`
- Status: planned
- Paths: none
- Activation: `data-rim-static="on"`, `[data-rim-static="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static rim accent via gradients.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Filter blur would move to L3.
- Examples: none
- Notes: Use gradients; avoid filter blur.

### selectionHalo

- Description: Selection halo for active items.
- Category: effect
- Tags: `ux`, `selection`
- Status: planned
- Paths: none
- Activation: `data-selection-halo="on"`, `[data-selection-halo="on"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static selection halo.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid conflict with focus rings.
- Examples: none
- Notes: Selection halo for chosen items.

### shimmerSweep

- Description: Animated shimmer sweep across surfaces.
- Category: effect
- Tags: `animation`, `shimmer`
- Status: planned
- Paths: none
- Activation: `data-shimmer-sweep="on"`, `[data-shimmer-sweep="on"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Animation is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Animated sweep; policy forbids L4.

### specularAccent

- Description: Static specular accent highlight.
- Category: effect
- Tags: `lighting`, `specular`
- Status: planned
- Paths: none
- Activation: `data-specular-accent="on"`, `[data-specular-accent="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static specular accent.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid over-bright highlights.
- Examples: none
- Notes: Static specular highlight; no motion.

### temperatureShift

- Description: Material temperature shift options.
- Category: material
- Tags: `material`, `temperature`
- Status: planned
- Paths: none
- Activation: `data-temperature-shift="cool|warm"`, `[data-temperature-shift="cool"]`, `[data-temperature-shift="warm"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static temperature shift.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep color balance stable.
- Examples: none
- Notes: Static temperature shift for materials.

### trackedOpacityFade

- Description: Tracked opacity fade transition.
- Category: effect
- Tags: `animation`, `tracked`
- Status: planned
- Paths: none
- Activation: `data-tracked-opacity="fade"`, `[data-tracked-opacity="fade"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Tracked transition is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Tracked opacity fade; policy forbids L4.

### trackedTransformSlide

- Description: Tracked transform slide transition.
- Category: effect
- Tags: `animation`, `tracked`
- Status: planned
- Paths: none
- Activation: `data-tracked-transform="slide"`, `[data-tracked-transform="slide"]`
- Estimated level: L4
- Cost signals: `animation`
- Score notes: Tracked transform is L4.
- Allowed surfaces: none
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Forbidden by policy (L4).
- Examples: none
- Notes: Tracked transform slide; policy forbids L4.

### vignetteSoft

- Description: Soft vignette via gradients.
- Category: effect
- Tags: `atmosphere`, `vignette`
- Status: planned
- Paths: none
- Activation: `data-vignette="soft"`, `[data-vignette="soft"]`
- Estimated level: L1
- Cost signals: none
- Score notes: Static vignette gradient.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Avoid heavy darkening.
- Examples: none
- Notes: Subtle vignette via gradients; no blur.

### wearPatina

- Description: Wear patina texture overlay.
- Category: material
- Tags: `material`, `patina`
- Status: planned
- Paths: none
- Activation: `data-wear-patina="on"`, `[data-wear-patina="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Static patina texture.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Keep texture subtle.
- Examples: none
- Notes: Static patina texture for materials.

### zFogFake

- Description: Fake depth fog using gradients.
- Category: effect
- Tags: `depth`, `fog`
- Status: planned
- Paths: none
- Activation: `data-z-fog="on"`, `[data-z-fog="on"]`
- Estimated level: L2
- Cost signals: none
- Score notes: Gradient-based fog cue.
- Allowed surfaces: stage, ui, overlay, inspector
- Allow marker required: no
- Tokens: none
- Observed signals: none
- Risks: Filter blur would raise to L3.
- Examples: none
- Notes: Fake fog using gradients; avoid filter blur.

## Discovered (unregistered)

Auto-scan found CSS sources that are not referenced in the curated catalog.

| Path | Cost signals | Data attributes | Tokens |
| --- | --- | --- | --- |
| src/app/styles/hi-materials.css | `animation`, `backdrop-filter`, `filter`, `mix-blend-mode` | `data-chart-highlight="on"` | `--hi-bg-0`, `--hi-bg-1`, `--hi-bg-2`, `--hi-blur`, `--hi-blur-soft`, `--hi-chart-highlight-opacity`, `--hi-chart-highlight-period`, `--hi-cyan`, `--hi-cyan-soft`, `--hi-edge-inner`, `--hi-edge-outer`, `--hi-glint-a`, `--hi-glint-b`, `--hi-grain-url`, `--hi-panel-core`, `--hi-panel-deep`, `--hi-radius-lg`, `--hi-radius-xl`, `--hi-shadow-in`, `--hi-shadow-mid`, `--hi-shadow-out`, `--hi-spec-fade`, `--hi-spec-stop`, `--hi-spec-top-a`, `--hi-spec-top-b`, `--hi-steel-a`, `--hi-steel-b`, `--hi-steel-c`, `--hi-text`, `--hi-text-dim` |

