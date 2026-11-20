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

/**
 * Tiny fallback pool used only if `data/campus-activities.json` is missing or invalid.
 * The primary weighted activity pools live in `data/campus-activities.json`.
 */
export const FALLBACK_CAMPUS_ACTIVITIES = [
  "Special Week is practicing her final-stretch sprint...",
  "Super Creek is preparing warm tea for Trainer...",
  "Symboli Rudolf is reviewing student council track reports...",
] as const;
