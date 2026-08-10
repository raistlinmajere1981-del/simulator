import { describe, expect, it } from 'vitest';
import {
  GPANO_NAMESPACE_URI,
  extractJpegXmpPackets,
  parseGpanoMetadataFromXmpPackets,
  readGpanoMetadataFromJpeg
} from '../src/simulation/gpano-xmp';

const XMP_HEADER = 'http://ns.adobe.com/xap/1.0/\u0000';
const EXT_HEADER = 'http://ns.adobe.com/xmp/extension/\u0000';

function gpanoXml(overrides: Record<string, string | number | undefined> = {}): string {
  const values: Record<string, string | number | undefined> = {
    ProjectionType: 'equirectangular',
    PoseHeadingDegrees: 350,
    PosePitchDegrees: 0,
    PoseRollDegrees: 0,
    CroppedAreaImageWidthPixels: 4000,
    CroppedAreaImageHeightPixels: 2000,
    FullPanoWidthPixels: 4000,
    FullPanoHeightPixels: 2000,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 0,
    ...overrides
  };
  const body = Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `<p:${key}>${value}</p:${key}>`)
    .join('');
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:p="${GPANO_NAMESPACE_URI}">${body}</rdf:Description></rdf:RDF></x:xmpmeta>`;
}

function jpegWithApp1Payloads(payloads: string[]): Uint8Array {
  const bytes: number[] = [0xff, 0xd8];
  for (const payload of payloads) {
    const raw = new TextEncoder().encode(payload);
    const length = raw.length + 2;
    bytes.push(0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...raw);
  }
  bytes.push(0xff, 0xda, 0x00, 0x02, 0xff, 0xd9);
  return Uint8Array.from(bytes);
}

describe('GPano XMP parser', () => {
  it('extracts standard JPEG APP1 XMP and ignores unrelated APP1 payloads', () => {
    const jpeg = jpegWithApp1Payloads([
      'Exif\u0000\u0000not-xmp',
      `${XMP_HEADER}${gpanoXml()}`
    ]);
    const extracted = extractJpegXmpPackets(jpeg);
    expect(extracted.standardPackets).toHaveLength(1);
    expect(extracted.standardPackets[0]).toContain(GPANO_NAMESPACE_URI);
    expect(extracted.extendedPacketFound).toBe(false);
    expect(extracted.warnings).toHaveLength(0);
  });

  it('parses complete GPano geometry using the namespace URI rather than a fixed prefix', () => {
    const metadata = parseGpanoMetadataFromXmpPackets({
      standardPackets: [gpanoXml()],
      actualImageWidthPx: 4000,
      actualImageHeightPx: 2000
    });
    expect(metadata.status).toBe('complete');
    expect(metadata.geometry).toEqual({
      imageWidthPx: 4000,
      imageHeightPx: 2000,
      fullPanoWidthPx: 4000,
      fullPanoHeightPx: 2000,
      croppedAreaLeftPx: 0,
      croppedAreaTopPx: 0,
      poseHeadingDeg: 350,
      posePitchDeg: 0,
      poseRollDeg: 0
    });
    expect(metadata.metadataScaledToImage).toBe(false);
  });

  it('supports GPano properties serialized as RDF attributes', () => {
    const xml = `<rdf:Description xmlns:g="${GPANO_NAMESPACE_URI}" g:ProjectionType="equirectangular" g:PoseHeadingDegrees="12.5" g:CroppedAreaImageWidthPixels="4000" g:CroppedAreaImageHeightPixels="2000" g:FullPanoWidthPixels="4000" g:FullPanoHeightPixels="2000" g:CroppedAreaLeftPixels="0" g:CroppedAreaTopPixels="0" />`;
    const metadata = parseGpanoMetadataFromXmpPackets({
      standardPackets: [xml],
      actualImageWidthPx: 4000,
      actualImageHeightPx: 2000
    });
    expect(metadata.status).toBe('complete');
    expect(metadata.geometry?.poseHeadingDeg).toBe(12.5);
    expect(metadata.geometry?.posePitchDeg).toBe(0);
    expect(metadata.geometry?.poseRollDeg).toBe(0);
    expect(metadata.warnings.some((warning) => warning.includes('PosePitchDegrees'))).toBe(true);
  });

  it('rescales GPano crop/full geometry when the bitmap was uniformly resized', () => {
    const metadata = parseGpanoMetadataFromXmpPackets({
      standardPackets: [gpanoXml({
        CroppedAreaImageWidthPixels: 4000,
        CroppedAreaImageHeightPixels: 2000,
        FullPanoWidthPixels: 8000,
        FullPanoHeightPixels: 4000,
        CroppedAreaLeftPixels: 1000,
        CroppedAreaTopPixels: 500
      })],
      actualImageWidthPx: 2000,
      actualImageHeightPx: 1000
    });
    expect(metadata.status).toBe('complete');
    expect(metadata.metadataScaledToImage).toBe(true);
    expect(metadata.geometry).toMatchObject({
      imageWidthPx: 2000,
      imageHeightPx: 1000,
      fullPanoWidthPx: 4000,
      fullPanoHeightPx: 2000,
      croppedAreaLeftPx: 500,
      croppedAreaTopPx: 250
    });
  });

  it('fails closed when the bitmap aspect ratio no longer matches GPano crop metadata', () => {
    const metadata = parseGpanoMetadataFromXmpPackets({
      standardPackets: [gpanoXml()],
      actualImageWidthPx: 4000,
      actualImageHeightPx: 1800
    });
    expect(metadata.status).toBe('incompatible-scale');
    expect(metadata.geometry).toBeUndefined();
  });

  it('rejects unsupported projection and missing real-world heading for automatic orientation', () => {
    const unsupported = parseGpanoMetadataFromXmpPackets({
      standardPackets: [gpanoXml({ ProjectionType: 'cylindrical' })],
      actualImageWidthPx: 4000,
      actualImageHeightPx: 2000
    });
    expect(unsupported.status).toBe('unsupported-projection');
    expect(unsupported.geometry).toBeUndefined();

    const missingHeading = parseGpanoMetadataFromXmpPackets({
      standardPackets: [gpanoXml({ PoseHeadingDegrees: undefined })],
      actualImageWidthPx: 4000,
      actualImageHeightPx: 2000
    });
    expect(missingHeading.status).toBe('incomplete');
    expect(missingHeading.geometry).toBeUndefined();
  });

  it('detects Extended XMP but never uses it to invent missing standard GPano fields', () => {
    const jpeg = jpegWithApp1Payloads([
      `${XMP_HEADER}${gpanoXml({ PoseHeadingDegrees: undefined })}`,
      `${EXT_HEADER}0123456789abcdef0123456789abcdefrest`
    ]);
    const metadata = readGpanoMetadataFromJpeg(jpeg, 4000, 2000);
    expect(metadata.status).toBe('incomplete');
    expect(metadata.extendedXmpPacketFound).toBe(true);
    expect(metadata.geometry).toBeUndefined();
    expect(metadata.warnings.some((warning) => warning.includes('Extended XMP'))).toBe(true);
  });
});
