#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_expected(path: str, old: str, new: str, expected: int, marker: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    if marker in text:
        print(f'[ok] {path}: already applied ({marker})')
        return
    count = text.count(old)
    if count != expected:
        raise RuntimeError(f'{path}: expected {expected} replacement(s) for {marker}, found {count}')
    target.write_text(text.replace(old, new), encoding='utf-8')
    print(f'[updated] {path}: {marker}')


def write_new(path: str, content: str) -> None:
    target = ROOT / path
    if target.exists():
        if target.read_text(encoding='utf-8') == content:
            print(f'[ok] {path}: already exists')
            return
        raise RuntimeError(f'{path}: file already exists with different content')
    target.write_text(content, encoding='utf-8')
    print(f'[created] {path}')


# Shared text setup contract.
replace_expected(
    'src/shared/text-experiment-setup.ts',
    "import type { AtmosphereMode } from './atmosphere';\n",
    "import type { AtmosphereMode } from './atmosphere';\nimport { AI_TEST_SPEC_SCENARIOS, parseAiTestSpec } from './ai-test-spec';\n",
    1,
    "parseAiTestSpec } from './ai-test-spec'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.1.0';",
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.2.0';",
    1,
    "TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.2.0'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """export type ExperimentSetupFieldId =
  | 'scenarioId'
  | 'surfaceDistanceKm'
""",
    """export type ExperimentSetupFieldId =
  | 'scenarioId'
  | 'experimentName'
  | 'observedAtUtc'
  | 'utcOffsetMinutes'
  | 'surfaceDistanceKm'
""",
    1,
    "| 'observedAtUtc'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """export interface ExperimentSetupApplication {
  scenarioId?: SimulationScenarioId;
  inputChanges: Partial<SimulatorInputs>;
""",
    """export interface ExperimentSetupApplication {
  scenarioId?: SimulationScenarioId;
  experimentName?: string;
  observedAtIso?: string;
  utcOffsetMinutes?: number;
  inputChanges: Partial<SimulatorInputs>;
""",
    1,
    'utcOffsetMinutes?: number;'
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  const raw: RawCandidate[] = [];
  const notes: string[] = [];

  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [
""",
    """  const raw: RawCandidate[] = [];
  const notes: string[] = [];
  const aiSpec = parseAiTestSpec(text);
  raw.push(...aiSpec.candidates);
  notes.push(...aiSpec.notes);

  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [
""",
    1,
    'const aiSpec = parseAiTestSpec(text);'
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [
    ['ufuk analizi', 'horizon', 'Ufuk Analizi'],
    ['uzun mesafe görüş', 'long-distance-visibility', 'Uzun Mesafe Görüş'],
    ['hedef görünürlüğü', 'target-visibility', 'Hedef Görünürlüğü']
  ];
""",
    """  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [
    ['ufuk analizi', 'horizon', 'Ufuk Analizi'],
    ['uzun mesafe görüş', 'long-distance-visibility', 'Uzun Mesafe Görüş'],
    ['hedef görünürlüğü', 'target-visibility', 'Hedef Görünürlüğü'],
    ['güneş ve ay gözlemleri', 'sun-moon-observation', 'Güneş ve Ay Gözlemleri'],
    ['gölge deneyi', 'shadow-observation', 'Gölge Deneyi'],
    ['yıldız gözlemleri', 'stellar-observation', 'Yıldız Gözlemleri'],
    ['tutulma simülasyonları', 'eclipse-simulation', 'Tutulma Simülasyonları']
  ];
""",
    1,
    "['tutulma simülasyonları', 'eclipse-simulation'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  let scenarioId: SimulationScenarioId | undefined;
  let atmosphereMode: AtmosphereMode | undefined;
  let coordinateApplied = false;
""",
    """  let scenarioId: SimulationScenarioId | undefined;
  let experimentName: string | undefined;
  let observedAtIso: string | undefined;
  let utcOffsetMinutes: number | undefined;
  let atmosphereMode: AtmosphereMode | undefined;
  let coordinateApplied = false;
""",
    1,
    'let experimentName: string | undefined;'
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """      case 'scenarioId':
        if (candidate.stringValue === 'target-visibility' || candidate.stringValue === 'horizon' || candidate.stringValue === 'long-distance-visibility') scenarioId = candidate.stringValue;
        break;
      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;
""",
    """      case 'scenarioId':
        if (candidate.stringValue && AI_TEST_SPEC_SCENARIOS.includes(candidate.stringValue as SimulationScenarioId)) scenarioId = candidate.stringValue as SimulationScenarioId;
        break;
      case 'experimentName': if (candidate.stringValue) experimentName = candidate.stringValue; break;
      case 'observedAtUtc': if (candidate.stringValue) observedAtIso = candidate.stringValue; break;
      case 'utcOffsetMinutes': if (value !== undefined) utcOffsetMinutes = value; break;
      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;
""",
    1,
    "case 'observedAtUtc'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  return {
    ...(scenarioId ? { scenarioId } : {}),
    inputChanges,
""",
    """  return {
    ...(scenarioId ? { scenarioId } : {}),
    ...(experimentName ? { experimentName } : {}),
    ...(observedAtIso ? { observedAtIso } : {}),
    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
    inputChanges,
""",
    1,
    '...(observedAtIso ? { observedAtIso } : {})'
)

# Preview dialog: the same current-value shape occurs twice (helper argument + component props).
replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """const trNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 });

const scenarioLabels""",
    """const trNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 });

