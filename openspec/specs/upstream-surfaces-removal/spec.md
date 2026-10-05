# upstream-surfaces-removal Specification

## Purpose
TBD - created by archiving change drop-touchpoints-marketplace-vela-media. Update Purpose after archive.

## Requirements

### Requirement: Touchpoint runtimes are not served under the knowdesign profile
Under the knowdesign profile the daemon SHALL NOT register the production or test touchpoint runtime routes. With the profile off they SHALL remain registered.

#### Scenario: Touchpoint routes are absent
- **WHEN** a touchpoint production-runtime, event or test-runtime route is requested under the knowdesign profile
- **THEN** the response is 404 for both GET and POST

#### Scenario: Touchpoint routes remain with the profile off
- **WHEN** the production-runtime route is requested with the profile off
- **THEN** the response is not 404

### Requirement: Marketplace registries are not fetched under the knowdesign profile
Under the knowdesign profile the marketplace fetcher SHALL refuse outbound registry fetches without making a network request.

#### Scenario: Registry fetch is refused
- **WHEN** a marketplace registry URL is fetched under the knowdesign profile
- **THEN** the response is 403 and the underlying fetch is never called

### Requirement: Vela media models are not listed under the knowdesign profile
Under the knowdesign profile the media catalogue SHALL contain no Vela provider and no model whose id starts with `vela/`, and SHALL keep non-Vela models. With the profile off the Vela provider and models SHALL be listed.

#### Scenario: Vela models are removed, others kept
- **WHEN** the media catalogue is loaded under the knowdesign profile
- **THEN** no `vela` provider or `vela/*` model exists and a non-Vela image model such as `gpt-image-2` from `openai` remains
- **AND** looking up `vela/gpt-image-2` finds nothing

#### Scenario: New project defaults never pick a Vela model
- **WHEN** the new-project panel chooses a default image model under the knowdesign profile, including when the profile is learned after the panel mounted
- **THEN** the default is not a Vela model

### Requirement: Cloud-publishing CLI commands are hidden under the knowdesign profile
Under the knowdesign profile the `od` CLI SHALL neither advertise nor dispatch `od plugin login`, `publish`, `publish-repo`, `open-design-pr`, or `od marketplace login`; they SHALL be rejected as unknown subcommands.

#### Scenario: Help omits and dispatch rejects
- **WHEN** `od plugin --help` or `od marketplace --help` is run under the knowdesign profile
- **THEN** the publishing and login commands are not listed and `od marketplace add` still is
- **AND** running one of the hidden commands exits 2 with an unknown-subcommand error
