import { describe, expect, it } from 'vitest';
import { calculateGreenwichMeanSiderealTimeDeg } from '../src/simulation/stellar-position';
import { calculateStellarLocalHorizonTrail } from '../src/simulation/stellar-local-horizon-trail';

const FLAT_ZERO_MASK = {
  sourceKind: 'manual' as const,
  sourceLabel: 'Düz 0° test ufku',
  points: [
    { azimuthDeg: 0, altitudeDeg: 0 },
    { azimuthDeg: 90, altitudeDeg: 0 },
    { azimuthDeg: 180, altitudeDeg: 0 },
    { azimuthDeg: 270, altitudeDeg: 0 }
  ]
};

const FLAT_TEN_MASK = {
  sourceKind: 'manual' as const,
  sourceLabel: 'Düz +10° test ufku',
  points: [
    { azimuthDeg: 0, altitudeDeg: 10 },
    { azimuthDeg: 90, altitudeDeg: 10 },
    { azimuthDeg: 180, altitudeDeg: 10 },
    { azimuthDeg: 270, altitudeDeg: 10 }
  ]
};

describe('stellar local-horizon trail', () => {
  it('0° düz skyline ile geometrik 0° ufuk batışını yeniden üretir', () => {
    const startAtIso = '2000-01-01T12:00:00.000Z';
    const rightAscensionDeg = calculateGreenwichMeanSiderealTimeDeg(startAtIso);
    const result = calculateStellarLocalHorizonTrail({
      startAtIso,
      durationMinutes: 720,
      sampleIntervalMinutes: 30,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg,
      declinationDeg: 0,
      label: 'equator-test',
      horizonMask: FLAT_ZERO_MASK
    });

    expect(result.samples).toHaveLength(25);
    expect(result.crossingScanIntervalMinutes).toBe(0.25);
    expect(result.localHorizonCrossings).toHaveLength(1);
    expect(result.localHorizonCrossings[0]!.kind).toBe('set');
    expect(result.localHorizonCrossings[0]!.elapsedMinutes).toBeCloseTo(359.0167, 2);
    expect(result.visibleDurationMinutes).not.toBeNull();
    expect(result.visibleDurationMinutes!).toBeCloseTo(359.0167, 2);
  });

  it('+10° düz skyline batışı geometrik ufuktan daha erken üretir', () => {
    const startAtIso = '2000-01-01T12:00:00.000Z';
    const rightAscensionDeg = calculateGreenwichMeanSiderealTimeDeg(startAtIso);
    const result = calculateStellarLocalHorizonTrail({
      startAtIso,
      durationMinutes: 720,
      sampleIntervalMinutes: 30,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg,
      declinationDeg: 0,
      label: 'equator-test',
      horizonMask: FLAT_TEN_MASK
    });

    expect(result.localHorizonCrossings).toHaveLength(1);
    expect(result.localHorizonCrossings[0]!.kind).toBe('set');
    expect(result.localHorizonCrossings[0]!.elapsedMinutes).toBeGreaterThan(300);
    expect(result.localHorizonCrossings[0]!.elapsedMinutes).toBeLessThan(359.0167);
    expect(result.visibleDurationMinutes).not.toBeNull();
    expect(result.visibleDurationMinutes!).toBeCloseTo(result.localHorizonCrossings[0]!.elapsedMinutes, 6);
  });

  it('yüksek circumpolar yıldız +20° skyline üzerinde tüm pencereyi korur', () => {
    const result = calculateStellarLocalHorizonTrail({
      startAtIso: '2026-08-09T18:00:00.000Z',
      durationMinutes: 1_440,
      sampleIntervalMinutes: 60,
      latitudeDeg: 60,
      longitudeDeg: 0,
      rightAscensionDeg: 0,
      declinationDeg: 80,
      label: 'circumpolar-test',
      horizonMask: {
        sourceKind: 'manual',
        sourceLabel: 'Düz +20° test ufku',
        points: [
          { azimuthDeg: 0, altitudeDeg: 20 },
          { azimuthDeg: 90, altitudeDeg: 20 },
          { azimuthDeg: 180, altitudeDeg: 20 },
          { azimuthDeg: 270, altitudeDeg: 20 }
        ]
      }
    });

    expect(result.localHorizonCrossings).toHaveLength(0);
    expect(result.visibleDurationMinutes).toBeCloseTo(1_440, 8);
    expect(result.samples.every((sample) => sample.geometricClearanceDeg === null || sample.geometricClearanceDeg > 0)).toBe(true);
  });

  it('azimuta bağlı skyline her örnekte interpolasyonla uygulanır', () => {
    const result = calculateStellarLocalHorizonTrail({
      startAtIso: '2000-01-01T12:00:00.000Z',
      durationMinutes: 60,
      sampleIntervalMinutes: 60,
      latitudeDeg: 0,
      longitudeDeg: 0,
      rightAscensionDeg: 0,
      declinationDeg: 0,
      horizonMask: {
        sourceKind: 'manual',
        sourceLabel: 'Yönlü test ufku',
        points: [
          { azimuthDeg: 0, altitudeDeg: 0 },
          { azimuthDeg: 90, altitudeDeg: 10 },
          { azimuthDeg: 180, altitudeDeg: 20 },
          { azimuthDeg: 270, altitudeDeg: 10 }
        ]
      }
    });

    for (const sample of result.samples) {
      if (sample.azimuthDeg === null) {
        expect(sample.status).toBe('undefined-azimuth');
        continue;
      }
      expect(sample.localHorizonAltitudeDeg).not.toBeNull();
      expect(sample.geometricClearanceDeg).toBeCloseTo(
        sample.geometricAltitudeDeg - sample.localHorizonAltitudeDeg!,
        10
      );
    }
  });

  it('maske provenansını ve örnekleme kalitesini sonuçta korur', () => {
    const result = calculateStellarLocalHorizonTrail({
      startAtIso: '2026-08-09T18:00:00.000Z',
      durationMinutes: 60,
      sampleIntervalMinutes: 30,
      latitudeDeg: 41,
      longitudeDeg: 29,
      rightAscensionDeg: 200,
      declinationDeg: 30,
      horizonMask: {
        sourceKind: 'external',
        sourceLabel: 'Ölçülmüş skyline.csv',
        points: [
          { azimuthDeg: 0, altitudeDeg: 1 },
          { azimuthDeg: 120, altitudeDeg: 3 },
          { azimuthDeg: 240, altitudeDeg: 2 }
        ]
      }
    });

    expect(result.maskSourceKind).toBe('external');
    expect(result.maskSourceLabel).toBe('Ölçülmüş skyline.csv');
    expect(result.maskPointCount).toBe(3);
    expect(result.maskMaximumAzimuthGapDeg).toBeCloseTo(120, 10);
    expect(result.trace.assumptions.some((item) => item.includes('Atmosferik kırılma'))).toBe(true);
  });
});