function utcOffsetLabel(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

const scenarioLabels""",
    1,
    'function utcOffsetLabel(totalMinutes: number)'
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """    scenarioId: SimulationScenarioId;
    inputs: SimulatorInputs;
    atmosphereMode: AtmosphereMode;
""",
    """    scenarioId: SimulationScenarioId;
    experimentName: string;
    observedAtIso: string;
    utcOffsetMinutes: number;
    inputs: SimulatorInputs;
    atmosphereMode: AtmosphereMode;
""",
    1,
    'observedAtIso: string;'
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  switch (fieldId) {
    case 'scenarioId': return scenarioLabels[current.scenarioId];
    case 'surfaceDistanceKm':""",
    """  switch (fieldId) {
    case 'scenarioId': return scenarioLabels[current.scenarioId];
    case 'experimentName': return current.experimentName || 'Adsız / yeni deney';
    case 'observedAtUtc': return new Date(current.observedAtIso).toISOString();
    case 'utcOffsetMinutes': return utcOffsetLabel(current.utcOffsetMinutes);
    case 'surfaceDistanceKm':""",
    1,
    "case 'observedAtUtc'"
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  scenarioId,
  inputs,
  atmosphereMode,
""",
    """  scenarioId,
  experimentName,
  observedAtIso,
  utcOffsetMinutes,
  inputs,
  atmosphereMode,
""",
    1,
    'experimentName,\n  observedAtIso,\n  utcOffsetMinutes,'
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  scenarioId: SimulationScenarioId;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
""",
    """  scenarioId: SimulationScenarioId;
  experimentName: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
""",
    1,
    'experimentName: string;\n  observedAtIso: string;'
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    "  const current = { scenarioId, inputs, atmosphereMode, modelUncertainty };",
    "  const current = { scenarioId, experimentName, observedAtIso, utcOffsetMinutes, inputs, atmosphereMode, modelUncertainty };",
    1,
    'const current = { scenarioId, experimentName, observedAtIso, utcOffsetMinutes'
)

replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """            Gözlem notunu normal cümlelerle yaz. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
""",
    """            Gözlem notunu normal cümlelerle yaz veya başka bir AI'nin ürettiği <code>GGL-AI-TEST v1</code> bloğunu doğrudan yapıştır. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;
            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>
""",
    1,
    '<code>GGL-AI-TEST v1</code>'
)

# AppNext applies explicit identity/time fields after scenario reset so the text values win.
replace_expected(
    'src/renderer/src/AppNext.tsx',
    """    setInputs((current) => ({ ...current, ...application.inputChanges }));
    if (application.atmosphereMode) {
      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));
    }
    setIsDirty(true);
""",
    """    setInputs((current) => ({ ...current, ...application.inputChanges }));
    if (application.atmosphereMode) {
      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));
    }
    if (application.experimentName !== undefined) setActiveExperimentName(application.experimentName);
    if (application.observedAtIso !== undefined) setExperimentObservedAtIso(application.observedAtIso);
    if (application.utcOffsetMinutes !== undefined) setObservationUtcOffsetMinutes(application.utcOffsetMinutes);
    setIsDirty(true);
""",
    1,
    'if (application.observedAtIso !== undefined)'
)

replace_expected(
    'src/renderer/src/AppNext.tsx',
    """      <TextExperimentSetupDialog
        open={textSetupOpen}
        scenarioId={activeScenarioId}
        inputs={inputs}
""",
    """      <TextExperimentSetupDialog
        open={textSetupOpen}
        scenarioId={activeScenarioId}
        experimentName={activeExperimentName}
        observedAtIso={experimentObservedAtIso}
        utcOffsetMinutes={observationUtcOffsetMinutes}
        inputs={inputs}
""",
    1,
    'utcOffsetMinutes={observationUtcOffsetMinutes}'
)

