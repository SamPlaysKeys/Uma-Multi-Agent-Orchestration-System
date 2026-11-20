import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface CampusActivity {
  text: string;
  weight: number;
}

export interface CampusActivitiesData {
  pools?: Record<string, unknown>;
}

/**
 * Loads JSON data safely from disk.
 */
export function loadJsonSafe<T>(filePath: string): T | null {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as T;
    }
  } catch (err) {
    console.error(`[opencode-uma-os] Failed to load ${filePath}:`, err);
  }
  return null;
}

/**
 * Resolves the realpath'd directory of a module URL.
 * Uses fileURLToPath so percent-encoded characters (e.g., spaces in directory names)
 * are decoded, and resolves symlinks so symlinked entrypoints map back to the real repo.
 */
export function getModuleDir(metaUrl: string = import.meta.url): string | null {
  try {
    const rawFile = fileURLToPath(metaUrl);
    const resolvedFile = fs.existsSync(rawFile) ? fs.realpathSync(rawFile) : rawFile;
    return path.dirname(resolvedFile);
  } catch {
    return null;
  }
}

/**
 * Locates the repository root containing `data/uma_cameos.json` across possible
 * runtime locations (`plugin/dist/`, `plugin/src/`, `plugin/`, or repo root).
 * Checks only `[../.., .., .]` relative to `startDir` with no CWD fallback.
 */
export function resolveRepoRoot(startDir: string): string | null {
  const candidates = [
    path.resolve(startDir, "../.."),
    path.resolve(startDir, ".."),
    path.resolve(startDir),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "data", "uma_cameos.json"))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Resolves the repository `data/` directory relative to the module location.
 * Returns null if no valid repo root is found (never falls back to CWD).
 */
export function resolveDataDir(metaUrl: string = import.meta.url): string | null {
  const pluginDir = getModuleDir(metaUrl);
  if (!pluginDir) {
    return null;
  }
  const repoRoot = resolveRepoRoot(pluginDir);
  return repoRoot ? path.join(repoRoot, "data") : null;
}

/**
 * Defensively parses a campus-activities payload for a given pool name.
 * Ignores entries with non-string/empty text or non-positive/non-finite weight.
 */
export function parseCampusActivities(
  raw: unknown,
  poolName: string = "default",
): CampusActivity[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [];
  }

  const pools = (raw as { pools?: unknown }).pools;
  if (typeof pools !== "object" || pools === null || Array.isArray(pools)) {
    return [];
  }

  const pool = (pools as Record<string, unknown>)[poolName];
  if (!Array.isArray(pool)) {
    return [];
  }

  const valid: CampusActivity[] = [];
  for (const entry of pool) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const { text, weight } = entry as { text?: unknown; weight?: unknown };
    if (
      typeof text === "string" &&
      text.trim().length > 0 &&
      typeof weight === "number" &&
      Number.isFinite(weight) &&
      weight > 0
    ) {
      valid.push({ text, weight });
    }
  }

  return valid;
}

/**
 * Loads weighted campus activities from `filePath`, falling back to `fallbackTexts`
 * if the file is missing, unreadable, malformed, or yields no valid entries.
 */
export function loadCampusActivities(
  filePath: string | null,
  fallbackTexts: readonly string[],
  poolName: string = "default",
): CampusActivity[] {
  if (filePath) {
    const raw = loadJsonSafe<unknown>(filePath);
    const parsed = parseCampusActivities(raw, poolName);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return fallbackTexts
    .filter((text) => typeof text === "string" && text.trim().length > 0)
    .map((text) => ({ text, weight: 1 }));
}

/**
 * Performs a weighted random selection from `items` using `getWeight`.
 * Missing, non-finite, or non-positive weights are treated as 1.
 */
export function pickWeighted<T>(
  items: readonly T[],
  getWeight: (item: T) => number | undefined,
  rng: () => number = Math.random,
): T | null {
  if (items.length === 0) {
    return null;
  }

  let totalWeight = 0;
  const weights = items.map((item) => {
    const raw = getWeight(item);
    const weight = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 1;
    totalWeight += weight;
    return weight;
  });

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return items[0];
  }

  let threshold = rng() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    threshold -= weights[i];
    if (threshold < 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

/**
 * Performs a weighted random pull from `pool`, avoiding immediate repetition
 * of `lastText` whenever another option exists.
 */
export function pickWeightedActivity(
  pool: readonly CampusActivity[],
  lastText?: string | null,
  rng: () => number = Math.random,
): string {
  if (pool.length === 0) {
    return "";
  }

  const candidates =
    lastText && pool.length > 1
      ? pool.filter((item) => item.text !== lastText)
      : pool;

  const activePool = candidates.length > 0 ? candidates : pool;
  return pickWeighted(activePool, (item) => item.weight, rng)?.text ?? "";
}
