import { Plugin } from "@opencode/plugin";
import * as path from "node:path";
import { loadJsonSafe, pickWeighted, resolveDataDir } from "./data.js";

export interface SoftAlias {
  text: string;
  chance: number;
}

export interface CameoCharacter {
  name: string;
  mononym: string;
  aliases: string[];
  soft_aliases?: SoftAlias[];
  voice: string;
  mannerisms: string;
  sample_quote: string;
  weight?: number;
}

export interface CameoData {
  characters: CameoCharacter[];
}

export interface NicknameData {
  alias_to_canonical?: Record<string, string>;
  roster?: Array<{
    canonical_name: string;
    mononym: string;
    in_game_nicknames?: string[];
    community_nicknames?: string[];
  }>;
}

export interface ContextHookEvent {
  agent?: unknown;
  sessionID?: unknown;
  system?: unknown;
  messages?: Array<{
    id?: unknown;
    role: string;
    content: unknown;
  }>;
}

export interface ContextHookOptions {
  cameosData?: CameoData | null;
  nicknamesData?: NicknameData | null;
  rng?: () => number;
}

/**
 * Single-word terms from `uma_cameos.json` and `uma_nicknames.json` that are
 * ordinary English/common words and would false-trigger on everyday prose unless
 * explicitly invoked (`@Name` or prefixed by "bring in", "ask", or "call").
 */
const ALIAS_STOPWORDS = new Set([
  "ace",
  "acute",
  "bamboo",
  "believe",
  "bourbon",
  "brian",
  "bright",
  "cafe",
  "city",
  "crown",
  "cyborg",
  "dia",
  "earth",
  "el",
  "empress",
  "fine",
  "flash",
  "flower",
  "gorilla",
  "grass",
  "groove",
  "heart",
  "jordan",
  "king",
  "kita",
  "love",
  "mac",
  "marvelous",
  "maya",
  "messiah",
  "nature",
  "pandora",
  "pearl",
  "reason",
  "rice",
  "ruby",
  "ryan",
  "sei",
  "silly",
  "still",
  "sweep",
  "tact",
  "tap",
  "ticket",
  "turbo",
  "uni",
  "universe",
  "variation",
  "vodka",
  "windy",
  "zephyr",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWordMatcher(term: string): RegExp | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}_])(${escapeRegExp(trimmed)})(?![\\p{L}\\p{N}_])`, "iu");
}

function buildExplicitInvocationMatcher(term: string): RegExp | null {
  const trimmed = term.trim();
  if (!trimmed) return null;
  const escaped = escapeRegExp(trimmed);
  return new RegExp(
    `(?:(?<![\\p{L}\\p{N}_.])@|(?<![\\p{L}\\p{N}_])(?:bring\\s+in|ask|call)\\s+)(${escaped})(?![\\p{L}\\p{N}_])`,
    "iu",
  );
}

const MAX_MATCH_CHARS = 20_000;

/**
 * Strips non-prose regions (fenced code blocks, inline code spans, URLs, emails,
 * CLI package-runner invocations, and file paths/filenames) from user text for
 * matching purposes only. Bounds input length and collapses long non-whitespace
 * tokens up front to guarantee linear-time matching without ReDoS backtracking.
 */
export function stripNonProseForMatching(text: string): string {
  return text
    .slice(0, MAX_MATCH_CHARS)
    .replace(/\S{200,}/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`+[^`\n]*`+/g, " ")
    .replace(/\b(?:https?|ftp):\/\/\S+/gi, " ")
    .replace(/\bwww\.\S+/gi, " ")
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, " ")
    .replace(/\b(?:npx|bunx|pnpx)\s+(?:-[\w-]+\s+)*[@\w./:-]+/gi, " ")
    .replace(/\b(?:npm|pnpm|yarn|bun)\s+(?:run|exec|dlx)\s+(?:-[\w-]+\s+)*[@\w./:-]+/gi, " ")
    .replace(/(?<![\p{L}\p{N}_])(?:~|\.\.?)?\/[\w.@+-]+(?:\/[\w.@+-]*)*(?![\p{L}\p{N}_])/gu, " ")
    .replace(/(?<![\p{L}\p{N}_])[\w.-]+(?:\/[\w.@+-]+)+(?![\p{L}\p{N}_])/gu, " ")
    .replace(
      /(?<![\p{L}\p{N}_])[\w.-]+\.(?:json|ya?ml|toml|lock|env|ini|cfg|conf|ts|tsx|js|jsx|mjs|cjs|mts|cts|py|rb|go|rs|java|kt|swift|c|cpp|cc|h|hpp|cs|php|sh|zsh|bash|fish|ps1|md|mdx|txt|csv|tsv|sql|html|htm|css|scss|sass|less|xml|svg|png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|tgz|log|out|map|wasm|sqlite|db|vue|svelte|bak|tmp|exe|bin|dmg|deb|rpm)(?![\p{L}\p{N}_])/giu,
      " ",
    );
}

