## ADDED Requirements

### Requirement: The AMR agent is not shipped under the knowdesign profile
Under the knowdesign profile the system SHALL omit the `amr` agent from the shipped agent registry and SHALL leave every other agent unchanged. With the profile off the registry SHALL include `amr`.

#### Scenario: Registry omits amr only under the profile
- **WHEN** the agent registry is loaded with `OD_BUILD_PROFILE=knowdesign`
- **THEN** `amr` is absent and agents such as `claude` remain
- **AND** with the profile off, `amr` is present

#### Scenario: Agent list and Settings never offer amr
- **WHEN** a fresh knowdesign install lists agents and opens Settings, Local CLI
- **THEN** no `amr` agent is returned and no `amr` card is shown

### Requirement: AMR and billing routes are unavailable, not reaching the cloud
Under the knowdesign profile the daemon's AMR and billing routes SHALL answer with a non-2xx unavailable response, which the web fetchers map to null, instead of contacting the AMR cloud.

#### Scenario: Routes degrade
- **WHEN** an AMR or billing route is requested under the knowdesign profile
- **THEN** the response is non-2xx and no request is made to the AMR cloud
- **AND** the web fetchers for those routes resolve to null

### Requirement: A fresh install shows no Cloud sign-in or billing surface
Under the knowdesign profile a fresh install SHALL land on Home without first-run onboarding's Cloud sign-in step, and SHALL NOT render Cloud sign-in tips, account controls, balance dialogs or upgrade surfaces, before or after a local agent run.

#### Scenario: Fresh install lands on Home
- **WHEN** a knowdesign install starts with no stored onboarding state
- **THEN** the page is Home, not `/onboarding`
- **AND** no Cloud sign-in tip, account control, balance dialog or upgrade card is present

#### Scenario: A local agent run completes with no billing surface
- **WHEN** a local agent run is started and completes on a fresh knowdesign install
- **THEN** the run succeeds and the artifact is produced
- **AND** no balance or upgrade dialog appears

### Requirement: Start-up work does not reach the AMR cloud
Under the knowdesign profile daemon start-up SHALL NOT call the AMR cloud, including the team-share reconciliation that otherwise runs at launch.

#### Scenario: No AMR host is contacted at start
- **WHEN** a knowdesign daemon starts behind a recording proxy
- **THEN** no AMR cloud host is requested
