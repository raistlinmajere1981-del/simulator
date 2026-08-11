import type { SimulationScenarioId } from './scenario';
import type {
  ExperimentSetupCandidate,
  ExperimentSetupCandidateStatus,
  ExperimentSetupFieldId
} from './text-experiment-setup';

export const GGL_AI_TEST_SPEC_VERSION = 'v1';

export type AiTestSpecCandidate = Omit<ExperimentSetupCandidate, 'id'>;

export interface AiTestSpecParseResult {
  detected: boolean;
  candidates: AiTestSpecCandidate[];
  notes: string[];
}

const HEADER = /^GGL-AI-TEST\s+v1$/iu;
const END = /^END\s+GGL-AI-TEST$/iu;

const KNOWN_KEYS = new Set([
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
  'uncertainty.refraction_k',
  'shadow.gnomon_height_m',
  'shadow.observed_length_m',
  'shadow.observed_length_uncertainty_m',
  'shadow.observed_azimuth_deg',
  'shadow.observed_azimuth_uncertainty_deg',
  'shadow.station_b.coordinates',
  'shadow.station_b.gnomon_height_m',
  'shadow.station_b.observed_length_m',
  'shadow.station_b.observed_length_uncertainty_m',
  'shadow.station_b.observed_azimuth_deg',
  'shadow.station_b.observed_azimuth_uncertainty_deg',
  'stellar.star_id',
  'stellar.trail_duration_minutes',
  'stellar.sample_interval_minutes',
  'stellar.local_horizon.enabled',
  'stellar.local_horizon.n_deg',
  'stellar.local_horizon.ne_deg',
  'stellar.local_horizon.e_deg',
  'stellar.local_horizon.se_deg',
  'stellar.local_horizon.s_deg',
  'stellar.local_horizon.sw_deg',
  'stellar.local_horizon.w_deg',
  'stellar.local_horizon.nw_deg',
  'eclipse.search_half_window_hours'
]);


const STELLAR_STAR_IDS = new Set([
  'hr-2491', 'hr-2326', 'hr-5340', 'hr-7001', 'hr-1708', 'hr-1713', 'hr-2943',
  'hr-0472', 'hr-2061', 'hr-5267', 'hr-7557', 'hr-1457', 'hr-6134', 'hr-5056',
  'hr-2990', 'hr-8728', 'hr-7924', 'hr-3982', 'hr-0424'
]);
const STELLAR_TRAIL_DURATIONS = new Set([180, 360, 720, 1440, 2880]);
const STELLAR_SAMPLE_INTERVALS = new Set([5, 10, 15, 30, 60]);
const ECLIPSE_HALF_WINDOWS = new Set([6, 12, 24, 48]);

export const AI_TEST_SPEC_SCENARIOS: readonly SimulationScenarioId[] = [
  'target-visibility',
  'horizon',
  'long-distance-visibility',
  'sun-moon-observation',
  'shadow-observation',
  'stellar-observation',
  'eclipse-simulation'
];

function parseNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function trNumber(value: number, max = 4): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: max }).format(value);
}

function candidate(
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
): AiTestSpecCandidate {
  return {
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
  };
}

function numberCandidate(
  fieldId: ExperimentSetupFieldId,
  label: string,
  line: string,
  rawValue: string,
  validate: (value: number) => boolean,
  display: (value: number) => string
): AiTestSpecCandidate {
  const value = parseNumber(rawValue.trim());
  const valid = Number.isFinite(value) && validate(value);
  return candidate(fieldId, label, line, valid ? display(value) : rawValue.trim(), {
    status: valid ? 'found' : 'review',
    ...(valid ? { numericValue: value } : {}),
    ...(!valid ? { reason: 'GGL-AI-TEST değeri desteklenen aralıkta geçerli bir sayı değil.' } : {})
  });
}

function parseCoordinate(value: string): { latitudeDeg: number; longitudeDeg: number } | undefined {
  const match = /^\s*([-+]?\d+(?:[.,]\d+)?)\s*,\s*([-+]?\d+(?:[.,]\d+)?)\s*$/u.exec(value);
  if (!match) return undefined;
  const latitudeDeg = parseNumber(match[1]!);
  const longitudeDeg = parseNumber(match[2]!);
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) return undefined;
  if (latitudeDeg < -90 || latitudeDeg > 90 || longitudeDeg < -180 || longitudeDeg > 180) return undefined;
  return { latitudeDeg, longitudeDeg };
}

