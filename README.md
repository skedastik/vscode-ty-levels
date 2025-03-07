# vscode-ty-levels

A Visual Studio Code extension for editing Avara levels.

## Commands

Hit `Cmd-Shift-P` and begin typing any of the commands below. Hit `Enter` to execute.

### Transforming geometry and actor elements

Physically transform geometry and actors en masse by selecting the elements you want to transform and executing any of the following commands. The entire document will be affected if no selection is made.

#### Translation

You will be prompted to enter a translation expression. Your expression can be a simple constant (e.g. "-2"), or more complex (e.g. "3 * mainRampWidth").

##### `Translate Elements Along X Axis`

Add to **cx/x/xx** attributes.

##### `Translate Elements Along Z Axis`

Add to **cz/z/zz** attributes.

##### `Translate Elements Along Y Axis`

Add to **y/yy** attributes.

#### Mirroring

Mirror elements across axes centered at the world origin (0,0,0).

##### `Mirror Elements Across X Axis`

Multiply **cz/z/zz** attributes by -1. Reflect **angle** attributes across the X axis.

##### `Mirror Elements Across Z Axis`

Multiply **cx/x/xx** attributes by -1. Reflect **angle** attributes across the Z axis.

##### `Mirror Elements Across Y Axis`

Multiply **y/yy** attributes by -1. Reflect ramp **angle** attributes across the Y axis. The **angle** attribute for elements other than ramps are unaffected.

#### More commands

##### `Set Param`

Set a specific param/attribute to a given value. You will be prompted to enter arguments matching this format: `{<param>,<value>,<element (optional)>}`. Examples:

    w,5
    
        Set all `w` params/attributes to `5`.

    shape,bspGrenade,Goody

        Set `shape` params/attributes to `bspGrenade` on all `Goody` elements.

### Tagging

#### `Toggle Auto Tag`

Enable or disable automatic etag creation on save. This adds an "autotag" comment to the top of your file when enabled.

#### `Paste with Etags`

Paste from clipboard, adding etags where they didn't exist before and regenerating existing etags in the pasted clip. There is no need to invoke this command manually. It happens automatically when **[Auto Tag](#toggle-auto-tag)** is enabled and you paste using `Cmd-V`.

#### Manual tagging

##### `Add Etags`

Add etags to selected solids (Walls, Ramps, WallDoors etc.). Existing etags are unchanged. The entire document is affected if nothing is selected.

##### `Remove Etags`

Remove etags from selection or entire document.

##### `Regenerate Etags`

Regenerate existing etags across selection or entire document.

#### External commands

These commands are triggered externally. They cannot be manually invoked.

##### `Find Etag`

This command is triggered by Avara's `/find` TUI command. It selects and reveals the targeted etag in your open document.
