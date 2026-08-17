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
- `h` or left arrow: decrease by one step / previous option.
- `l` or right arrow: increase by one step / next option.
- `H` / `L`: decrease or increase by a big step.
- `0` through `9`: jump to `0.0` through `0.9` (opacity controls only).
- `e`: type a background-image path directly (on the background-image control).
- `r`: reload Ghostty configuration.
- `u`: undo the last applied change (restores the previous file contents).
- `R`: reset to the session-start baseline.
- `q`: quit.

Available controls and steps:

- `preset` — cycles through named appearance presets and applies the selected
  one immediately (all numeric controls plus theme, and the background image
  when the preset sets one), then reloads Ghostty. Shows `(custom)` when the
  current settings match no preset. Built-in presets: `subtle`, `balanced`,
  `dramatic`, `clear`. User presets live in `~/.config/ghostty/dial-presets.json`
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

Values are validated and clamped before writing, and Ghostty reloads through
the configured `super+shift+,` shortcut after every accepted change.

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
