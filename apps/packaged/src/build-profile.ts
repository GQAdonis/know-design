/**
 * `OD_BUILD_PROFILE=knowdesign` switches off upstream (open-design.ai /
 * PostHog / Langfuse / release-feed) network behaviour. Read straight from the
 * environment with an injectable `env`; deliberately a local copy of the
 * daemon's check because apps must not import each other's `src/`.
 */
export function isKnowdesignBuildProfile(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.OD_BUILD_PROFILE ?? "").trim().toLowerCase() === "knowdesign";
}
