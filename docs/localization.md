# TR/EN localization architecture

GGL supports Turkish and English as user-interface languages. Localization is introduced in small functional slices so protocol, persistence and deterministic calculation semantics are never mixed with presentation translation.

## Language selection

- An explicit user choice is persisted under the UI-only key `ggl.ui.locale.v1`.
- A persisted valid choice wins over operating-system/browser language detection.
- Without a persisted choice, Turkish (`tr-*`) systems start in Turkish; all other systems start in English.
- The application shell exposes explicit `TR` / `EN` controls.
- `document.documentElement.lang` and the window document title follow the active locale.
- If localStorage is unavailable, the application continues to work; only preference persistence is lost.

## Non-localizable contracts

The following are language-invariant and must not be translated:

- `GGL-AI-TEST v1`, `GGL-AI-ANALYSIS v1`, `GGL-AI-COMPARISON v1` headers/end markers and canonical keys/enum values,
- `ai-follow-up-lineage v1`, SHA-256 inputs and canonical serialization,
- portable/local JSON schema identifiers, versions and storage field names,
- scenario/model IDs, units used by machine contracts and persisted enum values,
- deterministic numeric/physical calculation semantics.

Human-readable descriptions around those contracts may be localized, but machine-readable protocol text must remain byte/semantic compatible.

## Delivery slices

1. Foundation: typed `tr`/`en` locale, OS fallback, persisted explicit switch, document language/title and top application shell.
2. Navigation and core experiment panels, including locale-aware human number/date formatting.
3. Specialized observation/calibration/terrain/astronomy panels and dialogs.
4. Help catalog, AI workflow guidance and user-facing validation/error explanations while canonical AI blocks remain invariant.
5. HTML reports and public documentation, followed by a final untranslated-string audit.

The localization stage is complete only after both languages cover all user-facing application/report/help surfaces; the foundation PR by itself is intentionally partial.

## Implemented progress

- Foundation: locale bootstrap, persisted explicit TR/EN switch, document language/title and top application shell.
- Navigation slice: scenario labels/descriptions, sidebar states/model references/visual layers and locale-aware default experiment names.
- Core panel slice: visibility/horizon scenario summary, observation reference panels, vertical datum presentation and explicit locale-aware number/coordinate/bearing/percent formatting.
- Model-results slice: physical/reference model labels, result status presentation, visibility/horizon model cards and comparison tables, all using active-locale human numeric formatting.
- Astronomy shell slice: shared Time and date card plus Sun/Moon, eclipse, shadow and stellar scenario-summary shells.
- Astronomy result slice (part 1): Sun/Moon position panels plus eclipse overlap/event-search result surfaces, with renderer-only phase/geometry presentation mapping and active-locale numeric formatting.
- Astronomy result slice (part 2): daily solar events, civil↔solar time, annual season events and same-instant WGS84 route comparison surfaces; threshold/season domain ids remain unchanged.
- Astronomy result slice (part 3): single/dual shadow result surfaces plus core stellar result and geometric sky-snapshot presentation use TR/EN; raw engine warnings/traces and stellar source/editor controls remain follow-up work.
- Stellar control slice (part 4): catalog/trail controls, verified proper-motion source and standard-refraction diagnostic use TR/EN and active-locale formatting; local-horizon/DEM/panorama editors remain follow-up work.
- Stellar control slice (part 5): local-horizon source/editor presentation uses TR/EN while stable direction/source ids and raw imported warnings/messages remain unchanged; DEM and panorama controls remain follow-up work.

Engine-emitted warnings/assumptions/raw calculation errors and traces, DEM/panorama skyline controls, terrain/calibration panels, dialogs, help/AI guidance and reports remain separate follow-up slices.
