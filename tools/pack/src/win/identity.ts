import {
  resolveWindowsReleaseNamespaceToken,
  resolveWindowsUninstallRegistryKey,
} from "@open-design/sidecar-proto";
import { releaseInstallIdentity } from "@open-design/release";

import { brandExecutableFileName, brandOf, releaseChannelForConfig, type BrandedConfig } from "../brand.js";
import type { ToolPackConfig } from "../config/index.js";

export type WinInstallIdentity = {
  appPathsKey: string;
  displayName: string;
  exeName: string;
  registryKey: string;
  shortcutName: string;
  uninstallerName: string;
};

export function resolveWinInstallIdentity(
  config: Pick<ToolPackConfig, "namespace" | "appVersion"> & BrandedConfig,
): WinInstallIdentity {
  const brand = brandOf(config);
  const namespaceToken = resolveWindowsReleaseNamespaceToken(config.namespace);
  const channel = releaseChannelForConfig(config);
  const displayName = channel == null
    ? `${brand.productName} ${namespaceToken}`
    : releaseInstallIdentity(channel, brand).productName;

  return {
    appPathsKey: `Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${displayName}.exe`,
    displayName,
    exeName: brandExecutableFileName(brand),
    registryKey: resolveWindowsUninstallRegistryKey(config.namespace, brand.productName),
    shortcutName: `${displayName}.lnk`,
    uninstallerName: `Uninstall ${displayName}.exe`,
  };
}
