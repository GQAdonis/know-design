# Goals

- Build the web surface (apps/web + apps/daemon) into a deployable container image
- Deploy to the Kubernetes cluster reachable via the 'know-me' kubectl context
- Serve at https://design.know-me.tools
- Route through an EXISTING shared Envoy Gateway — do not provision a new gateway or a new external IP address
- Use PostgreSQL as the database wherever multiple database options exist (replacing the local SQLite default)
- Authenticate users via the in-cluster Ory Kratos identity stack, with flint-gate configured to mint JWTs the web application can use to know who is signed in

<!--
Goal 6 (authentication) was added by operator decision on 2026-09-14, during
/kbd-plan, after the adversarial review of plan.md flagged that changes 7-8
mapped to no goal. Ratified deliberately, with this scope understood:

  It delivers EDGE AUTHENTICATION ONLY. Every signed-in user still sees and
  edits everyone's projects, because no daemon table carries an owner column
  (assessment §7: zero per-user identity, no request-scoped primitive).
  Per-user data isolation is NOT in this goal and remains a separate, larger
  data-model effort.

Goal 5 (PostgreSQL) was re-affirmed by the same operator decision, overturning
the plan's proposed scope cut. It is planned as real migration work.
-->
