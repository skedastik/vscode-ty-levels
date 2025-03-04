# vscode-ty-levels

A Visual Studio Code extension for editing Avara levels.

## Commands

Hit `Cmd-Shift-P` and begin typing any of the commands below. Hit `Enter` when the command appears to execute it.

### `Toggle Auto Tag`

Enable or disable automatic etag creation on save. This adds an "autotag" comment to the top of your file when enabled.

### `Add Etags`

Add etags to untagged solids (Walls, Ramps, WallDoors etc.).

### `Remove Etags`

Remove etags.

### `Regenerate Etags`

Regenerate existing etags.

### `Paste with New Etags`

Paste from clipboard, automatically regenerating existing etags.

## External commands

These commands are triggered externally. They cannot be manually invoked.

### `Find Etag`

This command is triggered by Avara's `/find` TUI command. It selects and reveals the targeted etag in your open document.
