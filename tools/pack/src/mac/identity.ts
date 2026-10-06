import { releaseInstallIdentity } from "@open-design/release";

import { brandOf, releaseChannelForConfig, type BrandedConfig } from "../brand.js";
import type { ToolPackConfig } from "../config/index.js";

export type MacInstallIdentity = {
  appId: string;
  executableName: string;
  installerTitle: string;
  productName: string;
  publicAppBundleName: string;
  systemAppBundleName: string;
};

function sanitizeNamespace(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}

export function resolveMacInstallIdentity(
  config: Pick<ToolPackConfig, "namespace" | "appVersion"> & BrandedConfig,
): MacInstallIdentity {
  const brand = brandOf(config);
  const namespaceToken = sanitizeNamespace(config.namespace);
  const channel = releaseChannelForConfig(config);
  const channelIdentity = channel == null
    ? { appId: brand.appId, productName: brand.productName }
    : releaseInstallIdentity(channel, brand);
  const publicAppBundleName = `${channelIdentity.productName}.app`;
  const systemAppBundleName = channel != null
    ? publicAppBundleName
    : `${brand.productName}.${namespaceToken}.app`;

  return {
    ...channelIdentity,
    executableName: channelIdentity.productName,
    installerTitle: channel == null ? `${brand.productName}-${namespaceToken}` : channelIdentity.productName,
    publicAppBundleName,
    systemAppBundleName,
  };
}
