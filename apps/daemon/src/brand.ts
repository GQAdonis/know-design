import { resolveBrand, type BrandDescriptor } from '@open-design/release';

/**
 * The brand this daemon presents, resolved from `OD_BUILD_PROFILE` at call
 * time. Every identifier that the OS, another install or another program can
 * observe is read from here instead of spelled as a literal, so a KnowDesign
 * build can run beside an installed Open Design without sharing state.
 */
export function daemonBrand(env: NodeJS.ProcessEnv = process.env): BrandDescriptor {
  return resolveBrand(env);
}

export function defaultDaemonPort(env: NodeJS.ProcessEnv = process.env): number {
  return daemonBrand(env).daemonDefaultPort;
}

export function defaultMcpServerName(env: NodeJS.ProcessEnv = process.env): string {
  return daemonBrand(env).mcpServerName;
}

export function daemonCliBin(env: NodeJS.ProcessEnv = process.env): string {
  return daemonBrand(env).cliBin;
}

/** Name of the per-user state directory under the home directory. */
export function userStateDirName(env: NodeJS.ProcessEnv = process.env): string {
  return daemonBrand(env).userStateDirName;
}

// Command-position `od` tokens in help and error text: a line that starts with
// the command (optionally after `$ ` or `Usage:`), a backticked command, or a
// command introduced by run/use/try. Anything else (JSON keys, prose such as
// "od-ish", user data) is left alone.
const LINE_START_COMMAND = /^([ \t]*(?:\$[ \t]+)?(?:Usage:[ \t]+)?)od(?=[ \t]|$)/gm;
const INLINE_USAGE = /(Usage:[ \t]+)od(?=[ \t]|$)/g;
const BACKTICKED_COMMAND = /(`)od(?=[ \t`])/g;
const INTRODUCED_COMMAND = /\b((?:run|use|try|via|with|Run|Use|Try)[ \t]+)od(?=[ \t]+[a-z-])/g;

/**
 * Rewrite the `od` command name in CLI help and error text to the brand's
 * command. One entry serves both bins, so the text must follow the name the
 * user typed. Identity for `od`.
 */
export function brandCliText(text: string, cliBin: string): string {
  if (cliBin === 'od') return text;
  return text
    .replace(LINE_START_COMMAND, `$1${cliBin}`)
    .replace(INLINE_USAGE, `$1${cliBin}`)
    .replace(BACKTICKED_COMMAND, `$1${cliBin}`)
    .replace(INTRODUCED_COMMAND, `$1${cliBin}`);
}

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error'] as const;

/**
 * Make the CLI's help and error output use the brand's command name. The one
 * `bin/od.mjs` entry serves both `od` and the brand's own bin, and usage text
 * names the command in hundreds of places, so the rewrite sits at the console
 * seam instead of in every string. A no-op for `od`.
 */
export function installCliBrandOutput(env: NodeJS.ProcessEnv = process.env): void {
  const cliBin = daemonCliBin(env);
  if (cliBin === 'od') return;
  for (const method of CONSOLE_METHODS) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      const [first, ...rest] = args;
      original(...(typeof first === 'string' ? [brandCliText(first, cliBin), ...rest] : args));
    };
  }
}
