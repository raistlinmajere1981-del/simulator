import { describe, expect, it } from 'vitest';
import type {
  StellarPanoramaGeometry,
  StellarPanoramaSkylineDraft
} from '../src/shared/stellar-local-horizon-import';
import {
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION
} from '../src/simulation/equirectangular-panorama';
import {
  StellarPanoramaSkylineSourceError,
  savedStellarLocalHorizonSourceFromPanorama
} from '../src/simulation/stellar-panorama-skyline-source';

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

const draft: StellarPanoramaSkylineDraft = {
  fileName: 'field-panorama.jpg',
  importedAtIso: '2026-08-10T10:00:00.000Z',
  fileSizeBytes: 5_000_000,
  sha256: 'a'.repeat(64),
  mimeType: 'image/jpeg',
  imageWidthPx: 4000,
  imageHeightPx: 1600,
  dataUrl: 'data:image/jpeg;base64,SESSION_ONLY',
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

function markAtAzimuth(azimuthDeg: number, altitudeDeg = 5) {
  const headingDeg = azimuthDeg > 180 ? azimuthDeg - 360 : azimuthDeg;
  return {
    xPx: (headingDeg + 180) / 360 * geometry.fullPanoWidthPx - 0.5,
    yPx: (90 - altitudeDeg) / 180 * geometry.fullPanoHeightPx - 0.5 - geometry.croppedAreaTopPx
  };
}

const eightMarks = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5]
  .map((azimuthDeg) => markAtAzimuth(azimuthDeg));

describe('stellar panorama skyline source', () => {
  it('creates a provenance-rich derived local-horizon source from full horizontal GPano coverage', () => {
    const source = savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'gpano-xmp',
      marks: eightMarks
    });
    expect(source.format).toBe('panorama');
    expect(source.fileName).toBe('field-panorama.jpg');
    expect(source.pointCount).toBe(8);
    expect(source.maximumAzimuthGapDeg).toBeCloseTo(45, 10);
    expect(source.points.every((point) => Math.abs(point.altitudeDeg - 5) < 1e-10)).toBe(true);
    expect(source.panoramaDerivation).toMatchObject({
      algorithmId: EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
      algorithmVersion: EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
      geometrySource: 'gpano-xmp',
      horizontalCoverageDeg: 360,
      verticalCoverageDeg: 144,
      fullSphereCoverage: false
    });
    expect(source.panoramaDerivation?.marks).toHaveLength(8);
    const firstMark = source.panoramaDerivation!.marks[0]!;
    expect(firstMark.xPx).toBe(eightMarks[0]!.xPx);
    expect(firstMark.yPx).toBe(eightMarks[0]!.yPx);
    expect(firstMark.azimuthDeg).toBeCloseTo(22.5, 12);
    expect(firstMark.altitudeDeg).toBeCloseTo(5, 12);
    expect(source).not.toHaveProperty('dataUrl');
    expect(JSON.stringify(source)).not.toContain('SESSION_ONLY');
  });

  it('allows explicit manual geometry but records that the orientation was not GPano-verified', () => {
    const manualDraft: StellarPanoramaSkylineDraft = {
      ...draft,
      metadata: {
        status: 'absent',
        metadataScaledToImage: false,
        standardXmpPacketFound: false,
        extendedXmpPacketFound: false,
        warnings: ['GPano yok.']
      }
    };
    const source = savedStellarLocalHorizonSourceFromPanorama({
      draft: manualDraft,
      geometry: { ...geometry, poseHeadingDeg: 12 },
      geometrySource: 'manual',
      marks: eightMarks
    });
    expect(source.panoramaDerivation?.geometrySource).toBe('manual');
    expect(source.warnings.some((warning) => warning.includes('manuel girildi'))).toBe(true);
  });

  it('rejects partial horizontal coverage instead of interpolating unseen azimuths', () => {
    const partialGeometry: StellarPanoramaGeometry = {
      ...geometry,
      imageWidthPx: 3000,
      fullPanoWidthPx: 4000,
      croppedAreaLeftPx: 500
    };
    const partialDraft: StellarPanoramaSkylineDraft = {
      ...draft,
      imageWidthPx: 3000,
      metadata: {
        status: 'complete',
        geometry: partialGeometry,
        projectionType: 'equirectangular',
        metadataScaledToImage: false,
        standardXmpPacketFound: true,
        extendedXmpPacketFound: false,
        warnings: []
      }
    };
    expect(() => savedStellarLocalHorizonSourceFromPanorama({
      draft: partialDraft,
      geometry: partialGeometry,
      geometrySource: 'gpano-xmp',
      marks: eightMarks.map((mark) => ({ xPx: Math.max(0, mark.xPx - 500), yPx: mark.yPx }))
    })).toThrow('270.000° yatay kapsam');
  });

  it('rejects sparse marks with an azimuth gap over 90 degrees', () => {
    const sparseMarks = [15, 45, 75, 105, 135, 165, 195, 225]
      .map((azimuthDeg) => markAtAzimuth(azimuthDeg));
    expect(() => savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'gpano-xmp',
      marks: sparseMarks
    })).toThrow('en büyük azimut boşluğu 150.000°');
  });

  it('rejects GPano mode when the user-edited geometry no longer matches verified metadata', () => {
    expect(() => savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry: { ...geometry, poseHeadingDeg: 1 },
      geometrySource: 'gpano-xmp',
      marks: eightMarks
    })).toThrow('değiştirildi');
  });

  it('rejects GPano mode when the source has no complete GPano geometry', () => {
    const noGpano: StellarPanoramaSkylineDraft = {
      ...draft,
      metadata: {
        status: 'absent',
        metadataScaledToImage: false,
        standardXmpPacketFound: false,
        extendedXmpPacketFound: false,
        warnings: []
      }
    };
    expect(() => savedStellarLocalHorizonSourceFromPanorama({
      draft: noGpano,
      geometry,
      geometrySource: 'gpano-xmp',
      marks: eightMarks
    })).toThrow(StellarPanoramaSkylineSourceError);
  });

  it('requires at least eight manual skyline marks for a panorama-derived 360-degree source', () => {
    expect(() => savedStellarLocalHorizonSourceFromPanorama({
      draft,
      geometry,
      geometrySource: 'gpano-xmp',
      marks: eightMarks.slice(0, 7)
    })).toThrow('en az 8');
  });
});
