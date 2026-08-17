/** Multi-control interactive TUI for dialing Ghostty config values. */

import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import {
  CONFIG_PATH,
  HOME,
  THEME_DIR,
  opacityValidator,
  parseNumber,
  positiveValidator,
  readKey,
  setKey,
  writeKey,
  type Validator,
} from "./config.ts";
import { reloadGhostty, resolveThemes } from "./ghostty.ts";
import {
  loadHistory,
  restoreFiles,
  saveHistory,
  snapshotFiles,
} from "./history.ts";
import { loadPresets, type Preset } from "./presets.ts";

const IMAGE_DIR =
  process.env.GHOSTTY_IMAGE_DIR ?? join(HOME, ".config/ghostty/images");

interface NumberControl {
  kind: "number";
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

interface CycleControl {
  kind: "cycle";
  label: string;
  /** Discover available options (absolute values to write). */
  options: () => string[];
  /** Currently applied value, or null when unset/unreadable. */
  current: () => string | null;
  /** Persist an option. */
  apply: (option: string) => void;
  /** Short display form for an option (defaults to identity). */
  display?: (option: string) => string;
  /** Empty-options message shown in the footer. */
  emptyHint: string;
  /** When true, `e` opens a free-text path prompt. */
  promptable?: boolean;
  /** Label shown instead of "(unset)" when there is no current option. */
  unsetLabel?: string;
}

type Control = NumberControl | CycleControl;

function bar(value: number, width = 40): string {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * width);
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

function discoverThemes(): string[] {
  try {
    return readdirSync(THEME_DIR, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

function discoverImages(): string[] {
  try {
    if (!existsSync(IMAGE_DIR)) return [];
    return readdirSync(IMAGE_DIR, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => join(IMAGE_DIR, e.name))
      .sort();
  } catch {
    return [];
  }
}

export function run(themeArg: string): void {
  const themes = resolveThemes(themeArg);
  const themePaths = themes.map((t) => join(THEME_DIR, t));
  const presets = loadPresets();

  const controls: Control[] = [
    {
      kind: "cycle",
      label: "preset",
      options: () => Object.keys(presets).sort(),
      current: () => currentPresetName(),
      apply: (name) => applyPreset(name),
      emptyHint: "no presets defined",
      unsetLabel: "custom",
    },
    {
      kind: "cycle",
      label: "theme",
      options: discoverThemes,
      current: () => {
        try {
          return readKey(CONFIG_PATH, "theme");
        } catch {
          return null;
        }
      },
      apply: (name) => setKey(CONFIG_PATH, "theme", name),
      emptyHint: `no theme files found in ${THEME_DIR}`,
    },
    {
      kind: "cycle",
      label: "background-image",
      options: discoverImages,
      current: () => {
        try {
          return readKey(themePaths[0]!, "background-image");
        } catch {
          return null;
        }
      },
      apply: (path) => {
        if (!existsSync(path)) throw new Error(`Image not found: ${path}`);
        for (const p of themePaths) setKey(p, "background-image", path);
      },
      display: (path) => basename(path),
      emptyHint: `no images in ${IMAGE_DIR} (press e to enter a path)`,
      promptable: true,
    },
    {
      kind: "number",
      label: "background-image-opacity",
      key: "background-image-opacity",
      paths: themePaths,
      step: 0.01,
      bigStep: 0.05,
      validator: opacityValidator(),
      jump: true,
    },
    {
      kind: "number",
      label: "background-opacity",
      key: "background-opacity",
      paths: themePaths,
      step: 0.01,
      bigStep: 0.05,
      validator: opacityValidator(),
      jump: true,
    },
    {
      kind: "number",
      label: "background-blur-radius",
      key: "background-blur-radius",
      paths: themePaths,
      step: 1,
      bigStep: 5,
      validator: positiveValidator(0),
      jump: false,
    },
    {
      kind: "number",
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
  let prompt: string | null = null;
  const values: (number | null)[] = controls.map(() => null);
  /** Staged (not yet written) changes: control index -> new value. */
  const pending = new Map<number, number | string>();

  const watchedFiles = [...themePaths, CONFIG_PATH];
  const history = loadHistory();
  const baseline = snapshotFiles(watchedFiles);

  /** Snapshot the watched files onto the persisted undo stack. */
  function recordHistory(label: string): void {
    history.push({ at: new Date().toISOString(), label, files: snapshotFiles(watchedFiles) });
    saveHistory(history);
  }

  function readValue(i: number): number | null {
    const c = controls[i]!;
    if (c.kind !== "number") return null;
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

  function numberValue(key: string): number | null {
    const i = controls.findIndex((c) => c.kind === "number" && c.key === key);
    return i === -1 ? null : values[i];
  }

  function currentPresetName(): string | null {
    let theme: string | null = null;
    let image: string | null = null;
    try {
      theme = readKey(CONFIG_PATH, "theme");
    } catch {}
    try {
      image = readKey(themePaths[0]!, "background-image");
    } catch {}
    for (const [name, p] of Object.entries(presets)) {
      if (
        numberValue("background-image-opacity") === p["background-image-opacity"] &&
        numberValue("background-opacity") === p["background-opacity"] &&
        numberValue("background-blur-radius") === p["background-blur-radius"] &&
        numberValue("font-size") === p["font-size"] &&
        theme === p.theme &&
        (p["background-image"] === undefined || image === p["background-image"])
      ) {
        return name;
      }
    }
    return null;
  }

  function applyPreset(name: string): void {
    const p = presets[name];
    if (!p) throw new Error(`Unknown preset: ${name}`);
    for (const c of controls) {
      if (c.kind === "number") {
        const v = (p as unknown as Record<string, unknown>)[c.key];
        if (typeof v === "number") {
          const coerced = c.validator.coerce(v);
          for (const path of c.paths) writeKey(path, c.key, c.validator.format(coerced));
        }
      }
    }
    setKey(CONFIG_PATH, "theme", p.theme);
    if (p["background-image"] !== undefined) {
      if (!existsSync(p["background-image"])) {
        throw new Error(`Image not found: ${p["background-image"]}`);
      }
      for (const path of themePaths) setKey(path, "background-image", p["background-image"]);
    }
  }

  /** Drop a staged change when it matches the value already on disk. */
  function stage(i: number, value: number | string): void {
    const c = controls[i]!;
    const onDisk =
      c.kind === "number"
        ? values[i]
        : c.current();
    if (onDisk !== null && value === onDisk) pending.delete(i);
    else pending.set(i, value);
  }

  /** Files a staged change on control `i` would touch. */
  function affectedFiles(i: number): string[] {
    const c = controls[i]!;
    if (c.kind === "number") return c.paths;
    if (c.label === "theme") return [CONFIG_PATH];
    if (c.label === "background-image") return themePaths;
    return watchedFiles; // preset
  }

  /** One-line `old → new` description of a staged change. */
  function pendingLine(i: number): string {
    const c = controls[i]!;
    const next = pending.get(i)!;
    const files = affectedFiles(i).map((p) => basename(p)).join(", ");
    if (c.kind === "number") {
      const cur = values[i];
      const old = cur === null ? "?" : c.validator.format(cur);
      return `${c.label}: ${old} → ${c.validator.format(next as number)}  (${files})`;
    }
    const disp = c.display ?? ((s: string) => s);
    const cur = c.current();
    const old = cur === null ? `(${c.unsetLabel ?? "unset"})` : disp(cur);
    return `${c.label}: ${old} → ${disp(next as string)}  (${files})`;
  }

  function draw(): void {
    process.stdout.write("\x1b[2J\x1b[H");
    process.stdout.write("Ghostty dial\n");
    process.stdout.write(`themes: ${themes.join(" + ")}\n`);
    process.stdout.write(`history: ${history.length} change(s)\n\n`);
    for (let i = 0; i < controls.length; i++) {
      const c = controls[i]!;
      const cursor = i === selected ? "❯" : " ";
      const staged = pending.get(i);
      let rendered: string;
      if (c.kind === "number") {
        const v = staged !== undefined ? (staged as number) : values[i];
        rendered =
          v === null
            ? "(unavailable)"
            : c.jump
              ? `${bar(v)}  ${c.validator.format(v)}`
              : `  ${c.validator.format(v)}`;
        if (staged !== undefined && values[i] !== null) {
          rendered += `  (${c.validator.format(values[i]!)} → ${c.validator.format(staged as number)})`;
        }
      } else {
        const cur = c.current();
        const disp = c.display ?? ((s: string) => s);
        rendered =
          cur === null ? `(${c.unsetLabel ?? "unset"})` : `‹ ${disp(cur)} ›`;
        if (staged !== undefined) rendered += ` → ‹ ${disp(staged as string)} ›`;
      }
      process.stdout.write(`${cursor} ${c.label.padEnd(26)} ${rendered}\n`);
    }
    process.stdout.write("\n");
    if (pending.size > 0) {
      process.stdout.write("  pending changes (Enter apply, Esc cancel):\n");
      for (const i of pending.keys()) {
        process.stdout.write(`    ${pendingLine(i)}\n`);
      }
      process.stdout.write("\n");
    }
    process.stdout.write("  j/k or ↑/↓  select control\n");
    process.stdout.write("  ←/h  −step/prev    →/l  +step/next    H/L  −/+big step\n");
    process.stdout.write(
      "  0–9  jump (opacity controls)    e  enter image path    r reload    q quit\n",
    );
    process.stdout.write("  Enter  apply pending    Esc  cancel pending    u  undo    R  reset\n");
    if (prompt !== null) {
      process.stdout.write(`\n  image path: ${prompt}`);
    } else if (message) {
      process.stdout.write(`\n  ! ${message}\n`);
    }
  }

  function adjustNumber(next: number): void {
    const c = controls[selected]!;
    if (c.kind !== "number") return;
    stage(selected, c.validator.coerce(next));
    message = "";
    draw();
  }

  function adjustCycle(dir: 1 | -1): void {
    const c = controls[selected]!;
    if (c.kind !== "cycle") return;
    const options = c.options();
    if (options.length === 0) {
      message = c.emptyHint;
      return draw();
    }
    const staged = pending.get(selected) as string | undefined;
    const base = staged ?? c.current();
    const idx = base === null || base === undefined ? -1 : options.indexOf(base);
    const next = options[(idx + dir + options.length) % options.length]!;
    stage(selected, next);
    message = "";
    draw();
  }

  function stageImagePath(path: string): void {
    const i = controls.findIndex(
      (x) => x.kind === "cycle" && x.label === "background-image",
    );
    if (!existsSync(path)) {
      message = `Image not found: ${path}`;
      return;
    }
    stage(i, path);
    message = "";
  }

  /** Write every staged change, record one history entry, reload Ghostty. */
  function confirmPending(): void {
    if (pending.size === 0) return draw();
    const labels = [...pending.keys()].map((i) => pendingLine(i));
    try {
      recordHistory(labels.join("; "));
      for (const [i, next] of pending) {
        const c = controls[i]!;
        if (c.kind === "number") {
          for (const path of c.paths) {
            writeKey(path, c.key, c.validator.format(next as number));
          }
        } else {
          c.apply(next as string);
        }
      }
      pending.clear();
      refresh();
      message = "applied pending changes";
      reloadGhostty();
    } catch (err) {
      message = (err as Error).message;
    }
    draw();
  }

  function cancelPending(): void {
    pending.clear();
    message = "cancelled; configuration unchanged";
    draw();
  }

  function undo(): void {
    const entry = history.pop();
    if (!entry) {
      message = "nothing to undo";
      return draw();
    }
    try {
      restoreFiles(entry.files);
      saveHistory(history);
      pending.clear();
      refresh();
      message = `undid: ${entry.label}`;
      reloadGhostty();
    } catch (err) {
      message = (err as Error).message;
    }
    draw();
  }

  function resetToBaseline(): void {
    try {
      recordHistory("reset to baseline");
      restoreFiles(baseline);
      pending.clear();
      refresh();
      message = "reset to session-start state";
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
      if (c.kind === "number") {
        const v = values[i];
        console.log(
          `${themes.join(",")}: ${c.key} = ${v === null ? "(unavailable)" : c.validator.format(v)}`,
        );
      } else {
        console.log(
          `${themes.join(",")}: ${c.label} = ${c.current() ?? `(${c.unsetLabel ?? "unset"})`}`,
        );
      }
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
      handleKey(key);
    }
  });

  function handleKey(key: string): void {
    if (prompt !== null) return handlePromptKey(key);
    if (key === "\x03" || key === "q") return quit();
    const c = controls[selected]!;
    if (key === "\x1b[A" || key === "k") {
      selected = (selected - 1 + controls.length) % controls.length;
      return draw();
    }
    if (key === "\x1b[B" || key === "j") {
      selected = (selected + 1) % controls.length;
      return draw();
    }
    if (c.kind === "cycle") {
      if (key === "\x1b[D" || key === "h" || key === "H") return adjustCycle(-1);
      if (key === "\x1b[C" || key === "l" || key === "L") return adjustCycle(1);
      if (key === "e" && c.promptable) {
        prompt = "";
        return draw();
      }
    } else {
      const v = (pending.get(selected) as number | undefined) ?? values[selected];
      if (v !== null && v !== undefined) {
        if (key === "\x1b[D" || key === "h") return adjustNumber(v - c.step);
        if (key === "\x1b[C" || key === "l") return adjustNumber(v + c.step);
        if (key === "H") return adjustNumber(v - c.bigStep);
        if (key === "L") return adjustNumber(v + c.bigStep);
        if (c.jump && key >= "0" && key <= "9") return adjustNumber(Number(key) / 10);
      }
    }
    if (key === "\r" || key === "\n") return confirmPending();
    if (key === "\x1b" && pending.size > 0) return cancelPending();
    if (key === "r") {
      reloadGhostty();
      return draw();
    }
    if (key === "u") return undo();
    if (key === "R") return resetToBaseline();
    draw();
  }

  function handlePromptKey(key: string): void {
    if (key === "\x03") return quit();
    if (key === "\x1b" || key === "\x1b[D" || key === "\x1b[C") {
      prompt = null;
      return draw();
    }
    if (key === "\r" || key === "\n") {
      const path = prompt!;
      prompt = null;
      if (path.length > 0) stageImagePath(path);
      return draw();
    }
    if (key === "\x7f") {
      prompt = prompt!.slice(0, -1);
      return draw();
    }
    if (key >= " ") prompt += key;
    draw();
  }

  function quit(): void {
    process.stdin.setRawMode(false);
    process.stdout.write("\n");
    process.exit(0);
  }
}
