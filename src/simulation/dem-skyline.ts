import type { CalculationTrace } from '../shared/domain';
import {
  sampleEsriAsciiGrid,
  type EsriAsciiGrid,
  type EsriAsciiGridSamplingMethod
} from './esri-ascii-grid';
import { coordinateAtWgs84BearingDistance } from './geodesic-path';
import { isValidCoordinate, type GeographicCoordinate } from './geodesy';
import { topocentricDirectionBetween } from './wgs84-topocentric';

export const DEM_SKYLINE_ALGORITHM_ID = 'dem-skyline-wgs84-topocentric';
export const DEM_SKYLINE_ALGORITHM_VERSION = '0.1.0';

const MAXIMUM_AZIMUTH_POINT_COUNT = 1_440;
const MAXIMUM_DISTANCE_M = 500_000;
const MAXIMUM_SAMPLE_BUDGET = 2_000_000;
const AZIMUTH_DIVISION_TOLERANCE = 1e-9;

export type DemSkylineRayStatus =
  | 'complete'
  | 'coverage-limited'
  | 'partial-nodata'
  | 'no-data'
  | 'no-coverage';

export interface DemSkylineInput {
  grid: EsriAsciiGrid;
  observer: GeographicCoordinate;
  observerHeightM: number;
  heightDatumToEllipsoidOffsetM: number;
  azimuthStepDeg: number;
  distanceStepM: number;
  maximumDistanceM: number;
  samplingMethod?: EsriAsciiGridSamplingMethod;
}

export interface DemSkylinePoint {
  azimuthDeg: number;
  elevationDeg: number | null;
  status: DemSkylineRayStatus;
  validSampleCount: number;
  noDataSampleCount: number;
  coverageDistanceM: number;
  criticalDistanceM: number | null;
  criticalTerrainElevationM: number | null;
  criticalLatitudeDeg: number | null;
  criticalLongitudeDeg: number | null;
  criticalTopocentricAzimuthDeg: number | null;
}

