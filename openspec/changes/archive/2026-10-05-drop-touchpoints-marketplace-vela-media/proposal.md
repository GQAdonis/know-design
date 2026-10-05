## Why

KnowDesign has no Open Design cloud. Its campaign touchpoints, remote plugin marketplace registries, Vela media models and the CLI commands that publish to the Open Design cloud have nothing to talk to.

## What Changes

- Under `OD_BUILD_PROFILE=knowdesign`, do not register the touchpoint runtimes, refuse outbound marketplace registry fetches, list no Vela provider or `vela/*` media model, and hide the cloud-publishing CLI commands.

## Impact

Profile off keeps the stock routes, models and CLI. Proven by daemon and web unit tests with profile-on and profile-off cases.
