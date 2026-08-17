/**
 * Workspace-specific profiles.
 *
 * A profile binds a name + directory to a preset reference. Profiles are
 * stored as a JSON array in `dial-profiles.json` next to the Ghostty config
 * (overridable via the DIAL_PROFILES env var), separate from theme files.
 * A missing or corrupt file fails safe to no profiles.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HOME } from "./config.ts";

export const PROFILES_PATH =
  process.env.DIAL_PROFILES ?? join(HOME, ".config/ghostty/dial-profiles.json");

export interface Profile {
  name: string;
  /** Absolute directory this profile binds to. */
  directory: string;
  /** Name of the preset applied for this profile. */
  preset: string;
}

export function loadProfiles(path: string = PROFILES_PATH): Profile[] {
  try {
    if (!existsSync(path)) return [];
    const data: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(data)) return [];
    return data.filter(
      (p): p is Profile =>
        typeof p === "object" &&
        p !== null &&
        typeof (p as Profile).name === "string" &&
        typeof (p as Profile).directory === "string" &&
        typeof (p as Profile).preset === "string",
    );
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[], path: string = PROFILES_PATH): void {
  writeFileSync(path, JSON.stringify(profiles, null, 2));
}

/** First profile bound to `directory`, if any. */
export function profileForDirectory(
  profiles: Profile[],
  directory: string,
): Profile | null {
  return profiles.find((p) => p.directory === directory) ?? null;
}
