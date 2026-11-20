import { Plugin } from "@opencode/plugin/tui";
import { createSignal, onCleanup } from "solid-js";
import { CAMPUS_ACTIVITIES } from "./banner.js";

/**
 * OpenCode V2 TUI Plugin for UmaCode
 *
 * - Home Screen: Clean, dignified `[🐎 Tracen Squad Ready]` status badge.
 * - In-Session: Subtle, slow-refreshing in-game flavor remarks
 *   (e.g., "Special Week is practicing her final-stretch sprint...").
 */
export default Plugin.define({
  id: "opencode-uma-os.tui",
  setup(context) {
    // Slower, gentle refresh cycle (every 25 seconds) for in-session flavor
    const [activityIndex, setActivityIndex] = createSignal(0);

    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % CAMPUS_ACTIVITIES.length);
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
        const text = () => CAMPUS_ACTIVITIES[activityIndex()];
        return (
          <text fg="#8B8FA8">
            {` 🐎 ${text()} `}
          </text>
        );
      }
    });
  }
});
