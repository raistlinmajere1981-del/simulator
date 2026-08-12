#!/usr/bin/env python3
"""Behavior-preserving split for src/shared/text-experiment-setup.ts.

The helper is intentionally fail-closed and temporary. It keeps the public
`text-experiment-setup.ts` facade and parser/application exports stable while
moving types, generic parser helpers, manual free-text candidate generation,
and application building into focused modules.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/shared/text-experiment-setup.ts"
TYPES = ROOT / "src/shared/text-experiment-setup-types.ts"
CORE = ROOT / "src/shared/text-experiment-setup-parser-core.ts"
MANUAL = ROOT / "src/shared/text-experiment-setup-manual-parser.ts"
APPLICATION = ROOT / "src/shared/text-experiment-setup-application.ts"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


for path in (TYPES, CORE, MANUAL, APPLICATION):
    if path.exists():
        fail(f"target already exists: {path.relative_to(ROOT)}")

text = SOURCE.read_text(encoding="utf-8")
markers = [
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.3.0';",
    "const NUM = String.raw`[-+]?\\d+(?:[.,]\\d+)?`;",
    "export function parseExperimentSetupText(sourceText: string): ExperimentSetupDraft {",
    "  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [",
    "  const candidates = collapseConflicts(raw);",
    "function numeric(candidate: ExperimentSetupCandidate): number | undefined {",
    "export function buildExperimentSetupApplication(",
]
for marker in markers:
    if text.count(marker) != 1:
        fail(f"expected exactly one marker: {marker}")

version_start = text.index(markers[0])
core_start = text.index(markers[1])
parse_start = text.index(markers[2])
application_start = text.index(markers[5])

if not (version_start < core_start < parse_start < application_start):
    fail("unexpected source section ordering")

types_block = text[version_start:core_start].rstrip() + "\n"
core_block = text[core_start:parse_start].rstrip() + "\n"
parse_block = text[parse_start:application_start].rstrip() + "\n"
application_block = text[application_start:].rstrip() + "\n"

manual_start = parse_block.index(markers[3])
manual_end = parse_block.index(markers[4])
manual_body = parse_block[manual_start:manual_end].rstrip() + "\n"
parse_prefix = parse_block[:manual_start]
parse_tail = parse_block[manual_end:]

# Turn only the parser-core top-level helpers into internal module exports.
core_block = core_block.replace("const NUM =", "export const NUM =", 1)
core_block = core_block.replace("const LENGTH_UNIT =", "export const LENGTH_UNIT =", 1)
core_block = core_block.replace("interface RawCandidate", "export interface RawCandidate", 1)
for name in (
    "normalizeText",
    "parseNumber",
    "normalizedUnit",
    "lengthToMetres",
    "trNumber",
    "excerpt",
    "addNumberMatches",
    "collapseConflicts",
    "addKeywordCandidate",
    "parseCoordinatePair",
):
    needle = f"function {name}("
    if core_block.count(needle) != 1:
        fail(f"parser-core helper marker changed: {needle}")
    core_block = core_block.replace(needle, f"export {needle}", 1)

TYPES.write_text(
    "import type { AtmosphereMode } from './atmosphere';\n"
    "import type { SimulationScenarioId } from './scenario';\n"
    "import type { SimulatorInputs } from './simulator';\n"
    "import type { ModelInputUncertaintySettings } from './uncertainty';\n"
    "import type { AiFollowUpLineage } from './ai-lineage';\n\n"
    + types_block,
    encoding="utf-8",
)

CORE.write_text(
    "import type {\n"
    "  ExperimentSetupCandidate,\n"
    "  ExperimentSetupCandidateStatus,\n"
    "  ExperimentSetupFieldId\n"
    "} from './text-experiment-setup-types';\n\n"
    + core_block,
    encoding="utf-8",
)

MANUAL.write_text(
    "import type { SimulationScenarioId } from './scenario';\n"
    "import type { VerticalDatumKind } from './terrain';\n"
    "import type { ExperimentSetupFieldId } from './text-experiment-setup-types';\n"
    "import {\n"
    "  NUM,\n"
    "  LENGTH_UNIT,\n"
    "  addKeywordCandidate,\n"
    "  addNumberMatches,\n"
    "  lengthToMetres,\n"
    "  parseCoordinatePair,\n"
    "  trNumber\n"
    "} from './text-experiment-setup-parser-core';\n"
    "import type { RawCandidate } from './text-experiment-setup-parser-core';\n\n"
    "export function addManualFreeTextCandidates(\n"
    "  raw: RawCandidate[],\n"
    "  text: string,\n"
    "  lower: string\n"
    "): void {\n"
    + manual_body
    + "}\n",
    encoding="utf-8",
)

APPLICATION.write_text(
    "import type { AtmosphereMode } from './atmosphere';\n"
    "import { AI_TEST_SPEC_SCENARIOS } from './ai-test-spec';\n"
    "import type { SimulationScenarioId } from './scenario';\n"
    "import type { SimulatorInputs } from './simulator';\n"
    "import type { ModelInputUncertaintySettings } from './uncertainty';\n"
    "import type {\n"
    "  ExperimentSetupApplication,\n"
    "  ExperimentSetupCandidate,\n"
    "  ExperimentSetupDraft,\n"
    "  ShadowStationBTextSetupChanges,\n"
    "  ShadowTextSetupChanges,\n"
    "  StellarTextSetupChanges,\n"
    "  TextSetupProvenanceContext\n"
    "} from './text-experiment-setup-types';\n\n"
    + application_block,
    encoding="utf-8",
)

facade = (
    "import { parseAiTestSpec } from './ai-test-spec';\n"
    "import { addManualFreeTextCandidates } from './text-experiment-setup-manual-parser';\n"
    "import { collapseConflicts, normalizeText } from './text-experiment-setup-parser-core';\n"
    "import type { RawCandidate } from './text-experiment-setup-parser-core';\n"
    "import { TEXT_EXPERIMENT_SETUP_PARSER_VERSION } from './text-experiment-setup-types';\n"
    "import type { ExperimentSetupDraft } from './text-experiment-setup-types';\n\n"
    "export * from './text-experiment-setup-types';\n"
    "export { buildExperimentSetupApplication } from './text-experiment-setup-application';\n\n"
    + parse_prefix
    + "  addManualFreeTextCandidates(raw, text, lower);\n\n"
    + parse_tail
)

# Guard against accidentally retaining the old monolith or dropping the facade API.
if "export function buildExperimentSetupApplication(" in facade:
    fail("application builder unexpectedly remained in facade")
if "const scenarioKeywords:" in facade:
    fail("manual parser body unexpectedly remained in facade")
if "export function parseExperimentSetupText" not in facade:
    fail("parseExperimentSetupText facade export missing")
if len(facade) > 7_000:
    fail(f"facade unexpectedly large after split: {len(facade)} bytes")

SOURCE.write_text(facade, encoding="utf-8")

print("text-experiment-setup refactor applied successfully.")
print("Created:")
for path in (TYPES, CORE, MANUAL, APPLICATION):
    print(f"  - {path.relative_to(ROOT)}")
print(f"Facade: {SOURCE.relative_to(ROOT)}")
