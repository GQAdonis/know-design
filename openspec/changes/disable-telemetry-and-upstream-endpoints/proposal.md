## Why

A knowdesign install must not report to, or fetch from, the Open Design cloud: no product analytics, trace relay, release feed, What's New document, or GitHub and Discord metadata, even with credentials or consent present.

## What Changes

- Under `OD_BUILD_PROFILE=knowdesign`, turn off analytics, Langfuse tracing and the telemetry relays, the release feed and updater (unless a KnowDesign feed is configured), the What's New fetch, and the GitHub and Discord metadata fetches.
- Packaged builds do not bake the upstream telemetry endpoints into the daemon environment and forward the profile to child processes.

## Impact

Profile off is unchanged. Proven by a recording-proxy e2e with a stock-profile control, and by a packaged desktop e2e.
