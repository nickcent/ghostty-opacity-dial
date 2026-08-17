/** Multi-control interactive TUI for dialing Ghostty config values. */

import { join } from "node:path";
import {
  CONFIG_PATH,
  THEME_DIR,
  opacityValidator,
  parseNumber,
  positiveValidator,
  readKey,
  writeKey,
  type Validator,
} from "./config.ts";
import { reloadGhostty, resolveThemes } from "./ghostty.ts";

interface Control {
  label: string;
  key: string;
  /** Files this control reads from / writes to. */
  paths: string[];
  step: number;
  bigStep: number;
  validator: Validator;
  /** Allow 0-9 jump keys (only meaningful for 0-1 ranges). */
  jump: boolean;
}

function bar(value: number, width = 40): string {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

export function run(themeArg: string): void {
  const themes = resolveThemes(themeArg);
  const themePaths = themes.map((t) => join(THEME_DIR, t));

  const controls: Control[] = [
    {
      label: "background-image-opacity",
      key: "background-image-opacity",
      paths: themePaths,
      step: 0.01,
      bigStep: 0.05,
      validator: opacityValidator(),
      jump: true,
    },
    {
      label: "background-opacity",
      key: "background-opacity",
      paths: themePaths,
      step: 0.01,
      bigStep: 0.05,
      validator: opacityValidator(),
      jump: true,
    },
    {
      label: "background-blur-radius",
      key: "background-blur-radius",
      paths: themePaths,
      step: 1,
      bigStep: 5,
      validator: positiveValidator(0),
      jump: false,
    },
    {
      label: "font-size",
      key: "font-size",
      paths: [CONFIG_PATH],
      step: 0.5,
      bigStep: 1,
      validator: positiveValidator(1, 1),
      jump: false,
    },
  ];

  let selected = 0;
  let message = "";
  const values: (number | null)[] = controls.map(() => null);

  function readValue(i: number): number | null {
    const c = controls[i]!;
    try {
      return c.validator.coerce(parseNumber(c.key, readKey(c.paths[0]!, c.key)));
    } catch (err) {
      if (i === selected) message = (err as Error).message;
      return null;
    }
  }

  function refresh(): void {
    message = "";
    for (let i = 0; i < controls.length; i++) values[i] = readValue(i);
  }

  function draw(): void {
    process.stdout.write("\x1b[2J\x1b[H");
    process.stdout.write("Ghostty dial\n");
    process.stdout.write(`themes: ${themes.join(" + ")}\n\n`);
    for (let i = 0; i < controls.length; i++) {
      const c = controls[i]!;
      const v = values[i];
      const cursor = i === selected ? "❯" : " ";
      const rendered =
        v === null
          ? "(unavailable)"
          : c.jump
            ? `${bar(v)}  ${c.validator.format(v)}`
            : `  ${c.validator.format(v)}`;
      process.stdout.write(`${cursor} ${c.label.padEnd(26)} ${rendered}\n`);
    }
    process.stdout.write("\n");
    process.stdout.write("  j/k or ↑/↓  select control\n");
    process.stdout.write("  ←/h  −step    →/l  +step    H/L  −/+big step\n");
    process.stdout.write("  0–9  jump (opacity controls)    r reload    q quit\n");
    if (message) process.stdout.write(`\n  ! ${message}\n`);
  }

  function apply(next: number): void {
    const c = controls[selected]!;
    const v = c.validator.coerce(next);
    try {
      for (const path of c.paths) writeKey(path, c.key, c.validator.format(v));
      values[selected] = v;
      message = "";
      reloadGhostty();
    } catch (err) {
      message = (err as Error).message;
    }
    draw();
  }

  refresh();
  message = "";

  if (!process.stdin.isTTY) {
    for (let i = 0; i < controls.length; i++) {
      const c = controls[i]!;
      const v = values[i];
      console.log(
        `${themes.join(",")}: ${c.key} = ${v === null ? "(unavailable)" : c.validator.format(v)}`,
      );
    }
    return;
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  draw();

  // A single data event may carry several keys; split it into tokens of
  // escape sequences or single characters and handle each in turn.
  process.stdin.on("data", (chunk: string) => {
    for (const key of chunk.match(/\x1b\[[A-D]|[\s\S]/g) ?? []) {
      if (handleKey(key)) return;
    }
  });

  /** Returns true when the app should quit. */
  function handleKey(key: string): boolean {
    if (key === "\x03" || key === "q") {
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      process.exit(0);
    }
    const v = values[selected];
    if (key === "\x1b[A" || key === "k") {
      selected = (selected - 1 + controls.length) % controls.length;
      draw();
      return false;
    }
    if (key === "\x1b[B" || key === "j") {
      selected = (selected + 1) % controls.length;
      draw();
      return false;
    }
    if (v !== null) {
      if (key === "\x1b[D" || key === "h") apply(v - controls[selected]!.step);
      else if (key === "\x1b[C" || key === "l") apply(v + controls[selected]!.step);
      else if (key === "H") apply(v - controls[selected]!.bigStep);
      else if (key === "L") apply(v + controls[selected]!.bigStep);
      else if (controls[selected]!.jump && key >= "0" && key <= "9") {
        apply(Number(key) / 10);
      } else if (key !== "r") draw();
    }
    if (key === "r") {
      reloadGhostty();
      draw();
    }
    return false;
  }
}
