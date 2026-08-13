import type { AtmosphereMode } from '../../shared/atmosphere';
import type { SimulationScenarioId } from '../../shared/scenario';
import type { SimulatorInputs } from '../../shared/simulator';
import type {
  ExperimentSetupCandidate,
  ExperimentSetupCandidateStatus,
  ExperimentSetupFieldId
} from '../../shared/text-experiment-setup';
import type { ModelInputUncertaintySettings } from '../../shared/uncertainty';
import { appLocaleTag, translate, type AppLocale, type TranslationKey } from './i18n';

export interface TextSetupCurrentState {
  scenarioId: SimulationScenarioId;
  experimentName: string;
  observedAtIso: string;
  utcOffsetMinutes: number;
  inputs: SimulatorInputs;
  atmosphereMode: AtmosphereMode;
  modelUncertainty: ModelInputUncertaintySettings;
}

type LocaleText = Record<AppLocale, string>;

const fieldLabels: Record<ExperimentSetupFieldId, LocaleText> = {
  scenarioId: { tr: 'Senaryo', en: 'Scenario' },
  experimentName: { tr: 'Deney adı', en: 'Experiment name' },
  observedAtUtc: { tr: 'Gözlem anı · UTC', en: 'Observation instant · UTC' },
  utcOffsetMinutes: { tr: 'UTC ofseti', en: 'UTC offset' },
  surfaceDistanceKm: { tr: 'Yüzey mesafesi', en: 'Surface distance' },
  observerHeightM: { tr: 'Göz yüksekliği', en: 'Eye height' },
  targetHeightM: { tr: 'Hedef yüksekliği', en: 'Target height' },
  observerGroundElevationM: { tr: 'Gözlemci zemin kotu', en: 'Observer ground elevation' },
  targetGroundElevationM: { tr: 'Hedef taban kotu', en: 'Target base elevation' },
  observerCoordinates: { tr: 'Gözlemci koordinatı', en: 'Observer coordinates' },
  targetCoordinates: { tr: 'Hedef / B koordinatı', en: 'Target / B coordinates' },
  observedVisiblePercent: { tr: 'Gözlenen görünürlük', en: 'Observed visibility' },
  observationUncertaintyPercent: { tr: 'Gözlem belirsizliği', en: 'Observation uncertainty' },
  verticalDatumKind: { tr: 'Düşey datum', en: 'Vertical datum' },
  verticalDatumOffsetM: { tr: 'Datum / gelgit ofseti', en: 'Datum / tide offset' },
  atmosphereMode: { tr: 'Atmosfer modu', en: 'Atmosphere mode' },
  refractionCoefficient: { tr: 'Kırılma katsayısı k', en: 'Refraction coefficient k' },
  surfaceDistanceUncertaintyM: { tr: 'Mesafe belirsizliği', en: 'Distance uncertainty' },
  observerEyeHeightUncertaintyM: { tr: 'Göz yüksekliği belirsizliği', en: 'Eye-height uncertainty' },
  observerGroundElevationUncertaintyM: { tr: 'Gözlemci zemin kotu belirsizliği', en: 'Observer-ground uncertainty' },
  targetHeightUncertaintyM: { tr: 'Hedef yüksekliği belirsizliği', en: 'Target-height uncertainty' },
  targetGroundElevationUncertaintyM: { tr: 'Hedef taban kotu belirsizliği', en: 'Target-base uncertainty' },
  refractionCoefficientUncertainty: { tr: 'k belirsizliği', en: 'k uncertainty' },
  shadowGnomonHeightM: { tr: 'Gnomon yüksekliği', en: 'Gnomon height' },
  shadowObservedLengthM: { tr: 'Gözlenen gölge uzunluğu', en: 'Observed shadow length' },
  shadowObservedLengthUncertaintyM: { tr: 'Gölge uzunluğu belirsizliği', en: 'Shadow-length uncertainty' },
  shadowObservedAzimuthDeg: { tr: 'Gözlenen gölge azimutu', en: 'Observed shadow azimuth' },
  shadowObservedAzimuthUncertaintyDeg: { tr: 'Gölge azimut belirsizliği', en: 'Shadow-azimuth uncertainty' },
  shadowStationBCoordinates: { tr: 'B istasyonu koordinatı', en: 'Station B coordinates' },
  shadowStationBGnomonHeightM: { tr: 'B gnomon yüksekliği', en: 'B gnomon height' },
  shadowStationBObservedLengthM: { tr: 'B gözlenen gölge uzunluğu', en: 'B observed shadow length' },
  shadowStationBObservedLengthUncertaintyM: { tr: 'B gölge uzunluğu belirsizliği', en: 'B shadow-length uncertainty' },
  shadowStationBObservedAzimuthDeg: { tr: 'B gözlenen gölge azimutu', en: 'B observed shadow azimuth' },
  shadowStationBObservedAzimuthUncertaintyDeg: { tr: 'B gölge azimut belirsizliği', en: 'B shadow-azimuth uncertainty' },
  stellarStarId: { tr: 'Yıldız kimliği', en: 'Star id' },
  stellarTrailDurationMinutes: { tr: 'Yıldız izi süresi', en: 'Star-trail duration' },
  stellarSampleIntervalMinutes: { tr: 'Yıldız örnekleme aralığı', en: 'Star sampling interval' },
  stellarLocalHorizonEnabled: { tr: 'Yerel ufuk', en: 'Local horizon' },
  stellarLocalHorizonNorthDeg: { tr: 'Yerel ufuk · K', en: 'Local horizon · N' },
  stellarLocalHorizonNorthEastDeg: { tr: 'Yerel ufuk · KD', en: 'Local horizon · NE' },
  stellarLocalHorizonEastDeg: { tr: 'Yerel ufuk · D', en: 'Local horizon · E' },
  stellarLocalHorizonSouthEastDeg: { tr: 'Yerel ufuk · GD', en: 'Local horizon · SE' },
  stellarLocalHorizonSouthDeg: { tr: 'Yerel ufuk · G', en: 'Local horizon · S' },
  stellarLocalHorizonSouthWestDeg: { tr: 'Yerel ufuk · GB', en: 'Local horizon · SW' },
  stellarLocalHorizonWestDeg: { tr: 'Yerel ufuk · B', en: 'Local horizon · W' },
  stellarLocalHorizonNorthWestDeg: { tr: 'Yerel ufuk · KB', en: 'Local horizon · NW' },
  eclipseSearchHalfWindowHours: { tr: 'Tutulma arama yarı-penceresi', en: 'Eclipse search half-window' },
  cameraCalibration: { tr: 'Kamera / FOV', en: 'Camera / FOV' },
  waterSurface: { tr: 'Su yüzeyi', en: 'Water surface' }
};

