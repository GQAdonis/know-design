---
type: Lesson
id: bake-packaged-product-profiles-instead-of-relying-on-runtime-flags
title: Bake packaged product profiles instead of relying on runtime flags
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- commerce-removal
- packaged-e2e
- feature-flags
- build-profile
- product-guarantee
- desktop-packaging
links:
- commerce-removal-phase-reflection-and-corrective-actions
sources:
- id: lesson
  resource: learning:6349fffe94309138
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:49:11.747394+00:00
created_at: 2026-10-05T16:49:11.747394+00:00
updated_at: 2026-10-05T16:49:11.747394+00:00
revision: 0
content_hash: 49725825516505f7769e65edddce0d0089c7f8462b824d8740a078f21394b897
---

## Lesson

A runtime-only feature flag is not a product guarantee. If a packaged build must always run as a specific profile, that profile must be baked into the artifact and verified by launching it with no environment overrides.[^lesson]

## Engineering implications

- Treat environment variables as test harness inputs, not proof of delivered behavior.
- Packaged desktop acceptance tests must launch the installed artifact as a user would, e.g. Finder/double-click or equivalent, without inheriting `OD_BUILD_PROFILE` or other profile-forcing environment variables.
- A passing packaged e2e only proves product behavior if the packaged config itself enforces the required profile.
- This is the core corrective principle behind the packaged-profile gap documented in [Commerce-removal phase reflection and corrective actions](/commerce-removal-phase-reflection-and-corrective-actions.md).

[^lesson]: Phase commerce-removal reflection lesson.