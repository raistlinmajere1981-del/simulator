import { describe, expect, it } from 'vitest';
import type {
  StellarPanoramaGeometry,
  StellarPanoramaSkylineDraft
} from '../src/shared/stellar-local-horizon-import';
import { parseSavedStellarPanoramaLocalHorizonSource } from '../src/simulation/stellar-panorama-skyline-persistence';
import { savedStellarLocalHorizonSourceFromPanorama } from '../src/simulation/stellar-panorama-skyline-source';

const geometry: StellarPanoramaGeometry = {
  imageWidthPx: 800,
  imageHeightPx: 400,
  fullPanoWidthPx: 800,
  fullPanoHeightPx: 400,
  croppedAreaLeftPx: 0,
  croppedAreaTopPx: 0,
  poseHeadingDeg: 0,
  posePitchDeg: 0,
  poseRollDeg: 0
};

const draft: StellarPanoramaSkylineDraft = {
  fileName: 'assist-panorama.png',
  importedAtIso: '2026-08-10T15:00:00.000Z',
  fileSizeBytes: 12_000,
  sha256: 'e'.repeat(64),
  mimeType: 'image/png',
  imageWidthPx: 800,
  imageHeightPx: 400,
  dataUrl: 'data:image/png;base64,SESSION',
  metadata: {
    status: 'absent',
    metadataScaledToImage: false,
    standardXmpPacketFound: false,
    extendedXmpPacketFound: false,
    warnings: []
  }
};

const marks = Array.from({ length: 8 }, (_, index) => ({
  xPx: (index + 0.5) * 100 - 0.5,
  yPx: 199.5
}));

describe('panorama skyline assisted marking provenance', () => {
  it('persists an accepted gradient-assisted marking method and warning', () => {
    const source = savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'manual',
      markingMethod: 'assisted-gradient-v1',
      marks
    });
    expect(source.panoramaDerivation?.markingMethod).toBe('assisted-gradient-v1');
    expect(source.warnings.some((warning) => warning.includes('yardımcı taslaktan'))).toBe(true);

    const parsed = parseSavedStellarPanoramaLocalHorizonSource(JSON.parse(JSON.stringify(source)));
    expect(parsed?.panoramaDerivation?.markingMethod).toBe('assisted-gradient-v1');
  });

  it('defaults older v11 panorama derivations without markingMethod to manual', () => {
    const source = savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'manual',
      marks
    });
    const legacy = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
    const derivation = legacy.panoramaDerivation as Record<string, unknown>;
    delete derivation.markingMethod;
    const parsed = parseSavedStellarPanoramaLocalHorizonSource(legacy);
    expect(parsed?.panoramaDerivation?.markingMethod).toBe('manual');
  });

  it('rejects unknown persisted marking methods', () => {
    const source = savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'manual',
      markingMethod: 'assisted-gradient-v1-edited',
      marks
    });
    const raw = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
    const derivation = raw.panoramaDerivation as Record<string, unknown>;
    derivation.markingMethod = 'opaque-auto-segmentation';
    expect(parseSavedStellarPanoramaLocalHorizonSource(raw)).toBeNull();
  });
});
