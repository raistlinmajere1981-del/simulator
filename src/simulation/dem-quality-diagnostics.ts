import type {
  DemTerrainDiagnosticStatus,
  DemTerrainSamplingMethod
} from '../shared/simulator';

const METRES_PER_LATITUDE_DEGREE = 111_132;
const METRES_PER_LONGITUDE_DEGREE_AT_EQUATOR = 111_320;

export interface DemQualityPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  elevationM: number;
}

export interface DemQualityInput {
  cellSizeDeg: number;
  sampleSpacingM: number;
  samplingMethod: DemTerrainSamplingMethod;
  westBoundaryDeg: number;
  eastBoundaryDeg: number;
  southBoundaryDeg: number;
  northBoundaryDeg: number;
  points: readonly DemQualityPoint[];
}

export interface DemQualityDiagnostics {
  diagnosticStatus: DemTerrainDiagnosticStatus;
  effectiveCellSpanM: number;
  sampleSpacingToCellRatio: number;
  minimumCoverageMarginM: number;
  coverageMarginCellRatio: number;
  minimumElevationM: number;
  maximumElevationM: number;
  elevationRangeM: number;
  warnings: string[];
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function longitudeMetresPerDegree(latitudeDeg: number): number {
  return METRES_PER_LONGITUDE_DEGREE_AT_EQUATOR * Math.max(
    0.01,
    Math.abs(Math.cos(latitudeDeg * Math.PI / 180))
  );
}

function validate(input: DemQualityInput): void {
  if (!finite(input.cellSizeDeg) || input.cellSizeDeg <= 0 || input.cellSizeDeg > 180) {
    throw new RangeError('DEM tanısı için hücre boyutu 0…180 derece aralığında olmalı.');
  }
  if (!finite(input.sampleSpacingM) || input.sampleSpacingM <= 0) {
    throw new RangeError('DEM tanısı için örnek aralığı pozitif olmalı.');
  }
  if (input.samplingMethod !== 'nearest' && input.samplingMethod !== 'bilinear') {
    throw new RangeError('DEM tanısı için örnekleme yöntemi geçersiz.');
  }
  if (!finite(input.westBoundaryDeg) || !finite(input.eastBoundaryDeg) ||
    !finite(input.southBoundaryDeg) || !finite(input.northBoundaryDeg) ||
    input.westBoundaryDeg >= input.eastBoundaryDeg ||
    input.southBoundaryDeg >= input.northBoundaryDeg) {
    throw new RangeError('DEM tanısı için grid sınırları geçersiz.');
  }
  if (input.points.length < 2) {
    throw new RangeError('DEM tanısı için en az iki rota örneği gerekli.');
  }
  input.points.forEach((point, index) => {
    if (!finite(point.latitudeDeg) || !finite(point.longitudeDeg) ||
      !finite(point.elevationM)) {
      throw new RangeError(`${index + 1}. DEM tanı noktası sonlu değerler içermeli.`);
    }
    if (point.longitudeDeg < input.westBoundaryDeg ||
      point.longitudeDeg > input.eastBoundaryDeg ||
      point.latitudeDeg < input.southBoundaryDeg ||
      point.latitudeDeg > input.northBoundaryDeg) {
      throw new RangeError(`${index + 1}. DEM tanı noktası grid kapsamının dışında.`);
    }
  });
}

export function analyzeDemRouteQuality(
  input: DemQualityInput
): DemQualityDiagnostics {
  validate(input);

  const averageLatitudeDeg = input.points.reduce(
    (sum, point) => sum + point.latitudeDeg,
    0
  ) / input.points.length;
  const latitudeCellSpanM = input.cellSizeDeg * METRES_PER_LATITUDE_DEGREE;
  const longitudeCellSpanM = input.cellSizeDeg *
    longitudeMetresPerDegree(averageLatitudeDeg);
  const effectiveCellSpanM = Math.max(1, Math.min(
    latitudeCellSpanM,
    longitudeCellSpanM
  ));
  const sampleSpacingToCellRatio = input.sampleSpacingM / effectiveCellSpanM;

  let minimumCoverageMarginM = Number.POSITIVE_INFINITY;
  let minimumElevationM = Number.POSITIVE_INFINITY;
  let maximumElevationM = Number.NEGATIVE_INFINITY;

  for (const point of input.points) {
    const longitudeScale = longitudeMetresPerDegree(point.latitudeDeg);
    const marginM = Math.max(0, Math.min(
      (point.longitudeDeg - input.westBoundaryDeg) * longitudeScale,
      (input.eastBoundaryDeg - point.longitudeDeg) * longitudeScale,
      (point.latitudeDeg - input.southBoundaryDeg) * METRES_PER_LATITUDE_DEGREE,
      (input.northBoundaryDeg - point.latitudeDeg) * METRES_PER_LATITUDE_DEGREE
    ));
    minimumCoverageMarginM = Math.min(minimumCoverageMarginM, marginM);
    minimumElevationM = Math.min(minimumElevationM, point.elevationM);
    maximumElevationM = Math.max(maximumElevationM, point.elevationM);
  }

  const coverageMarginCellRatio = minimumCoverageMarginM / effectiveCellSpanM;
  const warnings: string[] = [];
  let diagnosticStatus: DemTerrainDiagnosticStatus = 'good';

  if (sampleSpacingToCellRatio > 1) {
    diagnosticStatus = 'limited';
    warnings.push(
      'Rota örnek aralığı etkili grid hücre genişliğinden büyük; dar arazi değişimleri atlanabilir.'
    );
  } else if (sampleSpacingToCellRatio > 0.5) {
    diagnosticStatus = 'caution';
    warnings.push(
      'Rota örnek aralığı etkili grid hücre genişliğinin yarısından büyük; daha sık örnekleme ayrıntıyı artırabilir.'
    );
  }

  if (coverageMarginCellRatio < 0.5) {
    diagnosticStatus = 'limited';
    warnings.push(
      'Rota grid sınırına yarım etkili hücreden daha yakın; küçük koordinat değişiklikleri kapsam dışına çıkabilir.'
    );
  } else if (coverageMarginCellRatio < 1) {
    if (diagnosticStatus === 'good') diagnosticStatus = 'caution';
    warnings.push(
      'Rota grid sınırına bir etkili hücreden daha yakın; kenar kapsaması sınırlıdır.'
    );
  }

  if (input.samplingMethod === 'nearest') {
    if (diagnosticStatus === 'good') diagnosticStatus = 'caution';
    warnings.push(
      'En yakın hücre yöntemi basamaklı yükseklik değişimleri üretebilir; sürekli profil için iki doğrusal yöntem daha uygundur.'
    );
  }

  return {
    diagnosticStatus,
    effectiveCellSpanM,
    sampleSpacingToCellRatio,
    minimumCoverageMarginM,
    coverageMarginCellRatio,
    minimumElevationM,
    maximumElevationM,
    elevationRangeM: maximumElevationM - minimumElevationM,
    warnings
  };
}
