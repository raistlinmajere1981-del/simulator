#!/usr/bin/env python3
"""Centralize GGL AI contract versions and add canonical fixture coverage.

Temporary helper: remove before merge.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        fail(f"expected exactly one marker in {path.relative_to(ROOT)}: {old[:100]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


contracts = ROOT / "src/shared/ai-contracts.ts"
contracts.write_text("""/**
 * Canonical registry for public GGL AI wire-contract identities and versions.
 *
 * Keep this module dependency-free. Protocol producers/parsers may import from it,
 * but it must never import them back. Existing facade exports remain available from
 * their historical modules for backward-compatible contributor imports.
 */
export const AI_CONTRACT_REGISTRY = {
  test: {
    id: 'GGL-AI-TEST',
    version: 'v1',
    header: 'GGL-AI-TEST v1',
    endMarker: 'END GGL-AI-TEST',
    direction: 'ai-to-ggl',
    authority: 'proposal-only'
  },
  analysis: {
    id: 'GGL-AI-ANALYSIS',
    version: 'v1',
    header: 'GGL-AI-ANALYSIS v1',
    endMarker: 'END GGL-AI-ANALYSIS',
    direction: 'ggl-to-ai',
    authority: 'deterministic-snapshot'
  },
  comparison: {
    id: 'GGL-AI-COMPARISON',
    version: 'v1',
    header: 'GGL-AI-COMPARISON v1',
    endMarker: 'END GGL-AI-COMPARISON',
    direction: 'ggl-to-ai',
    authority: 'deterministic-snapshot'
  },
  lineage: {
    id: 'ai-follow-up-lineage',
    version: 'v1',
    direction: 'persisted-provenance',
    authority: 'integrity-metadata'
  }
} as const;

export const GGL_AI_TEST_SPEC_VERSION = AI_CONTRACT_REGISTRY.test.version;
export const GGL_AI_TEST_HEADER = AI_CONTRACT_REGISTRY.test.header;
export const GGL_AI_TEST_END = AI_CONTRACT_REGISTRY.test.endMarker;

export const GGL_AI_ANALYSIS_PACKAGE_VERSION = AI_CONTRACT_REGISTRY.analysis.version;
export const GGL_AI_ANALYSIS_HEADER = AI_CONTRACT_REGISTRY.analysis.header;
export const GGL_AI_ANALYSIS_END = AI_CONTRACT_REGISTRY.analysis.endMarker;

export const GGL_AI_COMPARISON_PACKAGE_VERSION = AI_CONTRACT_REGISTRY.comparison.version;
export const GGL_AI_COMPARISON_HEADER = AI_CONTRACT_REGISTRY.comparison.header;
export const GGL_AI_COMPARISON_END = AI_CONTRACT_REGISTRY.comparison.endMarker;

