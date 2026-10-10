# maidog in herdr

maidog plugs into [herdr-file-viewer](https://github.com/smarzban/herdr-file-viewer), the file viewer plugin for [herdr](https://herdr.dev). After setup, every markdown file you open in the viewer shows its Mermaid diagrams as box art.

## Requirements

- herdr 0.7.5 or newer
- herdr-file-viewer 1.12.0 or newer, with [glow](https://github.com/charmbracelet/glow) installed. Older viewers ignore config files. Setup warns when it finds one.
- macOS or Linux

Node 18+ or Bun makes the install small (1.5 MB). Without either, the plugin downloads a single binary for your platform and checks its SHA-256 first.

## Install

```bash
herdr plugin install dynaum/maidog
herdr plugin action invoke maidog.setup-file-viewer
```

herdr shows you the commands the plugin runs before you confirm the install. A notification confirms the setup. Open the file viewer and select any markdown file.

## What setup changes

Setup does three things:

1. Copies maidog to a fixed folder under the plugin's state directory (`<state-dir>/runtime/`). herdr moves plugins to a new folder on every update, so the viewer never points inside the plugin folder.
2. Copies the viewer's own glow color palette into the same folder, so markdown keeps the colors you know.
3. Adds one line at the top of the viewer's config file:

   ```toml
   markdown = "\"<state-dir>/runtime/maidog\" glow -s \"<state-dir>/runtime/glow-style.json\" -w 0 -" # managed by maidog
   ```

The viewer reads its config from `herdr plugin config-dir herdr-file-viewer`, which is usually `~/.config/herdr/plugins/config/herdr-file-viewer/config.toml`. When herdr does not answer, setup falls back to `~/.config/herdr-file-viewer/config.toml`.

The first time setup changes the file, it saves the original as `config.toml.maidog-backup`. Later runs never replace the backup. Running setup again is safe. Setup updates its own line and leaves the rest alone.

### You already use a custom markdown renderer

Setup stops and tells you. Your config stays unchanged. To replace your renderer with maidog, run the force action:

```bash
herdr plugin action invoke maidog.setup-file-viewer-force
```

Setup saves your config as `config.toml.maidog-backup` first. Later runs keep that first backup, so your original line stays safe.

## Updates

```bash
herdr plugin install dynaum/maidog --yes
```

Reinstalling from GitHub replaces the installed version and keeps your config. Newer herdr releases also offer `herdr plugin update maidog`.

A startup hook copies the new version into the fixed folder the next time the herdr server starts. To apply an update without a restart, run the setup action again.

## Preview popup

Preview any markdown file in a popup, outside the file viewer:

```bash
herdr plugin action invoke maidog.preview
```

The popup asks for a path (Tab completes), then opens the file in glow's pager. Press `q` to close.

Bind the preview to a key in `~/.config/herdr/config.toml`:

```toml
[[keys.command]]
key = "prefix+m"
type = "plugin_action"
command = "maidog.preview"
description = "maidog preview"
```

## Uninstall

1. Open the viewer config (path above) and delete the line ending in `# managed by maidog`. Or restore `config.toml.maidog-backup`.
2. Remove the plugin:

   ```bash
   herdr plugin uninstall maidog
   ```

## Troubleshooting

### Diagrams still show as code

- Run the setup action again and read the notification. The message names the config file setup wrote.
- Check the file has the `# managed by maidog` line:

  ```bash
  cat "$(herdr plugin config-dir herdr-file-viewer)/config.toml"
  ```

- Look for a note under the block. A line such as `> maidog: pie diagrams are not supported yet` means maidog ran but does not support the type.

### A wide diagram shows as code in a narrow pane

maidog fits each diagram to the pane: a wide flowchart turns top-down, and the spacing tightens. A diagram that still does not fit stays as source with a note, because glow would wrap the lines and break the boxes. Press `w` in the viewer for the full-width view: the viewer then renders without a width limit, maidog draws the whole diagram, and you scroll sideways.

### Setup says the viewer ignores config files

herdr-file-viewer reads `config.toml` from version 1.12.0 on. Update the viewer, then reopen it:

```bash
herdr plugin install smarzban/herdr-file-viewer --yes
```

### A changed file shows a diff, not the diagram

The viewer opens files with uncommitted or branch changes as a diff. Press `v` to cycle to the rendered markdown view. Set `changed_file_view` in the viewer config to change the default.

### "Markdown renderer timed out"

The viewer stops a renderer after 5 seconds. maidog stops itself after 3 seconds and keeps any unfinished diagram as source, so this message means something else ran slow, such as a cold Node start on a busy machine. A very long single chain (25 steps or more) hits a slow path in the drawing library and always shows as source.

### "Markdown renderer failed"

Copy the quoted path at the start of the `markdown` line in the viewer config, and run the path by hand to see the error:

```bash
"/path/from/the/config/runtime/maidog" --version
```

If Node moved or was removed, run the setup action again so the runtime points at the current Node.

### herdr says "protocol_mismatch"

You updated the herdr client while an older server still runs. Restart the server (this closes your panes), then run the setup action again.
