import type { AtmosphereMode } from './atmosphere';
import { AI_TEST_SPEC_SCENARIOS, parseAiTestSpec } from './ai-test-spec';
import type { SimulationScenarioId } from './scenario';
import type { SimulatorInputs } from './simulator';
import type { VerticalDatumKind } from './terrain';
import type { ModelInputUncertaintySettings } from './uncertainty';

export const TEXT_EXPERIMENT_SETUP_PARSER_VERSION = '0.3.0';

export type ExperimentSetupFieldId =
  | 'scenarioId'
  | 'experimentName'
  | 'observedAtUtc'
  | 'utcOffsetMinutes'
  | 'surfaceDistanceKm'
  | 'observerHeightM'
  | 'targetHeightM'
  | 'observerGroundElevationM'
  | 'targetGroundElevationM'
  | 'observerCoordinates'
  | 'targetCoordinates'
  | 'observedVisiblePercent'
  | 'observationUncertaintyPercent'
  | 'verticalDatumKind'
  | 'verticalDatumOffsetM'
  | 'atmosphereMode'
  | 'refractionCoefficient'
  | 'surfaceDistanceUncertaintyM'
  | 'observerEyeHeightUncertaintyM'
  | 'observerGroundElevationUncertaintyM'
  | 'targetHeightUncertaintyM'
  | 'targetGroundElevationUncertaintyM'
  | 'refractionCoefficientUncertainty'
  | 'shadowGnomonHeightM'
  | 'shadowObservedLengthM'
  | 'shadowObservedLengthUncertaintyM'
  | 'shadowObservedAzimuthDeg'
  | 'shadowObservedAzimuthUncertaintyDeg'
  | 'shadowStationBCoordinates'
  | 'shadowStationBGnomonHeightM'
  | 'shadowStationBObservedLengthM'
  | 'shadowStationBObservedLengthUncertaintyM'
  | 'shadowStationBObservedAzimuthDeg'
  | 'shadowStationBObservedAzimuthUncertaintyDeg'
  | 'stellarStarId'
  | 'stellarTrailDurationMinutes'
  | 'stellarSampleIntervalMinutes'
  | 'stellarLocalHorizonEnabled'
  | 'stellarLocalHorizonNorthDeg'
  | 'stellarLocalHorizonNorthEastDeg'
  | 'stellarLocalHorizonEastDeg'
  | 'stellarLocalHorizonSouthEastDeg'
  | 'stellarLocalHorizonSouthDeg'
  | 'stellarLocalHorizonSouthWestDeg'
  | 'stellarLocalHorizonWestDeg'
  | 'stellarLocalHorizonNorthWestDeg'
  | 'eclipseSearchHalfWindowHours'
  | 'cameraCalibration'
  | 'waterSurface';

export type ExperimentSetupCandidateStatus = 'found' | 'review' | 'unavailable';

export interface ExperimentSetupCandidate {
  id: string;
  fieldId: ExperimentSetupFieldId;
  label: string;
  status: ExperimentSetupCandidateStatus;
  displayValue: string;
  sourceExcerpt: string;
  numericValue?: number;
  stringValue?: string;
  latitudeDeg?: number;
  longitudeDeg?: number;
  reason?: string;
}

export interface ExperimentSetupDraft {
  sourceText: string;
  parserVersion: typeof TEXT_EXPERIMENT_SETUP_PARSER_VERSION;
  candidates: ExperimentSetupCandidate[];
  notes: string[];
}

export interface TextSetupAppliedField {
  fieldId: ExperimentSetupFieldId;
  displayValue: string;
  sourceExcerpt: string;
}

export interface TextExperimentSetupProvenance {
  parserVersion: string;
  sourceText: string;
  appliedAtIso: string;
  appliedFields: TextSetupAppliedField[];
}


export interface ShadowTextSetupChanges {
  gnomonHeightM?: number;
  observedShadowLengthM?: number;
  observedShadowLengthUncertaintyM?: number;
  observedShadowAzimuthDeg?: number;
  observedShadowAzimuthUncertaintyDeg?: number;
}

export interface ShadowStationBTextSetupChanges extends ShadowTextSetupChanges {
  latitudeDeg?: number;
  longitudeDeg?: number;
}

