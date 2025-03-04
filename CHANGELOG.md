# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.6] - 2025.03.04

### Changed

- Generated etags are now seven characters long.
- `Auto Tag` command is now `Toggle Auto Tag`.

## [0.0.5] - 2025.03.04

### Added

- `Auto Tag` command.
- Automatically add etags on save if autotag is enabled. 

## [0.0.4] - 2025.03.03

### Added

- `Regenerate Etags` command.

### Changed

- `Paste with New Etags` is invoked automatically when you paste. It regenerates existing etags instead of adding new ones to all pasted elements.
- `Remove Etags` and `Add Etags` now only affect the current selection, or the entire document if nothing is selected.

## [0.0.3] - 2025.03.03

### Added

- `Remove Etags` command.
- `Paste with New Etags` command.

## [0.0.2] - 2025.03.03

### Added

- Trigger `Find Etag` command on corresponding command URI.

## [0.0.1] - 2025.03.03

### Added

- `Add Etags` command.
