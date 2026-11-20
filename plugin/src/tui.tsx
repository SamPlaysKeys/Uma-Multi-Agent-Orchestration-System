import { Plugin } from "@opencode/plugin/tui";
import * as path from "node:path";
import { createSignal, onCleanup } from "solid-js";
import { FALLBACK_CAMPUS_ACTIVITIES } from "./banner.js";
import {
  loadCampusActivities,
  pickWeightedActivity,
  resolveDataDir,
} from "./data.js";

/**
 * OpenCode V2 TUI Plugin for UmaCode
 *
 * - Home Screen: Clean, dignified `[🐎 Tracen Squad Ready]` status badge.
 * - In-Session: Subtle, slow-refreshing weighted gacha flavor remarks
 *   loaded from `data/campus-activities.json`
 *   (e.g., "Special Week is practicing her final-stretch sprint...").
 */
export default Plugin.define({
  id: "opencode-uma-os.tui",
  setup(context) {
    const dataDir = resolveDataDir(import.meta.url);
    const activitiesPath = dataDir ? path.join(dataDir, "campus-activities.json") : null;
    const activities = loadCampusActivities(activitiesPath, FALLBACK_CAMPUS_ACTIVITIES);

    // Slower, gentle refresh cycle (every 25 seconds) with weighted gacha pulls
    const [activity, setActivity] = createSignal(pickWeightedActivity(activities));

    const interval = setInterval(() => {
      setActivity((prev) => pickWeightedActivity(activities, prev));
    }, 25000);

    onCleanup(() => clearInterval(interval));

    // Home screen: Keep it clean and peaceful
    context.ui.slot({
      append: "home.footer.status",
      render: () => {
        return (
          <text fg="#10B981">
            {" 🐎 Tracen Squad Ready "}
          </text>
        );
      }
    });

    // In-session / prompt footer: Gentle, in-game campus remarks
    context.ui.slot({
      append: "prompt.footer.status",
      render: () => {
        return (
          <text fg="#8B8FA8">
            {` 🐎 ${activity()} `}
          </text>
        );
      }
    });
  }
});