const statusLabels: Record<ExperimentSetupCandidateStatus, LocaleText> = {
  found: { tr: 'BULUNDU', en: 'FOUND' },
  review: { tr: 'KONTROL GEREKLİ', en: 'REVIEW REQUIRED' },
  unavailable: { tr: 'KULLANILAMADI', en: 'UNAVAILABLE' }
};

const scenarioKeys: Record<SimulationScenarioId, TranslationKey> = {
  'target-visibility': 'scenario.targetVisibility.label',
  horizon: 'scenario.horizon.label',
  'long-distance-visibility': 'scenario.longDistanceVisibility.label',
  'sun-moon-observation': 'scenario.sunMoon.label',
  'shadow-observation': 'scenario.shadow.label',
  'stellar-observation': 'scenario.stellar.label',
  'eclipse-simulation': 'scenario.eclipse.label'
};

function number(locale: AppLocale, value: number, max = 6): string {
  return new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: max }).format(value);
}

function utcOffsetLabel(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(totalMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
}

function datum(locale: AppLocale, value: string | undefined): string | undefined {
  const values: Record<string, LocaleText> = {
    'orthometric-msl': { tr: 'Ortalama deniz seviyesi', en: 'Mean sea level' },
    'ellipsoidal-wgs84': { tr: 'WGS84 elipsoidal', en: 'WGS84 ellipsoidal' },
    local: { tr: 'Yerel düşey referans', en: 'Local vertical reference' }
  };
  return value ? values[value]?.[locale] : undefined;
}

function atmosphere(locale: AppLocale, value: string | undefined): string | undefined {
  const values: Record<string, LocaleText> = {
    off: { tr: 'Kapalı', en: 'Off' },
    standard: { tr: 'Standart k', en: 'Standard k' },
    profile: { tr: 'Katmanlı profil', en: 'Layered profile' }
  };
  return value ? values[value]?.[locale] : undefined;
}

export function textSetupFieldLabel(locale: AppLocale, fieldId: ExperimentSetupFieldId): string {
  return fieldLabels[fieldId][locale];
}

export function textSetupStatusLabel(locale: AppLocale, status: ExperimentSetupCandidateStatus): string {
  return statusLabels[status][locale];
}

export function textSetupCandidateDisplayValue(locale: AppLocale, candidate: ExperimentSetupCandidate): string {
  if (candidate.fieldId === 'scenarioId' && candidate.stringValue) {
    const key = scenarioKeys[candidate.stringValue as SimulationScenarioId];
    if (key) return translate(locale, key);
  }
  if (candidate.fieldId === 'verticalDatumKind') return datum(locale, candidate.stringValue) ?? candidate.displayValue;
  if (candidate.fieldId === 'atmosphereMode') return atmosphere(locale, candidate.stringValue) ?? candidate.displayValue;
  if (candidate.fieldId === 'cameraCalibration') return locale === 'tr' ? 'Fotoğraf kalibrasyon paneli gerekli' : 'Photo calibration panel required';
  if (candidate.fieldId === 'waterSurface') return locale === 'tr' ? 'Su yüzeyi kayıt paneli gerekli' : 'Water-surface record panel required';
  if (candidate.fieldId === 'stellarLocalHorizonEnabled' && candidate.stringValue) {
    const enabled = candidate.stringValue === 'true' || candidate.stringValue === 'enabled';
    return enabled ? (locale === 'tr' ? 'Etkin' : 'Enabled') : (locale === 'tr' ? 'Kapalı' : 'Off');
  }
  if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
    return `${number(locale, candidate.latitudeDeg, 6)}°, ${number(locale, candidate.longitudeDeg, 6)}°`;
  }
  if (candidate.numericValue === undefined) return candidate.stringValue ?? candidate.displayValue;

  const value = candidate.numericValue;
  const uncertainty = candidate.fieldId.includes('Uncertainty');
  switch (candidate.fieldId) {
    case 'utcOffsetMinutes': return utcOffsetLabel(value);
    case 'surfaceDistanceKm': return `${number(locale, value)} km`;
    case 'observedVisiblePercent': return locale === 'tr' ? `%${number(locale, value)}` : `${number(locale, value)}%`;
    case 'observationUncertaintyPercent': return locale === 'tr' ? `±%${number(locale, value)}` : `±${number(locale, value)}%`;
    case 'refractionCoefficient': return `k=${number(locale, value, 4)}`;
    case 'refractionCoefficientUncertainty': return `±${number(locale, Math.abs(value), 4)}`;
    case 'shadowObservedAzimuthDeg':
    case 'shadowObservedAzimuthUncertaintyDeg':
    case 'shadowStationBObservedAzimuthDeg':
    case 'shadowStationBObservedAzimuthUncertaintyDeg':
    case 'stellarLocalHorizonNorthDeg':
    case 'stellarLocalHorizonNorthEastDeg':
    case 'stellarLocalHorizonEastDeg':
    case 'stellarLocalHorizonSouthEastDeg':
    case 'stellarLocalHorizonSouthDeg':
    case 'stellarLocalHorizonSouthWestDeg':
    case 'stellarLocalHorizonWestDeg':
    case 'stellarLocalHorizonNorthWestDeg':
      return `${uncertainty ? '±' : ''}${number(locale, Math.abs(value))}°`;
    case 'stellarTrailDurationMinutes':
    case 'stellarSampleIntervalMinutes': return `${number(locale, value)} min`;
    case 'eclipseSearchHalfWindowHours': return `${number(locale, value)} h`;
    default: return `${uncertainty ? '±' : ''}${number(locale, Math.abs(value))} m`;
  }
}

