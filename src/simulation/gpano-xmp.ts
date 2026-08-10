import type {
  StellarPanoramaGeometry,
  StellarPanoramaMetadataSummary
} from '../shared/stellar-local-horizon-import';

export const GPANO_NAMESPACE_URI = 'http://ns.google.com/photos/1.0/panorama/';
export const GPANO_XMP_PARSER_ID = 'gpano-standard-xmp-jpeg';
export const GPANO_XMP_PARSER_VERSION = '0.1.0';

const STANDARD_XMP_HEADER = 'http://ns.adobe.com/xap/1.0/\u0000';
const EXTENDED_XMP_HEADER = 'http://ns.adobe.com/xmp/extension/\u0000';
const JPEG_APP1_MARKER = 0xe1;
const JPEG_START_OF_SCAN_MARKER = 0xda;
const JPEG_END_OF_IMAGE_MARKER = 0xd9;
const SCALE_RATIO_TOLERANCE = 1e-6;

export interface ExtractedJpegXmpPackets {
  standardPackets: string[];
  extendedPacketFound: boolean;
  warnings: string[];
}

function bytesStartWith(bytes: Uint8Array, offset: number, text: string): boolean {
  if (offset + text.length > bytes.length) return false;
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[offset + index] !== text.charCodeAt(index)) return false;
  }
  return true;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Reads standard XMP packets from JPEG APP1 segments. Extended XMP is only
 * detected, not merged; callers can therefore fail closed when required GPano
 * fields are not present in the standard packet.
 */
export function extractJpegXmpPackets(bytes: Uint8Array): ExtractedJpegXmpPackets {
  const result: ExtractedJpegXmpPackets = {
    standardPackets: [],
    extendedPacketFound: false,
    warnings: []
  };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    result.warnings.push('Dosya geçerli bir JPEG SOI başlığıyla başlamıyor; gömülü XMP okunmadı.');
    return result;
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      result.warnings.push('JPEG segment zincirinde beklenmeyen veri görüldü; XMP taraması burada durduruldu.');
      break;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset]!;
    offset += 1;

    if (marker === JPEG_START_OF_SCAN_MARKER || marker === JPEG_END_OF_IMAGE_MARKER) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > bytes.length) {
      result.warnings.push('JPEG segment uzunluğu eksik; XMP taraması tamamlanamadı.');
      break;
    }
    const segmentLength = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (segmentLength < 2) {
      result.warnings.push('JPEG segment uzunluğu geçersiz; XMP taraması tamamlanamadı.');
      break;
    }
    const payloadStart = offset + 2;
    const payloadEnd = offset + segmentLength;
    if (payloadEnd > bytes.length) {
      result.warnings.push('JPEG segmenti dosya sınırını aşıyor; XMP taraması tamamlanamadı.');
      break;
    }

    if (marker === JPEG_APP1_MARKER) {
      if (bytesStartWith(bytes, payloadStart, STANDARD_XMP_HEADER)) {
        result.standardPackets.push(
          decodeUtf8(bytes.subarray(payloadStart + STANDARD_XMP_HEADER.length, payloadEnd))
        );
      } else if (bytesStartWith(bytes, payloadStart, EXTENDED_XMP_HEADER)) {
        result.extendedPacketFound = true;
      }
    }
    offset = payloadEnd;
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function findGpanoPrefix(xml: string): string | null {
  const namespacePattern = new RegExp(
    `xmlns:([A-Za-z_][A-Za-z0-9_.-]*)\\s*=\\s*["']${escapeRegExp(GPANO_NAMESPACE_URI)}["']`,
    'i'
  );
  return namespacePattern.exec(xml)?.[1] ?? null;
}

function readProperty(xml: string, prefix: string, name: string): string | null {
  const escapedPrefix = escapeRegExp(prefix);
  const escapedName = escapeRegExp(name);
  const element = new RegExp(
    `<${escapedPrefix}:${escapedName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedPrefix}:${escapedName}>`,
    'i'
  ).exec(xml)?.[1];
  if (element !== undefined) return decodeXmlEntities(element.trim());
  const attribute = new RegExp(
    `\\b${escapedPrefix}:${escapedName}\\s*=\\s*["']([^"']*)["']`,
    'i'
  ).exec(xml)?.[1];
  return attribute === undefined ? null : decodeXmlEntities(attribute.trim());
}

