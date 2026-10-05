## ADDED Requirements

### Requirement: Workspace context sources are selected through a provider-kind registry
The system SHALL select the workspace context source from `OD_WORKSPACE_CONTEXT_SOURCE` through a registry whose entries declare their capabilities (directory authority, hub events) and carry their directory-fetch, hub-endpoint, sync-digest-request and context-provider implementations. Call sites SHALL dispatch through the selected source and SHALL NOT compare the kind to a specific provider.

#### Scenario: Vela resolves to directory authority and hub events
- **WHEN** the source kind is ` vela `
- **THEN** capabilities are directory authority and hub events

#### Scenario: Dev, unset and unknown kinds have no capabilities
- **WHEN** the kind is `dev`, unset, or an unregistered name such as `toString`
- **THEN** no capability is reported

#### Scenario: A registered third source is used end to end
- **WHEN** a third source is registered and selected
- **THEN** the directory fetch, hub endpoint, context provider and sync-digest request are all served by that source and none by Vela

#### Scenario: A source without directory authority yields an empty directory
- **WHEN** the selected source has no directory authority
- **THEN** the directory read answers an empty ok result and the source's fetch is not called

### Requirement: The knowdesign profile selects no workspace context source
Under the knowdesign profile the system SHALL select no source, regardless of the configured kind, and SHALL NOT construct or call the Vela provider.

#### Scenario: Configured kinds are ignored under the profile
- **WHEN** the profile is knowdesign and the kind is `vela`, `dev`, unset or a registered name
- **THEN** capabilities are all false, no directory is read, and the Vela provider is never constructed

### Requirement: The sync-digest reader enforces its cache key for every source
The sync-digest reader SHALL return no reading when the workspace id is empty or blank, or when the source reports an empty account id, before any request is built or sent, for every registered source.

#### Scenario: A blank workspace or missing account is refused
- **WHEN** the workspace id is empty or blank, or a registered source returns an empty account id
- **THEN** the reader returns null and no digest request is fetched
