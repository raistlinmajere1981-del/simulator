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


# ---------------------------------------------------------------------------
# 1) Shared text application contract
# ---------------------------------------------------------------------------
replace_expected(
    'src/shared/text-experiment-setup.ts',
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.2.0';",
    "export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.3.0';",
    1,
    "TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.3.0'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  | 'refractionCoefficientUncertainty'\n  | 'cameraCalibration'\n""",
    """  | 'refractionCoefficientUncertainty'\n  | 'shadowGnomonHeightM'\n  | 'shadowObservedLengthM'\n  | 'shadowObservedLengthUncertaintyM'\n  | 'shadowObservedAzimuthDeg'\n  | 'shadowObservedAzimuthUncertaintyDeg'\n  | 'shadowStationBCoordinates'\n  | 'shadowStationBGnomonHeightM'\n  | 'shadowStationBObservedLengthM'\n  | 'shadowStationBObservedLengthUncertaintyM'\n  | 'shadowStationBObservedAzimuthDeg'\n  | 'shadowStationBObservedAzimuthUncertaintyDeg'\n  | 'stellarStarId'\n  | 'stellarTrailDurationMinutes'\n  | 'stellarSampleIntervalMinutes'\n  | 'stellarLocalHorizonEnabled'\n  | 'stellarLocalHorizonNorthDeg'\n  | 'stellarLocalHorizonNorthEastDeg'\n  | 'stellarLocalHorizonEastDeg'\n  | 'stellarLocalHorizonSouthEastDeg'\n  | 'stellarLocalHorizonSouthDeg'\n  | 'stellarLocalHorizonSouthWestDeg'\n  | 'stellarLocalHorizonWestDeg'\n  | 'stellarLocalHorizonNorthWestDeg'\n  | 'eclipseSearchHalfWindowHours'\n  | 'cameraCalibration'\n""",
    1,
    "| 'eclipseSearchHalfWindowHours'"
)

