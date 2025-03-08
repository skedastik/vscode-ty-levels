# vscode-ty-levels

A Visual Studio Code extension for editing Avara levels.

## Commands

Hit `Cmd-Shift-P` and begin typing any of the commands below. Hit `Enter` to execute.

### Transforming geometry and actor elements

Physically transform geometry and actors en masse by selecting the elements you want to transform and executing any of the following commands.

#### Translation

You will be prompted to enter a translation expression. Your expression can be a simple constant (e.g. "-2"), or more complex (e.g. "3 * mainRampWidth").

##### `Translate Elements Along X Axis`

Add to cx/x/xx attributes.

##### `Translate Elements Along Z Axis`

Add to cz/z/zz attributes.

##### `Translate Elements Along Y Axis`

Add to y/yy attributes.

### Tagging

#### `Toggle Auto Tag`

Enable or disable automatic etag creation on save. This adds an "autotag" comment to the top of your file when enabled.

#### Manual tagging

##### `Add Etags`

Add etags to selected solids (Walls, Ramps, WallDoors etc.). Existing etags are unchanged. The entire document is affected if nothing is selected.

##### `Remove Etags`

Remove etags from selection or entire document.

##### `Regenerate Etags`

Regenerate existing etags across selection or entire document.

##### `Paste with New Etags`

Paste from clipboard, automatically regenerating etags in the pasted clip.

#### External commands

These commands are triggered externally. They cannot be manually invoked.

##### `Find Etag`

This command is triggered by Avara's `/find` TUI command. It selects and reveals the targeted etag in your open document.