function parseUtcOffset(value: string): number | undefined {
  const match = /^([+-])(\d{2}):(\d{2})$/u.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return undefined;
  const total = hours * 60 + minutes;
  return match[1] === '-' ? -total : total;
}

function formatUtcOffset(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseAiTestSpec(sourceText: string): AiTestSpecParseResult {
  const lines = sourceText.replace(/\u00a0/g, ' ').split(/\r?\n/u).map((line) => line.trim());
  const headerIndexes = lines.flatMap((line, index) => HEADER.test(line) ? [index] : []);
  if (headerIndexes.length === 0) return { detected: false, candidates: [], notes: [] };

  const notes: string[] = [];
  const candidates: AiTestSpecCandidate[] = [];
  if (headerIndexes.length > 1) notes.push('Birden fazla GGL-AI-TEST v1 bloğu bulundu; yalnız ilk blok ayrıştırıldı.');

  const start = headerIndexes[0]!;
  const relativeEnd = lines.slice(start + 1).findIndex((line) => END.test(line));
  if (relativeEnd < 0) {
    return {
      detected: true,
      candidates: [],
      notes: [...notes, 'GGL-AI-TEST v1 başlangıcı bulundu ancak END GGL-AI-TEST satırı eksik; kanonik blok uygulanmadı.']
    };
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
    if (!KNOWN_KEYS.has(key)) {
      notes.push(`GGL-AI-TEST v1 anahtarı tanınmıyor ve uygulanmadı: ${key}`);
      continue;
    }

    switch (key) {
      case 'scenario': {
        const scenario = value as SimulationScenarioId;
        const valid = AI_TEST_SPEC_SCENARIOS.includes(scenario);
        candidates.push(candidate('scenarioId', 'Senaryo', line, valid ? value : `Geçersiz: ${value}`, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: scenario } : {}),
          ...(!valid ? { reason: 'Desteklenen GGL senaryo kimliklerinden biri kullanılmalı.' } : {})
        }));
        break;
      }
      case 'name': {
        const valid = value.length > 0 && value.length <= 120;
        candidates.push(candidate('experimentName', 'Deney adı', line, value || '—', {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'Deney adı 1–120 karakter arasında olmalı.' } : {})
        }));
        break;
      }
      case 'observed_at_utc': {
        const date = new Date(value);
        const valid = value.endsWith('Z') && Number.isFinite(date.getTime());
        candidates.push(candidate('observedAtUtc', 'Gözlem anı · UTC', line, valid ? date.toISOString() : value, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: date.toISOString() } : {}),
          ...(!valid ? { reason: 'observed_at_utc geçerli ISO-8601 UTC zamanı olmalı ve Z ile bitmelidir.' } : {})
        }));
        break;
      }
      case 'utc_offset': {
        const offset = parseUtcOffset(value);
        candidates.push(candidate('utcOffsetMinutes', 'UTC ofseti', line, offset === undefined ? value : formatUtcOffset(offset), {
          status: offset === undefined ? 'review' : 'found',
          ...(offset !== undefined ? { numericValue: offset } : {}),
          ...(offset === undefined ? { reason: 'utc_offset +HH:MM veya -HH:MM biçiminde ve ±14:00 aralığında olmalı.' } : {})
        }));
        break;
      }
      case 'observer.coordinates':
      case 'target.coordinates': {
        const coordinate = parseCoordinate(value);
        const fieldId: ExperimentSetupFieldId = key === 'observer.coordinates' ? 'observerCoordinates' : 'targetCoordinates';
        candidates.push(candidate(
          fieldId,
          key === 'observer.coordinates' ? 'Gözlemci koordinatı' : 'Hedef / B koordinatı',
          line,
          coordinate ? `${trNumber(coordinate.latitudeDeg, 6)}°, ${trNumber(coordinate.longitudeDeg, 6)}°` : value,
          {
            status: coordinate ? 'found' : 'review',
            ...(coordinate ?? {}),
            ...(!coordinate ? { reason: 'Koordinat enlem,boylam biçiminde ve WGS84 aralığında olmalı.' } : {})
          }
        ));
        break;
      }
      case 'surface_distance_km': candidates.push(numberCandidate('surfaceDistanceKm', 'Yüzey mesafesi', line, value, (v) => v >= 0 && v <= 20_000, (v) => `${trNumber(v)} km`)); break;
      case 'observer.eye_height_m': candidates.push(numberCandidate('observerHeightM', 'Göz yüksekliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `${trNumber(v)} m`)); break;
      case 'observer.ground_elevation_m': candidates.push(numberCandidate('observerGroundElevationM', 'Gözlemci zemin kotu', line, value, (v) => v >= -12_000 && v <= 100_000, (v) => `${trNumber(v)} m`)); break;
      case 'target.height_m': candidates.push(numberCandidate('targetHeightM', 'Hedef yüksekliği', line, value, (v) => v > 0 && v <= 100_000, (v) => `${trNumber(v)} m`)); break;
      case 'target.ground_elevation_m': candidates.push(numberCandidate('targetGroundElevationM', 'Hedef taban kotu', line, value, (v) => v >= -12_000 && v <= 100_000, (v) => `${trNumber(v)} m`)); break;
      case 'observed_visible_percent': candidates.push(numberCandidate('observedVisiblePercent', 'Gözlenen görünürlük', line, value, (v) => v >= 0 && v <= 100, (v) => `%${trNumber(v)}`)); break;
      case 'observation_uncertainty_percent': candidates.push(numberCandidate('observationUncertaintyPercent', 'Gözlem belirsizliği', line, value, (v) => v >= 0 && v <= 100, (v) => `±%${trNumber(v)}`)); break;
      case 'vertical_datum': {
        const valid = value === 'orthometric-msl' || value === 'ellipsoidal-wgs84' || value === 'local';
        const display = value === 'orthometric-msl'
          ? 'Ortalama deniz seviyesi'
          : value === 'ellipsoidal-wgs84'
            ? 'WGS84 elipsoidal'
            : value === 'local'
              ? 'Yerel düşey referans'
              : value;
        candidates.push(candidate('verticalDatumKind', 'Düşey datum', line, display, {
          status: valid ? 'found' : 'review',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'vertical_datum desteklenen enum değerlerinden biri olmalı.' } : {})
        }));
        break;
      }
      case 'vertical_datum_offset_m': candidates.push(numberCandidate('verticalDatumOffsetM', 'Datum / gelgit ofseti', line, value, (v) => v >= -1_000 && v <= 1_000, (v) => `${trNumber(v)} m`)); break;
      case 'atmosphere_mode': {
        const valid = value === 'off' || value === 'standard' || value === 'profile';
        const profile = value === 'profile';
        candidates.push(candidate('atmosphereMode', 'Atmosfer modu', line, value, {
          status: !valid || profile ? 'review' : 'found',
          ...(valid ? { stringValue: value } : {}),
          ...(!valid ? { reason: 'atmosphere_mode off, standard veya profile olmalı.' } : {}),
          ...(profile ? { reason: 'Katmanlı profil veri ve provenans gerektirir; v1 metin taslağından otomatik uygulanmaz.' } : {})
        }));
        break;
      }
      case 'refraction_k': candidates.push(numberCandidate('refractionCoefficient', 'Kırılma katsayısı k', line, value, (v) => v >= -1 && v <= 0.99, (v) => `k=${trNumber(v, 4)}`)); break;
      case 'uncertainty.surface_distance_m': candidates.push(numberCandidate('surfaceDistanceUncertaintyM', 'Mesafe belirsizliği', line, value, (v) => v >= 0 && v <= 20_000_000, (v) => `±${trNumber(v)} m`)); break;
      case 'uncertainty.observer_eye_height_m': candidates.push(numberCandidate('observerEyeHeightUncertaintyM', 'Göz yüksekliği belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`)); break;
      case 'uncertainty.observer_ground_elevation_m': candidates.push(numberCandidate('observerGroundElevationUncertaintyM', 'Gözlemci zemin kotu belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`)); break;
      case 'uncertainty.target_height_m': candidates.push(numberCandidate('targetHeightUncertaintyM', 'Hedef yüksekliği belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`)); break;
      case 'uncertainty.target_ground_elevation_m': candidates.push(numberCandidate('targetGroundElevationUncertaintyM', 'Hedef taban kotu belirsizliği', line, value, (v) => v >= 0 && v <= 100_000, (v) => `±${trNumber(v)} m`)); break;
      case 'uncertainty.refraction_k': candidates.push(numberCandidate('refractionCoefficientUncertainty', 'k belirsizliği', line, value, (v) => v >= 0 && v <= 2, (v) => `±${trNumber(v, 4)}`)); break;
      case 'shadow.gnomon_height_m': candidates.push(numberCandidate('shadowGnomonHeightM', 'Gnomon yüksekliği', line, value, (v) => v > 0 && v <= 10_000, (v) => `${trNumber(v)} m`)); break;
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
      default: break;
    }
  }

  return { detected: true, candidates, notes };
}