export function textSetupCandidateReason(locale: AppLocale, reason: string | undefined): string | undefined {
  if (!reason || locale === 'tr') return reason;
  if (reason.includes('birim belirtilmeli')) return 'A unit must be specified for this field.';
  if (reason.includes('desteklenen aralığın dışında') || reason.includes('birimi tanınmıyor')) return 'The value is outside the supported range or its unit is not recognized.';
  if (reason.includes('birbiriyle çelişen')) return 'More than one conflicting value was found for the same field.';
  if (reason.includes('hem birimli hem de eksik/şüpheli')) return 'Both a unit-qualified and a missing/suspicious expression were found for the same field; user review is required.';
  if (reason.includes('Enlem/boylam') || reason.includes('Koordinat enlem,boylam')) return 'Coordinates must be latitude,longitude values inside the supported WGS84 range.';
  if (reason.includes('Katmanlı profil')) return 'Layered-profile data and provenance must be verified separately; the mode alone is not applied automatically.';
  if (reason.includes('FOV tek başına')) return 'FOV cannot be applied safely by itself; image dimensions, calibration method and marking provenance are required.';
  if (reason.includes('Su seviyesi;')) return 'Water level is not applied automatically without datum, observation time, source type and uncertainty provenance.';
  if (reason.includes('GGL-AI-TEST değeri desteklenen aralıkta geçerli bir sayı değil')) return 'The GGL-AI-TEST value is not a valid number inside the supported range.';
  return 'This value requires user review before it can be applied.';
}

