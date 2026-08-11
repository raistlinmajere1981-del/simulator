import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import {
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import {
  DEFAULT_SIMULATOR_INPUTS,
  type SavedExperiment
} from '../src/shared/simulator';
import {
  calculateSolarSeasonEvents,
  createSolarSeasonEventsPrediction,
  solarSeasonEventsMetadata
} from '../src/simulation/solar-season-events';
import {
  calculateSolarTimeOffset,
  createSolarTimeOffsetPrediction,
  solarTimeOffsetMetadata
} from '../src/simulation/solar-time-offset';
import {
  calculateSolarRouteComparison,
  createSolarRouteComparisonPrediction,
  solarRouteComparisonMetadata
} from '../src/simulation/solar-route-comparison';

const observedAtIso = '2024-06-20T12:00:00.000Z';
const latitudeDeg = 41.0082;
const longitudeDeg = 28.9784;
const routeEndLongitudeDeg = 58.9784;

function astronomyExperiment(): SavedExperiment {
  const experimentId = 'astronomy-persistence-test';
  const solarTime = calculateSolarTimeOffset({
    experimentId,
    observedAtIso,
    utcOffsetMinutes: 180,
    longitudeDeg
  });
  const seasons = calculateSolarSeasonEvents({
    experimentId,
    year: 2024,
    latitudeDeg,
    longitudeDeg,
    utcOffsetMinutes: 180
  });
  const route = calculateSolarRouteComparison({
    experimentId,
    observedAtIso,
    utcOffsetMinutes: 180,
    startLatitudeDeg: latitudeDeg,
    startLongitudeDeg: longitudeDeg,
    endLatitudeDeg: latitudeDeg,
    endLongitudeDeg: routeEndLongitudeDeg,
    sampleCount: 5
  });

  return {
    id: experimentId,
    name: 'Aşama 7 astronomi kayıt testi',
    createdAtIso: observedAtIso,
    updatedAtIso: observedAtIso,
    observedAtIso,
    observationUtcOffsetMinutes: 180,
    scenarioId: 'sun-moon-observation',
    inputs: {
      ...DEFAULT_SIMULATOR_INPUTS,
      observerLatitudeDeg: latitudeDeg,
      observerLongitudeDeg: longitudeDeg,
      targetLatitudeDeg: latitudeDeg,
      targetLongitudeDeg: routeEndLongitudeDeg
    },
    modelVersions: {
      [solarTimeOffsetMetadata.id]: solarTimeOffsetMetadata.version,
      [solarSeasonEventsMetadata.id]: solarSeasonEventsMetadata.version,
      [solarRouteComparisonMetadata.id]: solarRouteComparisonMetadata.version
    },
    predictions: [
      createSolarTimeOffsetPrediction(solarTime),
      createSolarSeasonEventsPrediction(seasons),
      createSolarRouteComparisonPrediction(route)
    ]
  };
}

describe('Aşama 7.8 astronomy persistence/report integration', () => {
  it('preserves route B and derived astronomy predictions through portable export/import', () => {
    const source = astronomyExperiment();
    const portable = createPortableExperimentFile(source, '1.27.0');
    const parsed = parsePortableExperimentFile(portable);

    expect(parsed.experiment.inputs.targetLatitudeDeg).toBe(latitudeDeg);
    expect(parsed.experiment.inputs.targetLongitudeDeg).toBe(routeEndLongitudeDeg);
    expect(parsed.experiment.predictions.map((prediction) => prediction.modelId)).toEqual([
      solarTimeOffsetMetadata.id,
      solarSeasonEventsMetadata.id,
      solarRouteComparisonMetadata.id
    ]);
  });

  it('stores self-describing A/B route endpoint metrics', () => {
    const routePrediction = astronomyExperiment().predictions.find(
      (prediction) => prediction.modelId === solarRouteComparisonMetadata.id
    );
    const metric = (key: string) => routePrediction?.metrics.find((item) => item.key === key)?.value;

    expect(metric('routeStartLatitudeDeg')).toBeCloseTo(latitudeDeg, 6);
    expect(metric('routeStartLongitudeDeg')).toBeCloseTo(longitudeDeg, 6);
    expect(metric('routeEndLatitudeDeg')).toBeCloseTo(latitudeDeg, 6);
    expect(metric('routeEndLongitudeDeg')).toBeCloseTo(routeEndLongitudeDeg, 6);
  });

  it('renders astronomy predictions as a named report group and formats event timestamps', () => {
    const experiment = astronomyExperiment();
    const seasonPrediction = experiment.predictions.find(
      (prediction) => prediction.modelId === solarSeasonEventsMetadata.id
    )!;
    const rawEventMs = seasonPrediction.metrics.find(
      (metric) => metric.key === 'march-equinoxUnixMs'
    )!.value!;
    const html = createExperimentHtmlReport(experiment, '2024-06-20T12:05:00.000Z');

    expect(html).toContain('Astronomi sonuçları');
    expect(html).toContain('Sivil Saat / Güneş Zamanı');
    expect(html).toContain('Ekinoks / Gündönümü');
    expect(html).toContain('Güneş Rota Karşılaştırması');
    expect(html).toContain('Rota karşılaştırması B');
    expect(html).not.toContain(`>${rawEventMs}<`);
  });
});
