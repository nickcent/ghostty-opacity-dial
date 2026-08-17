/**
 * Generic read/validate/write helpers for Ghostty `key = value` files.
 *
 * Distinct, human-readable errors for:
 *   - missing file        (ConfigFileNotFoundError)
 *   - missing key         (ConfigKeyNotFoundError)
 *   - invalid value       (InvalidValueError)
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const HOME = process.env.HOME ?? homedir();
export const THEME_DIR =
  process.env.GHOSTTY_THEME_DIR ?? join(HOME, ".config/ghostty/themes");
export const CONFIG_PATH =
  process.env.GHOSTTY_CONFIG ?? join(HOME, ".config/ghostty/config");

export class ConfigFileNotFoundError extends Error {
  constructor(path: string) {
    super(`Config file not found: ${path}`);
    this.name = "ConfigFileNotFoundError";
  }
}

export class ConfigKeyNotFoundError extends Error {
  constructor(key: string, path: string) {
    super(`No ${key} in ${path}`);
    this.name = "ConfigKeyNotFoundError";
  }
}

export class InvalidValueError extends Error {
  constructor(key: string, value: string, reason: string) {
    super(`Invalid value for ${key}: "${value}" (${reason})`);
    this.name = "InvalidValueError";
  }
}

function readText(path: string): string {
  if (!existsSync(path)) throw new ConfigFileNotFoundError(path);
  return readFileSync(path, "utf8");
}

function keyPattern(key: string): RegExp {
  return new RegExp(`^${key}\\s*=\\s*(.*?)\\s*$`, "m");
}

export function readKey(path: string, key: string): string {
  const text = readText(path);
  const match = text.match(keyPattern(key));
  if (!match) throw new ConfigKeyNotFoundError(key, path);
  return match[1]!;
}

export function writeKey(path: string, key: string, value: string): void {
  const text = readText(path);
  const next = text.replace(keyPattern(key), `${key} = ${value}`);
  if (next === text) throw new ConfigKeyNotFoundError(key, path);
  writeFileSync(path, next);
}

/** Append-or-replace: use when the key may legitimately be absent. */
export function setKey(path: string, key: string, value: string): void {
  const text = readText(path);
  if (keyPattern(key).test(text)) {
    writeFileSync(path, text.replace(keyPattern(key), `${key} = ${value}`));
  } else {
    const sep = text.endsWith("\n") || text.length === 0 ? "" : "\n";
    writeFileSync(path, `${text}${sep}${key} = ${value}\n`);
  }
}

export interface Validator {
  /** Clamp/round a proposed numeric value; returns the value to store. */
  coerce(value: number): number;
  /** Format a numeric value for writing. */
  format(value: number): string;
}

export function opacityValidator(): Validator {
  return {
    coerce: (v) => Math.min(1, Math.max(0, Math.round(v * 100) / 100)),
    format: (v) => v.toFixed(2),
  };
}

export function positiveValidator(min: number, decimals = 0): Validator {
  const factor = 10 ** decimals;
  return {
    coerce: (v) => Math.max(min, Math.round(v * factor) / factor),
    format: (v) => v.toFixed(decimals),
  };
}

/** Parse a stored string to a number, validating per-key. */
export function parseNumber(key: string, raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new InvalidValueError(key, raw, "not a number");
  return n;
}
