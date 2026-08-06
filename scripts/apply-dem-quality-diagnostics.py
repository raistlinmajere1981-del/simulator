from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, found {count}')
    write(path, text.replace(old, new, 1))


write('src/simulation/dem-quality-diagnostics.ts', r"""import type {
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
""")

write('tests/dem-quality-diagnostics.test.ts', r"""import { describe, expect, it } from 'vitest';
import { analyzeDemRouteQuality } from '../src/simulation/dem-quality-diagnostics';

const base = {
  cellSizeDeg: 0.01,
  sampleSpacingM: 300,
  samplingMethod: 'bilinear' as const,
  westBoundaryDeg: -2,
  eastBoundaryDeg: 2,
  southBoundaryDeg: -2,
  northBoundaryDeg: 2,
  points: [
    { latitudeDeg: 0, longitudeDeg: -1, elevationM: 10 },
    { latitudeDeg: 0, longitudeDeg: 0, elevationM: 25 },
    { latitudeDeg: 0, longitudeDeg: 1, elevationM: 15 }
  ]
};

describe('DEM route quality diagnostics', () => {
  it('reports dense bilinear sampling with elevation statistics', () => {
    const result = analyzeDemRouteQuality(base);

    expect(result.diagnosticStatus).toBe('good');
    expect(result.effectiveCellSpanM).toBeGreaterThan(1_100);
    expect(result.sampleSpacingToCellRatio).toBeLessThan(0.5);
    expect(result.coverageMarginCellRatio).toBeGreaterThan(1);
    expect(result.minimumElevationM).toBe(10);
    expect(result.maximumElevationM).toBe(25);
    expect(result.elevationRangeM).toBe(15);
    expect(result.warnings).toEqual([]);
  });

  it('marks nearest-cell sampling as cautionary', () => {
    const result = analyzeDemRouteQuality({
      ...base,
      samplingMethod: 'nearest'
    });

    expect(result.diagnosticStatus).toBe('caution');
    expect(result.warnings.some((warning) => warning.includes('En yakın hücre'))).toBe(true);
  });

  it('marks undersampling and edge-adjacent coverage as limited', () => {
    const result = analyzeDemRouteQuality({
      ...base,
      sampleSpacingM: 2_000,
      points: [
        { latitudeDeg: 0, longitudeDeg: -1.999, elevationM: 10 },
        { latitudeDeg: 0, longitudeDeg: 0, elevationM: 20 },
        { latitudeDeg: 0, longitudeDeg: 1, elevationM: 30 }
      ]
    });

    expect(result.diagnosticStatus).toBe('limited');
    expect(result.sampleSpacingToCellRatio).toBeGreaterThan(1);
    expect(result.coverageMarginCellRatio).toBeLessThan(0.5);
    expect(result.warnings).toHaveLength(2);
  });

  it('rejects partial or out-of-coverage diagnostic input', () => {
    expect(() => analyzeDemRouteQuality({
      ...base,
      points: [base.points[0]!]
    })).toThrow('en az iki');
    expect(() => analyzeDemRouteQuality({
      ...base,
      points: [
        ...base.points,
        { latitudeDeg: 0, longitudeDeg: 3, elevationM: 5 }
      ]
    })).toThrow('kapsamının dışında');
  });
});
""")

# Shared diagnostic contracts.
replace_once(
    'src/shared/simulator.ts',
    """export type DemTerrainSampleCountMode = 'automatic' | 'manual';
""",
    """export type DemTerrainSampleCountMode = 'automatic' | 'manual';
export type DemTerrainDiagnosticStatus = 'good' | 'caution' | 'limited';
""",
    'DEM diagnostic status type'
)
source_marker = """  northBoundaryDeg: number;
}

export type TerrainProfileSource =
"""
source_fields = """  northBoundaryDeg: number;
  diagnosticStatus?: DemTerrainDiagnosticStatus;
  effectiveCellSpanM?: number;
  sampleSpacingToCellRatio?: number;
  minimumCoverageMarginM?: number;
  coverageMarginCellRatio?: number;
  minimumElevationM?: number;
  maximumElevationM?: number;
  elevationRangeM?: number;
}

export type TerrainProfileSource =
"""
replace_once('src/shared/simulator.ts', source_marker, source_fields, 'DEM source diagnostic fields')
import_marker = """  northBoundaryDeg: number;
  sourceDistanceM: number;
"""
import_fields = """  northBoundaryDeg: number;
  diagnosticStatus: DemTerrainDiagnosticStatus;
  effectiveCellSpanM: number;
  sampleSpacingToCellRatio: number;
  minimumCoverageMarginM: number;
  coverageMarginCellRatio: number;
  minimumElevationM: number;
  maximumElevationM: number;
  elevationRangeM: number;
  sourceDistanceM: number;
"""
replace_once('src/shared/simulator.ts', import_marker, import_fields, 'imported DEM diagnostic fields')