export function textSetupNote(locale: AppLocale, note: string): string {
  if (locale === 'tr') return note;
  if (note === 'Koordinat alanı uygulanırsa mesafe kaynağı otomatik olarak WGS84 koordinat moduna alınır.') return 'Applying a coordinate field automatically switches the distance source to WGS84 coordinate mode.';
  if (note === 'Mevcut deterministik ayrıştırıcı bu metinde güvenle eşleyebileceği bir deney alanı bulamadı.') return 'The current deterministic parser did not find an experiment field it could match safely in this text.';
  if (note === 'Birden fazla GGL-AI-TEST v1 bloğu bulundu; yalnız ilk blok ayrıştırıldı.') return 'More than one GGL-AI-TEST v1 block was found; only the first block was parsed.';
  if (note.includes('END GGL-AI-TEST satırı eksik')) return 'A GGL-AI-TEST v1 start marker was found but END GGL-AI-TEST is missing; the canonical block was not applied.';
  if (note === 'GGL-AI-TEST v1 kanonik bloğu bulundu; alanlar deterministik anahtar sözleşmesiyle ayrıştırıldı.') return 'A canonical GGL-AI-TEST v1 block was found; fields were parsed using the deterministic key contract.';
  const badLine = /^GGL-AI-TEST satırı anahtar:değer biçiminde değil: “(.+)”$/u.exec(note);
  if (badLine) return `GGL-AI-TEST line is not in key:value form: “${badLine[1]}”`;
  const unknown = /^GGL-AI-TEST v1 anahtarı tanınmıyor ve uygulanmadı: (.+)$/u.exec(note);
  if (unknown) return `GGL-AI-TEST v1 key is unknown and was not applied: ${unknown[1]}`;
  return 'The parser produced an additional review note for this draft.';
}

