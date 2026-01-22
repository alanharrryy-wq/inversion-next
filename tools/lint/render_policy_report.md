# Render Effects Policy Report
Generated: 2026-01-22T03:36:34.431Z

## Summary
- Files scanned: 200 (runtime 122, artifacts 78)
- Effects detected: 91 (runtime 83, artifacts 8)
- Violations: 5 (runtime 5, artifacts 0)

## Surface Budgets (Runtime)
| Surface | Max Level Used | Max Level Allowed | L3 Count | L4 Count | Score | Score Budget |
| --- | --- | --- | --- | --- | --- | --- |
| ui | L3 | L3 | 46 | 0 | 350 | 400 |
| inspector | L3 | L3 | 4 | 0 | 32 | 10 |
| stage | L2 | L2 | 0 | 0 | 3 | 10 |

## Artifacts (Informational)
| Surface | Max Level Used | L3 Count | L4 Count | Score | Files |
| --- | --- | --- | --- | --- | --- |
| ui | L3 | 4 | 0 | 34 | 78 |
| inspector | L0 | 0 | 0 | 0 | 0 |
| stage | L0 | 0 | 0 | 0 | 0 |

## Violations
- [inspector:runtime] L3 effects require hi-allow:L3 in inspector files. (src\render\inspector\inspector.css:74)
- [ui:runtime] Centralized Blur Rule violated: 12 backdrop-filters found. (surface aggregate)
- [inspector:runtime] L3 count 4 exceeds budget 0. (surface aggregate)
- [inspector:runtime] Score 32 exceeds budget 10. (surface aggregate)
- [inspector:runtime] Centralized Blur Rule violated: 4 backdrop-filters found. (surface aggregate)
