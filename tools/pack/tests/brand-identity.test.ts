import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { KNOWDESIGN_BRAND, OPEN_DESIGN_BRAND, type BrandDescriptor } from "@open-design/release";
import { afterEach, describe, expect, it } from "vitest";

import {
  brandNamespacePrefix,
  brandPackagedAppName,
  brandScopedNamespace,
  releaseChannelForConfig,
} from "@/brand.js";
import { resolveToolPackConfig, type ToolPackConfig, type ToolPackPlatform } from "@/config/index.js";
import { toolPackSidecarStamp } from "@/config/sidecar-stamps.js";
import { renderPackagedMainEntry } from "@/launcher/packaged-entry.js";
import { resolveToolPackLauncherPayloadLayout } from "@/launcher/layout.js";
import { linuxResources, linuxResourcesForBrand, macResourcesForBrand, winResourcesForBrand } from "@/resources/index.js";
import { renderDesktopTemplate, resolveLinuxBrandNames } from "@/linux.js";
import { macBuilderProtocols } from "@/mac/builder.js";
import { resolveMacInstallIdentity } from "@/mac/identity.js";
import { macAppBundleName, resolveMacPaths } from "@/mac/paths.js";
import { writeInstallerScript } from "@/win/custom-installer.js";
import { resolveWinInstallIdentity } from "@/win/identity.js";
import { writeNsisInclude } from "@/win/nsis.js";
import { resolveWinPaths } from "@/win/paths.js";

const CHANNELS = [
  { name: "stable", version: "1.2.3" },
  { name: "prerelease", version: "1.2.3-prerelease.1" },
  { name: "beta", version: "1.2.3-beta.1" },
] as const;

const BRANDS: readonly BrandDescriptor[] = [OPEN_DESIGN_BRAND, KNOWDESIGN_BRAND];

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

function makeConfig(
  root: string,
  platform: ToolPackPlatform,
  brand: BrandDescriptor,
  channel: (typeof CHANNELS)[number],
): ToolPackConfig {
  const namespace = brandScopedNamespace(brand, `release-${channel.name}`);
  const out = join(root, "out", platform, "namespaces", namespace);
  const runtimeBase = join(root, "runtime", platform, "namespaces");
  return {
    appVersion: channel.version,
    brand,
    buildProfile: brand.id === "knowdesign" ? "knowdesign" : undefined,
    containerized: false,
    electronBuilderCliPath: "/x/cli.js",
    electronDistPath: "/x/dist",
    electronVersion: "41.3.0",
    macCompression: "normal",
    namespace,
    platform,
    portable: false,
    removeData: false,
    removeLogs: false,
    removeProductUserData: false,
    removeSidecars: false,
    requireVelaCli: false,
    roots: {
      output: {
        appBuilderRoot: join(out, "builder"),
        namespaceRoot: out,
        platformRoot: join(root, "out", platform),
        root: join(root, "out"),
      },
      runtime: { namespaceBaseRoot: runtimeBase, namespaceRoot: join(runtimeBase, namespace) },
      cacheRoot: join(root, "cache"),
      toolPackRoot: root,
    },
    signed: false,
    silent: true,
    to: "all",
    webOutputMode: "standalone",
    workspaceRoot: root,
  };
}

type Observed = Record<string, string>;

