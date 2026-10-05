## Why

Workspace directory, hub events, sync-digest and context-provider code compared the source kind to `vela` in several places, so adding another source meant editing every call site.

## What Changes

- Add a provider-kind registry whose entries carry their capabilities and their directory, hub-event, sync-digest and context-provider implementations. Call sites dispatch through the selected source.
- Keep the Vela behaviour as the registered `vela` source; `dev` or unset use the dev stub; the knowdesign profile selects no source.

## Impact

Behaviour for `vela` and `dev` is unchanged. A new context source needs only additive files.