contract_types = """\nexport interface ShadowTextSetupChanges {\n  gnomonHeightM?: number;\n  observedShadowLengthM?: number;\n  observedShadowLengthUncertaintyM?: number;\n  observedShadowAzimuthDeg?: number;\n  observedShadowAzimuthUncertaintyDeg?: number;\n}\n\nexport interface ShadowStationBTextSetupChanges extends ShadowTextSetupChanges {\n  latitudeDeg?: number;\n  longitudeDeg?: number;\n}\n\nexport interface StellarTextSetupChanges {\n  starId?: string;\n  trailDurationMinutes?: number;\n  trailSampleIntervalMinutes?: number;\n  localHorizonEnabled?: boolean;\n  localHorizonNorthDeg?: number;\n  localHorizonNorthEastDeg?: number;\n  localHorizonEastDeg?: number;\n  localHorizonSouthEastDeg?: number;\n  localHorizonSouthDeg?: number;\n  localHorizonSouthWestDeg?: number;\n  localHorizonWestDeg?: number;\n  localHorizonNorthWestDeg?: number;\n}\n\n"""
replace_expected(
    'src/shared/text-experiment-setup.ts',
    "export interface ExperimentSetupApplication {\n",
    contract_types + "export interface ExperimentSetupApplication {\n",
    1,
    'export interface ShadowTextSetupChanges'
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  atmosphereMode?: AtmosphereMode;\n  modelUncertaintyChanges: Partial<ModelInputUncertaintySettings>;\n  provenance: TextExperimentSetupProvenance;\n""",
    """  atmosphereMode?: AtmosphereMode;\n  modelUncertaintyChanges: Partial<ModelInputUncertaintySettings>;\n  shadowSettingsChanges?: ShadowTextSetupChanges;\n  dualShadowStationBChanges?: ShadowStationBTextSetupChanges;\n  stellarSettingsChanges?: StellarTextSetupChanges;\n  eclipseSearchHalfWindowHours?: number;\n  provenance: TextExperimentSetupProvenance;\n""",
    1,
    'dualShadowStationBChanges?: ShadowStationBTextSetupChanges;'
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """  const modelUncertaintyChanges: Partial<ModelInputUncertaintySettings> = {};\n  let scenarioId: SimulationScenarioId | undefined;\n""",
    """  const modelUncertaintyChanges: Partial<ModelInputUncertaintySettings> = {};\n  const shadowSettingsChanges: ShadowTextSetupChanges = {};\n  const dualShadowStationBChanges: ShadowStationBTextSetupChanges = {};\n  const stellarSettingsChanges: StellarTextSetupChanges = {};\n  let eclipseSearchHalfWindowHours: number | undefined;\n  let scenarioId: SimulationScenarioId | undefined;\n""",
    1,
    'const shadowSettingsChanges: ShadowTextSetupChanges = {};'
)

special_switch = """      case 'shadowGnomonHeightM': if (value !== undefined) shadowSettingsChanges.gnomonHeightM = value; break;\n      case 'shadowObservedLengthM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthM = value; break;\n      case 'shadowObservedLengthUncertaintyM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthUncertaintyM = value; break;\n      case 'shadowObservedAzimuthDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthDeg = value; break;\n      case 'shadowObservedAzimuthUncertaintyDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthUncertaintyDeg = value; break;\n      case 'shadowStationBCoordinates':\n        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {\n          dualShadowStationBChanges.latitudeDeg = candidate.latitudeDeg;\n          dualShadowStationBChanges.longitudeDeg = candidate.longitudeDeg;\n        }\n        break;\n      case 'shadowStationBGnomonHeightM': if (value !== undefined) dualShadowStationBChanges.gnomonHeightM = value; break;\n      case 'shadowStationBObservedLengthM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthM = value; break;\n      case 'shadowStationBObservedLengthUncertaintyM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthUncertaintyM = value; break;\n      case 'shadowStationBObservedAzimuthDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthDeg = value; break;\n      case 'shadowStationBObservedAzimuthUncertaintyDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthUncertaintyDeg = value; break;\n      case 'stellarStarId': if (candidate.stringValue) stellarSettingsChanges.starId = candidate.stringValue; break;\n      case 'stellarTrailDurationMinutes': if (value !== undefined) stellarSettingsChanges.trailDurationMinutes = value; break;\n      case 'stellarSampleIntervalMinutes': if (value !== undefined) stellarSettingsChanges.trailSampleIntervalMinutes = value; break;\n      case 'stellarLocalHorizonEnabled': if (candidate.stringValue === 'true' || candidate.stringValue === 'false') stellarSettingsChanges.localHorizonEnabled = candidate.stringValue === 'true'; break;\n      case 'stellarLocalHorizonNorthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthDeg = value; break;\n      case 'stellarLocalHorizonNorthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthEastDeg = value; break;\n      case 'stellarLocalHorizonEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonEastDeg = value; break;\n      case 'stellarLocalHorizonSouthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthEastDeg = value; break;\n      case 'stellarLocalHorizonSouthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthDeg = value; break;\n      case 'stellarLocalHorizonSouthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthWestDeg = value; break;\n      case 'stellarLocalHorizonWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonWestDeg = value; break;\n      case 'stellarLocalHorizonNorthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthWestDeg = value; break;\n      case 'eclipseSearchHalfWindowHours': if (value !== undefined) eclipseSearchHalfWindowHours = value; break;\n"""
replace_expected(
    'src/shared/text-experiment-setup.ts',
    """      case 'refractionCoefficientUncertainty': if (value !== undefined) modelUncertaintyChanges.refractionCoefficient = value; break;\n      default: break;\n""",
    """      case 'refractionCoefficientUncertainty': if (value !== undefined) modelUncertaintyChanges.refractionCoefficient = value; break;\n""" + special_switch + "      default: break;\n",
    1,
    "case 'shadowStationBCoordinates'"
)

replace_expected(
    'src/shared/text-experiment-setup.ts',
    """    ...(atmosphereMode ? { atmosphereMode } : {}),\n    modelUncertaintyChanges,\n    provenance: {\n""",
    """    ...(atmosphereMode ? { atmosphereMode } : {}),\n    modelUncertaintyChanges,\n    ...(Object.keys(shadowSettingsChanges).length > 0 ? { shadowSettingsChanges } : {}),\n    ...(Object.keys(dualShadowStationBChanges).length > 0 ? { dualShadowStationBChanges } : {}),\n    ...(Object.keys(stellarSettingsChanges).length > 0 ? { stellarSettingsChanges } : {}),\n    ...(eclipseSearchHalfWindowHours !== undefined ? { eclipseSearchHalfWindowHours } : {}),\n    provenance: {\n""",
    1,
    '...(Object.keys(stellarSettingsChanges).length > 0 ? { stellarSettingsChanges } : {})'
)


# ---------------------------------------------------------------------------
# 2) Canonical GGL-AI-TEST parser special fields
# ---------------------------------------------------------------------------
replace_expected(
    'src/shared/ai-test-spec.ts',
    """  'uncertainty.target_ground_elevation_m',\n  'uncertainty.refraction_k'\n]);\n""",
    """  'uncertainty.target_ground_elevation_m',\n  'uncertainty.refraction_k',\n  'shadow.gnomon_height_m',\n  'shadow.observed_length_m',\n  'shadow.observed_length_uncertainty_m',\n  'shadow.observed_azimuth_deg',\n  'shadow.observed_azimuth_uncertainty_deg',\n  'shadow.station_b.coordinates',\n  'shadow.station_b.gnomon_height_m',\n  'shadow.station_b.observed_length_m',\n  'shadow.station_b.observed_length_uncertainty_m',\n  'shadow.station_b.observed_azimuth_deg',\n  'shadow.station_b.observed_azimuth_uncertainty_deg',\n  'stellar.star_id',\n  'stellar.trail_duration_minutes',\n  'stellar.sample_interval_minutes',\n  'stellar.local_horizon.enabled',\n  'stellar.local_horizon.n_deg',\n  'stellar.local_horizon.ne_deg',\n  'stellar.local_horizon.e_deg',\n  'stellar.local_horizon.se_deg',\n  'stellar.local_horizon.s_deg',\n  'stellar.local_horizon.sw_deg',\n  'stellar.local_horizon.w_deg',\n  'stellar.local_horizon.nw_deg',\n  'eclipse.search_half_window_hours'\n]);\n""",
    1,
    "'eclipse.search_half_window_hours'"
)

parser_constants = """\nconst STELLAR_STAR_IDS = new Set([\n  'hr-2491', 'hr-2326', 'hr-5340', 'hr-7001', 'hr-1708', 'hr-1713', 'hr-2943',\n  'hr-0472', 'hr-2061', 'hr-5267', 'hr-7557', 'hr-1457', 'hr-6134', 'hr-5056',\n  'hr-2990', 'hr-8728', 'hr-7924', 'hr-3982', 'hr-0424'\n]);\nconst STELLAR_TRAIL_DURATIONS = new Set([180, 360, 720, 1440, 2880]);\nconst STELLAR_SAMPLE_INTERVALS = new Set([5, 10, 15, 30, 60]);\nconst ECLIPSE_HALF_WINDOWS = new Set([6, 12, 24, 48]);\n\n"""
replace_expected(
    'src/shared/ai-test-spec.ts',
    "export const AI_TEST_SPEC_SCENARIOS: readonly SimulationScenarioId[] = [\n",
    parser_constants + "export const AI_TEST_SPEC_SCENARIOS: readonly SimulationScenarioId[] = [\n",
    1,
    'const STELLAR_STAR_IDS = new Set(['
)

special_cases = r'''      case 'shadow.gnomon_height_m': candidates.push(numberCandidate('shadowGnomonHeightM', 'Gnomon yüksekliği', line, value, (v) => v > 0 && v <= 10_000, (v) => `${trNumber(v)} m`)); break;
      case 'shadow.observed_length_m': candidates.push(numberCandidate('shadowObservedLengthM', 'Gözlenen gölge uzunluğu', line, value, (v) => v >= 0 && v <= 10_000_000, (v) => `${trNumber(v)} m`)); break;
      case 'shadow.observed_length_uncertainty_m': candidates.push(numberCandidate('shadowObservedLengthUncertaintyM', 'Gölge uzunluğu belirsizliği', line, value, (v) => v >= 0 && v <= 1_000_000, (v) => `±${trNumber(v)} m`)); break;
      case 'shadow.observed_azimuth_deg': candidates.push(numberCandidate('shadowObservedAzimuthDeg', 'Gözlenen gölge azimutu', line, value, (v) => v >= 0 && v <= 360, (v) => `${trNumber(v)}°`)); break;
      case 'shadow.observed_azimuth_uncertainty_deg': candidates.push(numberCandidate('shadowObservedAzimuthUncertaintyDeg', 'Gölge azimut belirsizliği', line, value, (v) => v >= 0 && v <= 180, (v) => `±${trNumber(v)}°`)); break;
      case 'shadow.station_b.coordinates': {
        const coordinate = parseCoordinate(value);
        candidates.push(candidate('shadowStationBCoordinates', 'Gölge B istasyonu koordinatı', line, coordinate ? `${trNumber(coordinate.latitudeDeg, 6)}°, ${trNumber(coordinate.longitudeDeg, 6)}°` : value, {
          status: coordinate ? 'found' : 'review',
          ...(coordinate ?? {}),
          ...(!coordinate ? { reason: 'B istasyonu koordinatı enlem,boylam biçiminde ve WGS84 aralığında olmalı.' } : {})
        }));
        break;
      }
      case 'shadow.station_b.gnomon_height_m': candidates.push(numberCandidate('shadowStationBGnomonHeightM', 'B gnomon yüksekliği', line, value, (v) => v > 0 && v <= 10_000, (v) => `${trNumber(v)} m`)); break;
      case 'shadow.station_b.observed_length_m': candidates.push(numberCandidate('shadowStationBObservedLengthM', 'B gözlenen gölge uzunluğu', line, value, (v) => v >= 0 && v <= 10_000_000, (v) => `${trNumber(v)} m`)); break;
      case 'shadow.station_b.observed_length_uncertainty_m': candidates.push(numberCandidate('shadowStationBObservedLengthUncertaintyM', 'B gölge uzunluğu belirsizliği', line, value, (v) => v >= 0 && v <= 1_000_000, (v) => `±${trNumber(v)} m`)); break;
      case 'shadow.station_b.observed_azimuth_deg': candidates.push(numberCandidate('shadowStationBObservedAzimuthDeg', 'B gözlenen gölge azimutu', line, value, (v) => v >= 0 && v <= 360, (v) => `${trNumber(v)}°`)); break;
      case 'shadow.station_b.observed_azimuth_uncertainty_deg': candidates.push(numberCandidate('shadowStationBObservedAzimuthUncertaintyDeg', 'B gölge azimut belirsizliği', line, value, (v) => v >= 0 && v <= 180, (v) => `±${trNumber(v)}°`)); break;
      case 'stellar.star_id': {
        const valid = STELLAR_STAR_IDS.has(value);
        candidates.push(candidate('stellarStarId', 'Katalog yıldızı', line, value, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'stellar.star_id GGL v1 parlak yıldız katalog kimliklerinden biri olmalı.' } : {})
        }));
        break;
      }
      case 'stellar.trail_duration_minutes': {
        const parsed = parseNumber(value);
        const valid = Number.isFinite(parsed) && STELLAR_TRAIL_DURATIONS.has(parsed);
        candidates.push(candidate('stellarTrailDurationMinutes', 'Yıldız izi süresi', line, valid ? `${trNumber(parsed)} dk` : value, {
          status: valid ? 'found' : 'review', ...(valid ? { numericValue: parsed } : {}),
          ...(!valid ? { reason: 'İz süresi 180, 360, 720, 1440 veya 2880 dakika olmalı.' } : {})
        }));
        break;
      }
      case 'stellar.sample_interval_minutes': {
        const parsed = parseNumber(value);
        const valid = Number.isFinite(parsed) && STELLAR_SAMPLE_INTERVALS.has(parsed);
        candidates.push(candidate('stellarSampleIntervalMinutes', 'Yıldız örnekleme aralığı', line, valid ? `${trNumber(parsed)} dk` : value, {
          status: valid ? 'found' : 'review', ...(valid ? { numericValue: parsed } : {}),
          ...(!valid ? { reason: 'Örnekleme aralığı 5, 10, 15, 30 veya 60 dakika olmalı.' } : {})
        }));
        break;
      }
      case 'stellar.local_horizon.enabled': {
        const normalized = value.toLocaleLowerCase('en-US');
        const valid = normalized === 'true' || normalized === 'false';
        candidates.push(candidate('stellarLocalHorizonEnabled', 'Manuel yerel skyline', line, valid ? (normalized === 'true' ? 'Etkin' : 'Kapalı') : value, {
          status: valid ? 'found' : 'review', ...(valid ? { stringValue: normalized } : {}),
          ...(!valid ? { reason: 'stellar.local_horizon.enabled true veya false olmalı.' } : {})
        }));
        break;
      }
      case 'stellar.local_horizon.n_deg': candidates.push(numberCandidate('stellarLocalHorizonNorthDeg', 'Skyline K', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.ne_deg': candidates.push(numberCandidate('stellarLocalHorizonNorthEastDeg', 'Skyline KD', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.e_deg': candidates.push(numberCandidate('stellarLocalHorizonEastDeg', 'Skyline D', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.se_deg': candidates.push(numberCandidate('stellarLocalHorizonSouthEastDeg', 'Skyline GD', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.s_deg': candidates.push(numberCandidate('stellarLocalHorizonSouthDeg', 'Skyline G', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.sw_deg': candidates.push(numberCandidate('stellarLocalHorizonSouthWestDeg', 'Skyline GB', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.w_deg': candidates.push(numberCandidate('stellarLocalHorizonWestDeg', 'Skyline B', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'stellar.local_horizon.nw_deg': candidates.push(numberCandidate('stellarLocalHorizonNorthWestDeg', 'Skyline KB', line, value, (v) => v >= -90 && v <= 90, (v) => `${trNumber(v)}°`)); break;
      case 'eclipse.search_half_window_hours': {
        const parsed = parseNumber(value);
        const valid = Number.isFinite(parsed) && ECLIPSE_HALF_WINDOWS.has(parsed);
        candidates.push(candidate('eclipseSearchHalfWindowHours', 'Tutulma arama yarı penceresi', line, valid ? `±${trNumber(parsed)} saat` : value, {
          status: valid ? 'found' : 'review', ...(valid ? { numericValue: parsed } : {}),
          ...(!valid ? { reason: 'Tutulma arama yarı penceresi 6, 12, 24 veya 48 saat olmalı.' } : {})
        }));
        break;
      }
'''
replace_expected(
    'src/shared/ai-test-spec.ts',
    """      case 'uncertainty.refraction_k': candidates.push(numberCandidate('refractionCoefficientUncertainty', 'k belirsizliği', line, value, (v) => v >= 0 && v <= 2, (v) => `±${trNumber(v, 4)}`)); break;\n      default: break;\n""",
    """      case 'uncertainty.refraction_k': candidates.push(numberCandidate('refractionCoefficientUncertainty', 'k belirsizliği', line, value, (v) => v >= 0 && v <= 2, (v) => `±${trNumber(v, 4)}`)); break;\n""" + special_cases + "      default: break;\n",
    1,
    "case 'eclipse.search_half_window_hours'"
)


# ---------------------------------------------------------------------------
# 3) Preview dialog: special fields remain user-reviewed, without importing
#    scenario panels into the dialog.
# ---------------------------------------------------------------------------
special_current_cases = """    case 'shadowGnomonHeightM':\n    case 'shadowObservedLengthM':\n    case 'shadowObservedLengthUncertaintyM':\n    case 'shadowObservedAzimuthDeg':\n    case 'shadowObservedAzimuthUncertaintyDeg':\n    case 'shadowStationBCoordinates':\n    case 'shadowStationBGnomonHeightM':\n    case 'shadowStationBObservedLengthM':\n    case 'shadowStationBObservedLengthUncertaintyM':\n    case 'shadowStationBObservedAzimuthDeg':\n    case 'shadowStationBObservedAzimuthUncertaintyDeg':\n    case 'stellarStarId':\n    case 'stellarTrailDurationMinutes':\n    case 'stellarSampleIntervalMinutes':\n    case 'stellarLocalHorizonEnabled':\n    case 'stellarLocalHorizonNorthDeg':\n    case 'stellarLocalHorizonNorthEastDeg':\n    case 'stellarLocalHorizonEastDeg':\n    case 'stellarLocalHorizonSouthEastDeg':\n    case 'stellarLocalHorizonSouthDeg':\n    case 'stellarLocalHorizonSouthWestDeg':\n    case 'stellarLocalHorizonWestDeg':\n    case 'stellarLocalHorizonNorthWestDeg':\n    case 'eclipseSearchHalfWindowHours': return 'Senaryo özel ayarı';\n"""
replace_expected(
    'src/renderer/src/TextExperimentSetupDialog.tsx',
    """    case 'refractionCoefficientUncertainty': return modelUncertainty.refractionCoefficient === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.refractionCoefficient)}`;\n    case 'cameraCalibration': return 'Fotoğraf panelinden yönetilir';\n""",
    """    case 'refractionCoefficientUncertainty': return modelUncertainty.refractionCoefficient === undefined ? 'tanımsız' : `±${trNumber.format(modelUncertainty.refractionCoefficient)}`;\n""" + special_current_cases + "    case 'cameraCalibration': return 'Fotoğraf panelinden yönetilir';\n",
    1,
    "case 'eclipseSearchHalfWindowHours': return 'Senaryo özel ayarı';"
)


# ---------------------------------------------------------------------------
# 4) AppNext applies scenario-specific settings after scenario reset.
# ---------------------------------------------------------------------------
replace_expected(
    'src/renderer/src/AppNext.tsx',
    """  const [eclipseEventSearchSnapshot, setEclipseEventSearchSnapshot] = useState<SolarEclipseEventSearchSnapshot>();\n  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(\n""",
    """  const [eclipseEventSearchSnapshot, setEclipseEventSearchSnapshot] = useState<SolarEclipseEventSearchSnapshot>();\n  const [eclipseSearchHalfWindowHours, setEclipseSearchHalfWindowHours] = useState(12);\n  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(\n""",
    1,
    'const [eclipseSearchHalfWindowHours, setEclipseSearchHalfWindowHours] = useState(12);'
)

app_special = """    if (application.shadowSettingsChanges) {\n      setShadowObservationSettings((current) => ({ ...current, ...application.shadowSettingsChanges }));\n    }\n    if (application.dualShadowStationBChanges) {\n      const baseLatitudeDeg = application.inputChanges.observerLatitudeDeg ?? inputs.observerLatitudeDeg;\n      const baseLongitudeDeg = application.inputChanges.observerLongitudeDeg ?? inputs.observerLongitudeDeg;\n      setDualShadowSettings((current) => ({\n        stationB: {\n          ...(current?.stationB ?? createDefaultDualShadowComparisonSettings(baseLatitudeDeg, baseLongitudeDeg).stationB),\n          ...application.dualShadowStationBChanges\n        }\n      }));\n    }\n    if (application.stellarSettingsChanges) {\n      const manualHorizonChanged = application.stellarSettingsChanges.localHorizonEnabled !== undefined ||\n        application.stellarSettingsChanges.localHorizonNorthDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonNorthEastDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonEastDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonSouthEastDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonSouthDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonSouthWestDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonWestDeg !== undefined ||\n        application.stellarSettingsChanges.localHorizonNorthWestDeg !== undefined;\n      setStellarObservationSettings((current) => ({\n        ...current,\n        ...application.stellarSettingsChanges,\n        ...(manualHorizonChanged ? { localHorizonSourceMode: 'manual' as const } : {})\n      }));\n      if (manualHorizonChanged) setStellarLocalHorizonSource(undefined);\n    }\n    if (application.eclipseSearchHalfWindowHours !== undefined) {\n      setEclipseSearchHalfWindowHours(application.eclipseSearchHalfWindowHours);\n    }\n"""
replace_expected(
    'src/renderer/src/AppNext.tsx',
    """    if (application.utcOffsetMinutes !== undefined) setObservationUtcOffsetMinutes(application.utcOffsetMinutes);\n    setIsDirty(true);\n""",
    """    if (application.utcOffsetMinutes !== undefined) setObservationUtcOffsetMinutes(application.utcOffsetMinutes);\n""" + app_special + "    setIsDirty(true);\n",
    1,
    'if (application.eclipseSearchHalfWindowHours !== undefined)'
)

replace_expected(
    'src/renderer/src/AppNext.tsx',
    """                  eventSearchSnapshot={eclipseEventSearchSnapshot}\n                  onEventSearchSnapshotChange={(snapshot) => {\n""",
    """                  eventSearchSnapshot={eclipseEventSearchSnapshot}\n                  eventSearchHalfWindowHours={eclipseSearchHalfWindowHours}\n                  onEventSearchHalfWindowHoursChange={setEclipseSearchHalfWindowHours}\n                  onEventSearchSnapshotChange={(snapshot) => {\n""",
    1,
    'eventSearchHalfWindowHours={eclipseSearchHalfWindowHours}'
)


# ---------------------------------------------------------------------------
# 5) Eclipse search window becomes controlled, while search remains click-only.
# ---------------------------------------------------------------------------
replace_expected(
    'src/renderer/src/EclipseSimulationPanel.tsx',
    """  eventSearchSnapshot,\n  onEventSearchSnapshotChange,\n""",
    """  eventSearchSnapshot,\n  eventSearchHalfWindowHours,\n  onEventSearchHalfWindowHoursChange,\n  onEventSearchSnapshotChange,\n""",
    1,
    'eventSearchHalfWindowHours,'
)
replace_expected(
    'src/renderer/src/EclipseSimulationPanel.tsx',
    """  eventSearchSnapshot?: SolarEclipseEventSearchSnapshot;\n  onEventSearchSnapshotChange(snapshot: SolarEclipseEventSearchSnapshot | undefined): void;\n""",
    """  eventSearchSnapshot?: SolarEclipseEventSearchSnapshot;\n  eventSearchHalfWindowHours: number;\n  onEventSearchHalfWindowHoursChange(hours: number): void;\n  onEventSearchSnapshotChange(snapshot: SolarEclipseEventSearchSnapshot | undefined): void;\n""",
    1,
    'onEventSearchHalfWindowHoursChange(hours: number): void;'
)
replace_expected(
    'src/renderer/src/EclipseSimulationPanel.tsx',
    """        initialSnapshot={eventSearchSnapshot}\n        onSnapshotChange={onEventSearchSnapshotChange}\n""",
    """        initialSnapshot={eventSearchSnapshot}\n        halfWindowHours={eventSearchHalfWindowHours}\n        onHalfWindowHoursChange={onEventSearchHalfWindowHoursChange}\n        onSnapshotChange={onEventSearchSnapshotChange}\n""",
    1,
    'halfWindowHours={eventSearchHalfWindowHours}'
)

replace_expected(
    'src/renderer/src/EclipseEventSearchPanel.tsx',
    """  initialSnapshot,\n  onSnapshotChange,\n""",
    """  initialSnapshot,\n  halfWindowHours,\n  onHalfWindowHoursChange,\n  onSnapshotChange,\n""",
    1,
    'onHalfWindowHoursChange,'
)
replace_expected(
    'src/renderer/src/EclipseEventSearchPanel.tsx',
    """  initialSnapshot?: SolarEclipseEventSearchSnapshot;\n  onSnapshotChange?: (snapshot: SolarEclipseEventSearchSnapshot | undefined) => void;\n""",
    """  initialSnapshot?: SolarEclipseEventSearchSnapshot;\n  halfWindowHours: number;\n  onHalfWindowHoursChange(hours: number): void;\n  onSnapshotChange?: (snapshot: SolarEclipseEventSearchSnapshot | undefined) => void;\n""",
    1,
    'onHalfWindowHoursChange(hours: number): void;'
)
replace_expected(
    'src/renderer/src/EclipseEventSearchPanel.tsx',
    """  const [halfWindowHours, setHalfWindowHours] = useState(initialSnapshot?.halfWindowHours ?? 12);\n  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);\n""",
    """  const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);\n""",
    1,
    'const [snapshot, setSnapshot] = useState<SolarEclipseEventSearchSnapshot | undefined>(initialSnapshot);'
)
replace_expected(
    'src/renderer/src/EclipseEventSearchPanel.tsx',
    """  useEffect(() => {\n    setSnapshot(initialSnapshot);\n    if (initialSnapshot) setHalfWindowHours(initialSnapshot.halfWindowHours);\n  }, [initialSnapshot]);\n""",
    """  useEffect(() => {\n    setSnapshot(initialSnapshot);\n    if (initialSnapshot) onHalfWindowHoursChange(initialSnapshot.halfWindowHours);\n  }, [initialSnapshot]);\n""",
    1,
    'onHalfWindowHoursChange(initialSnapshot.halfWindowHours);'
)
replace_expected(
    'src/renderer/src/EclipseEventSearchPanel.tsx',
    """            <select value={halfWindowHours} onChange={(event) => setHalfWindowHours(Number(event.target.value))}>\n""",
    """            <select value={halfWindowHours} onChange={(event) => onHalfWindowHoursChange(Number(event.target.value))}>\n""",
    1,
    'onHalfWindowHoursChange(Number(event.target.value))'
)


# ---------------------------------------------------------------------------
# 6) Version bump and focused tests.
# ---------------------------------------------------------------------------
replace_expected('package.json', '"version": "1.28.0"', '"version": "1.29.0"', 1, '"version": "1.29.0"')
replace_expected("src/preload/index.ts", "version: '1.28.0'", "version: '1.29.0'", 1, "version: '1.29.0'")

test_content = r'''import { describe, expect, it } from 'vitest';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText
} from '../src/shared/text-experiment-setup';

function found(text: string, fieldId: string) {
  return parseExperimentSetupText(text).candidates.find((candidate) => candidate.fieldId === fieldId);
}

function application(text: string) {
  const draft = parseExperimentSetupText(text);
  return buildExperimentSetupApplication(
    draft,
    draft.candidates.filter((candidate) => candidate.status === 'found').map((candidate) => candidate.id),
    '2026-08-11T12:00:00.000Z'
  );
}

describe('GGL-AI-TEST v1 scenario-specific fields', () => {
  it('builds primary and station-B shadow settings', () => {
    const text = `GGL-AI-TEST v1
