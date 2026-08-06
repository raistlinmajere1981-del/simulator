import type { CalculationTrace } from '../shared/domain';

export type GeoidHeightDatum =
  | 'ellipsoidal-wgs84'
  | 'orthometric-msl';

export interface GeoidHeightConversionInput {
  valueM: number;
  from: GeoidHeightDatum;
  to: GeoidHeightDatum;
  /** Geoid undulation with the sign convention N = h - H. */
  geoidUndulationM: number;
  valueUncertaintyM?: number;
  geoidUndulationUncertaintyM?: number;
}

export interface GeoidHeightConversionResult {
  valueM: number;
  from: GeoidHeightDatum;
  to: GeoidHeightDatum;
  correctionM: number;
  geoidUndulationM: number;
  uncertaintyM: number | null;
  signConvention: 'N = h - H';
  traceId: string;
  trace: CalculationTrace;
  warnings: string[];
}

const MAX_ABSOLUTE_HEIGHT_M = 100_000;
const MAX_ABSOLUTE_GEOID_UNDULATION_M = 1_000;
const MAX_UNCERTAINTY_M = 10_000;

function finiteInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} ${minimum}…${maximum} m aralığında sonlu olmalı.`);
  }
}

function validateOptionalUncertainty(value: number | undefined, label: string): void {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0 || value > MAX_UNCERTAINTY_M) {
    throw new RangeError(`${label} 0…${MAX_UNCERTAINTY_M} m aralığında olmalı.`);
  }
}

function datumSymbol(datum: GeoidHeightDatum): 'h' | 'H' {
  return datum === 'ellipsoidal-wgs84' ? 'h' : 'H';
}

function datumLabel(datum: GeoidHeightDatum): string {
  return datum === 'ellipsoidal-wgs84'
    ? 'WGS84 elipsoidal yükseklik'
    : 'ortometrik yükseklik';
}

export function convertGeoidHeight(
  input: GeoidHeightConversionInput
): GeoidHeightConversionResult {
  finiteInRange(
    input.valueM,
    -MAX_ABSOLUTE_HEIGHT_M,
    MAX_ABSOLUTE_HEIGHT_M,
    'Yükseklik'
  );
  finiteInRange(
    input.geoidUndulationM,
    -MAX_ABSOLUTE_GEOID_UNDULATION_M,
    MAX_ABSOLUTE_GEOID_UNDULATION_M,
    'Jeoit ondülasyonu'
  );
  validateOptionalUncertainty(input.valueUncertaintyM, 'Yükseklik belirsizliği');
  validateOptionalUncertainty(
    input.geoidUndulationUncertaintyM,
    'Jeoit ondülasyonu belirsizliği'
  );

  const sameDatum = input.from === input.to;
  const correctionM = sameDatum
    ? 0
    : input.from === 'ellipsoidal-wgs84'
      ? -input.geoidUndulationM
      : input.geoidUndulationM;
  const valueM = input.valueM + correctionM;
  finiteInRange(
    valueM,
    -MAX_ABSOLUTE_HEIGHT_M,
    MAX_ABSOLUTE_HEIGHT_M,
    'Dönüştürülmüş yükseklik'
  );

  const hasUncertainty = input.valueUncertaintyM !== undefined ||
    input.geoidUndulationUncertaintyM !== undefined;
  const uncertaintyM = hasUncertainty
    ? Math.hypot(
        input.valueUncertaintyM ?? 0,
        sameDatum ? 0 : input.geoidUndulationUncertaintyM ?? 0
      )
    : null;
  const warnings = [
    'Jeoit ondülasyonu kullanıcı veya dış veri kaynağı tarafından sağlanır; bu motor otomatik jeoit modeli sorgulamaz.',
    'Girilen ondülasyonun deney koordinatına ve kullanılan jeoit modeline uygunluğu ayrıca doğrulanmalıdır.'
  ];
  if (sameDatum) {
    warnings.push('Kaynak ve hedef datum aynı olduğu için sayısal düzeltme uygulanmadı.');
  } else if (input.geoidUndulationUncertaintyM === undefined) {
    warnings.push('Jeoit ondülasyonu belirsizliği verilmedi; sonuç belirsizliğine eklenmedi.');
  }

  const fromSymbol = datumSymbol(input.from);
  const toSymbol = datumSymbol(input.to);
  const conversionFormula = sameDatum
    ? `${toSymbol} = ${fromSymbol}`
    : input.from === 'ellipsoidal-wgs84'
      ? 'H = h - N'
      : 'h = H + N';
  const signedOperator = correctionM >= 0 ? '+' : '−';
  const uncertaintyStep = uncertaintyM === null
    ? []
    : [{
        id: 'uncertainty',
        title: 'Bağımsız belirsizliklerin birleşimi',
        formula: 'u_out = √(u_height² + u_N²)',
        substitution: `√(${(input.valueUncertaintyM ?? 0).toFixed(6)}² + ${(sameDatum ? 0 : input.geoidUndulationUncertaintyM ?? 0).toFixed(6)}²)`,
        result: `${uncertaintyM.toFixed(6)} m`,
        note: sameDatum
          ? 'Datum değişmediği için jeoit ondülasyonu belirsizliği kullanılmadı.'
          : 'Yükseklik ve ondülasyon belirsizliklerinin bağımsız olduğu varsayıldı.'
      }];
  const trace: CalculationTrace = {
    summary: `${datumLabel(input.from)} → ${datumLabel(input.to)} dönüşümü.`,
    assumptions: [
      'Jeoit ondülasyonu işaret sözleşmesi N = h - H olarak tanımlıdır.',
      'h elipsoidal, H ortometrik yüksekliktir.',
      'Jeoit ondülasyonu dönüştürülen konum için geçerlidir.',
      ...(uncertaintyM === null
        ? []
        : ['Belirsizlik bileşenleri bağımsız kabul edilmiştir.'])
    ],
    steps: [
      {
        id: 'sign-convention',
        title: 'İşaret sözleşmesi',
        formula: 'N = h - H',
        substitution: `N = ${input.geoidUndulationM.toFixed(6)} m`,
        result: input.geoidUndulationM >= 0
          ? 'Jeoit elipsoide göre pozitif yöndedir.'
          : 'Jeoit elipsoide göre negatif yöndedir.'
      },
      {
        id: 'height-conversion',
        title: 'Yükseklik dönüşümü',
        formula: conversionFormula,
        substitution: sameDatum
          ? `${input.valueM.toFixed(6)} m`
          : `${input.valueM.toFixed(6)} m ${signedOperator} ${Math.abs(correctionM).toFixed(6)} m`,
        result: `${valueM.toFixed(6)} m`
      },
      ...uncertaintyStep
    ]
  };

  return {
    valueM,
    from: input.from,
    to: input.to,
    correctionM,
    geoidUndulationM: input.geoidUndulationM,
    uncertaintyM,
    signConvention: 'N = h - H',
    traceId: `geoid-height:${input.from}:${input.to}:${input.valueM}:${input.geoidUndulationM}`,
    trace,
    warnings
  };
}
