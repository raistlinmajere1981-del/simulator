import { describe, expect, it } from 'vitest';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import { normalizeSimulationScenarioId } from '../src/shared/scenario';
import {
  SOLAR_POSITION_ALGORITHM_ID,
  SOLAR_POSITION_ALGORITHM_VERSION,
  calculateSolarPosition
} from '../src/simulation/solar-position';
import { createSolarPositionPrediction } from '../src/simulation/solar-position-prediction';
import { createExperimentHtmlReport } from '../src/report/html-report';

function savedSolarExperiment(): SavedExperiment {
  const id = 'solar-observation-test';
  const observedAtIso = '2026-06-21T12:00:00.000Z';
  const result = calculateSolarPosition({
    observedAtIso,
    latitudeDeg: 41.0082,
    longitudeDeg: 28.9784
  });
  return {
    id,
    name: 'Güneş gözlemi test kaydı',
    createdAtIso: '2026-06-22T08:15:00.000Z',
    updatedAtIso: '2026-06-22T08:20:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'sun-moon-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: 41.0082,
      observerLongitudeDeg: 28.9784
    },
    modelVersions: {
      [SOLAR_POSITION_ALGORITHM_ID]: SOLAR_POSITION_ALGORITHM_VERSION
    },
    predictions: [createSolarPositionPrediction(id, result)]
  };
}

describe('solar observation persistence', () => {
  it('recognizes the celestial scenario without changing legacy fallback behavior', () => {
    expect(normalizeSimulationScenarioId('sun-moon-observation')).toBe('sun-moon-observation');
    expect(normalizeSimulationScenarioId(undefined)).toBe('target-visibility');
    expect(normalizeSimulationScenarioId('unknown')).toBe('target-visibility');
  });

  it('round-trips physical observation time, display offset and solar snapshot', () => {
    const saved = savedSolarExperiment();
    const portable = createPortableExperimentFile(
      saved,
      '1.8.0',
      '2026-06-22T09:00:00.000Z'
    );
    const parsed = parsePortableExperimentFile(portable).experiment;

    expect(parsed.scenarioId).toBe('sun-moon-observation');
    expect(parsed.observedAtIso).toBe('2026-06-21T12:00:00.000Z');
    expect(parsed.observationUtcOffsetMinutes).toBe(180);
    expect(parsed.createdAtIso).toBe('2026-06-22T08:15:00.000Z');
    expect(parsed.predictions).toHaveLength(1);
    expect(parsed.predictions[0]?.modelId).toBe(SOLAR_POSITION_ALGORITHM_ID);
    expect(parsed.predictions[0]?.metrics.find((metric) => metric.key === 'solarElevationDeg')?.value)
      .toBeTypeOf('number');
  });

  it('does not invent new astronomy-time fields in a legacy record that lacks them', () => {
    const saved = savedSolarExperiment();
    const legacy = { ...saved } as Record<string, unknown>;
    delete legacy.observedAtIso;
    delete legacy.observationUtcOffsetMinutes;

    const parsed = parsePortableExperimentFile(legacy).experiment;
    expect(parsed.observedAtIso).toBeUndefined();
    expect(parsed.observationUtcOffsetMinutes).toBeUndefined();
  });

  it('renders a celestial-specific report header and the traceable solar prediction', () => {
    const report = createExperimentHtmlReport(
      savedSolarExperiment(),
      '2026-06-22T10:00:00.000Z'
    );

    expect(report).toContain('Gözlem zamanı · UTC');
    expect(report).toContain('UTC ofset provenansı');
    expect(report).toContain('Gözlemci koordinatı');
    expect(report).toContain('Aşama 7 astronomi');
    expect(report).toContain('Güneş/Ay, günlük/yıllık olaylar');
    expect(report).toContain('Rota karşılaştırması B');
    expect(report).toContain('Güneş Konumu · Astronomik Referans');
    expect(report).toContain('Geometrik Güneş yüksekliği');
    expect(report).not.toContain('<small>Hedef yüksekliği</small>');
    expect(report).not.toContain('<small>Gözlenen görünürlük</small>');
  });
});