scenario: shadow-observation
shadow.gnomon_height_m: 1.5
shadow.observed_length_m: 0.65
shadow.observed_length_uncertainty_m: 0.02
shadow.observed_azimuth_deg: 190
shadow.observed_azimuth_uncertainty_deg: 2
shadow.station_b.coordinates: 39.9334,32.8597
shadow.station_b.gnomon_height_m: 1
END GGL-AI-TEST`;
    const result = application(text);
    expect(result.shadowSettingsChanges).toEqual({
      gnomonHeightM: 1.5,
      observedShadowLengthM: 0.65,
      observedShadowLengthUncertaintyM: 0.02,
      observedShadowAzimuthDeg: 190,
      observedShadowAzimuthUncertaintyDeg: 2
    });
    expect(result.dualShadowStationBChanges?.latitudeDeg).toBeCloseTo(39.9334);
    expect(result.dualShadowStationBChanges?.longitudeDeg).toBeCloseTo(32.8597);
    expect(result.dualShadowStationBChanges?.gnomonHeightM).toBe(1);
  });

  it('builds curated stellar settings and 8-direction manual horizon', () => {
    const text = `GGL-AI-TEST v1
scenario: stellar-observation
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
END GGL-AI-TEST`;
    const result = application(text);
    expect(result.stellarSettingsChanges).toEqual({
      starId: 'hr-0424',
      trailDurationMinutes: 720,
      trailSampleIntervalMinutes: 10,
      localHorizonEnabled: true,
      localHorizonNorthDeg: 5,
      localHorizonNorthEastDeg: 4,
      localHorizonEastDeg: 3,
      localHorizonSouthEastDeg: 2,
      localHorizonSouthDeg: 1,
      localHorizonSouthWestDeg: 2,
      localHorizonWestDeg: 3,
      localHorizonNorthWestDeg: 4
    });
  });

  it('accepts only supported eclipse half windows', () => {
    const valid = `GGL-AI-TEST v1\neclipse.search_half_window_hours: 12\nEND GGL-AI-TEST`;
    expect(application(valid).eclipseSearchHalfWindowHours).toBe(12);
    const invalid = `GGL-AI-TEST v1\neclipse.search_half_window_hours: 10\nEND GGL-AI-TEST`;
    expect(found(invalid, 'eclipseSearchHalfWindowHours')?.status).toBe('review');
  });

  it('fails closed for unknown star and unsupported trail enum', () => {
    const text = `GGL-AI-TEST v1
stellar.star_id: hr-9999
stellar.trail_duration_minutes: 500
stellar.sample_interval_minutes: 7
END GGL-AI-TEST`;
    expect(found(text, 'stellarStarId')?.status).toBe('review');
    expect(found(text, 'stellarTrailDurationMinutes')?.status).toBe('review');
    expect(found(text, 'stellarSampleIntervalMinutes')?.status).toBe('review');
  });

  it('fails closed for invalid shadow and skyline bounds', () => {
    const text = `GGL-AI-TEST v1
shadow.gnomon_height_m: 0
shadow.observed_azimuth_deg: 361
stellar.local_horizon.n_deg: 91
END GGL-AI-TEST`;
    expect(found(text, 'shadowGnomonHeightM')?.status).toBe('review');
    expect(found(text, 'shadowObservedAzimuthDeg')?.status).toBe('review');
    expect(found(text, 'stellarLocalHorizonNorthDeg')?.status).toBe('review');
  });
});
'''
write_new('tests/ai-test-spec-scenario-fields.test.ts', test_content)

print('Stage 8.2 AI scenario fields integration applied successfully.')
