import { describe, expect, it } from 'vitest';
import { summarizeDemSourceTraceability } from '../src/simulation/dem-source-traceability';
import type { ImportedDemTerrainProfile } from '../src/shared/simulator';

function source(): ImportedDemTerrainProfile {
  return {
    kind: 'dem',
    fileName: 'traceable.asc',
    fileSizeBytes: 1_024,
    sha256: 'a'.repeat(64),
    format: 'esri-ascii',
    samplingMethod: 'bilinear',
    geodesicMethod: 'vincenty',
    columnCount: 10,
    rowCount: 20,
    sampleCount: 101,
    sampleCountMode: 'automatic',
    sampleSpacingM: 225,
    cellSizeDeg: 0.03,
    noDataValue: -9999,
    westBoundaryDeg: 28.8,
    eastBoundaryDeg: 29.1,
    southBoundaryDeg: 40.8,
    northBoundaryDeg: 41.4,
    diagnosticStatus: 'good',
    effectiveCellSpanM: 2_500,
    sampleSpacingToCellRatio: 0.09,
    minimumCoverageMarginM: 1_500,
    coverageMarginCellRatio: 0.6,
    minimumElevationM: 12,
    maximumElevationM: 60,
    elevationRangeM: 48,
    sourceDistanceM: 22_500,
    observerEndpointElevationM: 12,
    targetEndpointElevationM: 18,
    points: [],
    warnings: []
  };
}

describe('DEM source traceability summary', () => {
  it('classifies current DEM provenance as complete', () => {
    const summary = summarizeDemSourceTraceability(source());

    expect(summary.status).toBe('complete');
    expect(summary.integrityRecorded).toBe(true);
    expect(summary.fileSizeBytes).toBe(1_024);
    expect(summary.sha256Short).toBe('aaaaaaaaaaaa');
    expect(summary.horizontalReference).toContain('WGS 84');
    expect(summary.horizontalReferenceEvidence).toBe('import-contract');
    expect(summary.verticalReference).toBe('unknown');
    expect(summary.nativeCellSizeDeg).toBe(0.03);
    expect(summary.effectiveCellSpanM).toBe(2_500);
    expect(summary.sampleSpacingToCellRatio).toBe(0.09);
    expect(summary.coverageWidthDeg).toBeCloseTo(0.3, 10);
    expect(summary.coverageHeightDeg).toBeCloseTo(0.6, 10);
    expect(summary.gridCellCount).toBe(200);
  });

  it('classifies a source with only integrity provenance as partial', () => {
    const candidate = source();
    const summary = summarizeDemSourceTraceability({
      ...candidate,
      effectiveCellSpanM: undefined as never,
      sampleSpacingToCellRatio: undefined as never
    });

    expect(summary.status).toBe('partial');
    expect(summary.integrityRecorded).toBe(true);
    expect(summary.effectiveCellSpanM).toBeNull();
    expect(summary.warnings.some((warning) => warning.includes('metre çözünürlüğü')))
      .toBe(true);
  });

  it('classifies older sources without integrity and diagnostics as legacy', () => {
    const candidate = source();
    const summary = summarizeDemSourceTraceability({
      ...candidate,
      fileSizeBytes: undefined,
      sha256: undefined,
      effectiveCellSpanM: undefined as never,
      sampleSpacingToCellRatio: undefined as never
    });

    expect(summary.status).toBe('legacy');
    expect(summary.integrityRecorded).toBe(false);
    expect(summary.sha256Short).toBeNull();
    expect(summary.warnings.some((warning) => warning.includes('SHA-256')))
      .toBe(true);
  });

  it('rejects invalid grid resolution and coverage', () => {
    expect(() => summarizeDemSourceTraceability({
      ...source(),
      cellSizeDeg: 0
    })).toThrow('hücre boyutu');
    expect(() => summarizeDemSourceTraceability({
      ...source(),
      westBoundaryDeg: 30,
      eastBoundaryDeg: 29
    })).toThrow('coğrafi kapsam');
  });
});
