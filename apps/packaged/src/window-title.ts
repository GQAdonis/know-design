import {
  releaseChannelFromNamespace,
  releaseChannelFromVersion,
  releaseInstallIdentity,
  resolveBrand,
} from "@open-design/release";

export function resolvePackagedWindowTitle(
  config: { appVersion: string | null; namespace: string },
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const brand = resolveBrand(env);
  const channel =
    releaseChannelFromVersion(config.appVersion) ??
    releaseChannelFromNamespace(config.namespace);
  return channel == null ? brand.productName : releaseInstallIdentity(channel, brand).productName;
}
