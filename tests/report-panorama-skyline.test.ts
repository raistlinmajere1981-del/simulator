import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import type {
  StellarPanoramaGeometry,
  StellarPanoramaSkylineDraft
} from '../src/shared/stellar-local-horizon-import';
import { savedStellarLocalHorizonSourceFromPanorama } from '../src/simulation/stellar-panorama-skyline-source';
import { savedExperimentFixture } from './portable.test';

const geometry: StellarPanoramaGeometry = {
  imageWidthPx: 4000,
  imageHeightPx: 1600,
  fullPanoWidthPx: 4000,
  fullPanoHeightPx: 2000,
  croppedAreaLeftPx: 0,
  croppedAreaTopPx: 200,
  poseHeadingDeg: 17.25,
  posePitchDeg: 1.5,
  poseRollDeg: -0.5
};

function panoramaSource() {
  const draft: StellarPanoramaSkylineDraft = {
    fileName: 'report-panorama.jpg',
    importedAtIso: '2026-08-10T10:40:00.000Z',
    fileSizeBytes: 3_500_000,
    sha256: 'f'.repeat(64),
    mimeType: 'image/jpeg',
    imageWidthPx: 4000,
    imageHeightPx: 1600,
    dataUrl: 'data:image/jpeg;base64,REPORT_IMAGE_MUST_NOT_PERSIST',
    metadata: {
      status: 'complete',
      geometry,
      projectionType: 'equirectangular',
      metadataScaledToImage: true,
      standardXmpPacketFound: true,
      extendedXmpPacketFound: true,
      warnings: ['Extended XMP bulundu; geometri standard XMP paketinden çözüldü.']
    }
  };
  const marks = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((azimuthDeg) => {
    const headingDeg = azimuthDeg > 180 ? azimuthDeg - 360 : azimuthDeg;
    return {
      xPx: (headingDeg + 180) / 360 * geometry.fullPanoWidthPx - 0.5,
      yPx: (90 - 4) / 180 * geometry.fullPanoHeightPx - 0.5 - geometry.croppedAreaTopPx
    };
  });
  return savedStellarLocalHorizonSourceFromPanorama({
    draft,
    geometry,
    geometrySource: 'gpano-xmp',
    marks
  });
}

describe('panorama skyline HTML report', () => {
  it('reports XMP, pose, crop and manual-mark provenance without embedding image bytes', () => {
    const html = createExperimentHtmlReport({
      ...savedExperimentFixture,
      stellarLocalHorizonSource: panoramaSource()
    });

    expect(html).toContain('Panorama skyline kaynak provenansı');
    expect(html).toContain('PANORAMA · türetilmiş geometrik');
    expect(html).toContain('report-panorama.jpg');
    expect(html).toContain('Panoramadan türetilmiş geometrik 360° skyline');
    expect(html).toContain('GPano XMP');
    expect(html).toContain('complete');
    expect(html).toContain('standart XMP var');
    expect(html).toContain('extended XMP var');
    expect(html).toContain('bitmap ölçekleme uygulandı');
    expect(html).toContain('4000 × 1600 px');
    expect(html).toContain('4000 × 2000 px');
    expect(html).toContain('heading 17,25°');
    expect(html).toContain('pitch 1,5°');
    expect(html).toContain('roll -0,5°');
    expect(html).toContain('8 işaret');
    expect(html).toContain('gpano-equirectangular-local-frame@0.1.0');
    expect(html).toContain('panorama görüntü baytlarını içermez');
    expect(html).not.toContain('REPORT_IMAGE_MUST_NOT_PERSIST');
  });
});
