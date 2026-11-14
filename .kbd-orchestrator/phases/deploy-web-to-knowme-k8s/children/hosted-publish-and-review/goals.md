# Goals — deploy-web-to-knowme-k8s› hosted-publish-and-review

- Own backend on the know-me.tools domain, hosted on the know-me cluster, replaces Open Design's hosted resource hub for publishing a design
- A published design gets a shareable link that reviewers open without an Open Design account (guest or Kratos-backed)
- Reviewers can leave comments on the published design; comments reach the author in the daemon and the web UI
- Built on the KnowMe fabric: flint-forge Postgres via Quarry, flint-gate/Kratos identity, flint-realtime-fabric for live comments
- Client change is minimal: KnowDesign points the existing hub seam at our API instead of forking publish routes; CLI and UI stay dual-track
- Scope boundary: owns publish, snapshot hosting, review comments; identity-and-collaboration keeps principals, roles, team workspaces, message center
