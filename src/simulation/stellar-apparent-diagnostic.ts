import type { CalculationTrace } from '../shared/domain';
import {
  calculateStellarAtmosphericRefraction,
  type StellarAtmosphericRefractionResult
} from './stellar-atmospheric-refraction';
import {
  evaluateStellarLocalHorizon,
  type StellarLocalHorizonMask,
  type StellarLocalHorizonResult
} from './stellar-local-horizon';

export const STELLAR_APPARENT_DIAGNOSTIC_ALGORITHM_ID = 'stellar-apparent-geometric-skyline-diagnostic';
export const STELLAR_APPARENT_DIAGNOSTIC_ALGORITHM_VERSION = '0.1.0';

export type StellarApparentLocalComparisonKind =
  | 'no-local-skyline'
  | 'mixed-reference-diagnostic';

export interface StellarApparentDiagnosticResult {
  geometricAltitudeDeg: number;
  azimuthDeg: number | null;
  refraction: StellarAtmosphericRefractionResult;
  localHorizon: StellarLocalHorizonResult | null;
  geometricLocalClearanceDeg: number | null;
  starOnlyApparentMinusGeometricSkylineDeg: number | null;
  localComparisonKind: StellarApparentLocalComparisonKind;
  localVisibilityClassified: false;
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

export class StellarApparentDiagnosticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarApparentDiagnosticError';
  }
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function validateAzimuth(azimuthDeg: number | null): void {
  if (azimuthDeg === null) return;
  if (!Number.isFinite(azimuthDeg)) {
    throw new StellarApparentDiagnosticError('Yıldız azimutu sonlu bir sayı veya null olmalıdır.');
  }
}

/**
 * Produces an explicitly frame-separated atmospheric-refraction diagnostic.
 *
 * Safe comparisons:
 * - geometric stellar altitude vs. a geometric local skyline;
 * - apparent stellar altitude vs. the apparent astronomical 0° reference.
 *
 * When a geometric local skyline is supplied, the function also exposes the
 * numeric difference `apparent star altitude - geometric skyline altitude`.
 * That value deliberately remains a mixed-reference diagnostic and MUST NOT
 * be interpreted as local optical visibility, because the skyline ray itself
 * has not been refracted/modelled under matching atmospheric conditions.
 */
export function calculateStellarApparentDiagnostic(input: {
  geometricAltitudeDeg: number;
  azimuthDeg: number | null;
  localHorizonMask?: StellarLocalHorizonMask;
  label?: string;
}): StellarApparentDiagnosticResult {
  validateAzimuth(input.azimuthDeg);
  const refraction = calculateStellarAtmosphericRefraction(input.geometricAltitudeDeg);

  if (input.localHorizonMask && input.azimuthDeg === null) {
    throw new StellarApparentDiagnosticError(
      'Yerel skyline karşılaştırması için yıldız azimutu tanımlı olmalıdır.'
    );
  }

  const localHorizon = input.localHorizonMask && input.azimuthDeg !== null
    ? evaluateStellarLocalHorizon({
        geometricAltitudeDeg: input.geometricAltitudeDeg,
        azimuthDeg: input.azimuthDeg,
        mask: input.localHorizonMask,
        label: input.label
      })
    : null;

  const geometricLocalClearanceDeg = localHorizon?.geometricClearanceDeg ?? null;
  const starOnlyApparentMinusGeometricSkylineDeg = localHorizon
    ? refraction.apparentAltitudeDeg - localHorizon.localHorizonAltitudeDeg
    : null;
  const localComparisonKind: StellarApparentLocalComparisonKind = localHorizon
    ? 'mixed-reference-diagnostic'
    : 'no-local-skyline';

  const warnings = [
    ...refraction.warnings,
    ...(localHorizon
      ? [
          'Yerel skyline geometrik referanstadır; yalnız yıldız ışınına standart atmosferik kırılma uygulanmıştır.',
          '“Apparent yıldız yüksekliği − geometrik skyline” farkı karma referanslı tanısal değerdir ve yerel optik görünürlük sınıfı değildir.',
          'Yerel görünürlüğü apparent referansta sınıflandırmak için skyline/terrain ışınının da aynı atmosfer modeli ve gözlem koşulları altında optik olarak çözülmesi gerekir.'
        ]
      : [
          'Yerel skyline verilmedi; sonuç yalnız geometrik ve standart-refraction apparent astronomik yükseklikleri ayırır.'
        ])
  ];

  const traceId = `${STELLAR_APPARENT_DIAGNOSTIC_ALGORITHM_ID}:${input.geometricAltitudeDeg.toFixed(8)}:${input.azimuthDeg === null ? 'az-null' : input.azimuthDeg.toFixed(8)}:${localHorizon?.traceId ?? 'no-local'}`;
  const trace: CalculationTrace = {
    summary: localHorizon
      ? 'Geometrik yıldız/skyline açıklığı ile yalnız yıldıza uygulanmış standart atmosferik kırılma sonucu ayrı referanslarda hesaplandı; karma apparent-skyline farkı yalnız tanısal olarak raporlandı.'
      : 'Geometrik yıldız yüksekliği ile standart atmosferik kırılma sonrası apparent yıldız yüksekliği ayrı olarak hesaplandı.',
    assumptions: warnings,
    steps: [
      ...refraction.trace.steps.map((step) => ({ ...step, id: `refraction-${step.id}` })),
      ...(localHorizon
        ? localHorizon.trace.steps.map((step) => ({ ...step, id: `local-${step.id}` }))
        : []),
      ...(localHorizon && starOnlyApparentMinusGeometricSkylineDeg !== null
        ? [{
            id: 'mixed-reference-difference',
            title: 'Karma referanslı apparent-skyline farkı',
            formula: 'Δh_tanı = h_apparent,yıldız − h_geometrik,skyline',
            substitution: `h_apparent,yıldız=${format(refraction.apparentAltitudeDeg, 9)}°; h_geometrik,skyline=${format(localHorizon.localHorizonAltitudeDeg, 9)}°`,
            result: `Δh_tanı=${format(starOnlyApparentMinusGeometricSkylineDeg, 9)}°; görünürlük sınıflandırması yapılmadı`
          }]
        : [])
    ]
  };

  return {
    geometricAltitudeDeg: input.geometricAltitudeDeg,
    azimuthDeg: input.azimuthDeg,
    refraction,
    localHorizon,
    geometricLocalClearanceDeg,
    starOnlyApparentMinusGeometricSkylineDeg,
    localComparisonKind,
    localVisibilityClassified: false,
    traceId,
    trace,
    warnings
  };
}