export const AI_FOLLOW_UP_LINEAGE_VERSION = AI_CONTRACT_REGISTRY.lineage.version;
export const AI_ANALYSIS_SNAPSHOT_FORMAT = AI_CONTRACT_REGISTRY.analysis.id;
""", encoding="utf-8")

workflow = ROOT / "src/shared/ai-workflow.ts"
replace_once(
    workflow,
    "export const GGL_AI_TEST_HEADER = 'GGL-AI-TEST v1';\nexport const GGL_AI_TEST_END = 'END GGL-AI-TEST';\n",
    "import { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-contracts';\n\nexport { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-contracts';\n"
)

test_spec = ROOT / "src/shared/ai-test-spec.ts"
replace_once(
    test_spec,
    "export const GGL_AI_TEST_SPEC_VERSION = 'v1';\n",
    "export { GGL_AI_TEST_SPEC_VERSION } from './ai-contracts';\n"
)

analysis = ROOT / "src/shared/ai-analysis-package.ts"
replace_once(
    analysis,
    "import type { SavedExperiment } from './simulator';\n\nexport const GGL_AI_ANALYSIS_PACKAGE_VERSION = 'v1';\nexport const GGL_AI_COMPARISON_PACKAGE_VERSION = 'v1';\n",
    "import type { SavedExperiment } from './simulator';\nimport {\n  GGL_AI_ANALYSIS_END,\n  GGL_AI_ANALYSIS_HEADER,\n  GGL_AI_ANALYSIS_PACKAGE_VERSION,\n  GGL_AI_COMPARISON_END,\n  GGL_AI_COMPARISON_HEADER,\n  GGL_AI_COMPARISON_PACKAGE_VERSION\n} from './ai-contracts';\n\nexport {\n  GGL_AI_ANALYSIS_PACKAGE_VERSION,\n  GGL_AI_COMPARISON_PACKAGE_VERSION\n} from './ai-contracts';\n"
)
replace_once(
    analysis,
    "    `GGL-AI-ANALYSIS ${GGL_AI_ANALYSIS_PACKAGE_VERSION}`,",
    "    GGL_AI_ANALYSIS_HEADER,"
)
replace_once(
    analysis,
    "    'END GGL-AI-ANALYSIS'",
    "    GGL_AI_ANALYSIS_END"
)
replace_once(
    analysis,
    "    `GGL-AI-COMPARISON ${GGL_AI_COMPARISON_PACKAGE_VERSION}`,",
    "    GGL_AI_COMPARISON_HEADER,"
)
replace_once(
    analysis,
    "  lines.push(...COMPARISON_AI_TASK, 'END GGL-AI-COMPARISON');",
    "  lines.push(...COMPARISON_AI_TASK, GGL_AI_COMPARISON_END);"
)

lineage = ROOT / "src/shared/ai-lineage.ts"
replace_once(
    lineage,
    "import type { SavedExperiment } from './simulator';\nimport { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-workflow';\n\nexport const AI_FOLLOW_UP_LINEAGE_VERSION = 'v1';\nexport const AI_ANALYSIS_SNAPSHOT_FORMAT = 'GGL-AI-ANALYSIS';\n",
    "import type { SavedExperiment } from './simulator';\nimport { GGL_AI_TEST_END, GGL_AI_TEST_HEADER } from './ai-workflow';\nimport {\n  AI_ANALYSIS_SNAPSHOT_FORMAT,\n  AI_FOLLOW_UP_LINEAGE_VERSION\n} from './ai-contracts';\n\nexport {\n  AI_ANALYSIS_SNAPSHOT_FORMAT,\n  AI_FOLLOW_UP_LINEAGE_VERSION\n} from './ai-contracts';\n"
)

fixture_dir = ROOT / "tests/fixtures/ai-contracts"
fixture_dir.mkdir(parents=True, exist_ok=True)
fixtures = {
    "valid-target-visibility.txt": """GGL-AI-TEST v1
scenario: target-visibility
name: Contract fixture target visibility
observed_at_utc: 2026-08-13T08:00:00Z
utc_offset: +03:00
surface_distance_km: 42
observer.coordinates: 41.0082,28.9784
observer.eye_height_m: 1.75
target.coordinates: 40.7128,29.9000
target.height_m: 30
END GGL-AI-TEST
""",
    "valid-shadow.txt": """GGL-AI-TEST v1
scenario: shadow-observation
name: Contract fixture shadow
observed_at_utc: 2024-06-21T12:00:00Z
utc_offset: +00:00
observer.coordinates: 41.0082,28.9784
shadow.gnomon_height_m: 1.5
shadow.observed_length_m: 0.65
shadow.observed_length_uncertainty_m: 0.02
shadow.station_b.coordinates: 39.9334,32.8597
shadow.station_b.gnomon_height_m: 1
END GGL-AI-TEST
""",
    "valid-stellar.txt": """GGL-AI-TEST v1
scenario: stellar-observation
name: Contract fixture Polaris
observed_at_utc: 2026-08-13T21:00:00Z
utc_offset: +03:00
observer.coordinates: 41.0082,28.9784
stellar.star_id: hr-0424
stellar.trail_duration_minutes: 720
stellar.sample_interval_minutes: 10
stellar.local_horizon.enabled: true
stellar.local_horizon.n_deg: 5
stellar.local_horizon.ne_deg: 4
stellar.local_horizon.e_deg: 3
stellar.local_horizon.se_deg: 2
stellar.local_horizon.s_deg: 1
stellar.local_horizon.sw_deg: 2
stellar.local_horizon.w_deg: 3
stellar.local_horizon.nw_deg: 4
END GGL-AI-TEST
""",
    "invalid-multiple-blocks.txt": """First proposal:
GGL-AI-TEST v1
scenario: target-visibility
surface_distance_km: 42
END GGL-AI-TEST

