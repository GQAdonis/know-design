import { lstat } from 'node:fs/promises';
import path from 'node:path';

// Directory names that should not be listed or watched for folder-backed
// projects. These are generated, installed, or cache trees that add file
// descriptor pressure without adding useful design context.
export const IGNORED_PROJECT_DIR_NAMES = new Set([
  '.git',
  'node_modules',
  'vendor',
  '.od',
  'debug',
  'dist',
  'build',
  '.build',
  'deriveddata',
  'target',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  '.output',
  'out',
  'coverage',
  '.gradle',
  '.swiftpm',
  '.tmp',
  '.venv',
  'venv',
  '__pycache__',
  '.mypy_cache',
  '.pytest_cache',
  '.tox',
  '.ruff_cache',
].map((name) => name.toLowerCase()));

export function isIgnoredProjectDirName(name: unknown): boolean {
  const normalized = String(name).toLowerCase();
  return (
    IGNORED_PROJECT_DIR_NAMES.has(normalized) ||
    normalized.startsWith('deriveddata-')
  );
}

// htmx + Alpine prototypes (design-templates/htmx-alpine-prototype) keep their
// runtime in a project-level `vendor/` folder that the page loads directly, so
// it is design content, not a dependency tree. Both marker files are written by
// the template; a dependency `vendor/` (PHP, Go, Ruby) has neither.
const PROTOTYPE_RUNTIME_DIR_NAME = 'vendor';
const PROTOTYPE_RUNTIME_MARKERS = ['MANIFEST.json', 'od-mock.js'];

async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    return (await lstat(filePath)).isFile();
  } catch {
    return false;
  }
}

/** True when `dirPath` is a prototype runtime folder that must stay visible. */
export async function isPrototypeRuntimeDir(name: string, dirPath: string): Promise<boolean> {
  if (name.toLowerCase() !== PROTOTYPE_RUNTIME_DIR_NAME) return false;
  const present = await Promise.all(
    PROTOTYPE_RUNTIME_MARKERS.map((marker) => isRegularFile(path.join(dirPath, marker))),
  );
  return present.every(Boolean);
}

/**
 * Directory filter for project listings and exports: skip ignored trees, except
 * a prototype runtime `vendor/` folder.
 */
export async function shouldSkipProjectDir(name: string, dirPath: string): Promise<boolean> {
  if (!isIgnoredProjectDirName(name)) return false;
  return !(await isPrototypeRuntimeDir(name, dirPath));
}
