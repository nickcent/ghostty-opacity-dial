#!/usr/bin/env bun
/**
 * Live-dial Ghostty background-image-opacity.
 *
 * Usage:
 *   ./dial-bg-opacity.ts          # active appearance theme
 *   ./dial-bg-opacity.ts dark
 *   ./dial-bg-opacity.ts light
 *   ./dial-bg-opacity.ts both
 *   ./dial-bg-opacity.ts cent-dark
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = process.env.HOME ?? homedir();
const THEME_DIR = process.env.GHOSTTY_THEME_DIR ?? join(HOME, ".config/ghostty/themes");
const KEY = "background-image-opacity";
const STEP = 0.01;
const BIG_STEP = 0.05;
const themeArg = (process.argv[2] ?? "active").toLowerCase();

function resolveThemes(arg: string): string[] {
  if (arg === "both") return ["cent-dark", "cent-light"];
  if (arg === "dark") return ["cent-dark"];
  if (arg === "light") return ["cent-light"];
  if (arg === "active") {
    const dark = spawnSync(
      "osascript",
      ["-e", "tell application \"System Events\" to tell appearance preferences to get dark mode"],
    );
    const isDark = dark.stdout.toString().trim().toLowerCase() === "true";
    return [isDark ? "cent-dark" : "cent-light"];
  }
  return [arg];
}

function themePath(name: string): string {
  return join(THEME_DIR, name);
}

function readOpacity(path: string): number {
  const text = readFileSync(path, "utf8");
  const match = text.match(new RegExp(`^${KEY}\\s*=\\s*([0-9.]+)\\s*$`, "m"));
  if (!match) throw new Error(`No ${KEY} in ${path}`);
  return Number(match[1]);
}

function writeOpacity(path: string, value: number): void {
  const text = readFileSync(path, "utf8");
  const next = text.replace(
    new RegExp(`^${KEY}\\s*=\\s*[0-9.]+\\s*$`, "m"),
    `${KEY} = ${value.toFixed(2)}`,
  );
  if (next === text) throw new Error(`Failed to patch ${KEY} in ${path}`);
  writeFileSync(path, next);
}

function reloadGhostty(): void {
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

function bar(value: number, width = 40): string {
  const filled = Math.round(value * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

const themes = resolveThemes(themeArg);
for (const theme of themes) {
  try {
    readFileSync(themePath(theme), "utf8");
  } catch {
    console.error(`Theme not found: ${themePath(theme)}`);
    process.exit(1);
  }
}

let value = readOpacity(themePath(themes[0]!));

function draw(): void {
  process.stdout.write("\\x1b[2J\\x1b[H");
  process.stdout.write(`Ghostty ${KEY}\\n`);
  process.stdout.write(`themes: ${themes.join(" + ")}\\n\\n`);
  process.stdout.write(`  ${bar(value)}  ${value.toFixed(2)}\\n\\n`);
  process.stdout.write("  ←/h  −0.01    →/l  +0.01\\n");
  process.stdout.write("  H     −0.05    L     +0.05\\n");
  process.stdout.write("  0–9   jump to 0.0–0.9    r reload    q quit\\n");
}

function apply(nextValue: number): void {
  value = Math.min(1, Math.max(0, Math.round(nextValue * 100) / 100));
  for (const theme of themes) writeOpacity(themePath(theme), value);
  reloadGhostty();
  draw();
}

if (!process.stdin.isTTY) {
  console.log(`${themes.join(",")}: ${value.toFixed(2)}`);
  process.exit(0);
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
draw();

process.stdin.on("data", (key: string) => {
  if (key === "\\x03" || key === "q") {
    process.stdin.setRawMode(false);
    process.stdout.write("\\n");
    process.exit(0);
  }
  if (key === "\\x1b[D" || key === "h") return apply(value - STEP);
  if (key === "\\x1b[C" || key === "l") return apply(value + STEP);
  if (key === "H") return apply(value - BIG_STEP);
  if (key === "L") return apply(value + BIG_STEP);
  if (key === "r") {
    reloadGhostty();
    draw();
    return;
  }
  if (key >= "0" && key <= "9") return apply(Number(key) / 10);
});

