import type { SimulationScenarioId } from './scenario';
import type { VerticalDatumKind } from './terrain';
import type { ExperimentSetupFieldId } from './text-experiment-setup-types';
import {
  NUM,
  LENGTH_UNIT,
  addKeywordCandidate,
  addNumberMatches,
  lengthToMetres,
  parseCoordinatePair,
  trNumber
} from './text-experiment-setup-parser-core';
import type { RawCandidate } from './text-experiment-setup-parser-core';

export function addManualFreeTextCandidates(
  raw: RawCandidate[],
  text: string,
  lower: string
): void {
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
}