function finiteNumber(raw: string | null): number | null {
  if (raw === null || raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInteger(raw: string | null): number | null {
  const parsed = finiteNumber(raw);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInteger(raw: string | null): number | null {
  const parsed = finiteNumber(raw);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function range(value: number | null, minimum: number, maximum: number, maximumExclusive = false): number | null {
  if (value === null || value < minimum) return null;
  if (maximumExclusive ? value >= maximum : value > maximum) return null;
  return value;
}

function near(left: number, right: number, tolerance = SCALE_RATIO_TOLERANCE): boolean {
  return Math.abs(left - right) <= tolerance * Math.max(1, Math.abs(left), Math.abs(right));
}

function scaledInteger(value: number, scale: number): number {
  return Math.round(value * scale);
}

function parseGeometryFromPacket(
  xml: string,
  actualImageWidthPx: number,
  actualImageHeightPx: number
): {
  status: StellarPanoramaMetadataSummary['status'];
  geometry?: StellarPanoramaGeometry;
  projectionType?: string;
  metadataScaledToImage: boolean;
  warnings: string[];
} | null {
  const prefix = findGpanoPrefix(xml);
  if (!prefix) return null;
  const warnings: string[] = [];
  const projectionType = readProperty(xml, prefix, 'ProjectionType') ?? undefined;
  if (!projectionType) {
    return {
      status: 'incomplete',
      projectionType,
      metadataScaledToImage: false,
      warnings: ['GPano namespace bulundu ancak ProjectionType alanı yok; otomatik panorama geometrisi uygulanmadı.']
    };
  }
  if (projectionType.toLowerCase() !== 'equirectangular') {
    return {
      status: 'unsupported-projection',
      projectionType,
      metadataScaledToImage: false,
      warnings: [`GPano ProjectionType “${projectionType}”; yalnız equirectangular panorama geometrisi destekleniyor.`]
    };
  }

  const cropWidth = positiveInteger(readProperty(xml, prefix, 'CroppedAreaImageWidthPixels'));
  const cropHeight = positiveInteger(readProperty(xml, prefix, 'CroppedAreaImageHeightPixels'));
  const fullWidth = positiveInteger(readProperty(xml, prefix, 'FullPanoWidthPixels'));
  const fullHeight = positiveInteger(readProperty(xml, prefix, 'FullPanoHeightPixels'));
  const cropLeft = nonNegativeInteger(readProperty(xml, prefix, 'CroppedAreaLeftPixels'));
  const cropTop = nonNegativeInteger(readProperty(xml, prefix, 'CroppedAreaTopPixels'));
  const heading = range(finiteNumber(readProperty(xml, prefix, 'PoseHeadingDegrees')), 0, 360, true);
  const pitchRaw = readProperty(xml, prefix, 'PosePitchDegrees');
  const rollRaw = readProperty(xml, prefix, 'PoseRollDegrees');
  const pitch = pitchRaw === null ? 0 : range(finiteNumber(pitchRaw), -90, 90);
  const roll = rollRaw === null ? 0 : range(finiteNumber(rollRaw), -180, 180);

  const missing: string[] = [];
  if (cropWidth === null) missing.push('CroppedAreaImageWidthPixels');
  if (cropHeight === null) missing.push('CroppedAreaImageHeightPixels');
  if (fullWidth === null) missing.push('FullPanoWidthPixels');
  if (fullHeight === null) missing.push('FullPanoHeightPixels');
  if (cropLeft === null) missing.push('CroppedAreaLeftPixels');
  if (cropTop === null) missing.push('CroppedAreaTopPixels');
  if (heading === null) missing.push('PoseHeadingDegrees');
  if (pitch === null) missing.push('PosePitchDegrees');
  if (roll === null) missing.push('PoseRollDegrees');
  if (missing.length > 0) {
    return {
      status: 'incomplete',
      projectionType,
      metadataScaledToImage: false,
      warnings: [`GPano geometrisi eksik veya aralık dışı: ${missing.join(', ')}.`]
    };
  }
  if (pitchRaw === null) warnings.push('GPano PosePitchDegrees yok; Google varsayılanı 0° kullanıldı.');
  if (rollRaw === null) warnings.push('GPano PoseRollDegrees yok; Google varsayılanı 0° kullanıldı.');

  let resolvedFullWidth = fullWidth!;
  let resolvedFullHeight = fullHeight!;
  let resolvedCropLeft = cropLeft!;
  let resolvedCropTop = cropTop!;
  let metadataScaledToImage = false;

  if (cropWidth !== actualImageWidthPx || cropHeight !== actualImageHeightPx) {
    const widthScale = actualImageWidthPx / cropWidth!;
    const heightScale = actualImageHeightPx / cropHeight!;
    if (!near(widthScale, heightScale)) {
      return {
        status: 'incompatible-scale',
        projectionType,
        metadataScaledToImage: false,
        warnings: [
          `GPano crop ${cropWidth}×${cropHeight} px ancak gerçek görüntü ${actualImageWidthPx}×${actualImageHeightPx} px; en-boy ölçeği korunmadığı için metadata otomatik uygulanmadı.`
        ]
      };
    }
    metadataScaledToImage = true;
    const scale = (widthScale + heightScale) / 2;
    resolvedFullWidth = scaledInteger(fullWidth!, scale);
    resolvedFullHeight = scaledInteger(fullHeight!, scale);
    resolvedCropLeft = scaledInteger(cropLeft!, scale);
    resolvedCropTop = scaledInteger(cropTop!, scale);
    warnings.push(
      `GPano metadata, gerçek bitmap boyutuna ${scale.toFixed(8)} ölçek katsayısıyla uyarlandı; full-pano/crop piksel değerleri yeniden ölçeklendi.`
    );
  }

  const geometry: StellarPanoramaGeometry = {
    imageWidthPx: actualImageWidthPx,
    imageHeightPx: actualImageHeightPx,
    fullPanoWidthPx: resolvedFullWidth,
    fullPanoHeightPx: resolvedFullHeight,
    croppedAreaLeftPx: resolvedCropLeft,
    croppedAreaTopPx: resolvedCropTop,
    poseHeadingDeg: heading!,
    posePitchDeg: pitch!,
    poseRollDeg: roll!
  };
  if (
    geometry.fullPanoWidthPx < geometry.imageWidthPx ||
    geometry.fullPanoHeightPx < geometry.imageHeightPx ||
    geometry.croppedAreaLeftPx + geometry.imageWidthPx > geometry.fullPanoWidthPx ||
    geometry.croppedAreaTopPx + geometry.imageHeightPx > geometry.fullPanoHeightPx
  ) {
    return {
      status: 'incompatible-scale',
      projectionType,
      metadataScaledToImage,
      warnings: [...warnings, 'GPano full-pano/crop geometrisi gerçek görüntü sınırlarıyla uyumsuz; otomatik geometri uygulanmadı.']
    };
  }

  return { status: 'complete', geometry, projectionType, metadataScaledToImage, warnings };
}

export function parseGpanoMetadataFromXmpPackets(input: {
  standardPackets: readonly string[];
  extendedPacketFound?: boolean;
  actualImageWidthPx: number;
  actualImageHeightPx: number;
  extractionWarnings?: readonly string[];
}): StellarPanoramaMetadataSummary {
  const warnings = [...(input.extractionWarnings ?? [])];
  for (const packet of input.standardPackets) {
    const parsed = parseGeometryFromPacket(packet, input.actualImageWidthPx, input.actualImageHeightPx);
    if (!parsed) continue;
    if (input.extendedPacketFound && parsed.status !== 'complete') {
      parsed.warnings.push('Extended XMP paketi bulundu ancak bu sürüm onu birleştirmiyor; eksik GPano alanları tahmin edilmedi.');
    } else if (input.extendedPacketFound) {
      parsed.warnings.push('Extended XMP paketi bulundu; gerekli GPano geometrisi standart XMP paketinden çözüldü, extended içerik kullanılmadı.');
    }
    return {
      status: parsed.status,
      ...(parsed.geometry ? { geometry: parsed.geometry } : {}),
      ...(parsed.projectionType ? { projectionType: parsed.projectionType } : {}),
      metadataScaledToImage: parsed.metadataScaledToImage,
      standardXmpPacketFound: input.standardPackets.length > 0,
      extendedXmpPacketFound: Boolean(input.extendedPacketFound),
      warnings: [...warnings, ...parsed.warnings]
    };
  }
  if (input.extendedPacketFound) {
    warnings.push('Yalnız Extended XMP bulundu; GPano geometrisi bu sürümde extended paketten çıkarılmıyor.');
  }
  return {
    status: input.standardPackets.length > 0 ? 'absent' : 'absent',
    metadataScaledToImage: false,
    standardXmpPacketFound: input.standardPackets.length > 0,
    extendedXmpPacketFound: Boolean(input.extendedPacketFound),
    warnings
  };
}

export function readGpanoMetadataFromJpeg(
  bytes: Uint8Array,
  actualImageWidthPx: number,
  actualImageHeightPx: number
): StellarPanoramaMetadataSummary {
  const extracted = extractJpegXmpPackets(bytes);
  return parseGpanoMetadataFromXmpPackets({
    standardPackets: extracted.standardPackets,
    extendedPacketFound: extracted.extendedPacketFound,
    actualImageWidthPx,
    actualImageHeightPx,
    extractionWarnings: extracted.warnings
  });
}
