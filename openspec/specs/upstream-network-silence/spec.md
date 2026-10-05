# upstream-network-silence Specification

## Purpose
TBD - created by archiving change disable-telemetry-and-upstream-endpoints. Update Purpose after archive.

## Requirements

### Requirement: No upstream call is made under the knowdesign profile
Under the knowdesign profile the daemon, web and desktop runtimes SHALL make no request to the Open Design cloud, its telemetry and trace relays, PostHog, Langfuse, GitHub metadata or Discord, even when telemetry consent is granted and upstream keys or relay URLs are configured.

#### Scenario: Upstream surfaces stay silent behind a recording proxy
- **WHEN** a knowdesign runtime is started with upstream analytics keys and relay URLs set, consent granted, and every outbound request routed through a recording proxy, and the analytics, What's New, GitHub and Discord routes are exercised
- **THEN** the proxy records no request to an upstream host

#### Scenario: A stock-profile control proves the recorder can see traffic
- **WHEN** the same runtime is started with the profile unset and the same routes are exercised
- **THEN** the proxy records upstream hosts, so the profile-on result is evidence and not a blind spot

### Requirement: The updater is off unless a KnowDesign feed is configured
Under the knowdesign profile the desktop updater SHALL be disabled unless an update metadata URL is explicitly configured; with the profile off its behaviour SHALL be unchanged.

#### Scenario: No feed, no updater
- **WHEN** the desktop starts under the knowdesign profile with no update metadata URL
- **THEN** no release feed is requested

### Requirement: The packaged app does not bake upstream telemetry
A packaged build under the knowdesign profile SHALL NOT pass the upstream telemetry endpoints or analytics key to the daemon environment, and SHALL forward `OD_BUILD_PROFILE` to its child processes.

#### Scenario: Packaged fresh install makes no upstream call
- **WHEN** a packaged knowdesign app is installed fresh, started with the profile, and runs a local agent behind a recording proxy
- **THEN** no request reaches an Open Design, telemetry, GitHub or Discord host
- **AND** the renderer makes no non-loopback request