function setBounded<K, V>(map: Map<K, V>, key: K, value: V, maxSize = 200): void {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) {
      map.delete(oldestKey);
    }
  }
  map.set(key, value);
}

interface HardCandidate {
  spanLength: number;
  priority: number;
  matcher: RegExp;
  character: CameoCharacter | null;
  canonical: string;
}

interface SoftAliasCandidate {
  character: CameoCharacter;
  chance: number;
  matcher: RegExp;
}

export function createContextHandler(options: ContextHookOptions = {}) {
  const dataDir =
    options.cameosData === undefined || options.nicknamesData === undefined
      ? resolveDataDir(import.meta.url)
      : null;

  const cameosData =
    options.cameosData !== undefined
      ? options.cameosData
      : dataDir
        ? loadJsonSafe<CameoData>(path.join(dataDir, "uma_cameos.json"))
        : null;
  const nicknamesData =
    options.nicknamesData !== undefined
      ? options.nicknamesData
      : dataDir
        ? loadJsonSafe<NicknameData>(path.join(dataDir, "uma_nicknames.json"))
        : null;

  const rng = options.rng ?? Math.random;

  const cameoCharacters = Array.isArray(cameosData?.characters) ? cameosData.characters : [];
  const eligibleCameoCharacters = cameoCharacters.filter((c) => (c.weight ?? 1) > 0);
  const aliasMap = nicknamesData?.alias_to_canonical || {};

  const lastCameoBySession = new Map<string, string>();
  const ambientCameoByTurn = new Map<string, CameoCharacter | null>();
  const softRollByTurn = new Map<string, CameoCharacter | null>();

  const cameoByName = new Map<string, CameoCharacter>();
  for (const character of cameoCharacters) {
    if (typeof character.name === "string" && character.name.trim().length > 0) {
      cameoByName.set(character.name.trim().toLowerCase(), character);
    }
  }

  const hardCandidates: HardCandidate[] = [];
  const softAliasCandidates: SoftAliasCandidate[] = [];
  const softAliasTerms = new Set<string>();

  for (const character of cameoCharacters) {
    const aliases = Array.isArray(character.aliases)
      ? character.aliases.filter((a): a is string => typeof a === "string")
      : [];
    const hardTerms = [character.name, character.mononym, ...aliases].filter(
      (t): t is string => typeof t === "string" && t.trim().length > 0,
    );

    for (const term of hardTerms) {
      const trimmed = term.trim();
      const isStopword = ALIAS_STOPWORDS.has(trimmed.toLowerCase());
      const matcher = isStopword
        ? buildExplicitInvocationMatcher(trimmed)
        : buildWordMatcher(trimmed);
      if (!matcher) continue;
      hardCandidates.push({
        spanLength: trimmed.length,
        priority: 2,
        matcher,
        character,
        canonical: character.name,
      });
    }

    if (Array.isArray(character.soft_aliases)) {
      for (const entry of character.soft_aliases) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          continue;
        }
        const rawText = (entry as { text?: unknown }).text;
        if (typeof rawText !== "string" || rawText.trim().length < 3) {
          continue;
        }
        const term = rawText.trim();
        const rawChance = (entry as { chance?: unknown }).chance;
        const chance =
          typeof rawChance === "number" && Number.isFinite(rawChance)
            ? Math.min(1, Math.max(0, rawChance))
            : 0;
        const matcher = buildWordMatcher(term);
        if (!matcher) continue;
        softAliasTerms.add(term.toLowerCase());
        softAliasCandidates.push({
          character,
          chance,
          matcher,
        });
      }
    }
  }

  for (const [alias, canonical] of Object.entries(aliasMap)) {
    const trimmed = alias.trim();
    if (trimmed.length < 3 || typeof canonical !== "string" || canonical.trim().length === 0) {
      continue;
    }
    const lower = trimmed.toLowerCase();
    // Exempt any nickname-tier key that matches a cameo's soft_aliases[].text
    if (softAliasTerms.has(lower)) {
      continue;
    }
    const isStopword = ALIAS_STOPWORDS.has(lower);
    const matcher = isStopword ? buildExplicitInvocationMatcher(trimmed) : buildWordMatcher(trimmed);
    if (!matcher) continue;
    const resolvedCameo = cameoByName.get(canonical.trim().toLowerCase()) ?? null;
    hardCandidates.push({
      spanLength: trimmed.length,
      priority: 1,
      matcher,
      character: resolvedCameo,
      canonical,
    });
  }

  return (event: ContextHookEvent) => {
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

    const messages = Array.isArray(event.messages) ? event.messages : [];
    const latestUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const userText =
      latestUserMsg && Array.isArray(latestUserMsg.content)
        ? latestUserMsg.content
            .filter(
              (part): part is { type: "text"; text: string } =>
                typeof part === "object" &&
                part !== null &&
                (part as { type?: unknown }).type === "text" &&
                typeof (part as { text?: unknown }).text === "string",
            )
            .map((part) => part.text)
            .join("\n")
        : "";

    const matchText = userText ? stripNonProseForMatching(userText) : "";

    const sessionKey =
      typeof event.sessionID === "string" && event.sessionID.length > 0 ? event.sessionID : null;
    const rawUserMsgId = latestUserMsg?.id;
    const userMsgId =
      typeof rawUserMsgId === "string" && rawUserMsgId.length > 0 ? rawUserMsgId : null;
    const turnKey = sessionKey && userMsgId ? `${sessionKey}:${userMsgId}` : null;
    const isUserTurn = messages.at(-1)?.role === "user";

    let dropInCharacter: CameoCharacter | null = null;
    let matchedAlias = "";
    let isSoftCameo = false;
    let softAliasMatched = false;

    if (matchText.trim()) {
      // Tier 1: Longest hard match across cameoProfiles and alias_to_canonical
      let bestHard: HardCandidate | null = null;
      let bestSpanLength = -1;
      let bestPriority = -1;

      for (const candidate of hardCandidates) {
        const match = candidate.matcher.exec(matchText);
        if (!match) continue;
        const matchedSpan = (match[1] ?? match[0]).length;
        if (
          matchedSpan > bestSpanLength ||
          (matchedSpan === bestSpanLength && candidate.priority > bestPriority)
        ) {
          bestHard = candidate;
          bestSpanLength = matchedSpan;
          bestPriority = candidate.priority;
        }
      }

      if (bestHard) {
        if (bestHard.character) {
          dropInCharacter = bestHard.character;
          matchedAlias = bestHard.character.name;
        } else {
          matchedAlias = bestHard.canonical;
        }
      } else {
        // Tier 2: Soft aliases (only if no hard alias, name, or mononym matched)
        let bestSoft: SoftAliasCandidate | null = null;
        let bestSoftSpan = -1;

        for (const candidate of softAliasCandidates) {
          const match = candidate.matcher.exec(matchText);
          if (!match) continue;
          const matchedSpan = (match[1] ?? match[0]).length;
          if (matchedSpan > bestSoftSpan) {
            bestSoft = candidate;
            bestSoftSpan = matchedSpan;
          }
        }

        if (bestSoft) {
          softAliasMatched = true;
          if (turnKey && softRollByTurn.has(turnKey)) {
            const cachedSoft = softRollByTurn.get(turnKey) ?? null;
            if (cachedSoft) {
              dropInCharacter = cachedSoft;
              isSoftCameo = true;
            }
          } else {
            if (bestSoft.chance > 0 && rng() < bestSoft.chance) {
              dropInCharacter = bestSoft.character;
              isSoftCameo = true;
            }
            if (turnKey) {
              setBounded(softRollByTurn, turnKey, dropInCharacter);
            }
          }
        }
      }
    }

    // Tier 3: Ambient random drop-in (suppressed on soft-alias match/miss and guest-request)
    if (!dropInCharacter && !matchedAlias && !softAliasMatched) {
      if (isUserTurn) {
        if (baseChance > 0 && rng() < baseChance && eligibleCameoCharacters.length > 0) {
          const lastCameoName = sessionKey ? lastCameoBySession.get(sessionKey) : undefined;
          const candidates =
            lastCameoName && eligibleCameoCharacters.length > 1
              ? eligibleCameoCharacters.filter((c) => c.name !== lastCameoName)
              : eligibleCameoCharacters;
          const pool = candidates.length > 0 ? candidates : eligibleCameoCharacters;

          dropInCharacter = pickWeighted(pool, (c) => c.weight, rng);
        }
        if (turnKey) {
          setBounded(ambientCameoByTurn, turnKey, dropInCharacter);
        }
      } else if (turnKey && ambientCameoByTurn.has(turnKey)) {
        dropInCharacter = ambientCameoByTurn.get(turnKey) ?? null;
      }
    }

    if (dropInCharacter && sessionKey) {
      setBounded(lastCameoBySession, sessionKey, dropInCharacter.name);
    }

    // If a drop-in character was selected, inject a subtle <campus-cameo> instruction into system context
    if (dropInCharacter) {
      const safeName = escapeXml(dropInCharacter.name);
      const safeMononym = escapeXml(dropInCharacter.mononym);
      const safeVoice = escapeXml(dropInCharacter.voice);
      const safeMannerisms = escapeXml(dropInCharacter.mannerisms);
      const safeQuote = escapeXml(dropInCharacter.sample_quote);

      const cameoLines = [
        `<campus-cameo character="${safeName}" mononym="${safeMononym}">`,
        `CAMPUS ATMOSPHERE / GUEST CAMEO:`,
        `Umamusume "${safeName}" (${safeMononym}) has just dropped by or passed nearby.`,
        `Voice & Mannerisms: ${safeVoice} ${safeMannerisms}`,
        `Example line: "${safeQuote}"`,
        `Guideline: They may briefly chime in, deliver a snack, yell past the doorway, or make a brief characteristic comment before moving along. Do not let them hijack the primary task or derail Trainer's mission. Attribution: '~${safeMononym}'.`,
      ];

      if (isSoftCameo) {
        cameoLines.push(
          `Mistaken Appearance: She appeared by mistake thinking someone called her! Have her look confused about why she's here, make a brief comment, and then leave immediately. She must NOT hijack the task.`,
        );
      }

      cameoLines.push(`</campus-cameo>`);

      if (Array.isArray(event.system)) {
        event.system.push({ type: "text", text: cameoLines.join("\n") });
      }
    } else if (matchedAlias) {
      const safeAlias = escapeXml(matchedAlias);
      // Known Uma was mentioned by Trainer that isn't in top cameos; inject a lookup reminder
      const guestInstruction = [
        `<guest-request alias="${safeAlias}">`,
        `Trainer referenced Umamusume "${safeAlias}". If addressing her in dialogue, adopt her canonical Tracen personality and quirks (using websearch to verify details if unfamiliar).`,
        `</guest-request>`,
      ].join("\n");

      if (Array.isArray(event.system)) {
        event.system.push({ type: "text", text: guestInstruction });
      }
    }
  };
}

export default Plugin.define({
  id: "opencode-uma-os",
  async setup(ctx) {
    const contextHandler = createContextHandler();
    // Hook session context before model dispatch to inject dynamic cameos or requested guest lore
    await ctx.session.hook("context", contextHandler);
  },
});