export function textSetupCurrentValue(locale: AppLocale, fieldId: ExperimentSetupFieldId, current: TextSetupCurrentState): string {
  const { inputs, modelUncertainty } = current;
  const undefinedValue = locale === 'tr' ? 'tanımsız' : 'undefined';
  const metres = (value: number): string => `${number(locale, value)} m`;
  const optionalMetres = (value: number | undefined): string => value === undefined ? undefinedValue : `±${number(locale, value)} m`;
  switch (fieldId) {
    case 'scenarioId': return translate(locale, scenarioKeys[current.scenarioId]);
    case 'experimentName': return current.experimentName || (locale === 'tr' ? 'Adsız / yeni deney' : 'Unnamed / new experiment');
    case 'observedAtUtc': return new Date(current.observedAtIso).toISOString();
    case 'utcOffsetMinutes': return utcOffsetLabel(current.utcOffsetMinutes);
    case 'surfaceDistanceKm': return `${number(locale, inputs.surfaceDistanceKm)} km · ${inputs.distanceSource === 'coordinates' ? (locale === 'tr' ? 'koordinat modu' : 'coordinate mode') : (locale === 'tr' ? 'manuel' : 'manual')}`;
    case 'observerHeightM': return metres(inputs.observerHeightM);
    case 'targetHeightM': return metres(inputs.targetHeightM);
    case 'observerGroundElevationM': return metres(inputs.observerGroundElevationM);
    case 'targetGroundElevationM': return metres(inputs.targetGroundElevationM);
    case 'observerCoordinates': return `${number(locale, inputs.observerLatitudeDeg, 6)}°, ${number(locale, inputs.observerLongitudeDeg, 6)}°`;
    case 'targetCoordinates': return `${number(locale, inputs.targetLatitudeDeg, 6)}°, ${number(locale, inputs.targetLongitudeDeg, 6)}°`;
    case 'observedVisiblePercent': return locale === 'tr' ? `%${number(locale, inputs.observedVisiblePercent)}` : `${number(locale, inputs.observedVisiblePercent)}%`;
    case 'observationUncertaintyPercent': return locale === 'tr' ? `±%${number(locale, inputs.observationUncertaintyPercent)}` : `±${number(locale, inputs.observationUncertaintyPercent)}%`;
    case 'verticalDatumKind': return datum(locale, inputs.verticalDatumKind) ?? inputs.verticalDatumKind;
    case 'verticalDatumOffsetM': return metres(inputs.verticalDatumOffsetM);
    case 'atmosphereMode': return atmosphere(locale, current.atmosphereMode) ?? current.atmosphereMode;
    case 'refractionCoefficient': return `k=${number(locale, inputs.refractionCoefficient, 4)}`;
    case 'surfaceDistanceUncertaintyM': return optionalMetres(modelUncertainty.surfaceDistanceM);
    case 'observerEyeHeightUncertaintyM': return optionalMetres(modelUncertainty.observerEyeHeightM);
    case 'observerGroundElevationUncertaintyM': return optionalMetres(modelUncertainty.observerGroundElevationM);
    case 'targetHeightUncertaintyM': return optionalMetres(modelUncertainty.targetHeightM);
    case 'targetGroundElevationUncertaintyM': return optionalMetres(modelUncertainty.targetGroundElevationM);
    case 'refractionCoefficientUncertainty': return modelUncertainty.refractionCoefficient === undefined ? undefinedValue : `±${number(locale, modelUncertainty.refractionCoefficient, 4)}`;
    case 'cameraCalibration': return locale === 'tr' ? 'Fotoğraf panelinden yönetilir' : 'Managed from the photo panel';
    case 'waterSurface': return locale === 'tr' ? 'Su yüzeyi panelinden yönetilir' : 'Managed from the water-surface panel';
    default: return locale === 'tr' ? 'Senaryo özel ayarı' : 'Scenario-specific setting';
  }
}
