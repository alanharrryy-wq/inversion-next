# Glosario

> Auto-generado desde docs/_meta/terms.json. Última generación: **2026-01-22**

## Baseline-aware lint

El lint no rompe por violaciones históricas; solo falla si aparecen NUEVAS violaciones o empeora el score.

**Links:**
- tools/lint/render_policy_check.mjs

## L0–L4

Niveles de costo de efectos de render. L0 es gratis (assets/pre-blur), L3/L4 son carísimos (blur real, loops, filters).

**Links:**
- docs/architecture/RENDER_POLICY.md
- docs/architecture/EFFECTS_POLICY.json

## Surface

Zona de render con budget propio: stage, ui, overlay, inspector.

**Links:**
- docs/architecture/EFFECTS_POLICY.json
