#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, marker: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    if marker in text:
        print(f'[ok] {path}: already applied ({marker})')
        return
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one replacement for {marker}, found {count}')
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


# 1) Extend the deterministic text setup contract with AI-friendly identity/time fields.
replace_once(
    'src/shared/text-experiment-setup.ts',
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.1.0';",
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.2.0';",
    "TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.2.0'"
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """export type ExperimentSetupFieldId =\n  | 'scenarioId'\n  | 'surfaceDistanceKm'\n""",
    """export type ExperimentSetupFieldId =\n  | 'scenarioId'\n  | 'experimentName'\n  | 'observedAtUtc'\n  | 'utcOffsetMinutes'\n  | 'surfaceDistanceKm'\n""",
    "| 'observedAtUtc'"
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """export interface ExperimentSetupApplication {\n  scenarioId?: SimulationScenarioId;\n  inputChanges: Partial<SimulatorInputs>;\n""",
    """export interface ExperimentSetupApplication {\n  scenarioId?: SimulationScenarioId;\n  experimentName?: string;\n  observedAtIso?: string;\n  utcOffsetMinutes?: number;\n  inputChanges: Partial<SimulatorInputs>;\n""",
    'utcOffsetMinutes?: number;'
)

canonical_helpers = r'''const AI_SPEC_HEADER = /^GGL-AI-TEST\s+v1$/iu;
const AI_SPEC_END = /^END\s+GGL-AI-TEST$/iu;

const AI_SPEC_KEYS = new Set([
  'scenario',
  'name',
  'observed_at_utc',
  'utc_offset',
  'surface_distance_km',
  'observer.coordinates',
  'observer.eye_height_m',
  'observer.ground_elevation_m',
  'target.coordinates',
  'target.height_m',
  'target.ground_elevation_m',
  'observed_visible_percent',
  'observation_uncertainty_percent',
  'vertical_datum',
  'vertical_datum_offset_m',
  'atmosphere_mode',
  'refraction_k',
  'uncertainty.surface_distance_m',
  'uncertainty.observer_eye_height_m',
  'uncertainty.observer_ground_elevation_m',
  'uncertainty.target_height_m',
  'uncertainty.target_ground_elevation_m',
  'uncertainty.refraction_k'
]);

const ALL_SCENARIO_IDS: readonly SimulationScenarioId[] = [
  'target-visibility',
  'horizon',
  'long-distance-visibility',
  'sun-moon-observation',
  'shadow-observation',
  'stellar-observation',
  'eclipse-simulation'
];

function canonicalLineCandidate(
  target: RawCandidate[],
  fieldId: ExperimentSetupFieldId,
  label: string,
  sourceExcerpt: string,
  displayValue: string,
  options: {
    status?: ExperimentSetupCandidateStatus;
    numericValue?: number;
    stringValue?: string;
    latitudeDeg?: number;
    longitudeDeg?: number;
    reason?: string;
  } = {}
): void {
  target.push({
    fieldId,
    label,
    status: options.status ?? 'found',
    displayValue,
    sourceExcerpt,
    ...(options.numericValue !== undefined ? { numericValue: options.numericValue } : {}),
    ...(options.stringValue !== undefined ? { stringValue: options.stringValue } : {}),
    ...(options.latitudeDeg !== undefined ? { latitudeDeg: options.latitudeDeg } : {}),
    ...(options.longitudeDeg !== undefined ? { longitudeDeg: options.longitudeDeg } : {}),
    ...(options.reason ? { reason: options.reason } : {})
  });
}

function parseCanonicalCoordinate(value: string): { latitudeDeg: number; longitudeDeg: number } | undefined {
  const match = /^\s*([-+]?\d+(?:[.,]\d+)?)\s*,\s*([-+]?\d+(?:[.,]\d+)?)\s*$/u.exec(value);
  if (!match) return undefined;
  const latitudeDeg = parseNumber(match[1]!);
  const longitudeDeg = parseNumber(match[2]!);
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg) ||
      latitudeDeg < -90 || latitudeDeg > 90 || longitudeDeg < -180 || longitudeDeg > 180) return undefined;
  return { latitudeDeg, longitudeDeg };
}

function parseCanonicalUtcOffset(value: string): number | undefined {
  const match = /^([+-])(\d{2}):(\d{2})$/u.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return undefined;
  const total = hours * 60 + minutes;
  return match[1] === '-' ? -total : total;
}

function formatCanonicalUtcOffset(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function addCanonicalNumber(
  target: RawCandidate[],
  fieldId: ExperimentSetupFieldId,
  label: string,
  line: string,
  rawValue: string,
  validate: (value: number) => boolean,
  display: (value: number) => string
): void {
  const value = parseNumber(rawValue.trim());
  const valid = Number.isFinite(value) && validate(value);
  canonicalLineCandidate(target, fieldId, label, line, valid ? display(value) : rawValue.trim(), {
    status: valid ? 'found' : 'review',
    ...(valid ? { numericValue: value } : {}),
    ...(!valid ? { reason: 'GGL-AI-TEST değeri desteklenen aralıkta geçerli bir sayı değil.' } : {})
  });
}

function parseCanonicalAiSpec(target: RawCandidate[], notes: string[], text: string): void {
  const lines = text.split(/\r?\n/u).map((line) => line.trim());
  const headerIndexes = lines.flatMap((line, index) => AI_SPEC_HEADER.test(line) ? [index] : []);
  if (headerIndexes.length === 0) return;
  if (headerIndexes.length > 1) notes.push('Birden fazla GGL-AI-TEST v1 bloğu bulundu; yalnız ilk blok ayrıştırıldı.');
  const start = headerIndexes[0]!;
  const relativeEnd = lines.slice(start + 1).findIndex((line) => AI_SPEC_END.test(line));
  if (relativeEnd < 0) {
    notes.push('GGL-AI-TEST v1 başlangıcı bulundu ancak END GGL-AI-TEST satırı eksik; kanonik blok uygulanmadı.');
    return;
  }
  const end = start + 1 + relativeEnd;
  notes.push('GGL-AI-TEST v1 kanonik bloğu bulundu; alanlar deterministik anahtar sözleşmesiyle ayrıştırıldı.');

  for (const line of lines.slice(start + 1, end)) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator <= 0) {
      notes.push(`GGL-AI-TEST satırı anahtar:değer biçiminde değil: “${line}”`);
      continue;
    }
    const key = line.slice(0, separator).trim().toLocaleLowerCase('en-US');
    const value = line.slice(separator + 1).trim();
    if (!AI_SPEC_KEYS.has(key)) {
      notes.push(`GGL-AI-TEST v1 anahtarı tanınmıyor ve uygulanmadı: ${key}`);
      continue;
    }

    switch (key) {
      case 'scenario': {
        const scenario = value as SimulationScenarioId;
        const valid = ALL_SCENARIO_IDS.includes(scenario);
        canonicalLineCandidate(target, 'scenarioId', 'Senaryo', line, valid ? value : `Geçersiz: ${value}`, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: scenario } : {}),
          ...(!valid ? { reason: 'Desteklenen GGL senaryo kimliklerinden biri kullanılmalı.' } : {})
        });
        break;
      }
      case 'name': {
        const valid = value.length > 0 && value.length <= 120;
        canonicalLineCandidate(target, 'experimentName', 'Deney adı', line, value || '—', {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'Deney adı 1–120 karakter arasında olmalı.' } : {})
        });
        break;
      }
      case 'observed_at_utc': {
        const date = new Date(value);
        const valid = value.endsWith('Z') && Number.isFinite(date.getTime());
        canonicalLineCandidate(target, 'observedAtUtc', 'Gözlem anı · UTC', line, valid ? date.toISOString() : value, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: date.toISOString() } : {}),
          ...(!valid ? { reason: 'observed_at_utc geçerli ISO-8601 UTC zamanı olmalı ve Z ile bitmelidir.' } : {})
        });
        break;
      }
      case 'utc_offset': {
        const offset = parseCanonicalUtcOffset(value);
        canonicalLineCandidate(target, 'utcOffsetMinutes', 'UTC ofseti', line, offset === undefined ? value : formatCanonicalUtcOffset(offset), {
          status: offset === undefined ? 'review' : 'found',
          ...(offset !== undefined ? { numericValue: offset } : {}),
          ...(offset === undefined ? { reason: 'utc_offset +HH:MM veya -HH:MM biçiminde ve ±14:00 aralığında olmalı.' } : {})
        });
        break;
      }
      case 'observer.coordinates':
      case 'target.coordinates': {
        const coordinate = parseCanonicalCoordinate(value);
        const fieldId = key === 'observer.coordinates' ? 'observerCoordinates' : 'targetCoordinates';
        canonicalLineCandidate(target, fieldId, key === 'observer.coordinates' ? 'Gözlemci koordinatı' : 'Hedef / B koordinatı', line, coordinate
          ? `${trNumber(coordinate.latitudeDeg, 6)}°, ${trNumber(coordinate.longitudeDeg, 6)}°`
          : value, {
          status: coordinate ? 'found' : 'review',
          ...(coordinate ?? {}),
          ...(!coordinate ? { reason: 'Koordinat enlem,boylam biçiminde ve WGS84 aralığında olmalı.' } : {})
        });
        break;
      }
      case 'surface_distance_km': addCanonicalNumber(target, 'surfaceDistanceKm', 'Yüzey mesafesi', line, value, (v) => v >= 0 && v <= 20_000, (v) => `${trNumber(v)} km`); break;
      case 'observer.eye_height_m': addCanonicalNumber(target, 'observerHeightM', 'Göz yüksekliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `${trNumber(v)} m`); break;
      case 'observer.ground_elevation_m': addCanonicalNumber(target, 'observerGroundElevationM', 'Gözlemci zemin kotu', line, value, (v) => v >= -12_000 && v <= 100_000, (v) => `${trNumber(v)} m`); break;
      case 'target.height_m': addCanonicalNumber(target, 'targetHeightM', 'Hedef yüksekliği', line, value, (v) => v > 0 && v <= 100_000, (v) => `${trNumber(v)} m`); break;
      case 'target.ground_elevation_m': addCanonicalNumber(target, 'targetGroundElevationM', 'Hedef taban kotu', line, value, (v) => v >= -12_000 && v <= 100_000, (v) => `${trNumber(v)} m`); break;
      case 'observed_visible_percent': addCanonicalNumber(target, 'observedVisiblePercent', 'Gözlenen görünürlük', line, value, (v) => v >= 0 && v <= 100, (v) => `%${trNumber(v)}`); break;
      case 'observation_uncertainty_percent': addCanonicalNumber(target, 'observationUncertaintyPercent', 'Gözlem belirsizliği', line, value, (v) => v >= 0 && v <= 100, (v) => `±%${trNumber(v)}`); break;
      case 'vertical_datum': {
        const valid = value === 'orthometric-msl' || value === 'ellipsoidal-wgs84' || value === 'local';
        const display = value === 'orthometric-msl' ? 'Ortalama deniz seviyesi' : value === 'ellipsoidal-wgs84' ? 'WGS84 elipsoidal' : value === 'local' ? 'Yerel düşey referans' : value;
        canonicalLineCandidate(target, 'verticalDatumKind', 'Düşey datum', line, display, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'vertical_datum desteklenen enum değerlerinden biri olmalı.' } : {})
        });
        break;
      }
      case 'vertical_datum_offset_m': addCanonicalNumber(target, 'verticalDatumOffsetM', 'Datum / gelgit ofseti', line, value, (v) => v >= -1_000 && v <= 1_000, (v) => `${trNumber(v)} m`); break;
      case 'atmosphere_mode': {
        const valid = value === 'off' || value === 'standard' || value === 'profile';
        const profile = value === 'profile';
        canonicalLineCandidate(target, 'atmosphereMode', 'Atmosfer modu', line, value, {
          status: !valid || profile ? 'review' : 'found',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'atmosphere_mode off, standard veya profile olmalı.' } : {}),
          ...(profile ? { reason: 'Katmanlı profil veri ve provenans gerektirir; v1 metin taslağından otomatik uygulanmaz.' } : {})
        });
        break;
      }
      case 'refraction_k': addCanonicalNumber(target, 'refractionCoefficient', 'Kırılma katsayısı k', line, value, (v) => v >= -1 && v <= 0.99, (v) => `k=${trNumber(v, 4)}`); break;
      case 'uncertainty.surface_distance_m': addCanonicalNumber(target, 'surfaceDistanceUncertaintyM', 'Mesafe belirsizliği', line, value, (v) => v >= 0 && v <= 20_000_000, (v) => `±${trNumber(v)} m`); break;
      case 'uncertainty.observer_eye_height_m': addCanonicalNumber(target, 'observerEyeHeightUncertaintyM', 'Göz yüksekliği belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`); break;
      case 'uncertainty.observer_ground_elevation_m': addCanonicalNumber(target, 'observerGroundElevationUncertaintyM', 'Gözlemci zemin kotu belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`); break;
      case 'uncertainty.target_height_m': addCanonicalNumber(target, 'targetHeightUncertaintyM', 'Hedef yüksekliği belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`); break;
      case 'uncertainty.target_ground_elevation_m': addCanonicalNumber(target, 'targetGroundElevationUncertaintyM', 'Hedef taban kotu belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`); break;
      case 'uncertainty.refraction_k': addCanonicalNumber(target, 'refractionCoefficientUncertainty', 'k belirsizliği', line, value, (v) => v >= 0 && v <= 2, (v) => `±${trNumber(v, 4)}`); break;
      default: break;
    }
  }
}

'''
replace_once(
    'src/shared/text-experiment-setup.ts',
    'function parseCoordinatePair(\n',
    canonical_helpers + 'function parseCoordinatePair(\n',
    'const AI_SPEC_HEADER = /^GGL-AI-TEST'
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """  const raw: RawCandidate[] = [];\n  const notes: string[] = [];\n\n  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [\n""",
    """  const raw: RawCandidate[] = [];\n  const notes: string[] = [];\n\n  parseCanonicalAiSpec(raw, notes, text);\n\n  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [\n""",
    'parseCanonicalAiSpec(raw, notes, text);'
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [\n    ['ufuk analizi', 'horizon', 'Ufuk Analizi'],\n    ['uzun mesafe görüş', 'long-distance-visibility', 'Uzun Mesafe Görüş'],\n    ['hedef görünürlüğü', 'target-visibility', 'Hedef Görünürlüğü']\n  ];\n""",
    """  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [\n    ['ufuk analizi', 'horizon', 'Ufuk Analizi'],\n    ['uzun mesafe görüş', 'long-distance-visibility', 'Uzun Mesafe Görüş'],\n    ['hedef görünürlüğü', 'target-visibility', 'Hedef Görünürlüğü'],\n    ['güneş ve ay gözlemleri', 'sun-moon-observation', 'Güneş ve Ay Gözlemleri'],\n    ['gölge deneyi', 'shadow-observation', 'Gölge Deneyi'],\n    ['yıldız gözlemleri', 'stellar-observation', 'Yıldız Gözlemleri'],\n    ['tutulma simülasyonları', 'eclipse-simulation', 'Tutulma Simülasyonları']\n  ];\n""",
    "['tutulma simülasyonları', 'eclipse-simulation'"
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """  let scenarioId: SimulationScenarioId | undefined;\n  let atmosphereMode: AtmosphereMode | undefined;\n  let coordinateApplied = false;\n""",
    """  let scenarioId: SimulationScenarioId | undefined;\n  let experimentName: string | undefined;\n  let observedAtIso: string | undefined;\n  let utcOffsetMinutes: number | undefined;\n  let atmosphereMode: AtmosphereMode | undefined;\n  let coordinateApplied = false;\n""",
    'let experimentName: string | undefined;'
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """      case 'scenarioId':\n        if (candidate.stringValue === 'target-visibility' || candidate.stringValue === 'horizon' || candidate.stringValue === 'long-distance-visibility') scenarioId = candidate.stringValue;\n        break;\n      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;\n""",
    """      case 'scenarioId':\n        if (candidate.stringValue && ALL_SCENARIO_IDS.includes(candidate.stringValue as SimulationScenarioId)) scenarioId = candidate.stringValue as SimulationScenarioId;\n        break;\n      case 'experimentName': if (candidate.stringValue) experimentName = candidate.stringValue; break;\n      case 'observedAtUtc': if (candidate.stringValue) observedAtIso = candidate.stringValue; break;\n      case 'utcOffsetMinutes': if (value !== undefined) utcOffsetMinutes = value; break;\n      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;\n""",
    "case 'observedAtUtc'"
)

replace_once(
    'src/shared/text-experiment-setup.ts',
    """  return {\n    ...(scenarioId ? { scenarioId } : {}),\n    inputChanges,\n""",
    """  return {\n    ...(scenarioId ? { scenarioId } : {}),\n    ...(experimentName ? { experimentName } : {}),\n    ...(observedAtIso ? { observedAtIso } : {}),\n    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),\n    inputChanges,\n""",
    '...(observedAtIso ? { observedAtIso } : {})'
)

# 2) Preview identity/time fields alongside current experiment values.
replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """const trNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 });\n\nconst scenarioLabels""",
    """const trNumber = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 6 });\n\nfunction utcOffsetLabel(totalMinutes: number): string {\n  const sign = totalMinutes < 0 ? '-' : '+';\n  const absolute = Math.abs(totalMinutes);\n  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;\n}\n\nconst scenarioLabels""",
    'function utcOffsetLabel(totalMinutes: number)'
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """    scenarioId: SimulationScenarioId;\n    inputs: SimulatorInputs;\n    atmosphereMode: AtmosphereMode;\n""",
    """    scenarioId: SimulationScenarioId;\n    experimentName: string;\n    observedAtIso: string;\n    utcOffsetMinutes: number;\n    inputs: SimulatorInputs;\n    atmosphereMode: AtmosphereMode;\n""",
    'utcOffsetMinutes: number;'
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  switch (fieldId) {\n    case 'scenarioId': return scenarioLabels[current.scenarioId];\n    case 'surfaceDistanceKm':""",
    """  switch (fieldId) {\n    case 'scenarioId': return scenarioLabels[current.scenarioId];\n    case 'experimentName': return current.experimentName || 'Adsız / yeni deney';\n    case 'observedAtUtc': return new Date(current.observedAtIso).toISOString();\n    case 'utcOffsetMinutes': return utcOffsetLabel(current.utcOffsetMinutes);\n    case 'surfaceDistanceKm':""",
    "case 'observedAtUtc'"
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  scenarioId,\n  inputs,\n  atmosphereMode,\n""",
    """  scenarioId,\n  experimentName,\n  observedAtIso,\n  utcOffsetMinutes,\n  inputs,\n  atmosphereMode,\n""",
    'experimentName,\n  observedAtIso,\n  utcOffsetMinutes,'
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  scenarioId: SimulationScenarioId;\n  inputs: SimulatorInputs;\n  atmosphereMode: AtmosphereMode;\n""",
    """  scenarioId: SimulationScenarioId;\n  experimentName: string;\n  observedAtIso: string;\n  utcOffsetMinutes: number;\n  inputs: SimulatorInputs;\n  atmosphereMode: AtmosphereMode;\n""",
    'experimentName: string;\n  observedAtIso: string;'
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """  const current = { scenarioId, inputs, atmosphereMode, modelUncertainty };\n""",
    """  const current = { scenarioId, experimentName, observedAtIso, utcOffsetMinutes, inputs, atmosphereMode, modelUncertainty };\n""",
    'const current = { scenarioId, experimentName, observedAtIso, utcOffsetMinutes'
)

