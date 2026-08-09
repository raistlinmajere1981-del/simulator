import type { CalculationTrace } from '../shared/domain';

export const STELLAR_REFRACTION_ALGORITHM_ID = 'stellar-refraction-noaa-standard';
export const STELLAR_REFRACTION_ALGORITHM_VERSION = '0.1.0';
export const STELLAR_REFRACTION_SOURCE = 'NOAA Global Monitoring Laboratory · Solar Calculator atmospheric refraction approximation';

export type StellarRefractionBranch =
  | 'zenith-negligible'
  | 'high-altitude-rational'
  | 'near-horizon-polynomial'
  | 'below-horizon-tangent';

export interface StellarAtmosphericRefractionResult {
  geometricAltitudeDeg: number;
  refractionCorrectionDeg: number;
  refractionCorrectionArcmin: number;
  apparentAltitudeDeg: number;
  aboveApparentAstronomicalHorizon: boolean;
  branch: StellarRefractionBranch;
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

export class StellarAtmosphericRefractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarAtmosphericRefractionError';
  }
}

const DEG_TO_RAD = Math.PI / 180;

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateAltitude(geometricAltitudeDeg: number): void {
  if (!Number.isFinite(geometricAltitudeDeg)) {
    throw new StellarAtmosphericRefractionError('Geometrik yıldız yüksekliği sonlu bir sayı olmalıdır.');
  }
  if (geometricAltitudeDeg < -90 || geometricAltitudeDeg > 90) {
    throw new StellarAtmosphericRefractionError('Geometrik yıldız yüksekliği -90° ile +90° arasında olmalıdır.');
  }
}

function correctionForAltitudeDeg(geometricAltitudeDeg: number): {
  correctionDeg: number;
  branch: StellarRefractionBranch;
  formula: string;
  substitution: string;
} {
  if (geometricAltitudeDeg >= 85) {
    return {
      correctionDeg: 0,
      branch: 'zenith-negligible',
      formula: 'R = 0',
      substitution: `h=${format(geometricAltitudeDeg)}° ≥ 85°`
    };
  }

  if (geometricAltitudeDeg > 5) {
    const tangent = Math.tan(geometricAltitudeDeg * DEG_TO_RAD);
    const correctionArcsec = 58.1 / tangent -
      0.07 / tangent ** 3 +
      0.000086 / tangent ** 5;
    return {
      correctionDeg: correctionArcsec / 3600,
      branch: 'high-altitude-rational',
      formula: 'R = [58.1/tan(h) - 0.07/tan³(h) + 0.000086/tan⁵(h)] / 3600',
      substitution: `h=${format(geometricAltitudeDeg)}°; tan(h)=${format(tangent, 9)}`
    };
  }

  if (geometricAltitudeDeg >= -0.575) {
    const h = geometricAltitudeDeg;
    const correctionArcsec = 1735 -
      518.2 * h +
      103.4 * h ** 2 -
      12.79 * h ** 3 +
      0.711 * h ** 4;
    return {
      correctionDeg: correctionArcsec / 3600,
      branch: 'near-horizon-polynomial',
      formula: 'R = [1735 - 518.2h + 103.4h² - 12.79h³ + 0.711h⁴] / 3600',
      substitution: `h=${format(h)}°`
    };
  }

  const tangent = Math.tan(geometricAltitudeDeg * DEG_TO_RAD);
  const correctionArcsec = -20.774 / tangent;
  return {
    correctionDeg: correctionArcsec / 3600,
    branch: 'below-horizon-tangent',
    formula: 'R = [-20.774/tan(h)] / 3600',
    substitution: `h=${format(geometricAltitudeDeg)}°; tan(h)=${format(tangent, 9)}`
  };
}

/**
 * Applies NOAA GML's standard piecewise atmospheric-refraction correction to
 * a geometric altitude. The NOAA expression is elevation-only and represents
 * a standard/approximate atmosphere; it is not a weather-resolved ray trace.
 *
 * The result is used for a point-source stellar altitude only. Solar
 * semidiameter or other disk-size corrections are intentionally absent.
 */
export function calculateStellarAtmosphericRefraction(
  geometricAltitudeDeg: number
): StellarAtmosphericRefractionResult {
  validateAltitude(geometricAltitudeDeg);
  const correction = correctionForAltitudeDeg(geometricAltitudeDeg);
  if (!Number.isFinite(correction.correctionDeg)) {
    throw new StellarAtmosphericRefractionError('Atmosferik kırılma düzeltmesi sonlu bir sonuç üretmedi.');
  }
  const apparentAltitudeDeg = geometricAltitudeDeg + correction.correctionDeg;
  const warnings = [
    `Kaynak yaklaşım: ${STELLAR_REFRACTION_SOURCE}.`,
    'Bu standart yaklaşım gerçek basınç, sıcaklık, nem, dalga boyu veya dikey atmosfer profilini kullanmaz.',
    'Atmosfer koşulları özellikle ufka yakın kırılmayı değiştirebilir; sonuç yaklaşık apparent altitude olarak yorumlanmalıdır.',
    'Bu katman yıldız sönümlemesi, gökyüzü parlaklığı, bulut, seeing veya çıplak-göz algı eşiği hesaplamaz.',
    'Yerel/topoğrafik skyline bu fonksiyonun dışında tutulur; apparent yıldız yüksekliği ile bir skyline karşılaştırması ayrıca açık bir gözlem sözleşmesi gerektirir.'
  ];
  const traceId = `${STELLAR_REFRACTION_ALGORITHM_ID}:${geometricAltitudeDeg.toFixed(8)}`;
  const trace: CalculationTrace = {
    summary: `Geometrik yıldız yüksekliğine NOAA standart atmosferik kırılma yaklaşımı uygulanarak apparent yükseklik hesaplandı.`,
    assumptions: warnings,
    steps: [
      {
        id: 'refraction-branch',
        title: 'Kırılma yaklaşımı bölgesi',
        formula: correction.formula,
        substitution: correction.substitution,
        result: `bölge=${correction.branch}; R=${format(correction.correctionDeg, 9)}° (${format(correction.correctionDeg * 60, 6)}′)`
      },
      {
        id: 'apparent-altitude',
        title: 'Apparent yıldız yüksekliği',
        formula: 'h_apparent = h_geometrik + R',
        substitution: `h_geometrik=${format(geometricAltitudeDeg)}°; R=${format(correction.correctionDeg, 9)}°`,
        result: `h_apparent=${format(apparentAltitudeDeg, 9)}°`
      }
    ]
  };

  return {
    geometricAltitudeDeg,
    refractionCorrectionDeg: correction.correctionDeg,
    refractionCorrectionArcmin: correction.correctionDeg * 60,
    apparentAltitudeDeg,
    aboveApparentAstronomicalHorizon: apparentAltitudeDeg >= 0,
    branch: correction.branch,
    traceId,
    trace,
    warnings
  };
}
