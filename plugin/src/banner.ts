/**
 * UMA OS ASCII Banner & TUI Constants
 *
 * Prepared for the upcoming OpenCode V2 `home.logo` slot (PR / Issue #51916).
 */

export const UMACODE_ASCII_LOGO = `
  _   _                 ____          _      
 | | | |_ __ ___   __ _/ ___|___   __| | ___ 
 | | | | '_ \` _ \\ / _\` | |   / _ \\ / _\` |/ _ \\
 | |_| | | | | | | (_| | |__| (_) | (_| |  __/
  \\___/|_| |_| |_|\\__,_|\\____\\___/ \\__,_|\\___|
       🐎  T R A C E N   A C A D E M Y  🐎     
`.trim();

export interface UmaStatus {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: "ready" | "training" | "scouting" | "tea-time";
}

export const SQUAD_MEMBERS: UmaStatus[] = [
  { id: "symboli", name: "Rudolf", emoji: "👑", role: "Orchestrator", status: "ready" },
  { id: "tracen-lounge", name: "Lounge", emoji: "☕", role: "Roundtable", status: "tea-time" },
  { id: "spe-chan", name: "Spe-chan", emoji: "🍠", role: "Workhorse", status: "ready" },
  { id: "super-creek", name: "Creek", emoji: "🍵", role: "Debugger", status: "ready" },
  { id: "tachyon", name: "Tachyon", emoji: "🧪", role: "Researcher", status: "training" },
  { id: "biwa", name: "Biwa", emoji: "👓", role: "Triage", status: "ready" },
  { id: "golshi", name: "Golshi", emoji: "🚢", role: "Scout", status: "scouting" }
];