async function observe(
  root: string,
  brand: BrandDescriptor,
  channel: (typeof CHANNELS)[number],
): Promise<Observed> {
  const mac = makeConfig(root, "mac", brand, channel);
  const win = makeConfig(root, "win", brand, channel);
  const linux = makeConfig(root, "linux", brand, channel);

  const macIdentity = resolveMacInstallIdentity(mac);
  const macPaths = resolveMacPaths(mac);
  const winIdentity = resolveWinInstallIdentity(win);
  const winPaths = resolveWinPaths(win);
  const names = resolveLinuxBrandNames(brand, linux.namespace);

  await writeNsisInclude(win, winPaths);
  await writeInstallerScript(win, winPaths, channel.version);
  const nsisScript = await readFile(winPaths.installerScriptPath, "utf8");
  const nsisInclude = await readFile(winPaths.nsisIncludePath, "utf8");
  const desktopEntry = renderDesktopTemplate(await readFile(linuxResources.desktopTemplate, "utf8"), {
    execPath: `/home/u/.local/bin/${names.appImageInstallName}`,
    iconName: names.iconBaseName,
    mimeScheme: names.mimeScheme,
    namespace: linux.namespace,
    productName: names.productName,
  });
  const protocol = macBuilderProtocols(brand)[0]!;

  return {
    "mac.appId": macIdentity.appId,
    "mac.productName": macIdentity.productName,
    "mac.executableName": macIdentity.executableName,
    "mac.publicBundle": macIdentity.publicAppBundleName,
    "mac.systemBundle": macIdentity.systemAppBundleName,
    "mac.installerTitle": macIdentity.installerTitle,
    "mac.dmg": basename(macPaths.dmgPath),
    "mac.zip": basename(macPaths.zipPath),
    "mac.payloadZip": basename(macPaths.payloadZipPath),
    "mac.systemApplications": macPaths.systemApplicationsAppPath,
    "mac.userApplications": macPaths.userApplicationsAppPath,
    "mac.urlName": protocol.name,
    "mac.urlScheme": protocol.schemes[0]!,
    "mac.extraMetadataName": brandPackagedAppName(brand),
    "mac.launcherPayload": basename(resolveToolPackLauncherPayloadLayout(mac, channel.version).archivePath),
    "win.displayName": winIdentity.displayName,
    "win.exeName": winIdentity.exeName,
    "win.uninstallKey": winIdentity.registryKey,
    "win.appPathsKey": winIdentity.appPathsKey,
    "win.shortcut": winIdentity.shortcutName,
    "win.uninstaller": winIdentity.uninstallerName,
    "win.installDir": winPaths.installDir,
    "win.setup": basename(winPaths.setupPath),
    "win.portableZip": basename(winPaths.setupZipPath),
    "win.payload7z": basename(winPaths.launcherPayloadPath),
    "win.protocolKey": nsisScript.match(/WriteRegStr HKCU "(Software\\Classes\\[^"]+)" "" "URL:/)?.[1] ?? "",
    "win.protocolName": nsisScript.match(/"URL:([^"]+)"/)?.[1] ?? "",
    "win.nsisInstallDir": nsisScript.match(/^InstallDir "([^"]+)"/m)?.[1] ?? "",
    "win.nsisUninstallText": nsisInclude.match(/OD_REMOVE_LOCAL_DATA_CHECKBOX 1033 "([^"]+)"/)?.[1] ?? "",
    "linux.appId": names.appId,
    "linux.executableName": names.executableName,
    "linux.appImage": names.appImageInstallName,
    "linux.desktopFile": names.desktopFileName,
    "linux.iconBase": names.iconBaseName,
    "linux.headlessLauncher": names.headlessLauncherName,
    "linux.extraMetadataName": names.packagedAppName,
    "linux.packageName": names.packagedPackageName,
    "linux.maintainer": names.maintainer,
    "linux.desktopName": desktopEntry.match(/^Name=(.+)$/m)?.[1] ?? "",
    "linux.wmClass": desktopEntry.match(/^StartupWMClass=(.+)$/m)?.[1] ?? "",
    "linux.mimeType": desktopEntry.match(/^MimeType=(.+)$/m)?.[1] ?? "",
    "stamp.namespace": toolPackSidecarStamp(mac).namespace,
  };
}

