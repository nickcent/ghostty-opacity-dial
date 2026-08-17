/**
 * Named appearance presets.
 *
 * Built-in presets ship in code; user presets are read from a JSON file
 * (`dial-presets.json` next to the Ghostty config, overridable via the
 * DIAL_PRESETS env var). User presets override built-ins of the same name.
 *
 * A preset fixes every numeric control plus the theme. The background image
 * is optional: when present it is applied (and validated) too.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./config.ts";

export const PRESETS_PATH =
  process.env.DIAL_PRESETS ?? join(HOME, ".config/ghostty/dial-presets.json");

export interface Preset {
  "background-image-opacity": number;
  "background-opacity": number;
  "background-blur-radius": number;
  "font-size": number;
  theme: string;
  /** Optional background image path; omitted presets leave the image alone. */
  "background-image"?: string;
}

export const BUILTIN_PRESETS: Record<string, Preset> = {
  subtle: {
    "background-image-opacity": 0.1,
    "background-opacity": 0.95,
    "background-blur-radius": 15,
    "font-size": 14,
    theme: "cent-dark",
  },
  balanced: {
    "background-image-opacity": 0.25,
    "background-opacity": 0.85,
    "background-blur-radius": 25,
    "font-size": 14,
    theme: "cent-dark",
  },
  dramatic: {
    "background-image-opacity": 0.5,
    "background-opacity": 0.65,
    "background-blur-radius": 40,
    "font-size": 16,
    theme: "cent-dark",
  },
  clear: {
    "background-image-opacity": 0,
    "background-opacity": 1,
    "background-blur-radius": 0,
    "font-size": 14,
    theme: "cent-dark",
  },
};

/** Load user presets; a missing or corrupt file yields an empty set. */
export function loadUserPresets(path: string = PRESETS_PATH): Record<string, Preset> {
  try {
    if (!existsSync(path)) return {};
    const data: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
    const out: Record<string, Preset> = {};
    for (const [name, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        out[name] = value as Preset;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Built-ins merged with user presets (user wins on name collision). */
export function loadPresets(): Record<string, Preset> {
  return { ...BUILTIN_PRESETS, ...loadUserPresets() };
}
