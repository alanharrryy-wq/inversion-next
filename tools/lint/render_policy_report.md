# Render Effects Policy Report
Generated: 2026-01-22T11:23:10.877Z

## Summary
- Files scanned: 206 (runtime 122, artifacts 84)
- Effects detected: 89 (runtime 80, artifacts 9)
- Violations: 5 (runtime 5, artifacts 0)

## Surface Budgets (Runtime)
| Surface | Max Level Used | Max Level Allowed | L3 Count | L4 Count | Score | Score Budget |
| --- | --- | --- | --- | --- | --- | --- |
| ui | L3 | L3 | 42 | 0 | 313 | 400 |
| inspector | L3 | L3 | 4 | 0 | 32 | 10 |
| stage | L2 | L2 | 0 | 0 | 3 | 10 |

## Artifacts (Informational)
| Surface | Max Level Used | L3 Count | L4 Count | Score | Files |
| --- | --- | --- | --- | --- | --- |
| ui | L3 | 4 | 0 | 34 | 84 |
| inspector | L0 | 0 | 0 | 0 | 0 |
| stage | L0 | 0 | 0 | 0 | 0 |

## Violations
- [inspector:runtime] L3 effects require hi-allow:L3 in inspector files. (src\render\inspector\inspector.css:74)
- [ui:runtime] Centralized Blur Rule violated: 8 backdrop-filters found. (surface aggregate)
- [inspector:runtime] L3 count 4 exceeds budget 0. (surface aggregate)
- [inspector:runtime] Score 32 exceeds budget 10. (surface aggregate)
- [inspector:runtime] Centralized Blur Rule violated: 4 backdrop-filters found. (surface aggregate)