Second proposal:
GGL-AI-TEST v1
scenario: horizon
surface_distance_km: 100
END GGL-AI-TEST
""",
    "invalid-missing-end.txt": """GGL-AI-TEST v1
scenario: target-visibility
surface_distance_km: 42
""",
    "invalid-values.txt": """GGL-AI-TEST v1
scenario: orbital-dynamics
name: Invalid contract values
observer.coordinates: 95,250
surface_distance_km: -1
stellar.star_id: not-a-catalog-id
stellar.trail_duration_minutes: 123
END GGL-AI-TEST
""",
    "invalid-unknown-key.txt": """GGL-AI-TEST v1
scenario: target-visibility
magic.curvature_override: 0.8
END GGL-AI-TEST
"""
}
for name, text in fixtures.items():
    (fixture_dir / name).write_text(text, encoding="utf-8")

registry_test = ROOT / "tests/ai-contract-registry.test.ts"
registry_test.write_text("""import { describe, expect, it } from 'vitest';
import {
  AI_ANALYSIS_SNAPSHOT_FORMAT,
  AI_CONTRACT_REGISTRY,
  AI_FOLLOW_UP_LINEAGE_VERSION,
  GGL_AI_ANALYSIS_END,
  GGL_AI_ANALYSIS_HEADER,
  GGL_AI_ANALYSIS_PACKAGE_VERSION,
  GGL_AI_COMPARISON_END,
  GGL_AI_COMPARISON_HEADER,
  GGL_AI_COMPARISON_PACKAGE_VERSION,
  GGL_AI_TEST_END,
  GGL_AI_TEST_HEADER,
  GGL_AI_TEST_SPEC_VERSION
} from '../src/shared/ai-contracts';
import {
  GGL_AI_ANALYSIS_PACKAGE_VERSION as analysisFacadeVersion,
  GGL_AI_COMPARISON_PACKAGE_VERSION as comparisonFacadeVersion,
  createAiAnalysisPackage,
  createAiComparisonPackage
} from '../src/shared/ai-analysis-package';
import { AI_FOLLOW_UP_LINEAGE_VERSION as lineageFacadeVersion } from '../src/shared/ai-lineage';
import { GGL_AI_TEST_SPEC_VERSION as testFacadeVersion } from '../src/shared/ai-test-spec';
import {
  GGL_AI_TEST_END as workflowEnd,
  GGL_AI_TEST_HEADER as workflowHeader
} from '../src/shared/ai-workflow';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';

function experiment(id: string): SavedExperiment {
  return {
    id,
    name: `Contract ${id}`,
    createdAtIso: '2026-08-13T08:00:00.000Z',
    updatedAtIso: '2026-08-13T08:00:00.000Z',
    scenarioId: 'target-visibility',
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    modelVersions: {},
    predictions: []
  };
}

