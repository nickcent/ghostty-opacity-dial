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
- `q`: quit.

Available controls and steps:

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

Requires macOS, Ghostty, Bun, and Accessibility permission for System Events.

## Development

```sh
bun install
bun run check   # tsc --noEmit
```
