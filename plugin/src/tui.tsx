import { Plugin } from "@opencode/plugin/tui";
import { createSignal, onCleanup } from "solid-js";
import { SQUAD_MEMBERS } from "./banner.js";

/**
 * OpenCode V2 TUI Plugin for UmaCode
 *
 * Injects a dynamic Umamusume squad status ticker into `home.footer.status`
 * and prepares for home.logo slot replacement when upstream merges #51916.
 */
export default Plugin.define({
  id: "opencode-uma-os.tui",
  setup(context) {
    // Reactive ticker state cycling through ready/active Umas
    const [index, setIndex] = createSignal(0);

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SQUAD_MEMBERS.length);
    }, 4000);

    onCleanup(() => clearInterval(interval));

    // Register into the home footer status slot
    context.ui.slot({
      append: "home.footer.status",
      render: () => {
        const current = () => SQUAD_MEMBERS[index()];
        return (
          <text fg="#A855F7">
            {` [🐎 UmaCode: ${current().emoji} ${current().name} (${current().role}) Standby] `}
          </text>
        );
      }
    });

    // Also register into prompt.footer.status to display subtle Uma presence during chat
    context.ui.slot({
      append: "prompt.footer.status",
      render: () => {
        return (
          <text fg="#10B981">
            {" 🐎 Tracen Squad Ready "}
          </text>
        );
      }
    });
  }
});