describe('AI contract registry', () => {
  it('pins the public v1 identities, headers and end markers in one dependency-free registry', () => {
    expect(AI_CONTRACT_REGISTRY).toEqual({
      test: {
        id: 'GGL-AI-TEST', version: 'v1', header: 'GGL-AI-TEST v1',
        endMarker: 'END GGL-AI-TEST', direction: 'ai-to-ggl', authority: 'proposal-only'
      },
      analysis: {
        id: 'GGL-AI-ANALYSIS', version: 'v1', header: 'GGL-AI-ANALYSIS v1',
        endMarker: 'END GGL-AI-ANALYSIS', direction: 'ggl-to-ai', authority: 'deterministic-snapshot'
      },
      comparison: {
        id: 'GGL-AI-COMPARISON', version: 'v1', header: 'GGL-AI-COMPARISON v1',
        endMarker: 'END GGL-AI-COMPARISON', direction: 'ggl-to-ai', authority: 'deterministic-snapshot'
      },
      lineage: {
        id: 'ai-follow-up-lineage', version: 'v1', direction: 'persisted-provenance',
        authority: 'integrity-metadata'
      }
    });
    expect(GGL_AI_TEST_SPEC_VERSION).toBe('v1');
    expect(GGL_AI_TEST_HEADER).toBe('GGL-AI-TEST v1');
    expect(GGL_AI_TEST_END).toBe('END GGL-AI-TEST');
    expect(GGL_AI_ANALYSIS_PACKAGE_VERSION).toBe('v1');
    expect(GGL_AI_ANALYSIS_HEADER).toBe('GGL-AI-ANALYSIS v1');
    expect(GGL_AI_ANALYSIS_END).toBe('END GGL-AI-ANALYSIS');
    expect(GGL_AI_COMPARISON_PACKAGE_VERSION).toBe('v1');
    expect(GGL_AI_COMPARISON_HEADER).toBe('GGL-AI-COMPARISON v1');
    expect(GGL_AI_COMPARISON_END).toBe('END GGL-AI-COMPARISON');
    expect(AI_FOLLOW_UP_LINEAGE_VERSION).toBe('v1');
    expect(AI_ANALYSIS_SNAPSHOT_FORMAT).toBe('GGL-AI-ANALYSIS');
  });

  it('keeps historical facade exports aligned with the registry', () => {
    expect(testFacadeVersion).toBe(GGL_AI_TEST_SPEC_VERSION);
    expect(workflowHeader).toBe(GGL_AI_TEST_HEADER);
    expect(workflowEnd).toBe(GGL_AI_TEST_END);
    expect(analysisFacadeVersion).toBe(GGL_AI_ANALYSIS_PACKAGE_VERSION);
    expect(comparisonFacadeVersion).toBe(GGL_AI_COMPARISON_PACKAGE_VERSION);
    expect(lineageFacadeVersion).toBe(AI_FOLLOW_UP_LINEAGE_VERSION);
  });

  it('keeps generated analysis and comparison package boundaries aligned with the registry', () => {
    const generatedAt = '2026-08-13T09:00:00.000Z';
    const analysis = createAiAnalysisPackage(experiment('one'), generatedAt).split('\\n');
    expect(analysis[0]).toBe(GGL_AI_ANALYSIS_HEADER);
    expect(analysis.at(-1)).toBe(GGL_AI_ANALYSIS_END);

    const comparison = createAiComparisonPackage([experiment('one'), experiment('two')], generatedAt).split('\\n');
    expect(comparison[0]).toBe(GGL_AI_COMPARISON_HEADER);
    expect(comparison.at(-1)).toBe(GGL_AI_COMPARISON_END);
  });
});
""", encoding="utf-8")

fixture_test = ROOT / "tests/ai-contract-fixtures.test.ts"
fixture_test.write_text("""import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAiTestSpec } from '../src/shared/ai-test-spec';
import { extractCanonicalAiTestBlock } from '../src/shared/ai-workflow';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'ai-contracts');

function fixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf-8');
}

describe('GGL AI contract fixture corpus', () => {
  for (const name of ['valid-target-visibility.txt', 'valid-shadow.txt', 'valid-stellar.txt']) {
    it(`accepts canonical valid fixture: ${name}`, () => {
      const extraction = extractCanonicalAiTestBlock(fixture(name));
      expect(extraction.status).toBe('found');
      if (extraction.status !== 'found') return;
      const parsed = parseAiTestSpec(extraction.block);
      expect(parsed.detected).toBe(true);
      expect(parsed.candidates.length).toBeGreaterThan(0);
      expect(parsed.candidates.every((candidate) => candidate.status === 'found')).toBe(true);
    });
  }

  it('rejects multiple canonical blocks instead of choosing one', () => {
    expect(extractCanonicalAiTestBlock(fixture('invalid-multiple-blocks.txt')).status).toBe('ambiguous');
  });

  it('rejects a block with no end marker', () => {
    expect(extractCanonicalAiTestBlock(fixture('invalid-missing-end.txt')).status).toBe('missing');
  });

  it('marks unsupported or out-of-range values for review instead of applying them', () => {
    const extraction = extractCanonicalAiTestBlock(fixture('invalid-values.txt'));
    expect(extraction.status).toBe('found');
    if (extraction.status !== 'found') return;
    const parsed = parseAiTestSpec(extraction.block);
    expect(parsed.detected).toBe(true);
    expect(parsed.candidates.some((candidate) => candidate.status === 'review')).toBe(true);
    expect(parsed.candidates.filter((candidate) => candidate.status === 'review').length).toBeGreaterThanOrEqual(4);
  });

  it('does not silently map an unknown key into an application field', () => {
    const extraction = extractCanonicalAiTestBlock(fixture('invalid-unknown-key.txt'));
    expect(extraction.status).toBe('found');
    if (extraction.status !== 'found') return;
    const parsed = parseAiTestSpec(extraction.block);
    expect(parsed.candidates.map((candidate) => candidate.fieldId)).toEqual(['scenarioId']);
    expect(parsed.notes.some((note) => note.includes('tanınmıyor'))).toBe(true);
  });
});
""", encoding="utf-8")

doc = ROOT / "docs/ai-contracts.md"
doc.write_text("""# GGL AI sözleşme registry ve fixture politikası

