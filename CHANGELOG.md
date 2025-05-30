# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.9] - 2025-05-30

### Changed
- Updated `@tact-lang/compiler` to `~1.6.13`
- Updated `@ton-ai-core/blueprint` to `^0.34.3`
- Updated `@nowarp/misti` to `~0.8.3`
- Updated peer dependency `@ton-ai-core/blueprint` to `>=0.34.5`

## [0.8.8] - 2025-05-05

### Added
- `--all` flag to run Misti analysis on all projects found in the workspace.
### Fixed
- Detect `--all` flag correctly by checking positional arguments instead of relying on potentially non-existent parsed property.

## [0.8.7] - 2025-05-05

### Added
- `--all` flag to run Misti analysis on all projects found in the workspace.

## [0.8.6] - 2025-04-17

### Fixed
- Use project.target for non-interactive contract selection (fixes JSON error)

## [0.8.5] - 2025-04-17

### Fixed
- Fixed non-interactive mode to correctly recognize project names using the same mechanism as interactive mode

## [0.8.4] - 2025-04-16

### Added
- Non-interactive mode support: `npx blueprint misti MyContract`

### Fixed
- Fixed main file path in package.json for correct package import

## [0.8.3] - 2025-04-16

### Fixed
- Fixed main file path in package.json for correct package import

## [0.8.2] - 2025-04-16

### Fixed
- Include test directory in tsconfig.json to resolve ESLint errors
- Replace @nowarp/blueprint-misti with @ton-ai-core/blueprint-misti in documentation

## [0.8.1] - 2025-04-16

### Fixed
- Include test directory in tsconfig.json to resolve ESLint errors

## [0.8.0] - 2025-04-08

### Added
- Misti 0.8.0 support

## [0.7.0] - 2025-03-05

### Added
- Misti 0.7.0 support
- Node.js 23 support
- Exit codes according to documentation (https://nowarp.io/tools/misti/docs/tutorial/cli#exit-codes): Issue [#12](https://github.com/nowarp/blueprint-misti/issues/12)
- Integration tests: PR [#14](https://github.com/nowarp/blueprint-misti/pull/14)

## [0.6.0] - 2024-12-22

### Added
- Misti 0.6.0 support

## [0.5.0] - 2024-10-31

### Added
- Misti 0.5.0 support

## [0.4.1] - 2024-10-12

### Added
- Misti 0.4.1 support

### Fixed
- Removed filepath and MistiResult hacks

## [0.4.0] - 2024-10-09

### Added
- Misti 0.4.0 support
- Improved Blueprint integration: PR [#7](https://github.com/nowarp/misti/pulls/7)
- Added `--blueprint-project` CLI argument to set the project name

## [0.3.2] - 2024-09-24

### Added
- Misti 0.3.1 support

## [0.3.1] - 2024-09-22
### Fixed
- API compatibility issues

## [0.3.0] - 2024-09-22
### Added
- Misti 0.3.0 support
