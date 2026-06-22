# Changelog

## [6.0.0] — 2026-06-22

### Added
- Unit tests for all calculator functions (Vitest, 46 tests)
- CHANGELOG.md
- Proper packaging script (`scripts/package.sh`)
- `UPDATE_PLAYTIME_AND_GET_ALL` single-message adjustment pipeline

### Changed
- Styles moved from JS-injected `<style>` tag into proper loaded stylesheet (`styles/content.css`)
- Popup adjustment now uses single message roundtrip instead of two (UPDATE_PLAYTIME → GET_CURRENT_DATA)
- `waitForProfileData` simplified — uses observer + timeout, removed redundant polling interval
- Removed URL-change MutationObserver (Turbo events + popstate already cover navigation)

### Removed
- `ui.js:addStyles()` — CSS now loads via `manifest.json` `content_scripts.css`
- Dead `styles/content.css` (the old one with mismatched selectors)
- Legacy alias methods (`getInterpretation`, `getColor`, `createElement`, `updateElement`)

### Fixed
- Popup coefficients now match `config.js` per-mode lookup (previously hardcoded wrong values)
- Playtime regex handles all osu! display formats, not just `Xd Yh Zm`

## [5.0.0] — 2026-06-22

### Fixed
- `injectIndices` early return blocking UPDATE_PLAYTIME updates
- Invalid Firefox manifest key `data_collection_permissions`
- Version mismatch (manifest v5 vs popup footer v4)
