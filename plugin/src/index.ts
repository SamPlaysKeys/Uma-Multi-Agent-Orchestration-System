import { Plugin } from "@opencode/plugin";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

interface CameoCharacter {
  name: string;
  mononym: string;
  aliases: string[];
  voice: string;
  mannerisms: string;
  sample_quote: string;
}

interface CameoData {
  characters: CameoCharacter[];
}

interface NicknameData {
  alias_to_canonical?: Record<string, string>;
  roster?: Array<{
    canonical_name: string;
    mononym: string;
    in_game_nicknames?: string[];
    community_nicknames?: string[];
  }>;
}

/**
 * Loads JSON data safely from repo data directory relative to this plugin.
 */
function loadJsonSafe<T>(filePath: string): T | null {
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
 * Locates the repository root containing `data/uma_cameos.json` across possible
 * runtime locations (`plugin/dist/`, `plugin/src/`, `plugin/`, or repo root).
 */
function resolveRepoRoot(startDir: string): string | null {
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordMatcher(term: string): RegExp | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}_])`, "iu");
}

export default Plugin.define({
  id: "opencode-uma-os",
  async setup(ctx) {
    // Resolve paths to repo data files.
    // In ES modules, __dirname is not globally defined. Use fileURLToPath so
    // percent-encoded characters (e.g., spaces in directory names) are decoded,
    // and resolve symlinks so symlinked entrypoints map back to the real repo.
    let pluginDir: string | null = null;
    try {
      const rawFile = fileURLToPath(import.meta.url);
      const resolvedFile = fs.existsSync(rawFile) ? fs.realpathSync(rawFile) : rawFile;
      pluginDir = path.dirname(resolvedFile);
    } catch {
      pluginDir = null;
    }
    const repoRoot = pluginDir ? resolveRepoRoot(pluginDir) : null;

    const cameosData = repoRoot
      ? loadJsonSafe<CameoData>(path.join(repoRoot, "data", "uma_cameos.json"))
      : null;
    const nicknamesData = repoRoot
      ? loadJsonSafe<NicknameData>(path.join(repoRoot, "data", "uma_nicknames.json"))
      : null;

    const cameoCharacters = cameosData?.characters || [];
    const aliasMap = nicknamesData?.alias_to_canonical || {};

    const cameoMatchers = cameoCharacters.map((character) => ({
      character,
      matchers: [character.name, character.mononym, ...character.aliases]
        .map(buildWordMatcher)
        .filter((matcher): matcher is RegExp => matcher !== null),
    }));

    const aliasMatchers = Object.entries(aliasMap)
      .filter(([alias]) => alias.trim().length >= 3)
      .map(([alias, canonical]) => ({
        canonical,
        matcher: buildWordMatcher(alias),
      }))
      .filter((entry): entry is { canonical: string; matcher: RegExp } => entry.matcher !== null);

    // Hook session context before model dispatch to inject dynamic cameos or requested guest lore
    await ctx.session.hook("context", (event) => {
      const agentId = typeof event.agent === "string" ? event.agent : "";

      // List of core solo Umamusume agents
      const soloUmaAgents = new Set(["spe-chan", "tachyon", "super-creek", "biwa", "golshi"]);

      // Determine cameo probability:
      // - tracen-lounge: high probability (~25%)
      // - symboli / default build / orchestrator (non-solo): moderate probability (~8%)
      // - 1-on-1 solo sessions (spe-chan, tachyon, etc.): very low/suppressed (0%) unless explicit name mention
      let baseChance = 0.08;
      if (agentId === "tracen-lounge") {
        baseChance = 0.25;
      } else if (soloUmaAgents.has(agentId)) {
        baseChance = 0.0; // Strictly prioritize uninterrupted 1-on-1 pairing
      }

      // Check if user explicitly mentioned a guest Uma in recent message text
      const messages = event.messages || [];
      const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
      const userText =
        latestUserMsg && Array.isArray(latestUserMsg.content)
          ? latestUserMsg.content
              .filter(
                (part): part is Extract<typeof part, { type: "text" }> =>
                  part.type === "text" && typeof part.text === "string",
              )
              .map((part) => part.text)
              .join("\n")
          : "";

      let explicitCameo: CameoCharacter | null = null;
      let matchedAlias = "";

      if (userText) {
        // Check for direct matches in cameo profiles
        for (const entry of cameoMatchers) {
          if (entry.matchers.some((matcher) => matcher.test(userText))) {
            explicitCameo = entry.character;
            matchedAlias = entry.character.name;
            break;
          }
        }

        // Also check general alias_to_canonical index if not found in top cameos
        if (!explicitCameo) {
          for (const entry of aliasMatchers) {
            if (entry.matcher.test(userText)) {
              matchedAlias = entry.canonical;
              break;
            }
          }
        }
      }

      let dropInCharacter: CameoCharacter | null = explicitCameo;

      // Only roll random ambient drop-ins on fresh user turns (not intermediate tool-call loops)
      const isUserTurn = messages.at(-1)?.role === "user";
      if (
        !dropInCharacter &&
        isUserTurn &&
        baseChance > 0 &&
        Math.random() < baseChance &&
        cameoCharacters.length > 0
      ) {
        const randomIdx = Math.floor(Math.random() * cameoCharacters.length);
        dropInCharacter = cameoCharacters[randomIdx];
      }

      // If a drop-in character was selected, inject a subtle <campus-cameo> instruction into system context
      if (dropInCharacter) {
        const cameoInstruction = [
          `<campus-cameo character="${dropInCharacter.name}" mononym="${dropInCharacter.mononym}">`,
          `CAMPUS ATMOSPHERE / GUEST CAMEO:`,
          `Umamusume "${dropInCharacter.name}" (${dropInCharacter.mononym}) has just dropped by or passed nearby.`,
          `Voice & Mannerisms: ${dropInCharacter.voice} ${dropInCharacter.mannerisms}`,
          `Example line: "${dropInCharacter.sample_quote}"`,
          `Guideline: They may briefly chime in, deliver a snack, yell past the doorway, or make a brief characteristic comment before moving along. Do not let them hijack the primary task or derail Trainer's mission. Attribution: '~${dropInCharacter.mononym}'.`,
          `</campus-cameo>`
        ].join("\n");

        if (Array.isArray(event.system)) {
          event.system.push({ type: "text", text: cameoInstruction });
        }
      } else if (matchedAlias && !dropInCharacter) {
        // Known Uma was mentioned by Trainer that isn't in top cameos; inject a lookup reminder
        const guestInstruction = [
          `<guest-request alias="${matchedAlias}">`,
          `Trainer referenced Umamusume "${matchedAlias}". If addressing her in dialogue, adopt her canonical Tracen personality and quirks (using websearch to verify details if unfamiliar).`,
          `</guest-request>`
        ].join("\n");

        if (Array.isArray(event.system)) {
          event.system.push({ type: "text", text: guestInstruction });
        }
      }
    });
  },
});
