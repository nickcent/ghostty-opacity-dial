# Ghostty Opacity Dial

Interactive macOS terminal control for Ghostty appearance settings:
theme and background-image switching, background-image opacity, window
background opacity, background blur radius, and font size.

## Usage

```sh
./dial-bg-opacity.ts
./dial-bg-opacity.ts dark
./dial-bg-opacity.ts light
./dial-bg-opacity.ts both
./dial-bg-opacity.ts cent-dark
```

The default theme directory is `~/.config/ghostty/themes` and the main config
is `~/.config/ghostty/config`. Background images are discovered in
`~/.config/ghostty/images`. Set `GHOSTTY_THEME_DIR`, `GHOSTTY_CONFIG`, and/or
`GHOSTTY_IMAGE_DIR` to use other locations.

Controls:

- `j` / `k` or up / down arrows: select a control.
- `h` or left arrow: stage a one-step decrease / previous option.
- `l` or right arrow: stage a one-step increase / next option.
- `H` / `L`: stage a big-step decrease or increase.
- `0` through `9`: stage a jump to `0.0` through `0.9` (opacity controls only).
- `e`: type a background-image path directly (on the background-image control);
  the path is validated to exist before it is staged.
- `n`: create (or overwrite) a profile binding the current directory to the
  currently matching preset.
- `w`: update the active profile to the current directory and preset.
- `Enter`: apply all pending changes (writes files, records one history entry,
  reloads Ghostty).
- `Esc`: discard all pending changes without touching the configuration.
- `r`: reload Ghostty configuration.
- `u`: undo the last applied change (restores the previous file contents).
- `R`: reset to the session-start baseline.
- `q`: quit.

Adjustments never write immediately: they stage a pending change shown inline
(`old → new`) and in a preview block listing every pending value with the
files it will touch. Nothing changes on disk until `Enter` confirms; `Esc`
cancels. History (`u` / `R`) records confirmed changes only.

Available controls and steps:

- `profile` — workspace-specific profiles binding a directory to a preset.
  Shows `(none)` when no profile is active. Profiles are stored in
  `~/.config/ghostty/dial-profiles.json` (override with `DIAL_PROFILES`) as a
  JSON array of `{"name", "directory", "preset"}` objects, separate from
  theme files; a corrupt file is ignored. Launching the tool inside a bound
  directory auto-applies that profile's preset (recorded in history).
- `preset` — cycles through named appearance presets, staging the selected
  one (all numeric controls plus theme, and the background image when the
  preset sets one); `Enter` applies it and reloads Ghostty. Shows `(custom)`
  when the current settings match no preset. Built-in presets: `subtle`,
  `balanced`, `dramatic`, `clear`. User presets live in `~/.config/ghostty/dial-presets.json`
  (override with `DIAL_PRESETS`) as a JSON object mapping names to presets, e.g.
  `{"work": {"background-image-opacity": 0.2, "background-opacity": 0.9, "background-blur-radius": 20, "font-size": 15, "theme": "cent-dark"}}`;
  user presets override built-ins of the same name, and a corrupt file is
  ignored. The `background-image` field is optional.
- `theme` — cycles through theme files found in the theme directory; the
  selection is written as `theme = <name>` in the main config.
- `background-image` — cycles through images found in the image directory, or
  enter any path with `e`; the path is validated to exist and written as
  `background-image = <path>` in the targeted theme files.

- `background-image-opacity` — step `0.01`, big step `0.05`, clamped to `0–1`
  (written to the targeted theme files).
- `background-opacity` — step `0.01`, big step `0.05`, clamped to `0–1`
  (written to the targeted theme files).
- `background-blur-radius` — step `1`, big step `5`, minimum `0`
  (written to the targeted theme files).
- `font-size` — step `0.5`, big step `1`, minimum `1`
  (written to the main config).

Values are validated and clamped before staging, and Ghostty reloads through
the configured `super+shift+,` shortcut after every confirmed change.

History: before every applied change, the current contents of the targeted
theme files and main config are pushed onto an undo stack persisted to
`~/.config/ghostty/dial-history.json` (override with `DIAL_HISTORY`), so undo
works across process restarts. `u` pops and restores the latest snapshot;
`R` restores the state captured when the session started (and is itself
undoable). A missing or corrupt history file is ignored and starts fresh.

Requires macOS, Ghostty, Bun, and Accessibility permission for System Events.

## Development

```sh
bun install
bun run check   # tsc --noEmit
```
