# Ghostty Opacity Dial

Interactive macOS terminal control for Ghostty background-image opacity.

## Usage

```sh
./dial-bg-opacity.ts
./dial-bg-opacity.ts dark
./dial-bg-opacity.ts light
./dial-bg-opacity.ts both
```

The default theme directory is `~/.config/ghostty/themes`. Set
`GHOSTTY_THEME_DIR` to use another directory.

Controls:

- `h` or left arrow: decrease by `0.01`.
- `l` or right arrow: increase by `0.01`.
- `H` / `L`: decrease or increase by `0.05`.
- `0` through `9`: jump to `0.0` through `0.9`.
- `r`: reload Ghostty configuration.
- `q`: quit.

The script updates `background-image-opacity` in the selected theme and
reloads Ghostty through the configured `super+shift+,` shortcut.

Requires macOS, Ghostty, Bun, and Accessibility permission for System Events.

