#!/usr/bin/env bun
/**
 * Live-dial Ghostty appearance settings.
 *
 * Usage:
 *   ./dial-bg-opacity.ts          # active appearance theme
 *   ./dial-bg-opacity.ts dark
 *   ./dial-bg-opacity.ts light
 *   ./dial-bg-opacity.ts both
 *   ./dial-bg-opacity.ts cent-dark
 */

import { run } from "./src/tui.ts";

run((process.argv[2] ?? "active").toLowerCase());
