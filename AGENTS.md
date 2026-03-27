# AGENTS.md

## Purpose
This repository contains the Granblue Fantasy collection tracker wiki assets. The main tracker is composed of:

- `Widget CharacterTrackerHeader`
- `Widget CharacterTrackerJS.js`
- `Template Tracker`
- `Template Tracker Item`
- `MediaWiki Gadget-common-icon-images.css`

Agents working here should preserve compatibility with existing tracker hashes unless a change is explicitly intended.

## File Roles
- `Widget CharacterTrackerHeader`: filter and control markup, including `data-option` and `data-bit` definitions.
- `Widget CharacterTrackerJS.js`: client-side tracker behavior, filtering, hash import/export, sorting, and expanded statistics.
- `Template Tracker`: page/template wrapper for the tracker UI.
- `Template Tracker Item`: emits tracker item HTML and `data-*` attributes consumed by JS.
- `MediaWiki Gadget-common-icon-images.css`: icon mappings used by header buttons and expanded statistics.

## Persistence Rules
- The tracker state is persisted through the URL hash.
- Local save/load is just a saved copy of `location.hash`.
- Treat hash changes as compatibility-sensitive.
- Prefer additive persistence changes where missing bits map to old defaults.
- Reuse existing `data-option` buckets when a new setting is logically part of an existing option family.

## Current `data-option="o"` Usage
- Bit `0`: character uncap visibility
- Bit `1`: summon uncap visibility
- Bit `2`: expanded statistics visibility
- Bit `3`: include collab disabled
- Bit `4`: sort name ascending
- Bit `5`: sort name descending
- Bit `6`: sort release ascending
- Bit `7`: sort release descending
- Bit `8`: expanded statistics percentage display

## Compatibility Notes
- Existing live hashes without the newer `o` bits must still load with old defaults.
- Missing bit `2` means expanded statistics are hidden.
- Missing bit `3` means collab is included in expanded statistics.
- Missing bits `4`-`7` mean sort mode is `Default`.
- Missing bit `8` means expanded statistics display uses fractions.
- Local save/load uses the exact URL hash, so any persisted setting change is also a local-save format change.

## Recent Feature History
- Expanded statistics were added as a client-side panel and later persisted into `data-option="o"`.
- Expanded statistics support an `Include Collab` toggle and a `Fraction` / `Percentage` display mode.
- Sorting is box-local and currently supports `Default`, `A→Z`, `Z→A`, `Old→New`, and `New→Old`.
- Sort and expanded-statistics preferences are persisted through the hash and therefore through local save/load.

## Editing Guidance
- When adding filter groups, update both header markup and JS restore/export logic.
- When adding item metadata, confirm it is emitted by `Template Tracker Item` and consumed consistently in JS.
- Keep expanded statistics defaults backward-compatible unless explicitly changing behavior.
- Avoid changing the hash parser regex unless there is a real need for more `data-option` prefixes.
- Do not remove or repurpose existing persisted bits once they are considered live.

## Validation Checklist
- Old hashes should still load without errors.
- New settings should round-trip through URL hash and local save/load when intended.
- Sorting, filtering, owned counts, and expanded statistics should continue to work together.
- If adding icons, confirm the icon name exists in CSS or is intentionally text-only.
