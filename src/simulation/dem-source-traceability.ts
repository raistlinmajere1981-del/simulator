import type {
  DemTerrainProfileSource,
  ImportedDemTerrainProfile
} from '../shared/simulator';

export type DemTraceabilityStatus = 'complete' | 'partial' | 'legacy';

export interface DemSourceTraceabilitySummary {
  status: DemTraceabilityStatus;
  integrityRecorded: boolean;
  fileSizeBytes: number | null;
  sha256Short: string | null;
  horizontalReference: 'WGS 84 coğrafi derece sözleşmesi';
  horizontalReferenceEvidence: 'import-contract';
  verticalReference: 'unknown';
  nativeCellSizeDeg: number;
  effectiveCellSpanM: number | null;
  sampleSpacingM: number;
  sampleSpacingToCellRatio: number | null;
  coverageWidthDeg: number;
  coverageHeightDeg: number;
  gridCellCount: number;
  warnings: string[];
}

type DemTraceabilitySource =
  | ImportedDemTerrainProfile
  | DemTerrainProfileSource;

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function validIntegrity(source: DemTraceabilitySource): boolean {
  return Number.isInteger(source.fileSizeBytes) &&
    (source.fileSizeBytes ?? 0) > 0 &&
    typeof source.sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(source.sha256);
}

export function summarizeDemSourceTraceability(
  source: DemTraceabilitySource
): DemSourceTraceabilitySummary {
  if (!finitePositive(source.cellSizeDeg)) {
    throw new RangeError('DEM kaynak izi için pozitif hücre boyutu gerekli.');
  }
  if (!finitePositive(source.sampleSpacingM)) {
    throw new RangeError('DEM kaynak izi için pozitif örnek aralığı gerekli.');
  }
  if (!Number.isInteger(source.columnCount) || source.columnCount <= 0 ||
    !Number.isInteger(source.rowCount) || source.rowCount <= 0) {
    throw new RangeError('DEM kaynak izi için pozitif grid boyutları gerekli.');
  }
  if (!Number.isFinite(source.westBoundaryDeg) ||
    !Number.isFinite(source.eastBoundaryDeg) ||
    !Number.isFinite(source.southBoundaryDeg) ||
    !Number.isFinite(source.northBoundaryDeg) ||
    source.westBoundaryDeg >= source.eastBoundaryDeg ||
    source.southBoundaryDeg >= source.northBoundaryDeg) {
    throw new RangeError('DEM kaynak izi için geçerli coğrafi kapsam gerekli.');
  }

  const integrityRecorded = validIntegrity(source);
  const effectiveCellSpanM = finitePositive(source.effectiveCellSpanM)
    ? source.effectiveCellSpanM
    : null;
  const sampleSpacingToCellRatio = typeof source.sampleSpacingToCellRatio === 'number' &&
    Number.isFinite(source.sampleSpacingToCellRatio) &&
    source.sampleSpacingToCellRatio >= 0
    ? source.sampleSpacingToCellRatio
    : null;
  const resolutionRecorded = effectiveCellSpanM !== null &&
    sampleSpacingToCellRatio !== null;
  const status: DemTraceabilityStatus = integrityRecorded && resolutionRecorded
    ? 'complete'
    : !integrityRecorded && !resolutionRecorded
      ? 'legacy'
      : 'partial';
  const warnings = [
    'Yatay referans bir .prj dosyasından doğrulanmadı; içe aktarma sözleşmesi WGS 84 coğrafi derece ızgarası kabul eder.',
    'ESRI ASCII başlığı düşey datum bilgisini kodlamaz; yükseklik referansı dosyadan bilinmiyor.'
  ];
  if (!integrityRecorded) {
    warnings.push('Bu kaynakta tam dosya boyutu ve SHA-256 bütünlük kaydı bulunmuyor.');
  }
  if (!resolutionRecorded) {
    warnings.push('Bu kaynakta rota orta enlemine göre etkili metre çözünürlüğü bulunmuyor.');
  }

  return {
    status,
    integrityRecorded,
    fileSizeBytes: integrityRecorded ? source.fileSizeBytes ?? null : null,
    sha256Short: integrityRecorded ? source.sha256?.slice(0, 12) ?? null : null,
    horizontalReference: 'WGS 84 coğrafi derece sözleşmesi',
    horizontalReferenceEvidence: 'import-contract',
    verticalReference: 'unknown',
    nativeCellSizeDeg: source.cellSizeDeg,
    effectiveCellSpanM,
    sampleSpacingM: source.sampleSpacingM,
    sampleSpacingToCellRatio,
    coverageWidthDeg: source.eastBoundaryDeg - source.westBoundaryDeg,
    coverageHeightDeg: source.northBoundaryDeg - source.southBoundaryDeg,
    gridCellCount: source.columnCount * source.rowCount,
    warnings
  };
}
