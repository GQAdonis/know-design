/**
 * `OD_BUILD_PROFILE=knowdesign` switches off upstream (open-design.ai /
 * PostHog / Langfuse / release-feed) network behaviour. Read straight from the
 * environment with an injectable `env`; deliberately a local copy of the
 * daemon's check because apps must not import each other's `src/`.
 */
export function isKnowdesignBuildProfile(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env.OD_BUILD_PROFILE ?? "").trim().toLowerCase() === "knowdesign";
}

/**
 * A knowdesign build carries its profile in its own packaged config, so an app
 * launched from Finder, the Dock or a Start-menu shortcut (no environment) is a
 * knowdesign app by construction instead of by launch recipe. An explicit,
 * non-blank `OD_BUILD_PROFILE` in the launch environment still wins, which keeps
 * tests and diagnostics able to override a baked build.
 *
 * Must run before anything reads the profile: the daemon and web sidecars inherit
 * it through the packaged child-environment allowlist.
 *
 * Returns the profile now in effect ("knowdesign", the launch value) or null when
 * nothing selects one.
 */
export function applyBakedBuildProfile(
  baked: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const launch = String(env.OD_BUILD_PROFILE ?? "").trim();
  if (launch !== "") return launch.toLowerCase();
  if (String(baked ?? "").trim().toLowerCase() !== "knowdesign") return null;
  env.OD_BUILD_PROFILE = "knowdesign";
  return "knowdesign";
}
