import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { createPortableExperimentFile, parsePortableExperimentFile } from '../src/shared/portable';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import {
  SOLAR_DAY_EVENTS_MODEL_ID,
  SOLAR_DAY_EVENTS_MODEL_VERSION,
  calculateSolarDayEvents,
  createSolarDayEventsPrediction
} from '../src/simulation/solar-day-events';

function savedSolarDayExperiment(): SavedExperiment {
  const id = 'solar-day-persistence';
  const observedAtIso = '2026-08-09T12:00:00.000Z';
  const result = calculateSolarDayEvents({
    experimentId: id,
    observedAtIso,
    utcOffsetMinutes: 180,
    latitudeDeg: 41.0082,
    longitudeDeg: 28.9784
  });
  return {
    id,
    name: 'Günlük Güneş olayları',
    createdAtIso: '2026-08-09T12:05:00.000Z',
    updatedAtIso: '2026-08-09T12:06:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'sun-moon-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: 41.0082,
      observerLongitudeDeg: 28.9784
    },
    modelVersions: {
      [SOLAR_DAY_EVENTS_MODEL_ID]: SOLAR_DAY_EVENTS_MODEL_VERSION
    },
    predictions: [createSolarDayEventsPrediction(result)]
  };
}

describe('solar day event persistence', () => {
  it('round-trips event metrics and trace through portable JSON', () => {
    const parsed = parsePortableExperimentFile(
      createPortableExperimentFile(savedSolarDayExperiment(), '1.12.0', '2026-08-09T13:00:00.000Z')
    ).experiment;
    const prediction = parsed.predictions.find((item) => item.modelId === SOLAR_DAY_EVENTS_MODEL_ID);
    expect(prediction).toBeDefined();
    expect(prediction?.metrics.find((metric) => metric.key === 'standardRiseLocalMinute')?.value).toBeTypeOf('number');
    expect(prediction?.trace.steps.some((step) => step.id === 'standard-apparent-events')).toBe(true);
  });

  it('renders solar day event metrics and assumptions in HTML report', () => {
    const report = createExperimentHtmlReport(savedSolarDayExperiment(), '2026-08-09T13:00:00.000Z');
    expect(report).toContain('Gün Doğumu / Batımı · Astronomik Referans');
    expect(report).toContain('Geometrik 0° doğuş');
    expect(report).toContain('Standart -0,833° doğuş');
    expect(report).toContain('ölçülen atmosfer değildir');
  });
});
