---
type: Lesson
id: use-a-control-to-prove-recording-proxy-interception
title: Use a Control to Prove Recording Proxy Interception
tags:
- vis:project
- kbd:reflect
- phase:commerce-removal
- commerce-removal
- packaged-e2e
- recording-proxy
- test-controls
- network-testing
- daemon-testing
links:
- bake-packaged-product-profiles-instead-of-relying-on-runtime-flags
sources:
- id: lesson
  resource: learning:82b47a75ce173901
generated:
  by: pk/1.11.0
  at: 2026-10-05T16:49:36.576570+00:00
created_at: 2026-10-05T16:49:36.576570+00:00
updated_at: 2026-10-05T16:49:36.576570+00:00
revision: 0
content_hash: 8a1ac58c035467e3bae904c51786f7db0c0380b94549363f2ee0e7fcfca27d5b
---

## Lesson

A witness is only evidence if a control proves the observer can see the relevant behavior. In the `commerce-removal` packaged-daemon tests, the stock-profile control showed that the recording proxy genuinely intercepted traffic from the packaged daemon, making later absence/presence claims meaningful.[^lesson]

## Engineering implications

- Before relying on a negative network observation, run a positive control that should produce observable traffic.
- A recording proxy trace with no events is not sufficient by itself; it may indicate either correct behavior or a blind/inactive observer.
- For packaged acceptance tests, controls should exercise the same installed artifact and launch path used by the claim under test.
- This complements [Bake packaged product profiles instead of relying on runtime flags](/bake-packaged-product-profiles-instead-of-relying-on-runtime-flags.md): packaged e2e evidence must prove delivered behavior, and the instrumentation itself must be proven capable of observing that behavior.

[^lesson]: Phase commerce-removal reflection lesson.