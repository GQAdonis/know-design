# build-profile Specification

## Purpose
TBD - created by archiving change build-profile-seam-and-permission-decoupling. Update Purpose after archive.

## Requirements

### Requirement: The build profile is resolved from the environment
The system SHALL resolve the build profile from `OD_BUILD_PROFILE` through an injectable-environment helper. A value of `knowdesign`, compared case-insensitively after trimming, selects the knowdesign profile; any other or missing value selects the default profile.

#### Scenario: Knowdesign is recognised regardless of case and padding
- **WHEN** `OD_BUILD_PROFILE` is `knowdesign` or ` KnowDesign `
- **THEN** the resolved profile is `knowdesign`

#### Scenario: Unknown values fall back to the default profile
- **WHEN** `OD_BUILD_PROFILE` is unset or is any other value
- **THEN** the resolved profile is `default`

### Requirement: Workspace write authority does not depend on billing under the knowdesign profile
Under the knowdesign profile the system SHALL treat the billing-derived lifecycle states `billing_past_due` and `locked` as `active`, so removing billing cannot write-lock a workspace. The states `deleting` and `deleted` SHALL remain denied, and a removed member SHALL remain denied in every lifecycle state.

#### Scenario: Billing states no longer lock a workspace
- **WHEN** a workspace in `billing_past_due` or `locked` is evaluated under the knowdesign profile
- **THEN** every active member can write synced files and share projects
- **AND** manage-members stays limited to owners and admins, and manage-billing to owners

#### Scenario: Deletion still denies access
- **WHEN** a workspace in `deleting` or `deleted` is evaluated under the knowdesign profile
- **THEN** write, share and member management are denied
- **AND** a deleted workspace denies settings and billing visibility

#### Scenario: A removed member stays denied
- **WHEN** a member whose status is `removed` is evaluated in any lifecycle state under the knowdesign profile
- **THEN** write and share are denied

### Requirement: The default profile behaves exactly as before
With the profile unset or `default`, the system SHALL produce the same workspace permissions and lifecycle values it produced before the profile existed.

#### Scenario: Profile off is byte-identical for permissions
- **WHEN** permissions are built for every lifecycle, role and member status with the profile omitted or `default`
- **THEN** the result equals the pre-profile result and write is allowed only for active members in a writable lifecycle

### Requirement: The active profile is observable by the web client
The daemon health response SHALL expose the active build profile, and the web client SHALL learn the profile from the boot health response and from the workspace directory response.

#### Scenario: Web reads the profile from health
- **WHEN** the web client boots against a knowdesign daemon
- **THEN** `/api/health` reports `buildProfile` as `knowdesign` and the client applies the profile's behaviour