# DEM route engine calculates diagnostics from actual sampled coordinates/elevations.
replace_once(
    'src/simulation/dem-route-profile.ts',
    """import { validateManualTerrainPoints } from './manual-terrain-profile';
""",
    """import { validateManualTerrainPoints } from './manual-terrain-profile';
import {
  analyzeDemRouteQuality,
  type DemQualityPoint
} from './dem-quality-diagnostics';
""",
    'DEM diagnostic module import'
)
replace_once(
    'src/simulation/dem-route-profile.ts',
    """  const elevations: number[] = [];
  const warnings = [...grid.warnings, ...path.warnings];
""",
    """  const elevations: number[] = [];
  const diagnosticPoints: DemQualityPoint[] = [];
  const warnings = [...grid.warnings, ...path.warnings];
""",
    'DEM diagnostic point collection'
)
replace_once(
    'src/simulation/dem-route-profile.ts',
    """    elevations.push(validateElevation(elevationM, fraction * 100));
  }

  warnings.push(...directWarnings);
""",
    """    const validatedElevationM = validateElevation(elevationM, fraction * 100);
    elevations.push(validatedElevationM);
    diagnosticPoints.push({
      latitudeDeg: pathPoint.coordinate.latitudeDeg,
      longitudeDeg: pathPoint.coordinate.longitudeDeg,
      elevationM: validatedElevationM
    });
  }

  warnings.push(...directWarnings);
""",
    'DEM diagnostic point append'
)
replace_once(
    'src/simulation/dem-route-profile.ts',
    """  warnings.push(
    'DEM yüksekliklerinin düşey datumu dosyadan doğrulanamadı; deneyde uygun düşey referans seçilmelidir.'
  );

  const points: ManualTerrainPoint[] = elevations.slice(1, -1).map((elevationM, index) => ({
""",
    """  const sampleSpacingM = path.totalDistanceM / (sampleCount - 1);
  const diagnostics = analyzeDemRouteQuality({
    cellSizeDeg: grid.cellSizeDeg,
    sampleSpacingM,
    samplingMethod: context.samplingMethod,
    westBoundaryDeg: grid.westBoundaryDeg,
    eastBoundaryDeg: grid.eastBoundaryDeg,
    southBoundaryDeg: grid.southBoundaryDeg,
    northBoundaryDeg: grid.northBoundaryDeg,
    points: diagnosticPoints
  });
  warnings.push(...diagnostics.warnings);
  warnings.push(
    'DEM yüksekliklerinin düşey datumu dosyadan doğrulanamadı; deneyde uygun düşey referans seçilmelidir.'
  );

  const points: ManualTerrainPoint[] = elevations.slice(1, -1).map((elevationM, index) => ({
""",
    'DEM diagnostic analysis'
)
replace_once(
    'src/simulation/dem-route-profile.ts',
    """    sampleCountMode: requestedSampleCount === undefined ? 'automatic' : 'manual',
    sampleSpacingM: path.totalDistanceM / (sampleCount - 1),
    cellSizeDeg: grid.cellSizeDeg,
""",
    """    sampleCountMode: requestedSampleCount === undefined ? 'automatic' : 'manual',
    sampleSpacingM,
    cellSizeDeg: grid.cellSizeDeg,
""",
    'reuse DEM sample spacing'
)
replace_once(
    'src/simulation/dem-route-profile.ts',
    """    northBoundaryDeg: grid.northBoundaryDeg,
    sourceDistanceM: path.totalDistanceM,
""",
    """    northBoundaryDeg: grid.northBoundaryDeg,
    diagnosticStatus: diagnostics.diagnosticStatus,
    effectiveCellSpanM: diagnostics.effectiveCellSpanM,
    sampleSpacingToCellRatio: diagnostics.sampleSpacingToCellRatio,
    minimumCoverageMarginM: diagnostics.minimumCoverageMarginM,
    coverageMarginCellRatio: diagnostics.coverageMarginCellRatio,
    minimumElevationM: diagnostics.minimumElevationM,
    maximumElevationM: diagnostics.maximumElevationM,
    elevationRangeM: diagnostics.elevationRangeM,
    sourceDistanceM: path.totalDistanceM,
""",
    'DEM result diagnostic fields'
)