replace_once(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """            Gözlem notunu normal cümlelerle yaz. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;\n            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>\n""",
    """            Gözlem notunu normal cümlelerle yaz veya başka bir AI'nin ürettiği <code>GGL-AI-TEST v1</code> bloğunu doğrudan yapıştır. Sistem yalnız güvenle eşleyebildiği değerleri taslağa çıkarır;\n            <b> hiçbir alan önizleme ve onay olmadan değişmez.</b>\n""",
    '<code>GGL-AI-TEST v1</code>'
)

# 3) AppNext applies the new identity/time fields after scenario reset, so explicit AI values win safely.
replace_once(
    'src/renderer/src/AppNext.tsx',
    """    setInputs((current) => ({ ...current, ...application.inputChanges }));\n    if (application.atmosphereMode) {\n      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));\n    }\n    setIsDirty(true);\n""",
    """    setInputs((current) => ({ ...current, ...application.inputChanges }));\n    if (application.atmosphereMode) {\n      setAtmosphereState((current) => ({ ...current, mode: application.atmosphereMode! }));\n    }\n    if (application.experimentName !== undefined) setActiveExperimentName(application.experimentName);\n    if (application.observedAtIso !== undefined) setExperimentObservedAtIso(application.observedAtIso);\n    if (application.utcOffsetMinutes !== undefined) setObservationUtcOffsetMinutes(application.utcOffsetMinutes);\n    setIsDirty(true);\n""",
    'if (application.observedAtIso !== undefined)'
)

