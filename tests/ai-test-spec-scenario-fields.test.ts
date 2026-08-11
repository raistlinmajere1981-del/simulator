import { describe, expect, it } from 'vitest';
import {
  buildExperimentSetupApplication,
  parseExperimentSetupText
} from '../src/shared/text-experiment-setup';

function found(text: string, fieldId: string) {
  return parseExperimentSetupText(text).candidates.find((candidate) => candidate.fieldId === fieldId);
}

function application(text: string) {
  const draft = parseExperimentSetupText(text);
  return buildExperimentSetupApplication(
    draft,
    draft.candidates.filter((candidate) => candidate.status === 'found').map((candidate) => candidate.id),
    '2026-08-11T12:00:00.000Z'
  );
}

describe('GGL-AI-TEST v1 scenario-specific fields', () => {
  it('builds primary and station-B shadow settings', () => {
    const text = `GGL-AI-TEST v1
scenario: shadow-observation
shadow.gnomon_height_m: 1.5
shadow.observed_length_m: 0.65
shadow.observed_length_uncertainty_m: 0.02
shadow.observed_azimuth_deg: 190
shadow.observed_azimuth_uncertainty_deg: 2
shadow.station_b.coordinates: 39.9334,32.8597
shadow.station_b.gnomon_height_m: 1
END GGL-AI-TEST`;
    const result = application(text);
    expect(result.shadowSettingsChanges).toEqual({
      gnomonHeightM: 1.5,
      observedShadowLengthM: 0.65,
      observedShadowLengthUncertaintyM: 0.02,
      observedShadowAzimuthDeg: 190,
      observedShadowAzimuthUncertaintyDeg: 2
    });
    expect(result.dualShadowStationBChanges?.latitudeDeg).toBeCloseTo(39.9334);
    expect(result.dualShadowStationBChanges?.longitudeDeg).toBeCloseTo(32.8597);
    expect(result.dualShadowStationBChanges?.gnomonHeightM).toBe(1);
  });

  it('builds curated stellar settings and 8-direction manual horizon', () => {
    const text = `GGL-AI-TEST v1
scenario: stellar-observation
stellar.star_id: hr-0424
stellar.trail_duration_minutes: 720
stellar.sample_interval_minutes: 10
stellar.local_horizon.enabled: true
stellar.local_horizon.n_deg: 5
stellar.local_horizon.ne_deg: 4
stellar.local_horizon.e_deg: 3
stellar.local_horizon.se_deg: 2
stellar.local_horizon.s_deg: 1
stellar.local_horizon.sw_deg: 2
stellar.local_horizon.w_deg: 3
stellar.local_horizon.nw_deg: 4
END GGL-AI-TEST`;
    const result = application(text);
    expect(result.stellarSettingsChanges).toEqual({
      starId: 'hr-0424',
      trailDurationMinutes: 720,
      trailSampleIntervalMinutes: 10,
      localHorizonEnabled: true,
      localHorizonNorthDeg: 5,
      localHorizonNorthEastDeg: 4,
      localHorizonEastDeg: 3,
      localHorizonSouthEastDeg: 2,
      localHorizonSouthDeg: 1,
      localHorizonSouthWestDeg: 2,
      localHorizonWestDeg: 3,
      localHorizonNorthWestDeg: 4
    });
  });

  it('accepts only supported eclipse half windows', () => {
    const valid = `GGL-AI-TEST v1\neclipse.search_half_window_hours: 12\nEND GGL-AI-TEST`;
    expect(application(valid).eclipseSearchHalfWindowHours).toBe(12);
    const invalid = `GGL-AI-TEST v1\neclipse.search_half_window_hours: 10\nEND GGL-AI-TEST`;
    expect(found(invalid, 'eclipseSearchHalfWindowHours')?.status).toBe('review');
  });

  it('fails closed for unknown star and unsupported trail enum', () => {
    const text = `GGL-AI-TEST v1
stellar.star_id: hr-9999
stellar.trail_duration_minutes: 500
stellar.sample_interval_minutes: 7
END GGL-AI-TEST`;
    expect(found(text, 'stellarStarId')?.status).toBe('review');
    expect(found(text, 'stellarTrailDurationMinutes')?.status).toBe('review');
    expect(found(text, 'stellarSampleIntervalMinutes')?.status).toBe('review');
  });

  it('fails closed for invalid shadow and skyline bounds', () => {
    const text = `GGL-AI-TEST v1
shadow.gnomon_height_m: 0
shadow.observed_azimuth_deg: 361
stellar.local_horizon.n_deg: 91
END GGL-AI-TEST`;
    expect(found(text, 'shadowGnomonHeightM')?.status).toBe('review');
    expect(found(text, 'shadowObservedAzimuthDeg')?.status).toBe('review');
    expect(found(text, 'stellarLocalHorizonNorthDeg')?.status).toBe('review');
  });
});
