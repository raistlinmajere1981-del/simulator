import { describe, expect, it } from 'vitest';
import type { ModelPrediction } from '../src/shared/domain';
import {
  createWaterSurfaceObservationRecord
} from '../src/simulation/water-surface-observation';
import {
  decodeWaterSurfaceObservationSnapshot,
  WaterSurfaceSnapshotError
} from '../src/simulation/water-surface-snapshot';

function prediction(): ModelPrediction {
  return createWaterSurfaceObservationRecord({
    experimentId: 'snapshot-test',
    sourceLabel: 'İstasyon; ana sensör',
    sourceKind: 'tide-prediction',
    observedAtIso: '2026-08-07T02:15:00+03:00',
    recordedAtIso: '2026-08-07T02:05:00+03:00',
    sourceIssuedAtIso: '2026-08-06T20:00:00Z',
    verticalDatumKind: 'orthometric-msl',
    waterLevelM: 1.4,
    waterLevelUncertaintyM: 0.1,
    waveVerticalUncertaintyM: 0.2,
    significantWaveHeightM: 0.75,
    uncertaintyCombination: 'linear-conservative',
    tidePhase: 'rising',
    stationLabel: 'TR-01',
    notes: 'Kamera kaydından 15 dakika sonra.'
  }).prediction;
}

describe('water surface snapshot decoding', () => {
  it('reconstructs typed source, time, datum and numeric values', () => {
    const snapshot = decodeWaterSurfaceObservationSnapshot(prediction());

    expect(snapshot).toMatchObject({
      experimentId: 'snapshot-test',
      sourceLabel: 'İstasyon; ana sensör',
      sourceKind: 'tide-prediction',
      observedAtIso: '2026-08-07T02:15:00+03:00',
      recordedAtIso: '2026-08-07T02:05:00+03:00',
      sourceIssuedAtIso: '2026-08-06T20:00:00Z',
      verticalDatumKind: 'orthometric-msl',
      stationLabel: 'TR-01',
      waterLevelM: 1.4,
      waterLevelUncertaintyM: 0.1,
      waveVerticalUncertaintyM: 0.2,
      significantWaveHeightM: 0.75,
      uncertaintyCombination: 'linear-conservative',
      tidePhase: 'rising',
      notes: 'Kamera kaydından 15 dakika sonra.'
    });
    expect(snapshot.combinedUncertaintyM).toBeCloseTo(0.3, 12);
    expect(snapshot.lowerWaterSurfaceM).toBeCloseTo(1.1, 12);
    expect(snapshot.upperWaterSurfaceM).toBeCloseTo(1.7, 12);
  });

  it('accepts a record without optional uncertainty values', () => {
    const source = createWaterSurfaceObservationRecord({
      experimentId: 'snapshot-test-empty',
      sourceLabel: 'Manuel seviye notu',
      sourceKind: 'manual-observation',
      observedAtIso: '2026-08-07T00:00:00Z',
      recordedAtIso: '2026-08-07T00:01:00Z',
      verticalDatumKind: 'local',
      waterLevelM: 0,
      tidePhase: 'unknown'
    }).prediction;
    const snapshot = decodeWaterSurfaceObservationSnapshot(source);

    expect(snapshot.waterLevelUncertaintyM).toBeUndefined();
    expect(snapshot.waveVerticalUncertaintyM).toBeUndefined();
    expect(snapshot.combinedUncertaintyM).toBeNull();
    expect(snapshot.lowerWaterSurfaceM).toBeNull();
    expect(snapshot.upperWaterSurfaceM).toBeNull();
  });

  it('rejects a tampered combined uncertainty or envelope', () => {
    const source = prediction();
    const metrics = source.metrics.map((metric) => metric.key ===
      'combinedWaterSurfaceUncertaintyM'
      ? { ...metric, value: 9 }
      : { ...metric });

    expect(() => decodeWaterSurfaceObservationSnapshot({ ...source, metrics }))
      .toThrow(WaterSurfaceSnapshotError);
  });

  it('rejects missing stable trace steps and unrelated predictions', () => {
    const source = prediction();
    expect(() => decodeWaterSurfaceObservationSnapshot({
      ...source,
      trace: {
        ...source.trace,
        steps: source.trace.steps.filter((candidate) => candidate.id !== 'source-time')
      }
    })).toThrow('source-time');
    expect(() => decodeWaterSurfaceObservationSnapshot({
      ...source,
      modelId: 'ideal-sphere'
    })).toThrow('su yüzeyi');
  });
});
