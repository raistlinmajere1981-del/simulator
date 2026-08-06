import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile,
  PORTABLE_EXPERIMENT_SCHEMA_VERSION
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  createWaterSurfaceObservationRecord,
  WATER_SURFACE_OBSERVATION_MODEL_ID
} from '../src/simulation/water-surface-observation';

function savedExperiment(): SavedExperiment {
  const water = createWaterSurfaceObservationRecord({
    experimentId: 'water-portable-test',
    sourceLabel: 'Boğaz gelgit ölçer servisi',
    sourceKind: 'tide-gauge',
    observedAtIso: '2026-08-07T01:10:00+03:00',
    recordedAtIso: '2026-08-07T01:20:00+03:00',
    verticalDatumKind: 'orthometric-msl',
    waterLevelM: 1.35,
    waterLevelUncertaintyM: 0.08,
    waveVerticalUncertaintyM: 0.22,
    significantWaveHeightM: 0.9,
    uncertaintyCombination: 'linear-conservative',
    tidePhase: 'rising',
    stationLabel: 'Bosphorus-01',
    notes: 'Kamera gözleminden 20 dakika önce.'
  });

  return {
    id: 'water-portable-test',
    name: 'Su yüzeyi provenans deneyi',
    createdAtIso: '2026-08-07T01:00:00+03:00',
    updatedAtIso: '2026-08-07T01:20:00+03:00',
    inputs: DEFAULT_SIMULATOR_INPUTS,
    modelVersions: {
      [WATER_SURFACE_OBSERVATION_MODEL_ID]: water.modelVersion
    },
    predictions: [water.prediction]
  };
}

describe('water observation portable and report integration', () => {
  it('round-trips through the existing portable prediction contract', () => {
    const file = createPortableExperimentFile(
      savedExperiment(),
      '1.0.8',
      '2026-08-07T01:30:00+03:00'
    );
    const parsed = parsePortableExperimentFile(file);
    const water = parsed.experiment.predictions.find(
      (prediction) => prediction.modelId === WATER_SURFACE_OBSERVATION_MODEL_ID
    );

    expect(file.schemaVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.modelVersions[WATER_SURFACE_OBSERVATION_MODEL_ID])
      .toBe('0.1.0');
    expect(water?.metrics.find((metric) => metric.key === 'waterLevelM')?.value)
      .toBe(1.35);
    expect(water?.metrics.find((metric) =>
      metric.key === 'combinedWaterSurfaceUncertaintyM')?.value).toBeCloseTo(0.3, 12);
    expect(water?.trace.assumptions.join(' ')).toContain('koruyucu doğrusal toplam');
    expect(water?.trace.steps.find((step) => step.id === 'source-time')?.substitution)
      .toContain('2026-08-07T01:10:00+03:00');
  });

  it('renders source, time, water level, wave context and interval in HTML', () => {
    const html = createExperimentHtmlReport(
      savedExperiment(),
      '2026-08-07T01:40:00+03:00'
    );

    expect(html).toContain('water-surface-observation');
    expect(html).toContain('Anlık su seviyesi');
    expect(html).toContain('1,35 m');
    expect(html).toContain('Dalga düşey belirsizliği');
    expect(html).toContain('Boğaz gelgit ölçer servisi');
    expect(html).toContain('2026-08-07T01:10:00+03:00');
    expect(html).toContain('0,3 m');
    expect(html).toContain('water-surface:2026-08-07T01:20:00+03:00:tide-gauge');
  });
});
