---
type: Lesson
id: define-upstream-acceptance-scope-explicitly
title: Define upstream acceptance scope explicitly
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- commerce-removal
- acceptance-criteria
- network-policy
- egress-testing
- upstream-endpoints
- testing-scope
links:
- commerce-removal-phase-reflection-and-corrective-actions
sources:
- id: lesson
  resource: learning:66e2029f5ce8ecf7
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:49:20.270911+00:00
created_at: 2026-10-05T16:49:20.270911+00:00
updated_at: 2026-10-05T16:49:20.270911+00:00
revision: 0
content_hash: 0edc57e2214bec70165726c2582696135607c9286d21492793db03cafb4d917e
---

## Lesson

An acceptance test that defines **upstream** narrowly can pass while other egress paths continue. Acceptance criteria must state exactly which hosts count as upstream and must record—not hide—the excluded hosts.[^lesson]

## Engineering implications

- Network-removal or telemetry-disable tests need an explicit host allow/deny scope.
- A passing test only proves the scoped claim; it does not prove all outbound network traffic stopped.
- Criteria should include:
  - hosts/domains considered in scope;
  - hosts/domains intentionally out of scope;
  - observed residual egress, even if excluded from the pass/fail rule.
- This complements the `commerce-removal` reflection that packaged tests must prove delivered behavior rather than only harness behavior in [Commerce-removal phase reflection and corrective actions](/commerce-removal-phase-reflection-and-corrective-actions.md).

[^lesson]: Phase commerce-removal reflection lesson.