# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.16] - 2025.03.14

### Changed

- Fix bug whereby documents were being saved incorrectly when the user saved multiple documents via "Save All".

## [0.0.15] - 2025.03.13

### Changed

- Fix `Set Param` command bug where hex expressions (e.g. "#fff") were not being encoded consistently.

## [0.0.14] - 2025.03.13

### Added

- `Set Param on Element with Etag` command

## [0.0.13] - 2025.03.12

### Changed

- Rotation commands
    - Support expressions in cx/x/xx/cz/z/zz/w/d attributes.
    - Display error when encountering non-numeric angle attributes.
- Mirroring commands
    - Display error when encountering non-numeric angle attributes.

## [0.0.12] - 2025.03.12

### Added

- Commands for rotating elements
    - `Rotate 90 Degrees Clockwise`
    - `Rotate 90 Degrees Counterclockwise`

### Changed

- Rename commands.
    - `Translate Elements Along X Axis` -> `Translate Along X Axis`
    - `Translate Elements Along Z Axis` -> `Translate Along Z Axis`
    - `Translate Elements Along Y Axis` -> `Translate Along Y Axis`
    - `Mirror Elements Across X Axis` -> `Mirror Across X Axis`
    - `Mirror Elements Across Z Axis` -> `Mirror Across Z Axis`
    - `Mirror Elements Across Y Axis` -> `Mirror Across Y Axis`

## [0.0.11] - 2025.03.10

### Changed

- Fix broken `Add Etags` command.

## [0.0.10] - 2025.03.10

### Added

- Support [configuration](./README.md#configuration) via `tylconfig.json` file in workspace root.

## [0.0.9] - 2025.03.09

### Added

- `Set Param` command

### Changed

- `Paste with New Etags` command
    - Rename to `Paste with Etags`.
    - Add etags to untagged elements in pasted text in addition to regenerating existing tags.
    - Only add/regenerate etags in pasted text if autotag is enabled.
    - Avoid permanently altering clipboard content.

## [0.0.8] - 2025.03.07

### Added

- Commands for mirroring elements
    - `Mirror Elements Across X Axis`
    - `Mirror Elements Across Z Axis`
    - `Mirror Elements Across Y Axis`

### Changed

- `Paste with New Etags` command
    - Reimplement paste logic to avoid overriding built-in paste action.

## [0.0.7] - 2025.03.06

### Added

- Commands for translating elements
    - `Translate Elements Along X Axis`
    - `Translate Elements Along Z Axis`
    - `Translate Elements Along Y Axis`

## [0.0.6] - 2025.03.04

### Changed

- Generate seven character long etags.
- Rename `Auto Tag` command to `Toggle Auto Tag`.

## [0.0.5] - 2025.03.04

### Added

- `Auto Tag` command
    - Automatically add etags on save if autotag is enabled. 

## [0.0.4] - 2025.03.03

### Added

- `Regenerate Etags` command

### Changed

- `Paste with New Etags` is invoked automatically when you paste. It regenerates existing etags instead of adding new ones to all pasted elements.
- `Remove Etags` and `Add Etags` now only affect the current selection, or the entire document if nothing is selected.

## [0.0.3] - 2025.03.03

### Added

- `Remove Etags` command
- `Paste with New Etags` command

## [0.0.2] - 2025.03.03

### Added

- Trigger `Find Etag` command on corresponding command URI.

## [0.0.1] - 2025.03.03

### Added

- `Add Etags` command
