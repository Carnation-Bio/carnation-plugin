---
status: accepted
date: 2026-10-12
pr: release gate 0.2.2
---

# Recap: 0.2.2 release gate

The submission draft records that 0.2.2 passed its release gate. Treatment
cohorts, annotated queries and annotated exports (app PRs #1565, #1566 and
#1567) are in production, and Codex qualified the flow on beta (app PR #1572).

Claude Code qualified the same flow against production through the Carnation
plugin connection on the synthetic `QA MCP local upload Oct 6 2026` dataset,
whose confirmed map has a DMSO 0.1% vehicle well (A01) and a QA compound
1.25 uM sample well (A02):

- Cohort selection by role and by exact treatment and dose returned one well
  and one ready field each.
- A cohort-scoped launch preflight narrowed the run to the A02 field.
- Map-derived preview summaries grouped both previews by confirmed condition
  (GFP mean 4000 vs 9000) and declined statistics with one well per group.
- A two-field full run completed with no failed fields.
- Context-pinned schema, row, well and FOV queries returned every public
  condition column, the map identity and the context hash.
- Annotated CSV (4 rows) and Parquet (2 well rows) downloads returned 200 and
  carried the analysis ID, workflow hash and execution fingerprint.

The installed 0.2.2 helper matched the published SHA-256 and inspected a
synthetic two-well, deflate-compressed OME-TIFF plate correctly. Publishing in
the directory remains manual.
