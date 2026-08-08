import { describe, expect, it } from 'vitest';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  SOLAR_POSITION_ALGORITHM_ID,
  SOLAR_POSITION_ALGORITHM_VERSION,
  calculateSolarPosition
} from '../src/simulation/solar-position';
import { createSolarPositionPrediction } from '../src/simulation/solar-position-prediction';
import {
  LUNAR_POSITION_ALGORITHM_ID,
  LUNAR_POSITION_ALGORITHM_VERSION,
  calculateLunarPosition
} from '../src/simulation/lunar-position';
import { createLunarPositionPrediction } from '../src/simulation/lunar-position-prediction';
import { createExperimentHtmlReport } from '../src/report/html-report';

function savedLunarExperiment(): SavedExperiment {
  const id = 'lunar-observation-test';
  const observedAtIso = '2026-08-08T20:06:28.000Z';
  const latitudeDeg = 41.0082;
  const longitudeDeg = 28.9784;
  const solar = calculateSolarPosition({ observedAtIso, latitudeDeg, longitudeDeg });
  const lunar = calculateLunarPosition({
    observedAtIso,
    latitudeDeg,
    longitudeDeg,
    solarPosition: solar
  });

  return {
    id,
    name: 'Güneş ve Ay gözlemi test kaydı',
    createdAtIso: '2026-08-08T20:10:00.000Z',
    updatedAtIso: '2026-08-08T20:12:00.000Z',
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'sun-moon-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: latitudeDeg,
      observerLongitudeDeg: longitudeDeg
    },
    modelVersions: {
      [SOLAR_POSITION_ALGORITHM_ID]: SOLAR_POSITION_ALGORITHM_VERSION,
      [LUNAR_POSITION_ALGORITHM_ID]: LUNAR_POSITION_ALGORITHM_VERSION
    },
    predictions: [
      createSolarPositionPrediction(id, solar),
      createLunarPositionPrediction(id, lunar)
    ]
  };
}

describe('lunar observation persistence', () => {
  it('round-trips the shared observation instant and both celestial snapshots', () => {
    const portable = createPortableExperimentFile(
      savedLunarExperiment(),
      '1.9.0',
      '2026-08-08T20:15:00.000Z'
    );
    const parsed = parsePortableExperimentFile(portable).experiment;

    expect(parsed.scenarioId).toBe('sun-moon-observation');
    expect(parsed.observedAtIso).toBe('2026-08-08T20:06:28.000Z');
    expect(parsed.observationUtcOffsetMinutes).toBe(180);
    expect(parsed.modelVersions[LUNAR_POSITION_ALGORITHM_ID]).toBe(LUNAR_POSITION_ALGORITHM_VERSION);
    expect(parsed.predictions.map((prediction) => prediction.modelId)).toEqual([
      SOLAR_POSITION_ALGORITHM_ID,
      LUNAR_POSITION_ALGORITHM_ID
    ]);
    const lunar = parsed.predictions.find((prediction) => prediction.modelId === LUNAR_POSITION_ALGORITHM_ID);
    expect(lunar?.metrics.find((metric) => metric.key === 'lunarElevationDeg')?.value).toBeTypeOf('number');
    expect(lunar?.metrics.find((metric) => metric.key === 'lunarIlluminatedFraction')?.value).toBeTypeOf('number');
    expect(lunar?.traceId).toContain('lunar-position-low-precision:');
  });

  it('renders a named lunar prediction and its traceable phase metrics in HTML', () => {
    const report = createExperimentHtmlReport(
      savedLunarExperiment(),
      '2026-08-08T20:20:00.000Z'
    );

    expect(report).toContain('Ay Konumu ve Fazı · Astronomik Referans');
    expect(report).toContain('Geometrik Ay yüksekliği');
    expect(report).toContain('Aydınlık oranı');
    expect(report).toContain('Yatay paralaks');
    expect(report).toContain('Faz geometrisi');
    expect(report).toContain('Güneş Konumu · Astronomik Referans');
  });
});