describe("brand identity matrix", () => {
  for (const channel of CHANNELS) {
    it(`shares no observable value between the two brands on ${channel.name}`, async () => {
      const root = await mkdtemp(join(tmpdir(), "od-brand-identity-"));
      roots.push(root);
      const original = await observe(root, OPEN_DESIGN_BRAND, channel);
      const knowdesign = await observe(root, KNOWDESIGN_BRAND, channel);

      expect(Object.keys(knowdesign)).toEqual(Object.keys(original));
      for (const key of Object.keys(original)) {
        expect(original[key], `${key} must be populated for Open Design`).toBeTruthy();
        expect(knowdesign[key], `${key} must be populated for KnowDesign`).toBeTruthy();
        expect(knowdesign[key], `${key} is shared between brands`).not.toBe(original[key]);
      }
    });
  }

  it("keeps the Open Design stable values byte-for-byte what they were", async () => {
    const root = await mkdtemp(join(tmpdir(), "od-brand-identity-"));
    roots.push(root);
    const observed = await observe(root, OPEN_DESIGN_BRAND, CHANNELS[0]);
    expect(observed).toMatchObject({
      "mac.appId": "io.open-design.desktop",
      "mac.productName": "Open Design",
      "mac.executableName": "Open Design",
      "mac.publicBundle": "Open Design.app",
      "mac.dmg": "Open Design-release-stable.dmg",
      "mac.zip": "Open Design-release-stable.zip",
      "mac.payloadZip": "Open Design-release-stable-payload.zip",
      "mac.urlName": "Open Design Invite",
      "mac.urlScheme": "opendesign",
      "mac.extraMetadataName": "open-design-packaged-app",
      "win.exeName": "Open Design.exe",
      "win.uninstallKey": "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Open Design-release-stable",
      "win.setup": "Open Design-release-stable-setup.exe",
      "win.protocolKey": "Software\\Classes\\opendesign",
      "win.protocolName": "Open Design Invite Protocol",
      "win.nsisInstallDir": "$LOCALAPPDATA\\Programs\\Open Design",
      "linux.appId": "io.open-design.desktop",
      "linux.appImage": "Open-Design.release-stable.AppImage",
      "linux.desktopFile": "open-design-release-stable.desktop",
      "linux.iconBase": "open-design-release-stable",
      "linux.headlessLauncher": "open-design-headless-release-stable",
      "linux.extraMetadataName": "open-design-packaged-app",
      "linux.desktopName": "Open Design (release-stable)",
      "linux.wmClass": "Open Design",
      "linux.mimeType": "x-scheme-handler/od;",
    });
  });

  it("derives KnowDesign names from the descriptor", async () => {
    const root = await mkdtemp(join(tmpdir(), "od-brand-identity-"));
    roots.push(root);
    const observed = await observe(root, KNOWDESIGN_BRAND, CHANNELS[1]);
    expect(observed).toMatchObject({
      "mac.appId": "ai.prometheusags.knowdesign.prerelease",
      "mac.urlScheme": "knowdesign",
      "mac.extraMetadataName": "knowdesign-packaged-app",
      "win.exeName": "KnowDesign.exe",
      "win.protocolKey": "Software\\Classes\\knowdesign",
      "linux.mimeType": "x-scheme-handler/knowdesign;",
      "linux.headlessLauncher": "knowdesign-headless-knowdesign-release-prerelease",
    });
  });

  it("selects icons by brand and leaves the original brand's paths alone", () => {
    expect(macResourcesForBrand("open-design").icon).toMatch(/resources\/mac\/icon\.icns$/);
    expect(winResourcesForBrand("open-design").icon).toMatch(/resources\/win\/icon\.ico$/);
    expect(linuxResourcesForBrand("open-design").icon).toMatch(/resources\/linux\/icon\.png$/);
    expect(macResourcesForBrand("knowdesign").icon).toMatch(/resources\/brands\/knowdesign\/mac\/icon\.icns$/);
    expect(winResourcesForBrand("knowdesign").icon).toMatch(/resources\/brands\/knowdesign\/win\/icon\.ico$/);
    expect(linuxResourcesForBrand("knowdesign").icon).toMatch(/resources\/brands\/knowdesign\/linux\/icon\.png$/);
  });

  it("renders the packaged-entry recovery text per brand and keeps the original unchanged", () => {
    expect(renderPackagedMainEntry(true)).toContain("Open Design could not start. ");
    const knowdesign = renderPackagedMainEntry(true, "KnowDesign");
    expect(knowdesign).toContain("KnowDesign could not start");
    expect(knowdesign).not.toContain("Open Design");
  });

  it("names the Mac bundle per brand when no config is given", () => {
    expect(macAppBundleName("ns")).toBe("Open Design.ns.app");
    expect(macAppBundleName("ns", { buildProfile: "knowdesign" })).toBe("KnowDesign.ns.app");
  });
});

describe("knowdesign default namespace", () => {
  const saved = process.env.OD_BUILD_PROFILE;
  afterEach(() => {
    if (saved == null) delete process.env.OD_BUILD_PROFILE;
    else process.env.OD_BUILD_PROFILE = saved;
  });

  it("defaults to `knowdesign`, never `default` or release-*", () => {
    process.env.OD_BUILD_PROFILE = "knowdesign";
    const config = resolveToolPackConfig("mac", {});
    expect(config.namespace).toBe("knowdesign");
    expect(config.brand?.id).toBe("knowdesign");
    expect(resolveToolPackConfig("mac", { appVersion: "1.0.0-beta.1" }).namespace).toBe("knowdesign-release-beta");
    expect(resolveToolPackConfig("mac", { namespace: "knowdesign" }).namespace).toBe("knowdesign");
  });

  it("keeps the original default untouched without the profile", () => {
    delete process.env.OD_BUILD_PROFILE;
    expect(resolveToolPackConfig("mac", {}).namespace).toBe("default");
    expect(brandNamespacePrefix(OPEN_DESIGN_BRAND)).toBeNull();
  });

  it("reads the release channel through the brand prefix", () => {
    const base = { appVersion: undefined, brand: KNOWDESIGN_BRAND };
    expect(releaseChannelForConfig({ ...base, namespace: "knowdesign" })).toBe("stable");
    expect(releaseChannelForConfig({ ...base, namespace: "knowdesign-release-beta" })).toBe("beta");
  });
});