# Renderer pending review.
replace_once(
    'src/renderer/src/MultiPointTerrainEditor.tsx',
    """function sourceRecordCount(profile: TerrainProfileImport): number {
""",
    """function demDiagnosticLabel(status: ImportedDemTerrainProfile['diagnosticStatus']): string {
  if (status === 'good') return 'iyi';
  if (status === 'caution') return 'dikkat';
  return 'sınırlı';
}

function sourceRecordCount(profile: TerrainProfileImport): number {
""",
    'DEM diagnostic UI label helper'
)
replace_once(
    'src/renderer/src/MultiPointTerrainEditor.tsx',
    """              <span>Jeodezik yöntem: <b>{pendingImport.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'küresel yedek'}</b></span>
""",
    """              <span>Jeodezik yöntem: <b>{pendingImport.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'küresel yedek'}</b></span>
              <span>Örnekleme tanısı: <b>{demDiagnosticLabel(pendingImport.diagnosticStatus)}</b></span>
              <span>Etkili hücre genişliği: <b>{numberFormatter.format(pendingImport.effectiveCellSpanM)} m</b></span>
              <span>Örnek / hücre oranı: <b>{numberFormatter.format(pendingImport.sampleSpacingToCellRatio)}</b></span>
              <span>En yakın grid kenarı: <b>{numberFormatter.format(pendingImport.minimumCoverageMarginM)} m ({numberFormatter.format(pendingImport.coverageMarginCellRatio)} hücre)</b></span>
              <span>Yükseklik aralığı: <b>{numberFormatter.format(pendingImport.minimumElevationM)} → {numberFormatter.format(pendingImport.maximumElevationM)} m (Δ {numberFormatter.format(pendingImport.elevationRangeM)} m)</b></span>
""",
    'DEM diagnostic pending review'
)

# App source strip and source persistence.
replace_once(
    'src/renderer/src/AppNext.tsx',
    """              <span>{source.sampleCount} rota örneği ({source.sampleCountMode === 'manual' ? 'manuel' : 'otomatik'}) · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</span>
""",
    """              <span>
                {source.sampleCount} rota örneği ({source.sampleCountMode === 'manual' ? 'manuel' : 'otomatik'}) · {source.columnCount} × {source.rowCount} grid · {source.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}
                {source.diagnosticStatus ? ` · tanı: ${source.diagnosticStatus === 'good' ? 'iyi' : source.diagnosticStatus === 'caution' ? 'dikkat' : 'sınırlı'}` : ''}
              </span>
""",
    'DEM diagnostic source strip'
)
replace_once(
    'src/renderer/src/AppNext.tsx',
    """          northBoundaryDeg: profile.northBoundaryDeg
""",
    """          northBoundaryDeg: profile.northBoundaryDeg,
          diagnosticStatus: profile.diagnosticStatus,
          effectiveCellSpanM: profile.effectiveCellSpanM,
          sampleSpacingToCellRatio: profile.sampleSpacingToCellRatio,
          minimumCoverageMarginM: profile.minimumCoverageMarginM,
          coverageMarginCellRatio: profile.coverageMarginCellRatio,
          minimumElevationM: profile.minimumElevationM,
          maximumElevationM: profile.maximumElevationM,
          elevationRangeM: profile.elevationRangeM
""",
    'DEM diagnostic source construction'
)