export interface DemSkylineResult {
  algorithmId: typeof DEM_SKYLINE_ALGORITHM_ID;
  algorithmVersion: typeof DEM_SKYLINE_ALGORITHM_VERSION;
  sourceFileName: string;
  samplingMethod: EsriAsciiGridSamplingMethod;
  observer: GeographicCoordinate;
  observerGroundElevationM: number;
  observerEyeEllipsoidalHeightM: number;
  heightDatumToEllipsoidOffsetM: number;
  azimuthStepDeg: number;
  distanceStepM: number;
  maximumDistanceM: number;
  pointCount: number;
  knownPointCount: number;
  completeRayCount: number;
  coverageLimitedRayCount: number;
  noDataAffectedRayCount: number;
  noCoverageRayCount: number;
  completeCoverage: boolean;
  geodesicFallbackSampleCount: number;
  points: DemSkylinePoint[];
  warnings: string[];
  traceId: string;
  trace: CalculationTrace;
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function within(value: number, minimum: number, maximum: number): boolean {
  return value >= minimum && value <= maximum;
}

function validate(input: DemSkylineInput): number {
  if (!isValidCoordinate(input.observer)) {
    throw new RangeError('DEM skyline gözlemci koordinatı WGS84 sınırlarında olmalı.');
  }
  if (!finite(input.observerHeightM) || input.observerHeightM < 0 ||
    input.observerHeightM > 20_000) {
    throw new RangeError('DEM skyline gözlemci yüksekliği 0…20000 m aralığında olmalı.');
  }
  if (!finite(input.heightDatumToEllipsoidOffsetM) ||
    Math.abs(input.heightDatumToEllipsoidOffsetM) > 20_000) {
    throw new RangeError('DEM → WGS84 elipsoid yükseklik ofseti sonlu ve ±20000 m içinde olmalı.');
  }
  if (!finite(input.azimuthStepDeg) || input.azimuthStepDeg <= 0 ||
    input.azimuthStepDeg > 90) {
    throw new RangeError('DEM skyline azimut adımı 0…90° aralığında olmalı.');
  }

  const azimuthPointCount = 360 / input.azimuthStepDeg;
  const roundedPointCount = Math.round(azimuthPointCount);
  if (Math.abs(azimuthPointCount - roundedPointCount) > AZIMUTH_DIVISION_TOLERANCE ||
    roundedPointCount < 4 || roundedPointCount > MAXIMUM_AZIMUTH_POINT_COUNT) {
    throw new RangeError(
      `Azimut adımı 360°'yi tam bölmeli ve 4…${MAXIMUM_AZIMUTH_POINT_COUNT} nokta üretmeli.`
    );
  }
  if (!finite(input.distanceStepM) || input.distanceStepM <= 0) {
    throw new RangeError('DEM skyline mesafe örnekleme adımı pozitif olmalı.');
  }
  if (!finite(input.maximumDistanceM) || input.maximumDistanceM < input.distanceStepM ||
    input.maximumDistanceM > MAXIMUM_DISTANCE_M) {
    throw new RangeError(
      `DEM skyline maksimum mesafesi örnek adımından küçük olamaz ve ${MAXIMUM_DISTANCE_M} m'yi aşamaz.`
    );
  }
  const samplesPerRay = Math.ceil(input.maximumDistanceM / input.distanceStepM);
  if (samplesPerRay * roundedPointCount > MAXIMUM_SAMPLE_BUDGET) {
    throw new RangeError(
      `DEM skyline örnek bütçesi ${MAXIMUM_SAMPLE_BUDGET.toLocaleString('tr-TR')} noktayı aşamaz.`
    );
  }
  if (input.samplingMethod !== undefined &&
    input.samplingMethod !== 'nearest' && input.samplingMethod !== 'bilinear') {
    throw new RangeError('DEM skyline örnekleme yöntemi geçersiz.');
  }
  if (!within(
    input.observer.longitudeDeg,
    input.grid.westBoundaryDeg,
    input.grid.eastBoundaryDeg
  ) || !within(
    input.observer.latitudeDeg,
    input.grid.southBoundaryDeg,
    input.grid.northBoundaryDeg
  )) {
    throw new RangeError('DEM skyline gözlemcisi grid kapsamının dışında.');
  }

  return roundedPointCount;
}

function coordinateInsideGrid(
  grid: EsriAsciiGrid,
  coordinate: GeographicCoordinate
): boolean {
  return within(coordinate.longitudeDeg, grid.westBoundaryDeg, grid.eastBoundaryDeg) &&
    within(coordinate.latitudeDeg, grid.southBoundaryDeg, grid.northBoundaryDeg);
}

function rayStatus(
  validSampleCount: number,
  noDataSampleCount: number,
  coverageDistanceM: number,
  maximumDistanceM: number
): DemSkylineRayStatus {
  if (validSampleCount === 0) {
    return coverageDistanceM <= 0 ? 'no-coverage' : 'no-data';
  }
  if (noDataSampleCount > 0) return 'partial-nodata';
  if (coverageDistanceM + 1e-6 < maximumDistanceM) return 'coverage-limited';
  return 'complete';
}

function makeTrace(
  input: DemSkylineInput,
  result: Pick<DemSkylineResult,
    | 'observerGroundElevationM'
    | 'observerEyeEllipsoidalHeightM'
    | 'pointCount'
    | 'knownPointCount'
    | 'completeRayCount'
    | 'coverageLimitedRayCount'
    | 'noDataAffectedRayCount'
    | 'noCoverageRayCount'
    | 'completeCoverage'
    | 'geodesicFallbackSampleCount'>
): CalculationTrace {
  return {
    summary: 'ESRI ASCII DEM, WGS84 jeodezik ışın örnekleme ve EPSG-style East/North/Up toposentrik geometriyle 360° geometrik skyline profiline dönüştürüldü.',
    assumptions: [
      'DEM koordinatları WGS84 coğrafi derece ızgarasıdır.',
      `DEM yüksekliklerine WGS84 elipsoidal yüksekliğe geçiş için tek sabit ${input.heightDatumToEllipsoidOffsetM.toFixed(3)} m ofset uygulanır.`,
      'Gözlemci zemin kotu DEM üzerinden aynı örnekleme yöntemiyle alınır; gözlemci göz yüksekliği bu zemine eklenir.',
      'Her azimut ışını WGS84 üzerinde doğrudan jeodezik çözümle yürütülür; hedef DEM hücresi ile gözlemci arasındaki yükselme açısı WGS84 geosentrik → toposentrik dönüşümden hesaplanır.',
      'Atmosferik kırılma, ışın bükülmesi, yapılar/bitki örtüsü ve DEM dışındaki arazi bu geometrik skyline hesabına dahil değildir.',
      'Grid dışına çıkan veya NODATA içeren yönler tam 360° kaynak olarak sessizce kabul edilmez.'
    ],
    steps: [
      {
        id: 'dem-skyline-observer',
        title: 'Gözlemci referansı',
        formula: 'h_eye,ellipsoid = h_DEM(observer) + Δh_datum + h_eye',
        substitution: `h_DEM=${result.observerGroundElevationM.toFixed(3)} m; Δh=${input.heightDatumToEllipsoidOffsetM.toFixed(3)} m; h_eye=${input.observerHeightM.toFixed(3)} m`,
        result: `h_eye,ellipsoid=${result.observerEyeEllipsoidalHeightM.toFixed(3)} m`
      },
      {
        id: 'dem-skyline-ray-sampling',
        title: '360° jeodezik ışın taraması',
        formula: 'A_i=i·ΔA; s_j=min(j·Δs,s_max)',
        substitution: `ΔA=${input.azimuthStepDeg}°; Δs=${input.distanceStepM} m; s_max=${input.maximumDistanceM} m`,
        result: `${result.pointCount} azimut; ${result.knownPointCount} yön için en az bir geçerli DEM örneği`
      },
      {
        id: 'dem-skyline-topocentric-angle',
        title: 'Toposentrik yükselme açısı',
        formula: 'elev = atan2(U_up, hypot(E_east,N_north))',
        substitution: 'WGS84 geosentrik noktalar → gözlemci ENU/toposentrik farkı',
        result: 'Her azimutta geçerli örneklerin maksimum geometrik yükselme açısı skyline olarak seçildi.'
      },
      {
        id: 'dem-skyline-coverage',
        title: 'Kapsama bütünlüğü',
        formula: 'tam ⇔ her azimut s_max mesafesine kadar NODATA boşluğu olmadan örneklendi',
        substitution: `tam=${result.completeRayCount}; kapsam-sınırlı=${result.coverageLimitedRayCount}; NODATA-etkili=${result.noDataAffectedRayCount}; kapsamasız=${result.noCoverageRayCount}`,
        result: result.completeCoverage ? '360° kapsama tam' : '360° kapsama eksik; otomatik yerel-ufuk kaynağı olarak fail-closed tutulmalı'
      },
      {
        id: 'dem-skyline-geodesic-method',
        title: 'Jeodezik çözüm durumu',
        formula: 'öncelik=Vincenty direct; yakınsama yoksa açık spherical fallback',
        substitution: `fallback örnek=${result.geodesicFallbackSampleCount}`,
        result: result.geodesicFallbackSampleCount === 0
          ? 'Bütün ışın noktaları Vincenty direct ile çözüldü.'
          : `${result.geodesicFallbackSampleCount} örnekte açıkça işaretlenmiş küresel yedek çözüm kullanıldı.`
      }
    ]
  };
}

export function generateDemSkyline(input: DemSkylineInput): DemSkylineResult {
  const pointCount = validate(input);
  const samplingMethod = input.samplingMethod ?? 'bilinear';
  const observerGroundElevationM = sampleEsriAsciiGrid(
    input.grid,
    input.observer.longitudeDeg,
    input.observer.latitudeDeg,
    samplingMethod
  );
  if (observerGroundElevationM === null) {
    throw new Error('Gözlemci konumunda geçerli DEM yüksekliği bulunamadı.');
  }

  const observerEyeEllipsoidalHeightM = observerGroundElevationM +
    input.heightDatumToEllipsoidOffsetM + input.observerHeightM;
  const observer3d = {
    ...input.observer,
    ellipsoidalHeightM: observerEyeEllipsoidalHeightM
  };
  const samplesPerRay = Math.ceil(input.maximumDistanceM / input.distanceStepM);
  const points: DemSkylinePoint[] = [];
  let geodesicFallbackSampleCount = 0;

  for (let azimuthIndex = 0; azimuthIndex < pointCount; azimuthIndex += 1) {
    const azimuthDeg = azimuthIndex * input.azimuthStepDeg;
    let maximumElevationDeg = Number.NEGATIVE_INFINITY;
    let criticalDistanceM: number | null = null;
    let criticalTerrainElevationM: number | null = null;
    let criticalLatitudeDeg: number | null = null;
    let criticalLongitudeDeg: number | null = null;
    let criticalTopocentricAzimuthDeg: number | null = null;
    let validSampleCount = 0;
    let noDataSampleCount = 0;
    let coverageDistanceM = 0;

    for (let sampleIndex = 1; sampleIndex <= samplesPerRay; sampleIndex += 1) {
      const distanceM = Math.min(
        sampleIndex * input.distanceStepM,
        input.maximumDistanceM
      );
      const direct = coordinateAtWgs84BearingDistance(
        input.observer,
        azimuthDeg,
        distanceM
      );
      if (direct.method === 'spherical-fallback') {
        geodesicFallbackSampleCount += 1;
      }
      if (!coordinateInsideGrid(input.grid, direct.coordinate)) break;
      coverageDistanceM = distanceM;

      const terrainElevationM = sampleEsriAsciiGrid(
        input.grid,
        direct.coordinate.longitudeDeg,
        direct.coordinate.latitudeDeg,
        samplingMethod
      );
      if (terrainElevationM === null) {
        noDataSampleCount += 1;
        continue;
      }

      validSampleCount += 1;
      const direction = topocentricDirectionBetween(observer3d, {
        ...direct.coordinate,
        ellipsoidalHeightM: terrainElevationM + input.heightDatumToEllipsoidOffsetM
      });
      if (direction.elevationDeg > maximumElevationDeg) {
        maximumElevationDeg = direction.elevationDeg;
        criticalDistanceM = distanceM;
        criticalTerrainElevationM = terrainElevationM;
        criticalLatitudeDeg = direct.coordinate.latitudeDeg;
        criticalLongitudeDeg = direct.coordinate.longitudeDeg;
        criticalTopocentricAzimuthDeg = direction.azimuthDeg;
      }
    }

    const status = rayStatus(
      validSampleCount,
      noDataSampleCount,
      coverageDistanceM,
      input.maximumDistanceM
    );
    points.push({
      azimuthDeg,
      elevationDeg: validSampleCount > 0 ? maximumElevationDeg : null,
      status,
      validSampleCount,
      noDataSampleCount,
      coverageDistanceM,
      criticalDistanceM,
      criticalTerrainElevationM,
      criticalLatitudeDeg,
      criticalLongitudeDeg,
      criticalTopocentricAzimuthDeg
    });
  }

  const knownPointCount = points.filter((point) => point.elevationDeg !== null).length;
  const completeRayCount = points.filter((point) => point.status === 'complete').length;
  const coverageLimitedRayCount = points.filter(
    (point) => point.status === 'coverage-limited'
  ).length;
  const noDataAffectedRayCount = points.filter(
    (point) => point.status === 'partial-nodata' || point.status === 'no-data'
  ).length;
  const noCoverageRayCount = points.filter(
    (point) => point.status === 'no-coverage'
  ).length;
  const completeCoverage = completeRayCount === pointCount;
  const warnings = [...input.grid.warnings];

  warnings.push(
    'DEM yükseklikleri WGS84 elipsoidal yüksekliğe tek sabit datum ofsetiyle bağlanır; mekânsal geoit değişimi modellenmez.'
  );
  warnings.push(
    'Skyline geometriktir; atmosferik kırılma, bitki/yapı örtüsü ve DEM çözünürlüğünün altındaki engeller uygulanmaz.'
  );
  if (!completeCoverage) {
    warnings.push(
      'En az bir azimut istenen maksimum mesafeye kadar eksiksiz DEM kapsamına sahip değil; sonuç tam 360° yerel ufuk kaynağı değildir.'
    );
  }
  if (geodesicFallbackSampleCount > 0) {
    warnings.push(
      `${geodesicFallbackSampleCount} ışın örneğinde Vincenty direct yakınsamayıp küresel yedek koordinat kullanıldı.`
    );
  }

  const traceId = [
    DEM_SKYLINE_ALGORITHM_ID,
    input.grid.fileName,
    input.observer.latitudeDeg.toFixed(6),
    input.observer.longitudeDeg.toFixed(6),
    input.azimuthStepDeg,
    input.distanceStepM,
    input.maximumDistanceM
  ].join(':');
  const traceInput = {
    observerGroundElevationM,
    observerEyeEllipsoidalHeightM,
    pointCount,
    knownPointCount,
    completeRayCount,
    coverageLimitedRayCount,
    noDataAffectedRayCount,
    noCoverageRayCount,
    completeCoverage,
    geodesicFallbackSampleCount
  };

  return {
    algorithmId: DEM_SKYLINE_ALGORITHM_ID,
    algorithmVersion: DEM_SKYLINE_ALGORITHM_VERSION,
    sourceFileName: input.grid.fileName,
    samplingMethod,
    observer: { ...input.observer },
    observerGroundElevationM,
    observerEyeEllipsoidalHeightM,
    heightDatumToEllipsoidOffsetM: input.heightDatumToEllipsoidOffsetM,
    azimuthStepDeg: input.azimuthStepDeg,
    distanceStepM: input.distanceStepM,
    maximumDistanceM: input.maximumDistanceM,
    pointCount,
    knownPointCount,
    completeRayCount,
    coverageLimitedRayCount,
    noDataAffectedRayCount,
    noCoverageRayCount,
    completeCoverage,
    geodesicFallbackSampleCount,
    points,
    warnings,
    traceId,
    trace: makeTrace(input, traceInput)
  };
}
