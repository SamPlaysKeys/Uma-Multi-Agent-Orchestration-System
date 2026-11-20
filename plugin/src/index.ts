import { Plugin } from "@opencode/plugin";
import * as fs from "node:fs";
import * as path from "node:path";

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

export default Plugin.define({
  id: "opencode-uma-os",
  setup(ctx) {
    // Resolve paths to repo data files
    // When loaded from ~/.config/opencode/opencode.jsonc or repo,
    // find data/ relative to plugin root (one level up from plugin/dist or plugin/)
    // In ES modules, __dirname is not globally defined. Resolve safely using import.meta.url.
    let pluginDir: string;
    try {
      pluginDir = path.dirname(new URL(import.meta.url).pathname);
    } catch {
      pluginDir = path.resolve(".");
    }
    const repoRoot = path.resolve(pluginDir, "..");
    const cameosPath = path.join(repoRoot, "data", "uma_cameos.json");
    const nicknamesPath = path.join(repoRoot, "data", "uma_nicknames.json");

    const cameosData = loadJsonSafe<CameoData>(cameosPath);
    const nicknamesData = loadJsonSafe<NicknameData>(nicknamesPath);

    const cameoCharacters = cameosData?.characters || [];
    const aliasMap = nicknamesData?.alias_to_canonical || {};

    console.log(`[opencode-uma-os] Loaded ${cameoCharacters.length} cameo profiles and ${Object.keys(aliasMap).length} nickname aliases.`);

    // Hook session context before model dispatch to inject dynamic cameos or requested guest lore
    ctx.session.hook("context", (event: any) => {
      const agentId = event.agent?.id || event.agentID || "";

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
      const latestUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      const userText = latestUserMsg?.text || (typeof latestUserMsg?.content === "string" ? latestUserMsg.content : "") || "";

      let explicitCameo: CameoCharacter | null = null;
      let matchedAlias = "";

      if (userText) {
        const lower = userText.toLowerCase();
        // Check for direct matches in cameo profiles
        for (const c of cameoCharacters) {
          if (
            lower.includes(c.name.toLowerCase()) ||
            lower.includes(c.mononym.toLowerCase()) ||
            c.aliases.some((a) => lower.includes(a.toLowerCase()))
          ) {
            explicitCameo = c;
            matchedAlias = c.name;
            break;
          }
        }

        // Also check general alias_to_canonical index if not found in top cameos
        if (!explicitCameo && aliasMap) {
          for (const [alias, canonical] of Object.entries(aliasMap)) {
            // Only check word-like boundary
            if (alias.length >= 3 && lower.includes(alias.toLowerCase())) {
              matchedAlias = canonical;
              break;
            }
          }
        }
      }

      let dropInCharacter: CameoCharacter | null = explicitCameo;

      // If no explicit cameo, roll probability for random drop-in
      if (!dropInCharacter && baseChance > 0 && Math.random() < baseChance && cameoCharacters.length > 0) {
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

    console.log("[opencode-uma-os] Registered dynamic cameo context hook.");
  },
});