# Portable parser supports all-or-none diagnostics and old v7 sources without them.
replace_once(
    'src/shared/portable.ts',
    """  if (value.kind === 'dem') {
    const noDataValid = value.noDataValue === null || isFiniteNumber(value.noDataValue);
    if (value.format !== 'esri-ascii' ||
""",
    """  if (value.kind === 'dem') {
    const noDataValid = value.noDataValue === null || isFiniteNumber(value.noDataValue);
    const diagnosticValues = [
      value.diagnosticStatus,
      value.effectiveCellSpanM,
      value.sampleSpacingToCellRatio,
      value.minimumCoverageMarginM,
      value.coverageMarginCellRatio,
      value.minimumElevationM,
      value.maximumElevationM,
      value.elevationRangeM
    ];
    const hasDiagnostics = diagnosticValues.some((item) => item !== undefined);
    const diagnosticsValid = !hasDiagnostics || (
      (value.diagnosticStatus === 'good' || value.diagnosticStatus === 'caution' ||
        value.diagnosticStatus === 'limited') &&
      isFiniteNumber(value.effectiveCellSpanM) && value.effectiveCellSpanM > 0 &&
      isFiniteNumber(value.sampleSpacingToCellRatio) && value.sampleSpacingToCellRatio >= 0 &&
      isFiniteNumber(value.minimumCoverageMarginM) && value.minimumCoverageMarginM >= 0 &&
      isFiniteNumber(value.coverageMarginCellRatio) && value.coverageMarginCellRatio >= 0 &&
      isFiniteNumber(value.minimumElevationM) &&
      isFiniteNumber(value.maximumElevationM) &&
      value.minimumElevationM <= value.maximumElevationM &&
      isFiniteNumber(value.elevationRangeM) && value.elevationRangeM >= 0
    );
    if (value.format !== 'esri-ascii' ||
""",
    'portable DEM diagnostic validation setup'
)
replace_once(
    'src/shared/portable.ts',
    """      value.southBoundaryDeg >= value.northBoundaryDeg ||
      !isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0) {
""",
    """      value.southBoundaryDeg >= value.northBoundaryDeg ||
      !diagnosticsValid ||
      !isFiniteNumber(value.sourceDistanceM) || value.sourceDistanceM <= 0) {
""",
    'portable DEM diagnostic validity condition'
)
replace_once(
    'src/shared/portable.ts',
    """      northBoundaryDeg: value.northBoundaryDeg
    };
""",
    """      northBoundaryDeg: value.northBoundaryDeg,
      ...(hasDiagnostics ? {
        diagnosticStatus: value.diagnosticStatus as 'good' | 'caution' | 'limited',
        effectiveCellSpanM: value.effectiveCellSpanM as number,
        sampleSpacingToCellRatio: value.sampleSpacingToCellRatio as number,
        minimumCoverageMarginM: value.minimumCoverageMarginM as number,
        coverageMarginCellRatio: value.coverageMarginCellRatio as number,
        minimumElevationM: value.minimumElevationM as number,
        maximumElevationM: value.maximumElevationM as number,
        elevationRangeM: value.elevationRangeM as number
      } : {})
    };
""",
    'portable DEM diagnostic parsing'
)

# HTML report.
replace_once(
    'src/report/html-report.ts',
    """    <tr><td>Jeodezik yöntem</td><td>${source.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'Küresel yedek'}</td></tr>`;
""",
    """    <tr><td>Jeodezik yöntem</td><td>${source.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'Küresel yedek'}</td></tr>
    ${source.diagnosticStatus ? `
    <tr><td>Örnekleme tanısı</td><td>${source.diagnosticStatus === 'good' ? 'İyi' : source.diagnosticStatus === 'caution' ? 'Dikkat' : 'Sınırlı'}</td></tr>
    <tr><td>Etkili hücre genişliği</td><td>${inputNumberFormatter.format(source.effectiveCellSpanM ?? 0)} m</td></tr>
    <tr><td>Örnek / hücre oranı</td><td>${inputNumberFormatter.format(source.sampleSpacingToCellRatio ?? 0)}</td></tr>
    <tr><td>En yakın grid kenarı</td><td>${inputNumberFormatter.format(source.minimumCoverageMarginM ?? 0)} m · ${inputNumberFormatter.format(source.coverageMarginCellRatio ?? 0)} hücre</td></tr>
    <tr><td>DEM yükseklik aralığı</td><td>${inputNumberFormatter.format(source.minimumElevationM ?? 0)} → ${inputNumberFormatter.format(source.maximumElevationM ?? 0)} m · Δ ${inputNumberFormatter.format(source.elevationRangeM ?? 0)} m</td></tr>` : `
    <tr><td>Örnekleme tanısı</td><td>Bu eski kayıtta tanı ölçümleri bulunmuyor.</td></tr>`}`;
""",
    'report DEM diagnostic rows'
)