export interface StellarTextSetupChanges {
  starId?: string;
  trailDurationMinutes?: number;
  trailSampleIntervalMinutes?: number;
  localHorizonEnabled?: boolean;
  localHorizonNorthDeg?: number;
  localHorizonNorthEastDeg?: number;
  localHorizonEastDeg?: number;
  localHorizonSouthEastDeg?: number;
  localHorizonSouthDeg?: number;
  localHorizonSouthWestDeg?: number;
  localHorizonWestDeg?: number;
  localHorizonNorthWestDeg?: number;
}

export interface ExperimentSetupApplication {
  scenarioId?: SimulationScenarioId;
  experimentName?: string;
  observedAtIso?: string;
  utcOffsetMinutes?: number;
  inputChanges: Partial<SimulatorInputs>;
  atmosphereMode?: AtmosphereMode;
  modelUncertaintyChanges: Partial<ModelInputUncertaintySettings>;
  shadowSettingsChanges?: ShadowTextSetupChanges;
  dualShadowStationBChanges?: ShadowStationBTextSetupChanges;
  stellarSettingsChanges?: StellarTextSetupChanges;
  eclipseSearchHalfWindowHours?: number;
  provenance: TextExperimentSetupProvenance;
}

const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`;
const LENGTH_UNIT = String.raw`(?:km|kilometre|kilometreler|m|metre|metreler|cm|santimetre)`;

interface RawCandidate extends Omit<ExperimentSetupCandidate, 'id'> {}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/[–—]/g, '-');
}

function parseNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

function normalizedUnit(unit: string): 'km' | 'm' | 'cm' | undefined {
  const lower = unit.toLocaleLowerCase('tr-TR');
  if (lower === 'km' || lower.startsWith('kilometre')) return 'km';
  if (lower === 'm' || lower.startsWith('metre')) return 'm';
  if (lower === 'cm' || lower.startsWith('santimetre')) return 'cm';
  return undefined;
}

function lengthToMetres(value: number, unit: string): number | undefined {
  const normalized = normalizedUnit(unit);
  if (normalized === 'km') return value * 1_000;
  if (normalized === 'm') return value;
  if (normalized === 'cm') return value / 100;
  return undefined;
}

function trNumber(value: number, max = 4): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: max }).format(value);
}

function excerpt(match: RegExpExecArray): string {
  return match[0].trim().replace(/\s+/g, ' ');
}

function addNumberMatches(
  target: RawCandidate[],
  text: string,
  options: {
    fieldId: ExperimentSetupFieldId;
    label: string;
    regex: RegExp;
    convert(value: number, unit?: string): number | undefined;
    display(value: number): string;
    validate(value: number): boolean;
    missingUnitReason?: string;
  }
): void {
  for (const match of text.matchAll(options.regex)) {
    const rawNumber = match.groups?.value;
    if (!rawNumber) continue;
    const parsed = parseNumber(rawNumber);
    if (!Number.isFinite(parsed)) continue;
    const rawUnit = match.groups?.unit;
    if (options.missingUnitReason && !rawUnit) {
      target.push({
        fieldId: options.fieldId,
        label: options.label,
        status: 'review',
        displayValue: trNumber(parsed),
        sourceExcerpt: excerpt(match as RegExpExecArray),
        reason: options.missingUnitReason
      });
      continue;
    }
    const converted = options.convert(parsed, rawUnit);
    if (converted === undefined || !options.validate(converted)) {
      target.push({
        fieldId: options.fieldId,
        label: options.label,
        status: 'review',
        displayValue: rawUnit ? `${trNumber(parsed)} ${rawUnit}` : trNumber(parsed),
        sourceExcerpt: excerpt(match as RegExpExecArray),
        reason: 'Değer desteklenen aralığın dışında veya birimi tanınmıyor.'
      });
      continue;
    }
    target.push({
      fieldId: options.fieldId,
      label: options.label,
      status: 'found',
      displayValue: options.display(converted),
      sourceExcerpt: excerpt(match as RegExpExecArray),
      numericValue: converted
    });
  }
}

function collapseConflicts(raw: RawCandidate[]): ExperimentSetupCandidate[] {
  const byField = new Map<ExperimentSetupFieldId, RawCandidate[]>();
  for (const candidate of raw) {
    const list = byField.get(candidate.fieldId) ?? [];
    list.push(candidate);
    byField.set(candidate.fieldId, list);
  }

  const collapsed: ExperimentSetupCandidate[] = [];
  let sequence = 0;
  for (const [fieldId, candidates] of byField) {
    const found = candidates.filter((candidate) => candidate.status === 'found');
    const review = candidates.filter((candidate) => candidate.status === 'review');
    const signatures = new Set(found.map((candidate) =>
      candidate.numericValue !== undefined
        ? `n:${candidate.numericValue}`
        : candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined
          ? `c:${candidate.latitudeDeg},${candidate.longitudeDeg}`
          : `s:${candidate.stringValue ?? candidate.displayValue}`
    ));
    if (signatures.size > 1 || (found.length > 0 && review.length > 0)) {
      collapsed.push({
        id: `${fieldId}-${sequence++}`,
        fieldId,
        label: candidates[0]?.label ?? fieldId,
        status: 'review',
        displayValue: candidates.map((candidate) => candidate.displayValue).join(' / '),
        sourceExcerpt: candidates.map((candidate) => candidate.sourceExcerpt).join(' | '),
        reason: signatures.size > 1
          ? 'Aynı alan için birbiriyle çelişen birden fazla değer bulundu.'
          : 'Aynı alan için hem birimli hem de eksik/şüpheli bir ifade bulundu; kullanıcı kontrolü gerekli.'
      });
      continue;
    }
    const best = found[0] ?? review[0] ?? candidates[0];
    if (best) collapsed.push({ ...best, id: `${fieldId}-${sequence++}` });
  }
  return collapsed;
}

function addKeywordCandidate(
  target: RawCandidate[],
  fieldId: ExperimentSetupFieldId,
  label: string,
  sourceExcerpt: string,
  displayValue: string,
  stringValue: string,
  status: ExperimentSetupCandidateStatus = 'found',
  reason?: string
): void {
  target.push({
    fieldId,
    label,
    status,
    displayValue,
    sourceExcerpt,
    stringValue,
    ...(reason ? { reason } : {})
  });
}

function parseCoordinatePair(
  target: RawCandidate[],
  text: string,
  role: 'gözlemci' | 'hedef',
  fieldId: 'observerCoordinates' | 'targetCoordinates',
  label: string
): void {
  const pair = new RegExp(
    String.raw`${role}\s+koordinat(?:ı|ları)?\s*[:=]?\s*(?<lat>${NUM})\s*[,;/]\s*(?<lon>${NUM})(?!\s*(?:m|km|cm))`,
    'giu'
  );
  for (const match of text.matchAll(pair)) {
    const lat = parseNumber(match.groups?.lat ?? '');
    const lon = parseNumber(match.groups?.lon ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const valid = lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    target.push({
      fieldId,
      label,
      status: valid ? 'found' : 'review',
      displayValue: `${trNumber(lat, 6)}°, ${trNumber(lon, 6)}°`,
      sourceExcerpt: excerpt(match as RegExpExecArray),
      ...(valid ? { latitudeDeg: lat, longitudeDeg: lon } : {}),
      ...(!valid ? { reason: 'Enlem/boylam desteklenen aralığın dışında.' } : {})
    });
  }

  const directional = new RegExp(
    String.raw`${role}[^\n.!?]{0,35}?(?<lat>${NUM})\s*°?\s*(?<ns>[NKG])[^\n.!?]{0,20}?(?<lon>${NUM})\s*°?\s*(?<ew>[EDBW])`,
    'giu'
  );
  for (const match of text.matchAll(directional)) {
    let lat = parseNumber(match.groups?.lat ?? '');
    let lon = parseNumber(match.groups?.lon ?? '');
    const ns = match.groups?.ns?.toLocaleUpperCase('tr-TR');
    const ew = match.groups?.ew?.toLocaleUpperCase('tr-TR');
    if (ns === 'G') lat *= -1;
    if (ew === 'B' || ew === 'W') lon *= -1;
    const valid = Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    target.push({
      fieldId,
      label,
      status: valid ? 'found' : 'review',
      displayValue: `${trNumber(lat, 6)}°, ${trNumber(lon, 6)}°`,
      sourceExcerpt: excerpt(match as RegExpExecArray),
      ...(valid ? { latitudeDeg: lat, longitudeDeg: lon } : {}),
      ...(!valid ? { reason: 'Enlem/boylam desteklenen aralığın dışında.' } : {})
    });
  }
}

export function parseExperimentSetupText(sourceText: string): ExperimentSetupDraft {
  const text = normalizeText(sourceText);
  const lower = text.toLocaleLowerCase('tr-TR');
  const raw: RawCandidate[] = [];
  const notes: string[] = [];
  const aiSpec = parseAiTestSpec(text);
  raw.push(...aiSpec.candidates);
  notes.push(...aiSpec.notes);

  const scenarioKeywords: Array<[string, SimulationScenarioId, string]> = [
    ['ufuk analizi', 'horizon', 'Ufuk Analizi'],
    ['uzun mesafe görüş', 'long-distance-visibility', 'Uzun Mesafe Görüş'],
    ['hedef görünürlüğü', 'target-visibility', 'Hedef Görünürlüğü'],
    ['güneş ve ay gözlemleri', 'sun-moon-observation', 'Güneş ve Ay Gözlemleri'],
    ['gölge deneyi', 'shadow-observation', 'Gölge Deneyi'],
    ['yıldız gözlemleri', 'stellar-observation', 'Yıldız Gözlemleri'],
    ['tutulma simülasyonları', 'eclipse-simulation', 'Tutulma Simülasyonları']
  ];
  for (const [keyword, value, label] of scenarioKeywords) {
    if (lower.includes(keyword)) addKeywordCandidate(raw, 'scenarioId', 'Senaryo', keyword, label, value);
  }

  addNumberMatches(raw, text, {
    fieldId: 'surfaceDistanceKm',
    label: 'Yüzey mesafesi',
    regex: new RegExp(String.raw`(?:(?:yüzey\s+mesafesi|mesafe)\s*[:=]?\s*|hedef\s+(?:yaklaşık\s+)?(?=(?:${NUM})\s*${LENGTH_UNIT}\s+(?:uzakta|mesafede)))(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})(?:\s+(?:uzakta|mesafede))?`, 'giu'),
    convert: (value, unit) => {
      const metres = unit ? lengthToMetres(value, unit) : undefined;
      return metres === undefined ? undefined : metres / 1_000;
    },
    display: (value) => `${trNumber(value)} km`,
    validate: (value) => value >= 0 && value <= 20_000,
    missingUnitReason: 'Mesafe için birim belirtilmeli.'
  });

  addNumberMatches(raw, text, {
    fieldId: 'observerHeightM',
    label: 'Göz yüksekliği',
    regex: new RegExp(String.raw`(?:göz\s*yüksekliği|kamera\s+(?:yerden|zeminden))\s*[:=]?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})?`, 'giu'),
    convert: (value, unit) => unit ? lengthToMetres(value, unit) : undefined,
    display: (value) => `${trNumber(value)} m`,
    validate: (value) => value >= 0 && value <= 100_000,
    missingUnitReason: 'Göz/kamera yüksekliği için birim belirtilmeli.'
  });

  addNumberMatches(raw, text, {
    fieldId: 'targetHeightM',
    label: 'Hedef yüksekliği',
    regex: new RegExp(String.raw`(?:hedef\s+(?:yüksekliği|nesnesi)?|hedef)[^\n.!?]{0,60}?(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})\s+(?:yüksekliğinde|yüksek|boyunda)`, 'giu'),
    convert: (value, unit) => unit ? lengthToMetres(value, unit) : undefined,
    display: (value) => `${trNumber(value)} m`,
    validate: (value) => value > 0 && value <= 100_000,
    missingUnitReason: 'Hedef yüksekliği için birim belirtilmeli.'
  });

  addNumberMatches(raw, text, {
    fieldId: 'observerGroundElevationM',
    label: 'Gözlemci zemin kotu',
    regex: new RegExp(String.raw`gözlemci[^\n.!?]{0,35}?(?:deniz\s+seviyesinden|zemin\s+kotu|rakımı)\s*[:=]?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'),
    convert: (value, unit) => unit ? lengthToMetres(value, unit) : undefined,
    display: (value) => `${trNumber(value)} m`,
    validate: (value) => value >= -12_000 && value <= 100_000
  });

  addNumberMatches(raw, text, {
    fieldId: 'targetGroundElevationM',
    label: 'Hedef taban kotu',
    regex: new RegExp(String.raw`hedef\s+(?:tabanı|zemini)[^\n.!?]{0,30}?(?:deniz\s+seviyesinden|zemin\s+kotu|rakımı)?\s*[:=]?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'),
    convert: (value, unit) => unit ? lengthToMetres(value, unit) : undefined,
    display: (value) => `${trNumber(value)} m`,
    validate: (value) => value >= -12_000 && value <= 100_000
  });

  parseCoordinatePair(raw, text, 'gözlemci', 'observerCoordinates', 'Gözlemci koordinatı');
  parseCoordinatePair(raw, text, 'hedef', 'targetCoordinates', 'Hedef koordinatı');

  addNumberMatches(raw, text, {
    fieldId: 'observedVisiblePercent',
    label: 'Gözlenen görünürlük',
    regex: new RegExp(String.raw`(?:gözlenen\s+görünürlük|görünürlük|görünen)\s*[:=]?\s*%?\s*(?<value>${NUM})\s*%?`, 'giu'),
    convert: (value) => value,
    display: (value) => `%${trNumber(value)}`,
    validate: (value) => value >= 0 && value <= 100
  });

  addNumberMatches(raw, text, {
    fieldId: 'observationUncertaintyPercent',
    label: 'Gözlem belirsizliği',
    regex: new RegExp(String.raw`(?:gözlem|görünürlük)\s+belirsizliği\s*(?:yaklaşık\s*)?[:=]?\s*±?\s*(?<value>${NUM})\s*%`, 'giu'),
    convert: (value) => Math.abs(value),
    display: (value) => `±%${trNumber(value)}`,
    validate: (value) => value >= 0 && value <= 100
  });

  const datumMatches: Array<[RegExp, VerticalDatumKind, string]> = [
    [/ortalama\s+deniz\s+seviyesi|ortometrik|\bmsl\b/iu, 'orthometric-msl', 'Ortalama deniz seviyesi'],
    [/wgs84[^\n.!?]{0,15}elipsoidal|elipsoidal\s+(?:yükseklik|datum)/iu, 'ellipsoidal-wgs84', 'WGS84 elipsoidal'],
    [/yerel\s+(?:düşey\s+)?(?:datum|referans)/iu, 'local', 'Yerel düşey referans']
  ];
  for (const [regex, value, display] of datumMatches) {
    const match = regex.exec(text);
    if (match) addKeywordCandidate(raw, 'verticalDatumKind', 'Düşey datum', match[0], display, value);
  }

  addNumberMatches(raw, text, {
    fieldId: 'verticalDatumOffsetM',
    label: 'Datum / gelgit ofseti',
    regex: new RegExp(String.raw`(?:datum|gelgit)\s+ofseti\s*[:=]?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'),
    convert: (value, unit) => unit ? lengthToMetres(value, unit) : undefined,
    display: (value) => `${trNumber(value)} m`,
    validate: (value) => value >= -1_000 && value <= 1_000
  });

  if (/standart\s+(?:atmosfer(?:ik)?\s+)?kırılma|standart\s+k\b/iu.test(text)) {
    const match = /standart\s+(?:atmosfer(?:ik)?\s+)?kırılma|standart\s+k\b/iu.exec(text)!;
    addKeywordCandidate(raw, 'atmosphereMode', 'Atmosfer modu', match[0], 'Standart k', 'standard');
  }
  if (/kırılma\s+(?:kapalı|yok)|atmosfer\s+kapalı/iu.test(text)) {
    const match = /kırılma\s+(?:kapalı|yok)|atmosfer\s+kapalı/iu.exec(text)!;
    addKeywordCandidate(raw, 'atmosphereMode', 'Atmosfer modu', match[0], 'Kapalı', 'off');
  }
  if (/katmanlı\s+(?:atmosfer|profil)/iu.test(text)) {
    const match = /katmanlı\s+(?:atmosfer|profil)/iu.exec(text)!;
    addKeywordCandidate(
      raw,
      'atmosphereMode',
      'Atmosfer modu',
      match[0],
      'Katmanlı profil',
      'profile',
      'review',
      'Katmanlı profil için sıcaklık, basınç, nem ve yükseklik örnekleri ayrı doğrulanmalıdır; yalnız mod otomatik uygulanmaz.'
    );
  }

  addNumberMatches(raw, text, {
    fieldId: 'refractionCoefficient',
    label: 'Kırılma katsayısı k',
    regex: new RegExp(String.raw`(?:kırılma\s+katsayısı\s*)?\bk\s*[:=]\s*(?<value>${NUM})`, 'giu'),
    convert: (value) => value,
    display: (value) => `k=${trNumber(value, 4)}`,
    validate: (value) => value >= -1 && value <= 0.99
  });

  const uncertaintySpecs: Array<{
    fieldId: ExperimentSetupFieldId;
    label: string;
    regex: RegExp;
    unitless?: boolean;
    max: number;
  }> = [
    { fieldId: 'surfaceDistanceUncertaintyM', label: 'Mesafe belirsizliği', regex: new RegExp(String.raw`mesafe\s+belirsizliği\s*(?:yaklaşık\s*)?[:=]?\s*±?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'), max: 20_000_000 },
    { fieldId: 'observerEyeHeightUncertaintyM', label: 'Göz yüksekliği belirsizliği', regex: new RegExp(String.raw`göz\s*yüksekliği\s+belirsizliği\s*[:=]?\s*±?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'), max: 100_000 },
    { fieldId: 'observerGroundElevationUncertaintyM', label: 'Gözlemci zemin kotu belirsizliği', regex: new RegExp(String.raw`gözlemci\s+(?:zemin\s+kotu|rakım)\s+belirsizliği\s*[:=]?\s*±?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'), max: 100_000 },
    { fieldId: 'targetHeightUncertaintyM', label: 'Hedef yüksekliği belirsizliği', regex: new RegExp(String.raw`hedef\s+yüksekliği\s+belirsizliği\s*[:=]?\s*±?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'), max: 100_000 },
    { fieldId: 'targetGroundElevationUncertaintyM', label: 'Hedef taban kotu belirsizliği', regex: new RegExp(String.raw`hedef\s+(?:taban|zemin)\s+kotu\s+belirsizliği\s*[:=]?\s*±?\s*(?<value>${NUM})\s*(?<unit>${LENGTH_UNIT})`, 'giu'), max: 100_000 },
    { fieldId: 'refractionCoefficientUncertainty', label: 'k belirsizliği', regex: new RegExp(String.raw`(?:k|kırılma\s+katsayısı)\s+belirsizliği\s*[:=]?\s*±?\s*(?<value>${NUM})`, 'giu'), unitless: true, max: 2 }
  ];
  for (const spec of uncertaintySpecs) {
    addNumberMatches(raw, text, {
      fieldId: spec.fieldId,
      label: spec.label,
      regex: spec.regex,
      convert: (value, unit) => spec.unitless ? Math.abs(value) : unit ? Math.abs(lengthToMetres(value, unit) ?? NaN) : undefined,
      display: (value) => spec.unitless ? `±${trNumber(value, 4)}` : `±${trNumber(value)} m`,
      validate: (value) => value >= 0 && value <= spec.max
    });
  }

  const fovMatch = /(?:yatay|düşey)?\s*fov\s*[:=]?\s*[0-9.,]+\s*°?/iu.exec(text);
  if (fovMatch) {
    addKeywordCandidate(raw, 'cameraCalibration', 'Kamera / FOV', fovMatch[0], 'Fotoğraf kalibrasyon paneli gerekli', 'camera', 'unavailable', 'FOV tek başına güvenli biçimde uygulanamaz; görüntü boyutu, kalibrasyon yöntemi ve işaret provenansı gerekir.');
  }
  const waterMatch = /su\s+seviyesi\s*[:=]?\s*[+-]?[0-9.,]+\s*(?:m|metre)/iu.exec(text);
  if (waterMatch) {
    addKeywordCandidate(raw, 'waterSurface', 'Su yüzeyi', waterMatch[0], 'Su yüzeyi kayıt paneli gerekli', 'water', 'unavailable', 'Su seviyesi; datum, gözlem zamanı, kaynak türü ve belirsizlik provenansı olmadan otomatik uygulanmaz.');
  }

  const candidates = collapseConflicts(raw);
  const foundCoordinates = candidates.some((candidate) => candidate.status === 'found' &&
    (candidate.fieldId === 'observerCoordinates' || candidate.fieldId === 'targetCoordinates'));
  if (foundCoordinates) notes.push('Koordinat alanı uygulanırsa mesafe kaynağı otomatik olarak WGS84 koordinat moduna alınır.');
  if (candidates.length === 0 && sourceText.trim() !== '') {
    notes.push('Mevcut deterministik ayrıştırıcı bu metinde güvenle eşleyebileceği bir deney alanı bulamadı.');
  }

  return {
    sourceText,
    parserVersion: TEXT_EXPERIMENT_SETUP_PARSER_VERSION,
    candidates,
    notes
  };
}

function numeric(candidate: ExperimentSetupCandidate): number | undefined {
  return candidate.status === 'found' && Number.isFinite(candidate.numericValue)
    ? candidate.numericValue
    : undefined;
}

export function buildExperimentSetupApplication(
  draft: ExperimentSetupDraft,
  selectedCandidateIds: readonly string[],
  appliedAtIso = new Date().toISOString()
): ExperimentSetupApplication {
  const selected = draft.candidates.filter((candidate) =>
    candidate.status === 'found' && selectedCandidateIds.includes(candidate.id)
  );
  const inputChanges: Partial<SimulatorInputs> = {};
  const modelUncertaintyChanges: Partial<ModelInputUncertaintySettings> = {};
  const shadowSettingsChanges: ShadowTextSetupChanges = {};
  const dualShadowStationBChanges: ShadowStationBTextSetupChanges = {};
  const stellarSettingsChanges: StellarTextSetupChanges = {};
  let eclipseSearchHalfWindowHours: number | undefined;
  let scenarioId: SimulationScenarioId | undefined;
  let experimentName: string | undefined;
  let observedAtIso: string | undefined;
  let utcOffsetMinutes: number | undefined;
  let atmosphereMode: AtmosphereMode | undefined;
  let coordinateApplied = false;

  for (const candidate of selected) {
    const value = numeric(candidate);
    switch (candidate.fieldId) {
      case 'scenarioId':
        if (candidate.stringValue && AI_TEST_SPEC_SCENARIOS.includes(candidate.stringValue as SimulationScenarioId)) scenarioId = candidate.stringValue as SimulationScenarioId;
        break;
      case 'experimentName': if (candidate.stringValue) experimentName = candidate.stringValue; break;
      case 'observedAtUtc': if (candidate.stringValue) observedAtIso = candidate.stringValue; break;
      case 'utcOffsetMinutes': if (value !== undefined) utcOffsetMinutes = value; break;
      case 'surfaceDistanceKm': if (value !== undefined) { inputChanges.surfaceDistanceKm = value; inputChanges.distanceSource = 'manual'; } break;
      case 'observerHeightM': if (value !== undefined) inputChanges.observerHeightM = value; break;
      case 'targetHeightM': if (value !== undefined) inputChanges.targetHeightM = value; break;
      case 'observerGroundElevationM': if (value !== undefined) inputChanges.observerGroundElevationM = value; break;
      case 'targetGroundElevationM': if (value !== undefined) inputChanges.targetGroundElevationM = value; break;
      case 'observerCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          inputChanges.observerLatitudeDeg = candidate.latitudeDeg;
          inputChanges.observerLongitudeDeg = candidate.longitudeDeg;
          coordinateApplied = true;
        }
        break;
      case 'targetCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          inputChanges.targetLatitudeDeg = candidate.latitudeDeg;
          inputChanges.targetLongitudeDeg = candidate.longitudeDeg;
          coordinateApplied = true;
        }
        break;
      case 'observedVisiblePercent': if (value !== undefined) inputChanges.observedVisiblePercent = value; break;
      case 'observationUncertaintyPercent': if (value !== undefined) inputChanges.observationUncertaintyPercent = value; break;
      case 'verticalDatumKind':
        if (candidate.stringValue === 'orthometric-msl' || candidate.stringValue === 'ellipsoidal-wgs84' || candidate.stringValue === 'local') inputChanges.verticalDatumKind = candidate.stringValue;
        break;
      case 'verticalDatumOffsetM': if (value !== undefined) inputChanges.verticalDatumOffsetM = value; break;
      case 'atmosphereMode':
        if (candidate.stringValue === 'off' || candidate.stringValue === 'standard') atmosphereMode = candidate.stringValue;
        break;
      case 'refractionCoefficient': if (value !== undefined) inputChanges.refractionCoefficient = value; break;
      case 'surfaceDistanceUncertaintyM': if (value !== undefined) modelUncertaintyChanges.surfaceDistanceM = value; break;
      case 'observerEyeHeightUncertaintyM': if (value !== undefined) modelUncertaintyChanges.observerEyeHeightM = value; break;
      case 'observerGroundElevationUncertaintyM': if (value !== undefined) modelUncertaintyChanges.observerGroundElevationM = value; break;
      case 'targetHeightUncertaintyM': if (value !== undefined) modelUncertaintyChanges.targetHeightM = value; break;
      case 'targetGroundElevationUncertaintyM': if (value !== undefined) modelUncertaintyChanges.targetGroundElevationM = value; break;
      case 'refractionCoefficientUncertainty': if (value !== undefined) modelUncertaintyChanges.refractionCoefficient = value; break;
      case 'shadowGnomonHeightM': if (value !== undefined) shadowSettingsChanges.gnomonHeightM = value; break;
      case 'shadowObservedLengthM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthM = value; break;
      case 'shadowObservedLengthUncertaintyM': if (value !== undefined) shadowSettingsChanges.observedShadowLengthUncertaintyM = value; break;
      case 'shadowObservedAzimuthDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthDeg = value; break;
      case 'shadowObservedAzimuthUncertaintyDeg': if (value !== undefined) shadowSettingsChanges.observedShadowAzimuthUncertaintyDeg = value; break;
      case 'shadowStationBCoordinates':
        if (candidate.latitudeDeg !== undefined && candidate.longitudeDeg !== undefined) {
          dualShadowStationBChanges.latitudeDeg = candidate.latitudeDeg;
          dualShadowStationBChanges.longitudeDeg = candidate.longitudeDeg;
        }
        break;
      case 'shadowStationBGnomonHeightM': if (value !== undefined) dualShadowStationBChanges.gnomonHeightM = value; break;
      case 'shadowStationBObservedLengthM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthM = value; break;
      case 'shadowStationBObservedLengthUncertaintyM': if (value !== undefined) dualShadowStationBChanges.observedShadowLengthUncertaintyM = value; break;
      case 'shadowStationBObservedAzimuthDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthDeg = value; break;
      case 'shadowStationBObservedAzimuthUncertaintyDeg': if (value !== undefined) dualShadowStationBChanges.observedShadowAzimuthUncertaintyDeg = value; break;
      case 'stellarStarId': if (candidate.stringValue) stellarSettingsChanges.starId = candidate.stringValue; break;
      case 'stellarTrailDurationMinutes': if (value !== undefined) stellarSettingsChanges.trailDurationMinutes = value; break;
      case 'stellarSampleIntervalMinutes': if (value !== undefined) stellarSettingsChanges.trailSampleIntervalMinutes = value; break;
      case 'stellarLocalHorizonEnabled': if (candidate.stringValue === 'true' || candidate.stringValue === 'false') stellarSettingsChanges.localHorizonEnabled = candidate.stringValue === 'true'; break;
      case 'stellarLocalHorizonNorthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthDeg = value; break;
      case 'stellarLocalHorizonNorthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthEastDeg = value; break;
      case 'stellarLocalHorizonEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonEastDeg = value; break;
      case 'stellarLocalHorizonSouthEastDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthEastDeg = value; break;
      case 'stellarLocalHorizonSouthDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthDeg = value; break;
      case 'stellarLocalHorizonSouthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonSouthWestDeg = value; break;
      case 'stellarLocalHorizonWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonWestDeg = value; break;
      case 'stellarLocalHorizonNorthWestDeg': if (value !== undefined) stellarSettingsChanges.localHorizonNorthWestDeg = value; break;
      case 'eclipseSearchHalfWindowHours': if (value !== undefined) eclipseSearchHalfWindowHours = value; break;
      default: break;
    }
  }

  if (coordinateApplied) inputChanges.distanceSource = 'coordinates';
  if (atmosphereMode !== undefined) inputChanges.useStandardRefraction = atmosphereMode === 'standard';

  return {
    ...(scenarioId ? { scenarioId } : {}),
    ...(experimentName ? { experimentName } : {}),
    ...(observedAtIso ? { observedAtIso } : {}),
    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
    inputChanges,
    ...(atmosphereMode ? { atmosphereMode } : {}),
    modelUncertaintyChanges,
    ...(Object.keys(shadowSettingsChanges).length > 0 ? { shadowSettingsChanges } : {}),
    ...(Object.keys(dualShadowStationBChanges).length > 0 ? { dualShadowStationBChanges } : {}),
    ...(Object.keys(stellarSettingsChanges).length > 0 ? { stellarSettingsChanges } : {}),
    ...(eclipseSearchHalfWindowHours !== undefined ? { eclipseSearchHalfWindowHours } : {}),
    provenance: {
      parserVersion: draft.parserVersion,
      sourceText: draft.sourceText,
      appliedAtIso,
      appliedFields: selected.map((candidate) => ({
        fieldId: candidate.fieldId,
        displayValue: candidate.displayValue,
        sourceExcerpt: candidate.sourceExcerpt
      }))
    }
  };
}
