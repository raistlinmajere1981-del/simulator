import { describe, expect, it } from 'vitest';
import { convertGeoidTerrainProfile } from '../src/simulation/geoid-profile-conversion';
import {
  createGeoidConversionApplication,
  GEOID_CONVERSION_MODEL_ID,
  GEOID_CONVERSION_MODEL_VERSION
} from '../src/simulation/geoid-conversion-provenance';

function convertedResult() {
  return convertGeoidTerrainProfile({
    from: 'ellipsoidal-wgs84',
    to: 'orthometric-msl',
    geoidUndulationM: 30,
    geoidUndulationUncertaintyM: 0.4,
    observerGroundElevationM: 90,
    targetGroundElevationM: 140,
    points: [
      { id: 'a', distancePercent: 25, elevationM: 100 },
      { id: 'b', distancePercent: 75, elevationM: 120 }
    ]
  });
}

describe('geoid conversion provenance', () => {
  it('creates a portable model prediction with source, direction and metrics', () => {
    const application = createGeoidConversionApplication({
      experimentId: 'experiment-1',
      sourceLabel: 'EGM2008 saha çözümü',
      sourceModelVersion: '2.5 arc-minute',
      sourceEpoch: '2008.0',
      appliedAtIso: '2026-08-06T20:30:00.000Z',
      geoidUndulationM: 30,
      geoidUndulationUncertaintyM: 0.4,
      result: convertedResult()
    });

    expect(application.modelVersion).toBe(GEOID_CONVERSION_MODEL_VERSION);
    expect(application.targetDatum).toBe('orthometric-msl');
    expect(application.prediction.modelId).toBe(GEOID_CONVERSION_MODEL_ID);
    expect(application.prediction.experimentId).toBe('experiment-1');
    expect(application.prediction.metrics.find((metric) =>
      metric.key === 'convertedPointCount')?.value).toBe(4);
    expect(application.prediction.trace.assumptions.join(' ')).toContain('EGM2008');
    expect(application.prediction.trace.assumptions.join(' ')).toContain('2008.0');
    expect(application.prediction.trace.steps.find((step) =>
      step.id === 'sign-convention')?.formula).toContain('H = h - N');
  });

  it('preserves converted points without sharing mutable references', () => {
    const result = convertedResult();
    const application = createGeoidConversionApplication({
      experimentId: 'experiment-2',
      sourceLabel: 'Kurum grid servisi',
      appliedAtIso: '2026-08-06T20:31:00.000Z',
      geoidUndulationM: 30,
      result
    });

    application.points[0]!.elevationM = -999;
    expect(result.points[0]?.elevationM).toBe(70);
  });

  it('records explicit warnings when version, epoch or uncertainty are missing', () => {
    const application = createGeoidConversionApplication({
      experimentId: 'experiment-3',
      sourceLabel: 'Manuel saha değeri',
      appliedAtIso: '2026-08-06T20:32:00.000Z',
      geoidUndulationM: 30,
      result: convertGeoidTerrainProfile({
        from: 'ellipsoidal-wgs84',
        to: 'orthometric-msl',
        geoidUndulationM: 30,
        observerGroundElevationM: 90,
        targetGroundElevationM: 140,
        points: []
      })
    });

    const warnings = application.prediction.warnings.join(' ');
    expect(warnings).toContain('sürümü belirtilmedi');
    expect(warnings).toContain('epoku belirtilmedi');
    expect(warnings).toContain('belirsizliği belirtilmedi');
    expect(application.prediction.metrics.find((metric) =>
      metric.key === 'geoidUndulationUncertaintyM')?.value).toBeNull();
  });

  it('rejects missing labels, invalid dates and same-datum results', () => {
    const valid = {
      experimentId: 'experiment-4',
      sourceLabel: 'Model',
      appliedAtIso: '2026-08-06T20:33:00.000Z',
      geoidUndulationM: 30,
      result: convertedResult()
    };

    expect(() => createGeoidConversionApplication({
      ...valid,
      sourceLabel: '   '
    })).toThrow('Kaynak/model etiketi');
    expect(() => createGeoidConversionApplication({
      ...valid,
      appliedAtIso: 'not-a-date'
    })).toThrow('ISO tarih');
    expect(() => createGeoidConversionApplication({
      ...valid,
      result: { ...valid.result, to: valid.result.from }
    })).toThrow('farklı');
  });
});