GGL'nin dış AI çalışma döngüsünde kullanılan wire sözleşmelerinin kimlik ve sürümleri `src/shared/ai-contracts.ts` içinde tek merkezde tutulur.

Registry şu yüzeyleri sabitler:

- `GGL-AI-TEST v1`: dış AI'den GGL'ye yalnız öneri girdisi; fail-closed extractor + parser + kullanıcı önizlemesi olmadan uygulanmaz.
- `GGL-AI-ANALYSIS v1`: GGL'nin deterministik tek-deney snapshot paketi.
- `GGL-AI-COMPARISON v1`: GGL'nin deterministik çoklu-deney karşılaştırma paketi.
- `ai-follow-up-lineage v1`: analiz/test hashleri ve opsiyonel deterministik analiz snapshot kanıtı için persisted provenance sürümü.

## Uyumluluk kuralı

Mevcut `v1` kimliği altında header, end marker, alan anlamı, birim veya fail-closed kabul/red davranışı sessizce değiştirilmemelidir. Böyle bir değişiklik gerekirse önce mevcut fixture/test etkisi görünür hale getirilmeli, geriye uyumluluk kararı açıkça verilmelidir.

Eski modüllerdeki public constant exportları korunur; bunlar registry değerlerini yeniden export eder. Böylece contributor import yolları kırılmaz.

## Fixture corpus

`tests/fixtures/ai-contracts/` altında hem kabul edilmesi gereken hem reddedilmesi/incelemeye düşmesi gereken örnekler bulunur. `tests/ai-contract-fixtures.test.ts` şu güvenlik davranışlarını sabitler:

- tek kanonik geçerli blok kabul edilir,
- birden fazla blokta GGL seçim yapmaz,
- eksik kapanış uygulanmaz,
- geçersiz/out-of-range değerler `review` olur,
- bilinmeyen anahtar sessizce başka uygulama alanına eşlenmez.

`tests/ai-contract-registry.test.ts` ayrıca tarihsel facade exportlarının registry ile aynı kaldığını ve GGL'nin ürettiği ANALYSIS/COMPARISON paket sınırlarının registry header/end markerlarıyla eşleştiğini doğrular.

Bu testler AI'nin bilimsel yorumunun doğruluğunu test etmez. Amaç protokol ve güven sınırlarının insan veya kodlama ajanı refactorları sırasında yanlışlıkla değişmesini yakalamaktır.
""", encoding="utf-8")

playbook = ROOT / "docs/ai-development.md"
replace_once(
    playbook,
    "| AI test sözleşmesi | `src/shared/ai-test-spec.ts`, `docs/ai-test-spec-v1.md` |\n| AI analiz paketi | `src/shared/ai-analysis-package.ts` |\n",
    "| AI sözleşme registry | `src/shared/ai-contracts.ts`, `docs/ai-contracts.md` |\n| AI test sözleşmesi | `src/shared/ai-test-spec.ts`, `docs/ai-test-spec-v1.md`, `tests/fixtures/ai-contracts/` |\n| AI analiz paketi | `src/shared/ai-analysis-package.ts` |\n"
)
replace_once(
    playbook,
    "- canonical metin/hash semantiği değişiyor mu?\n- lineage ve HTML raporu etkileniyor mu?",
    "- canonical metin/hash semantiği değişiyor mu?\n- `src/shared/ai-contracts.ts` registry ve canonical fixture corpus etkileniyor mu?\n- lineage ve HTML raporu etkileniyor mu?"
)

print("AI contract registry + fixture corpus applied successfully.")
print("Created:")
for path in [
    contracts,
    registry_test,
    fixture_test,
    doc,
    *sorted(fixture_dir.glob('*.txt')),
]:
    print(f"  - {path.relative_to(ROOT)}")
print("Updated:")
for path in [workflow, test_spec, analysis, lineage, playbook]:
    print(f"  - {path.relative_to(ROOT)}")
