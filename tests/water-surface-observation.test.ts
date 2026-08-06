import { describe, expect, it } from 'vitest';
import {
  createWaterSurfaceObservationRecord,
  WATER_SURFACE_OBSERVATION_MODEL_ID,
  WATER_SURFACE_OBSERVATION_MODEL_VERSION
} from '../src/simulation/water-surface-observation';

describe('water surface observation provenance', () => {
  it('creates a conservative water envelope from level and wave uncertainty', () => {
    const record = createWaterSurfaceObservationRecord({
      experimentId: 'water-test-1',
      sourceLabel: 'İstanbul gelgit ölçer istasyonu',
      sourceKind: 'tide-gauge',
      observedAtIso: '2026-08-07T01:30:00+03:00',
      recordedAtIso: '2026-08-07T01:35:00+03:00',
      verticalDatumKind: 'orthometric-msl',
      waterLevelM: 1.2,
      waterLevelUncertaintyM: 0.1,
      waveVerticalUncertaintyM: 0.25,
      significantWaveHeightM: 0.8,
      uncertaintyCombination: 'linear-conservative',
      tidePhase: 'rising',
      stationLabel: 'TR-IST-01'
    });

    expect(record.modelVersion).toBe(WATER_SURFACE_OBSERVATION_MODEL_VERSION);
    expect(record.prediction.modelId).toBe(WATER_SURFACE_OBSERVATION_MODEL_ID);
    expect(record.prediction.status).toBe('compatible');
    expect(record.combinedUncertaintyM).toBeCloseTo(0.35, 12);
    expect(record.lowerWaterSurfaceM).toBeCloseTo(0.85, 12);
    expect(record.upperWaterSurfaceM).toBeCloseTo(1.55, 12);
    expect(record.prediction.trace.steps.find((step) =>
      step.id === 'uncertainty')?.formula).toContain('u_su + u_dalga');
  });

  it('supports RSS only with an explicit independence warning', () => {
    const record = createWaterSurfaceObservationRecord({
      experimentId: 'water-test-2',
      sourceLabel: 'Saha gözlemi',
      sourceKind: 'manual-observation',
      observedAtIso: '2026-08-07T00:15:00Z',
      recordedAtIso: '2026-08-07T00:20:00Z',
      verticalDatumKind: 'local',
      waterLevelM: 2,
      waterLevelUncertaintyM: 0.3,
      waveVerticalUncertaintyM: 0.4,
      uncertaintyCombination: 'rss-independent',
      tidePhase: 'slack'
    });

    expect(record.combinedUncertaintyM).toBeCloseTo(0.5, 12);
    expect(record.prediction.warnings.join(' ')).toContain('bağımsız');
    expect(record.prediction.warnings.join(' ')).toContain('Yerel düşey referans');
  });

  it('does not convert significant wave height into vertical uncertainty', () => {
    const record = createWaterSurfaceObservationRecord({
      experimentId: 'water-test-3',
      sourceLabel: 'Dalga şamandırası',
      sourceKind: 'tide-prediction',
      observedAtIso: '2026-08-07T02:00:00+03:00',
      recordedAtIso: '2026-08-07T01:45:00+03:00',
      sourceIssuedAtIso: '2026-08-06T18:00:00Z',
      verticalDatumKind: 'orthometric-msl',
      waterLevelM: 0.7,
      significantWaveHeightM: 1.5,
      tidePhase: 'falling'
    });

    expect(record.prediction.status).toBe('indeterminate');
    expect(record.combinedUncertaintyM).toBeNull();
    expect(record.prediction.metrics.find((metric) =>
      metric.key === 'significantWaveHeightM')?.value).toBe(1.5);
    expect(record.prediction.metrics.find((metric) =>
      metric.key === 'waveVerticalUncertaintyM')?.value).toBeNull();
    expect(record.prediction.warnings.join(' ')).toContain('otomatik olarak');
    expect(record.prediction.warnings.join(' ')).toContain('doğrudan saha ölçümü değildir');
  });

  it('requires explicit timezone information and bounded uncertainties', () => {
    const base = {
      experimentId: 'water-test-4',
      sourceLabel: 'Test kaynağı',
      sourceKind: 'survey' as const,
      observedAtIso: '2026-08-07T02:00:00+03:00',
      recordedAtIso: '2026-08-07T02:01:00+03:00',
      verticalDatumKind: 'ellipsoidal-wgs84' as const,
      waterLevelM: 3
    };

    expect(() => createWaterSurfaceObservationRecord({
      ...base,
      observedAtIso: '2026-08-07T02:00:00'
    })).toThrow('saat dilimi');
    expect(() => createWaterSurfaceObservationRecord({
      ...base,
      waterLevelUncertaintyM: -0.1
    })).toThrow('belirsizliği');
    expect(() => createWaterSurfaceObservationRecord({
      ...base,
      sourceLabel: '   '
    })).toThrow('Kaynak etiketi');
  });
});
