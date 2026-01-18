# Render Effects Policy Report
Generated: 2026-01-18T05:06:31.263Z

## Summary
- Files scanned: 197
- Effects detected: 136
- Violations: 13

## Surface Budgets
| Surface | Max Level Used | Max Level Allowed | L3 Count | L4 Count | Score | Score Budget |
| --- | --- | --- | --- | --- | --- | --- |
| ui | L4 | L3 | 57 | 24 | 745 | 22 |
| inspector | L3 | L3 | 4 | 0 | 32 | 10 |
| stage | L2 | L2 | 0 | 0 | 3 | 10 |

## Violations
- [ui] No per-panel blur: backdrop-filter on panel classes is forbidden. (src\app\styles\globals.css:89)
- [ui] No per-panel blur: backdrop-filter on panel classes is forbidden. (src\app\styles\hi-materials.css:213)
- [inspector] L3 effects require hi-allow:L3 in inspector files. (src\render\inspector\inspector.css:74)
- [ui] No per-panel blur: backdrop-filter on panel classes is forbidden. (src\rts\styles\hi-materials.css:124)
- [ui] No per-panel blur: backdrop-filter on panel classes is forbidden. (src\shared\render\qa\qa.stage.debug.css:82)
- [ui] Max level exceeded: L4 used, L3 allowed. (surface aggregate)
- [ui] L3 count 57 exceeds budget 2. (surface aggregate)
- [ui] L4 count 24 exceeds budget 0. (surface aggregate)
- [ui] Score 745 exceeds budget 22. (surface aggregate)
- [ui] Centralized Blur Rule violated: 20 backdrop-filters found. (surface aggregate)
- [inspector] L3 count 4 exceeds budget 0. (surface aggregate)
- [inspector] Score 32 exceeds budget 10. (surface aggregate)
- [inspector] Centralized Blur Rule violated: 4 backdrop-filters found. (surface aggregate)