replace_once(
    'src/renderer/src/AppNext.tsx',
    """      <TextExperimentSetupDialog\n        open={textSetupOpen}\n        scenarioId={activeScenarioId}\n        inputs={inputs}\n""",
    """      <TextExperimentSetupDialog\n        open={textSetupOpen}\n        scenarioId={activeScenarioId}\n        experimentName={activeExperimentName}\n        observedAtIso={experimentObservedAtIso}\n        utcOffsetMinutes={observationUtcOffsetMinutes}\n        inputs={inputs}\n""",
    'utcOffsetMinutes={observationUtcOffsetMinutes}'
)

# 4) Version bump.
replace_once('package.json', '"version": "1.27.0"', '"version": "1.28.0"', '"version": "1.28.0"')
replace_once("src/preload/index.ts", "version: '1.27.0'", "version: '1.28.0'", "version: '1.28.0'")

# 5) Focused Stage 8.1 tests. Existing natural-language tests remain untouched.
test_content = r'''import { describe, expect, it } from 'vitest';
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

describe('GGL-AI-TEST v1', () => {
  it('parses canonical astronomy identity, time and coordinates and builds an application', () => {
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
      'target-visibility',
      'horizon',
      'long-distance-visibility',
      'sun-moon-observation',
      'shadow-observation',
      'stellar-observation',
      'eclipse-simulation'
    ];
    for (const scenario of scenarios) {
      const text = `GGL-AI-TEST v1\nscenario: ${scenario}\nEND GGL-AI-TEST`;
      expect(candidate(text, 'scenarioId')?.status).toBe('found');
      expect(candidate(text, 'scenarioId')?.stringValue).toBe(scenario);
    }
  });

  it('fails closed for non-UTC timestamps and invalid UTC offsets', () => {
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
    expect(draft.candidates.some((item) => item.fieldId === 'scenarioId' && item.status === 'found')).toBe(true);
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