# Tests lock generated and persisted diagnostics.
replace_once(
    'tests/dem-route-profile.test.ts',
    """    expect(profile.sampleSpacingM).toBeGreaterThan(0);
""",
    """    expect(profile.sampleSpacingM).toBeGreaterThan(0);
    expect(profile.effectiveCellSpanM).toBeGreaterThan(0);
    expect(profile.sampleSpacingToCellRatio).toBeGreaterThan(0);
    expect(profile.minimumCoverageMarginM).toBeGreaterThanOrEqual(0);
    expect(profile.coverageMarginCellRatio).toBeGreaterThanOrEqual(0);
    expect(profile.minimumElevationM).toBe(1);
    expect(profile.maximumElevationM).toBe(3);
    expect(profile.elevationRangeM).toBe(2);
""",
    'DEM route diagnostic assertions'
)
replace_once(
    'tests/portable.test.ts',
    """      northBoundaryDeg: 41.185
""",
    """      northBoundaryDeg: 41.185,
      diagnosticStatus: 'good' as const,
      effectiveCellSpanM: 2_500,
      sampleSpacingToCellRatio: 0.09,
      minimumCoverageMarginM: 1_500,
      coverageMarginCellRatio: 0.6,
      minimumElevationM: 12,
      maximumElevationM: 60,
      elevationRangeM: 48
""",
    'portable DEM diagnostic fixture'
)
replace_once(
    'tests/report.test.ts',
    """      northBoundaryDeg: 41.185
""",
    """      northBoundaryDeg: 41.185,
      diagnosticStatus: 'caution',
      effectiveCellSpanM: 2_500,
      sampleSpacingToCellRatio: 0.7,
      minimumCoverageMarginM: 1_500,
      coverageMarginCellRatio: 0.6,
      minimumElevationM: 12,
      maximumElevationM: 60,
      elevationRangeM: 48
""",
    'report DEM diagnostic fixture'
)
replace_once(
    'tests/report.test.ts',
    """  expect(html).toContain('WGS84 Vincenty');
""",
    """  expect(html).toContain('WGS84 Vincenty');
  expect(html).toContain('Örnekleme tanısı');
  expect(html).toContain('Dikkat');
  expect(html).toContain('Örnek / hücre oranı');
  expect(html).toContain('DEM yükseklik aralığı');
""",
    'report DEM diagnostic assertions'
)

# Version and documentation.
replace_once('package.json', '"version": "1.0.1"', '"version": "1.0.2"', 'package version')
replace_once('src/preload/index.ts', "version: '1.0.1'", "version: '1.0.2'", 'preload version')
replace_once(
    'docs/esri-ascii-dem.md',
    """Dosya içeriği renderer sürecine gönderilmez. Ana süreç yalnız oluşturulan arazi
noktalarını, grid çözünürlüğünü, kapsamı, örnekleme yöntemini ve kaynak dosya
adını aktarır. Kaynak bilgileri deney kaydında ve HTML raporunda korunur.
""",
    """Dosya içeriği renderer sürecine gönderilmez. Ana süreç yalnız oluşturulan arazi
noktalarını, grid çözünürlüğünü, kapsamı, örnekleme yöntemini ve kaynak dosya
adını aktarır. Kaynak bilgileri deney kaydında ve HTML raporunda korunur.

## Örnekleme tanısı

Her DEM profili için aşağıdaki ölçümler üretilir:

- rota örnek aralığının etkili grid hücre genişliğine oranı,
- rotanın grid sınırına en yakın mesafesi ve bunun hücre cinsinden karşılığı,
- rota üzerindeki en düşük, en yüksek ve toplam yükseklik aralığı,
- `iyi`, `dikkat` veya `sınırlı` örnekleme tanısı.

Tanı, DEM kaynağının mutlak doğruluğunu veya düşey datumunun doğruluğunu kanıtlamaz.
Yalnız örnek yoğunluğu, grid kenar payı ve kullanılan enterpolasyon yöntemine dayalı
koruyucu bir kalite göstergesidir. Ölçümler kayıt ve HTML raporunda korunur.
""",
    'DEM diagnostic documentation'
)
replace_once(
    'docs/roadmap.md',
    """## Sonraki gerçek arazi işleri
""",
    """## Aşama 3.13 — DEM örnekleme ve kapsam tanısı

Durum: tamamlandı

- Etkili grid hücre genişliğinin metre olarak hesaplanması
- Rota örnek aralığının hücre genişliğine oranı
- Rota boyunca grid kenarına en yakın mesafe
- Kenar payının hücre cinsinden karşılığı
- En düşük, en yüksek ve toplam DEM yükseklik aralığı
- İyi, dikkat ve sınırlı örnekleme tanısı
- Seyrek örnekleme, grid kenarı ve en yakın hücre yöntemi uyarıları
- Tanı ölçümlerinin inceleme kartı, kayıt ve HTML raporunda korunması
- Eski v7 DEM kayıtlarıyla geriye dönük uyumluluk
- Uygulama sürümü `1.0.2`

## Sonraki gerçek arazi işleri
""",
    'roadmap DEM diagnostic stage'
)
