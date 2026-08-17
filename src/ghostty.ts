/** Ghostty integration: theme resolution and config reload. */

import { spawnSync } from "node:child_process";

export function resolveThemes(arg: string): string[] {
  if (arg === "both") return ["cent-dark", "cent-light"];
  if (arg === "dark") return ["cent-dark"];
  if (arg === "light") return ["cent-light"];
  if (arg === "active") {
    const dark = spawnSync("osascript", [
      "-e",
      'tell application "System Events" to tell appearance preferences to get dark mode',
    ]);
    const isDark = dark.stdout.toString().trim().toLowerCase() === "true";
    return [isDark ? "cent-dark" : "cent-light"];
  }
  return [arg];
}

export function reloadGhostty(): void {
  spawnSync("osascript", [
    "-e",
    `
    tell application "System Events"
      if not (exists process "ghostty") then return
      tell process "ghostty"
        set frontmost to true
        keystroke "," using {command down, shift down}
      end tell
    end tell
    `,
  ]);
}
