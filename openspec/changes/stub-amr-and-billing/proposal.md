## Why

KnowDesign removes AMR login and billing. A fresh install must reach Home and run a local agent without a Cloud sign-in prompt, a balance dialog or any call to the AMR cloud.

## What Changes

- Under `OD_BUILD_PROFILE=knowdesign`, omit the `amr` agent from the shipped agent registry and degrade every AMR and billing route to an unavailable response that the web fetchers map to null.
- Keep Cloud sign-in, account, balance and upgrade surfaces off the page, and skip first-run onboarding's Cloud step.
- Stop daemon start-up work that reaches the AMR cloud.

## Impact

Profile off keeps the stock registry and surfaces unchanged. Proven by daemon and web unit tests, a tools-dev e2e with a recording proxy, and a packaged desktop e2e.
