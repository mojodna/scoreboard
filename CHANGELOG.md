# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Ability to login using OSM (using passport in the backend)

### Changed
- Move from Sqlite to Postgres
- Drop some columns from the user schema
- Move tests and fixtures for API into a single place

## [v0.2.0] - 2018-08-13

### Added
- Ability for user to sort by Most/Least recent edit or Most/Least total number of edits on /users.
- Ava test suite in api/tests/test.js uses obscured data in api/tests/fixtures and checks api/user(s) endpoints
- Added mocked endpoints for external APIs

### Changed
- Took out user table sorting (which overwrote sorts executed on the backend) in frontend/src/commponents/AllUsersTable.js.
- Started using lerna for package management
- Logic for setting up the application separated from the rest of api/server.js and put into api/index.js
- Connection.js (api/db/) now returns a function which sets a different database path when NODE_ENV is set to TEST
- Api source code is organized under the `src` folder

## [v0.1.0] - 2018-08-03

- The first release

[Unreleased]: https://github.com/developmentseed/scoreboard/compare/HEAD...v0.2.0
[v0.2.0]: https://github.com/developmentseed/scoreboard/compare/v0.2.0...v0.1.0
[v0.1.0]: https://github.com/developmentseed/scoreboard/compare/d4fc54a...v0.1.0