# Version bump.
replace_expected('package.json', '"version": "1.27.0"', '"version": "1.28.0"', 1, '"version": "1.28.0"')
replace_expected("src/preload/index.ts", "version: '1.27.0'", "version: '1.28.0'", 1, "version: '1.28.0'")

# Focused integration tests; legacy natural-language tests remain untouched.
test_content = '''import { describe, expect, it } from 'vitest';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText
} from '../src/shared/text-experiment-setup';

function candidate(text: string, fieldId: string) {
  return parseExperimentSetupText(text).candidates.find((item) => item.fieldId === fieldId);
}

const DALLAS = `GGL-AI-TEST v1
scenario: sun-moon-observation
name: 8 Nisan 2024 Dallas Güneş-Ay geometrisi
observed_at_utc: 2024-04-08T18:42:00Z
utc_offset: +00:00
observer.coordinates: 32.7767,-96.7970
target.coordinates: 32.7767,-66.7970
END GGL-AI-TEST`;

describe('GGL-AI-TEST v1 integration', () => {
  it('parses astronomy identity, time and coordinates and builds an application', () => {
    const draft = parseExperimentSetupText(DALLAS);
    expect(candidate(DALLAS, 'scenarioId')?.stringValue).toBe('sun-moon-observation');
    expect(candidate(DALLAS, 'experimentName')?.stringValue).toContain('Dallas');
    expect(candidate(DALLAS, 'observedAtUtc')?.stringValue).toBe('2024-04-08T18:42:00.000Z');
    expect(candidate(DALLAS, 'utcOffsetMinutes')?.numericValue).toBe(0);
    expect(candidate(DALLAS, 'observerCoordinates')?.latitudeDeg).toBeCloseTo(32.7767);
    expect(candidate(DALLAS, 'targetCoordinates')?.longitudeDeg).toBeCloseTo(-66.7970);

    const selected = draft.candidates.filter((item) => item.status === 'found').map((item) => item.id);
    const application = buildExperimentSetupApplication(draft, selected, '2026-08-11T10:00:00.000Z');
    expect(application.scenarioId).toBe('sun-moon-observation');
    expect(application.experimentName).toContain('Dallas');
    expect(application.observedAtIso).toBe('2024-04-08T18:42:00.000Z');
    expect(application.utcOffsetMinutes).toBe(0);
    expect(application.inputChanges.distanceSource).toBe('coordinates');
    expect(application.inputChanges.observerLatitudeDeg).toBeCloseTo(32.7767);
    expect(application.inputChanges.targetLongitudeDeg).toBeCloseTo(-66.7970);
  });

  it('accepts every current scenario id in the canonical contract', () => {
    const scenarios = [
      'target-visibility', 'horizon', 'long-distance-visibility', 'sun-moon-observation',
      'shadow-observation', 'stellar-observation', 'eclipse-simulation'
    ];
    for (const scenario of scenarios) {
      const text = `GGL-AI-TEST v1\nscenario: ${scenario}\nEND GGL-AI-TEST`;
      expect(candidate(text, 'scenarioId')?.status).toBe('found');
      expect(candidate(text, 'scenarioId')?.stringValue).toBe(scenario);
    }
  });

  it('fails closed for non-Z timestamps and invalid UTC offsets', () => {
    const text = `GGL-AI-TEST v1
observed_at_utc: 2024-04-08T18:42:00+03:00
utc_offset: +15:00
END GGL-AI-TEST`;
    expect(candidate(text, 'observedAtUtc')?.status).toBe('review');
    expect(candidate(text, 'utcOffsetMinutes')?.status).toBe('review');
  });

  it('reports unknown keys instead of silently applying them', () => {
    const draft = parseExperimentSetupText(`GGL-AI-TEST v1
scenario: horizon
magic_curve: 42
END GGL-AI-TEST`);
    expect(draft.notes.some((note) => note.includes('magic_curve'))).toBe(true);
  });

  it('marks conflicting canonical values for the same field as review', () => {
    const text = `GGL-AI-TEST v1
surface_distance_km: 20
surface_distance_km: 22
END GGL-AI-TEST`;
    const distance = candidate(text, 'surfaceDistanceKm');
    expect(distance?.status).toBe('review');
    expect(distance?.reason).toContain('çelişen');
  });

  it('keeps profile atmosphere mode review-only because source data is missing', () => {
    const text = `GGL-AI-TEST v1
atmosphere_mode: profile
END GGL-AI-TEST`;
    const atmosphere = candidate(text, 'atmosphereMode');
    expect(atmosphere?.status).toBe('review');
    expect(atmosphere?.reason).toContain('provenans');
  });
});
'''
write_new('tests/ai-test-spec-v1.test.ts', test_content)

print('Stage 8.1 AI test spec integration applied successfully.')
