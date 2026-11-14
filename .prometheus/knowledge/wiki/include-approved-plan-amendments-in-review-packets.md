---
type: Lesson
id: include-approved-plan-amendments-in-review-packets
title: Include approved plan amendments in review packets
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- kbd-process
- review-gates
- plan-amendments
- commerce-removal
- acceptance-criteria
links:
- commerce-removal-phase-reflection-and-corrective-actions
sources:
- id: lesson
  resource: learning:cfe32f8221ce98e2
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:49:28.032109+00:00
created_at: 2026-10-05T16:49:28.032109+00:00
updated_at: 2026-10-05T16:49:28.032109+00:00
revision: 0
content_hash: f07952cbb5d964eae5a214354ed853aada265d44979323fb473a5e83dfd7abc2
---

## Lesson

A review packet must include the plan's approved amendments; otherwise reviewers can correctly report deviations that the planner had already accepted.[^lesson]

## Engineering implications

- Treat amendments as part of the review baseline, not as informal context.
- Before review, package together:
  - original plan or acceptance criteria;
  - approved amendments or scope changes;
  - rationale for each amendment;
  - evidence showing implementation against the amended baseline.
- Reviewers should not have to infer planner approval from implementation artifacts or chat history.
- This strengthens the review-gate discipline described in [Commerce-removal phase reflection and corrective actions](/commerce-removal-phase-reflection-and-corrective-actions.md): evidence must prove the intended and approved behavior, not merely the unamended plan or test harness state.

[^lesson]: Phase commerce-removal reflection lesson.