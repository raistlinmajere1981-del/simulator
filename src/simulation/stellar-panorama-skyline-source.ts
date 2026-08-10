import type {
  SavedStellarLocalHorizonSource,
  StellarPanoramaGeometry,
  StellarPanoramaGeometrySource,
  StellarPanoramaMarkingMethod,
  StellarPanoramaSkylineDraft,
  StellarPanoramaSkylineMark
} from '../shared/stellar-local-horizon-import';
import {
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
  EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
  buildPanoramaSkylineProfile,
  validateEquirectangularPanoramaGeometry,
  type PanoramaSkylinePixelMark
} from './equirectangular-panorama';

export class StellarPanoramaSkylineSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarPanoramaSkylineSourceError';
  }
}

const COVERAGE_EPSILON_DEG = 1e-9;
const MAXIMUM_ALLOWED_AZIMUTH_GAP_DEG = 90;
const MINIMUM_MARK_COUNT = 8;

function sameGeometry(left: StellarPanoramaGeometry, right: StellarPanoramaGeometry): boolean {
  return left.imageWidthPx === right.imageWidthPx &&
    left.imageHeightPx === right.imageHeightPx &&
    left.fullPanoWidthPx === right.fullPanoWidthPx &&
    left.fullPanoHeightPx === right.fullPanoHeightPx &&
    left.croppedAreaLeftPx === right.croppedAreaLeftPx &&
    left.croppedAreaTopPx === right.croppedAreaTopPx &&
    left.poseHeadingDeg === right.poseHeadingDeg &&
    left.posePitchDeg === right.posePitchDeg &&
    left.poseRollDeg === right.poseRollDeg;
}

function cloneGeometry(geometry: StellarPanoramaGeometry): StellarPanoramaGeometry {
  return { ...geometry };
}

function mappedMarks(
  marks: readonly PanoramaSkylinePixelMark[],
  mapped: readonly { xPx: number; yPx: number; azimuthDeg: number; altitudeDeg: number }[]
): StellarPanoramaSkylineMark[] {
  if (marks.length !== mapped.length) {
    throw new StellarPanoramaSkylineSourceError('Panorama skyline işaret eşlemesi tutarsız.');
  }
  return mapped.map((mark) => ({
    xPx: mark.xPx,
    yPx: mark.yPx,
    azimuthDeg: mark.azimuthDeg,
    altitudeDeg: mark.altitudeDeg
  }));
}

export function savedStellarLocalHorizonSourceFromPanorama(input: {
  draft: StellarPanoramaSkylineDraft;
  geometry: StellarPanoramaGeometry;
  geometrySource: StellarPanoramaGeometrySource;
  markingMethod?: StellarPanoramaMarkingMethod;
  marks: readonly PanoramaSkylinePixelMark[];
}): SavedStellarLocalHorizonSource {
  if (input.marks.length < MINIMUM_MARK_COUNT) {
    throw new StellarPanoramaSkylineSourceError(
      `Panorama skyline için en az ${MINIMUM_MARK_COUNT} işaret gerekir.`
    );
  }
  if (
    input.geometry.imageWidthPx !== input.draft.imageWidthPx ||
    input.geometry.imageHeightPx !== input.draft.imageHeightPx
  ) {
    throw new StellarPanoramaSkylineSourceError(
      'Panorama geometrisinin görüntü boyutları seçilen kaynak bitmap ile eşleşmiyor.'
    );
  }

  if (input.geometrySource === 'gpano-xmp') {
    if (input.draft.metadata.status !== 'complete' || !input.draft.metadata.geometry) {
      throw new StellarPanoramaSkylineSourceError(
        'GPano XMP kaynak modu yalnız eksiksiz ve doğrulanmış metadata ile kullanılabilir.'
      );
    }
    if (!sameGeometry(input.geometry, input.draft.metadata.geometry)) {
      throw new StellarPanoramaSkylineSourceError(
        'GPano XMP geometrisi değiştirildi; değiştirilen değerler manuel geometri olarak açıkça seçilmelidir.'
      );
    }
  }

  const geometry = validateEquirectangularPanoramaGeometry(input.geometry);
  if (geometry.horizontalCoverageDeg < 360 - COVERAGE_EPSILON_DEG) {
    throw new StellarPanoramaSkylineSourceError(
      `Panorama yalnız ${geometry.horizontalCoverageDeg.toFixed(3)}° yatay kapsam sağlıyor; eksik azimutlar 360° skyline olarak interpolasyonla doldurulmadı.`
    );
  }

  const profile = buildPanoramaSkylineProfile({
    geometry,
    sourceLabel: input.draft.fileName,
    marks: input.marks
  });
  if (profile.mask.maximumAzimuthGapDeg > MAXIMUM_ALLOWED_AZIMUTH_GAP_DEG + COVERAGE_EPSILON_DEG) {
    throw new StellarPanoramaSkylineSourceError(
      `Panorama skyline işaretleri arasındaki en büyük azimut boşluğu ${profile.mask.maximumAzimuthGapDeg.toFixed(3)}°; güvenli sınır ${MAXIMUM_ALLOWED_AZIMUTH_GAP_DEG}°.`
    );
  }

  const markingMethod = input.markingMethod ?? 'manual';
  const warnings = [...input.draft.metadata.warnings, ...profile.warnings];
  if (input.geometrySource === 'manual') {
    warnings.push('Panorama yön/crop geometrisi kullanıcı tarafından manuel girildi; GPano XMP doğrulaması uygulanmadı.');
  } else if (input.draft.metadata.metadataScaledToImage) {
    warnings.push('GPano geometrisi gerçek bitmap boyutuna ölçeklenmiş metadata üzerinden uygulanmıştır.');
  }
  if (markingMethod === 'assisted-gradient-v1') {
    warnings.push('Skyline işaretleri yerel görüntü gradyanı kullanan yardımcı taslaktan kullanıcı tarafından kabul edildi; otomatik doğrulanmış segmentasyon değildir.');
  } else if (markingMethod === 'assisted-gradient-v1-edited') {
    warnings.push('Skyline işaretleri görüntü gradyanı yardımcı taslağından başlatıldı ve kullanıcı tarafından elle düzenlendi; otomatik doğrulanmış segmentasyon değildir.');
  }

  return {
    fileName: input.draft.fileName,
    importedAtIso: input.draft.importedAtIso,
    format: 'panorama',
    pointCount: profile.mask.points.length,
    maximumAzimuthGapDeg: profile.mask.maximumAzimuthGapDeg,
    points: profile.mask.points.map((point) => ({ ...point })),
    warnings,
    fileSizeBytes: input.draft.fileSizeBytes,
    sha256: input.draft.sha256,
    panoramaDerivation: {
      algorithmId: EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID,
      algorithmVersion: EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION,
      geometrySource: input.geometrySource,
      markingMethod,
      geometry: cloneGeometry(geometry),
      horizontalCoverageDeg: geometry.horizontalCoverageDeg,
      verticalCoverageDeg: geometry.verticalCoverageDeg,
      fullSphereCoverage: geometry.fullSphereCoverage,
      metadataStatusAtImport: input.draft.metadata.status,
      ...(input.draft.metadata.projectionType
        ? { projectionTypeAtImport: input.draft.metadata.projectionType }
        : {}),
      metadataScaledToImage: input.draft.metadata.metadataScaledToImage,
      standardXmpPacketFound: input.draft.metadata.standardXmpPacketFound,
      extendedXmpPacketFound: input.draft.metadata.extendedXmpPacketFound,
      marks: mappedMarks(input.marks, profile.mappedMarks)
    },
    modifiedAfterImport: false
  };
}
