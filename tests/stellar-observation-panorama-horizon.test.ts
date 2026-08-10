import { describe, expect, it } from 'vitest';
import type {
  StellarPanoramaGeometry,
  StellarPanoramaSkylineDraft
} from '../src/shared/stellar-local-horizon-import';
import { DEFAULT_STELLAR_OBSERVATION_SETTINGS, calculateStellarObservation } from '../src/simulation/stellar-observation';
import { savedStellarLocalHorizonSourceFromPanorama } from '../src/simulation/stellar-panorama-skyline-source';

const geometry: StellarPanoramaGeometry = {
  imageWidthPx: 4000,
  imageHeightPx: 1600,
  fullPanoWidthPx: 4000,
  fullPanoHeightPx: 2000,
  croppedAreaLeftPx: 0,
  croppedAreaTopPx: 200,
  poseHeadingDeg: 0,
  posePitchDeg: 0,
  poseRollDeg: 0
};

function source() {
  const draft: StellarPanoramaSkylineDraft = {
    fileName: 'stellar-panorama.jpg',
    importedAtIso: '2026-08-10T10:30:00.000Z',
    fileSizeBytes: 2_000_000,
    sha256: 'e'.repeat(64),
    mimeType: 'image/jpeg',
    imageWidthPx: 4000,
    imageHeightPx: 1600,
    dataUrl: 'data:image/jpeg;base64,SESSION',
    metadata: {
      status: 'complete',
      geometry,
      projectionType: 'equirectangular',
      metadataScaledToImage: false,
      standardXmpPacketFound: true,
      extendedXmpPacketFound: false,
      warnings: []
    }
  };
  const marks = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((azimuthDeg) => {
    const headingDeg = azimuthDeg > 180 ? azimuthDeg - 360 : azimuthDeg;
    return {
      xPx: (headingDeg + 180) / 360 * geometry.fullPanoWidthPx - 0.5,
      yPx: (90 - 7) / 180 * geometry.fullPanoHeightPx - 0.5 - geometry.croppedAreaTopPx
    };
  });
  return savedStellarLocalHorizonSourceFromPanorama({
    draft,
    geometry,
    geometrySource: 'gpano-xmp',
    marks
  });
}

describe('stellar observation panorama local horizon', () => {
  it('uses the existing local-horizon engine while preserving panorama-derived provenance', () => {
    const panorama = source();
    const result = calculateStellarObservation({
      experimentId: 'stellar-panorama-derived',
      observedAtIso: '2026-08-10T17:00:00Z',
      latitudeDeg: 41.0082,
      longitudeDeg: 28.9784,
      settings: {
        ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external',
        trailDurationMinutes: 180,
        trailSampleIntervalMinutes: 30
      },
      externalLocalHorizonSource: panorama
    });

    expect(result.localHorizonSource?.format).toBe('panorama');
    expect(result.localHorizonSource?.panoramaDerivation?.geometrySource).toBe('gpano-xmp');
    expect(result.localHorizonSource?.panoramaDerivation?.marks).toHaveLength(8);
    expect(result.localHorizonTrail?.maskPointCount).toBe(8);
    expect(result.trace.steps.find((step) => step.id === 'local-source')?.substitution).toContain('derived');
    expect(result.warnings.some((warning) => warning.includes('Panoramadan türetilmiş geometrik skyline'))).toBe(true);
  });
});
