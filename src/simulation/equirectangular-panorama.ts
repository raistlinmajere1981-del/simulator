import {
  normalizeStellarLocalHorizonMask,
  type NormalizedStellarLocalHorizonMask
} from './stellar-local-horizon';

export const EQUIRECTANGULAR_PANORAMA_ALGORITHM_ID = 'gpano-equirectangular-local-frame';
export const EQUIRECTANGULAR_PANORAMA_ALGORITHM_VERSION = '0.1.0';

export interface PanoramaPixelPoint {
  xPx: number;
  yPx: number;
}

/**
 * Explicit geometry needed to interpret a Google Photo Sphere style
 * equirectangular image. Image dimensions describe the stored/cropped bitmap;
 * full-pano dimensions and crop offsets describe its location inside the
 * conceptual 360° × 180° equirectangular sphere.
 */
export interface EquirectangularPanoramaGeometry {
  imageWidthPx: number;
  imageHeightPx: number;
  fullPanoWidthPx: number;
  fullPanoHeightPx: number;
  croppedAreaLeftPx: number;
  croppedAreaTopPx: number;
  poseHeadingDeg: number;
  posePitchDeg: number;
  poseRollDeg: number;
}

export interface ValidatedEquirectangularPanoramaGeometry extends EquirectangularPanoramaGeometry {
  horizontalCoverageDeg: number;
  verticalCoverageDeg: number;
  fullSphereCoverage: boolean;
}

export interface PanoramaLocalDirection {
  azimuthDeg: number;
  altitudeDeg: number;
  east: number;
  north: number;
  up: number;
  photoSphereHeadingDeg: number;
  photoSphereElevationDeg: number;
}

export interface PanoramaSkylinePixelMark extends PanoramaPixelPoint {
  label?: string;
}

export interface MappedPanoramaSkylineMark extends PanoramaSkylinePixelMark {
  azimuthDeg: number;
  altitudeDeg: number;
}

export interface PanoramaSkylineProfile {
  geometry: ValidatedEquirectangularPanoramaGeometry;
  mappedMarks: MappedPanoramaSkylineMark[];
  mask: NormalizedStellarLocalHorizonMask;
  warnings: string[];
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const INTEGER_LIMIT = 200_000;
const ANGLE_EPSILON_DEG = 1e-10;
const WARNING_THRESHOLD_EPSILON_DEG = 1e-9;

function radians(valueDeg: number): number {
  return valueDeg * DEG_TO_RAD;
}

function degrees(valueRad: number): number {
  return valueRad * RAD_TO_DEG;
}

function normalizeAzimuthDeg(valueDeg: number): number {
  const normalized = ((valueDeg % 360) + 360) % 360;
  return Math.abs(normalized - 360) <= ANGLE_EPSILON_DEG ? 0 : normalized;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} sonlu bir sayı olmalıdır.`);
  return value;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > INTEGER_LIMIT) {
    throw new RangeError(`${label} 1…${INTEGER_LIMIT} aralığında pozitif tam sayı olmalıdır.`);
  }
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > INTEGER_LIMIT) {
    throw new RangeError(`${label} 0…${INTEGER_LIMIT} aralığında tam sayı olmalıdır.`);
  }
  return value;
}

function finiteRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
  minimumInclusive = true,
  maximumInclusive = true
): number {
  finite(value, label);
  const below = minimumInclusive ? value < minimum : value <= minimum;
  const above = maximumInclusive ? value > maximum : value >= maximum;
  if (below || above) {
    const left = minimumInclusive ? '[' : '(';
    const right = maximumInclusive ? ']' : ')';
    throw new RangeError(`${label} ${left}${minimum}, ${maximum}${right} aralığında olmalıdır.`);
  }
  return value;
}

function assertPixelInside(
  geometry: ValidatedEquirectangularPanoramaGeometry,
  point: PanoramaPixelPoint
): void {
  finite(point.xPx, 'Panorama piksel X');
  finite(point.yPx, 'Panorama piksel Y');
  if (
    point.xPx < 0 || point.xPx > geometry.imageWidthPx - 1 ||
    point.yPx < 0 || point.yPx > geometry.imageHeightPx - 1
  ) {
    throw new RangeError('Panorama piksel noktası görüntü sınırları içinde olmalıdır.');
  }
}

function rotateZ(vector: readonly [number, number, number], angleRad: number): [number, number, number] {
  const [x, y, z] = vector;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [c * x - s * y, s * x + c * y, z];
}

function rotateX(vector: readonly [number, number, number], angleRad: number): [number, number, number] {
  const [x, y, z] = vector;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [x, c * y - s * z, s * y + c * z];
}

function rotateY(vector: readonly [number, number, number], angleRad: number): [number, number, number] {
  const [x, y, z] = vector;
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [c * x + s * z, y, -s * x + c * z];
}

function unit(vector: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(...vector);
  if (!(length > 0) || !Number.isFinite(length)) {
    throw new RangeError('Panorama yön vektörü normalize edilemedi.');
  }
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function validateEquirectangularPanoramaGeometry(
  input: EquirectangularPanoramaGeometry
): ValidatedEquirectangularPanoramaGeometry {
  const imageWidthPx = positiveInteger(input.imageWidthPx, 'Görüntü genişliği');
  const imageHeightPx = positiveInteger(input.imageHeightPx, 'Görüntü yüksekliği');
  const fullPanoWidthPx = positiveInteger(input.fullPanoWidthPx, 'Tam panorama genişliği');
  const fullPanoHeightPx = positiveInteger(input.fullPanoHeightPx, 'Tam panorama yüksekliği');
  const croppedAreaLeftPx = nonNegativeInteger(input.croppedAreaLeftPx, 'Kırpılmış alan sol ofseti');
  const croppedAreaTopPx = nonNegativeInteger(input.croppedAreaTopPx, 'Kırpılmış alan üst ofseti');

  if (imageWidthPx > fullPanoWidthPx || imageHeightPx > fullPanoHeightPx) {
    throw new RangeError('Kırpılmış panorama boyutları tam panorama boyutlarını aşamaz.');
  }
  if (
    croppedAreaLeftPx + imageWidthPx > fullPanoWidthPx ||
    croppedAreaTopPx + imageHeightPx > fullPanoHeightPx
  ) {
    throw new RangeError('Kırpılmış panorama alanı tam panorama sınırlarının dışına taşıyor.');
  }

  const poseHeadingDeg = finiteRange(input.poseHeadingDeg, 0, 360, 'Pose heading', true, false);
  const posePitchDeg = finiteRange(input.posePitchDeg, -90, 90, 'Pose pitch');
  const poseRollDeg = finiteRange(input.poseRollDeg, -180, 180, 'Pose roll', false, true);
  const horizontalCoverageDeg = imageWidthPx / fullPanoWidthPx * 360;
  const verticalCoverageDeg = imageHeightPx / fullPanoHeightPx * 180;

  return {
    imageWidthPx,
    imageHeightPx,
    fullPanoWidthPx,
    fullPanoHeightPx,
    croppedAreaLeftPx,
    croppedAreaTopPx,
    poseHeadingDeg,
    posePitchDeg,
    poseRollDeg,
    horizontalCoverageDeg,
    verticalCoverageDeg,
    fullSphereCoverage:
      croppedAreaLeftPx === 0 &&
      croppedAreaTopPx === 0 &&
      imageWidthPx === fullPanoWidthPx &&
      imageHeightPx === fullPanoHeightPx
  };
}

/**
 * Converts a stored-image pixel coordinate to the conceptual photo-sphere
 * longitude/elevation. Pixel coordinates refer to pixel centres; fractional
 * coordinates are allowed for manual marks between integer pixel centres.
 */
function pixelToPhotoSphereAngles(
  geometry: ValidatedEquirectangularPanoramaGeometry,
  point: PanoramaPixelPoint
): { headingDeg: number; elevationDeg: number } {
  assertPixelInside(geometry, point);
  const fullX = geometry.croppedAreaLeftPx + point.xPx;
  const fullY = geometry.croppedAreaTopPx + point.yPx;
  return {
    headingDeg: (fullX + 0.5) / geometry.fullPanoWidthPx * 360 - 180,
    elevationDeg: 90 - (fullY + 0.5) / geometry.fullPanoHeightPx * 180
  };
}

/**
 * Google Photo Sphere convention:
 * local frame X=East, Y=North, Z=Up and
 * R = Rz(-heading) · Rx(pitch) · Ry(roll).
 */
export function panoramaPixelToLocalDirection(
  geometryInput: EquirectangularPanoramaGeometry,
  point: PanoramaPixelPoint
): PanoramaLocalDirection {
  const geometry = validateEquirectangularPanoramaGeometry(geometryInput);
  const sphereAngles = pixelToPhotoSphereAngles(geometry, point);
  const sphereHeadingRad = radians(sphereAngles.headingDeg);
  const sphereElevationRad = radians(sphereAngles.elevationDeg);
  const cosElevation = Math.cos(sphereElevationRad);

  let vector: [number, number, number] = [
    cosElevation * Math.sin(sphereHeadingRad),
    cosElevation * Math.cos(sphereHeadingRad),
    Math.sin(sphereElevationRad)
  ];
  vector = rotateY(vector, radians(geometry.poseRollDeg));
  vector = rotateX(vector, radians(geometry.posePitchDeg));
  vector = rotateZ(vector, radians(-geometry.poseHeadingDeg));
  const [east, north, up] = unit(vector);

  return {
    azimuthDeg: normalizeAzimuthDeg(degrees(Math.atan2(east, north))),
    altitudeDeg: degrees(Math.asin(Math.max(-1, Math.min(1, up)))),
    east,
    north,
    up,
    photoSphereHeadingDeg: sphereAngles.headingDeg,
    photoSphereElevationDeg: sphereAngles.elevationDeg
  };
}

/**
 * Inverse of panoramaPixelToLocalDirection. Returns null when the requested
 * world direction falls outside the stored crop.
 */
export function localDirectionToPanoramaPixel(
  geometryInput: EquirectangularPanoramaGeometry,
  azimuthDeg: number,
  altitudeDeg: number
): PanoramaPixelPoint | null {
  const geometry = validateEquirectangularPanoramaGeometry(geometryInput);
  finite(azimuthDeg, 'Yerel azimut');
  finiteRange(altitudeDeg, -90, 90, 'Yerel yükseklik');
  const azimuthRad = radians(normalizeAzimuthDeg(azimuthDeg));
  const altitudeRad = radians(altitudeDeg);
  const cosAltitude = Math.cos(altitudeRad);

  let vector: [number, number, number] = [
    cosAltitude * Math.sin(azimuthRad),
    cosAltitude * Math.cos(azimuthRad),
    Math.sin(altitudeRad)
  ];

  // R^-1 = Ry(-roll) · Rx(-pitch) · Rz(+heading).
  vector = rotateZ(vector, radians(geometry.poseHeadingDeg));
  vector = rotateX(vector, radians(-geometry.posePitchDeg));
  vector = rotateY(vector, radians(-geometry.poseRollDeg));
  const [sphereX, sphereY, sphereZ] = unit(vector);
  const sphereHeadingDeg = degrees(Math.atan2(sphereX, sphereY));
  const sphereElevationDeg = degrees(Math.asin(Math.max(-1, Math.min(1, sphereZ))));

  const baseFullX = (sphereHeadingDeg + 180) / 360 * geometry.fullPanoWidthPx - 0.5;
  const fullY = (90 - sphereElevationDeg) / 180 * geometry.fullPanoHeightPx - 0.5;
  const cropStartX = geometry.croppedAreaLeftPx;
  const cropEndX = cropStartX + geometry.imageWidthPx - 1;
  const cropStartY = geometry.croppedAreaTopPx;
  const cropEndY = cropStartY + geometry.imageHeightPx - 1;
  const tolerance = 1e-8;

  if (fullY < cropStartY - tolerance || fullY > cropEndY + tolerance) return null;

  // Horizontal equirectangular coordinates are periodic. Try the canonical
  // coordinate and one wrapped copy on either side so full-pano seam handling
  // remains reversible without inventing crop coverage.
  const candidates = [
    baseFullX,
    baseFullX - geometry.fullPanoWidthPx,
    baseFullX + geometry.fullPanoWidthPx
  ];
  const fullX = candidates.find((candidate) =>
    candidate >= cropStartX - tolerance && candidate <= cropEndX + tolerance
  );
  if (fullX === undefined) return null;

  const xPx = fullX - cropStartX;
  const yPx = fullY - cropStartY;
  return {
    xPx: Math.max(0, Math.min(geometry.imageWidthPx - 1, xPx)),
    yPx: Math.max(0, Math.min(geometry.imageHeightPx - 1, yPx))
  };
}

export function buildPanoramaSkylineProfile(input: {
  geometry: EquirectangularPanoramaGeometry;
  sourceLabel: string;
  marks: readonly PanoramaSkylinePixelMark[];
}): PanoramaSkylineProfile {
  const geometry = validateEquirectangularPanoramaGeometry(input.geometry);
  const sourceLabel = input.sourceLabel.trim();
  if (!sourceLabel || sourceLabel.length > 240) {
    throw new RangeError('Panorama skyline kaynak etiketi 1…240 karakter olmalıdır.');
  }
  if (!Array.isArray(input.marks) || input.marks.length < 3 || input.marks.length > 1_440) {
    throw new RangeError('Panorama skyline en az 3, en fazla 1440 piksel işareti içermelidir.');
  }

  const mappedMarks = input.marks.map((mark) => {
    const direction = panoramaPixelToLocalDirection(geometry, mark);
    return {
      ...mark,
      azimuthDeg: direction.azimuthDeg,
      altitudeDeg: direction.altitudeDeg
    };
  });

  const mask = normalizeStellarLocalHorizonMask({
    sourceLabel,
    sourceKind: 'derived',
    points: mappedMarks.map((mark) => ({
      azimuthDeg: mark.azimuthDeg,
      altitudeDeg: mark.altitudeDeg
    }))
  });
  const warnings: string[] = [];
  if (!geometry.fullSphereCoverage) {
    warnings.push(
      `Panorama tam 360°×180° küreyi kapsamıyor (${geometry.horizontalCoverageDeg.toFixed(3)}° × ${geometry.verticalCoverageDeg.toFixed(3)}°); eksik azimutlar otomatik olarak gözlenmiş kabul edilmemelidir.`
    );
  }
  if (mask.maximumAzimuthGapDeg > 90 + WARNING_THRESHOLD_EPSILON_DEG) {
    warnings.push(
      `Manuel skyline işaretleri arasındaki en büyük azimut boşluğu ${mask.maximumAzimuthGapDeg.toFixed(3)}°; doğrusal interpolasyon bu aralıkta kaba olabilir.`
    );
  } else if (mask.maximumAzimuthGapDeg > 45 + WARNING_THRESHOLD_EPSILON_DEG) {
    warnings.push(
      `Manuel skyline işaretleri arasındaki en büyük azimut boşluğu ${mask.maximumAzimuthGapDeg.toFixed(3)}°; bu aralık dikkatle yorumlanmalıdır.`
    );
  }

  return { geometry, mappedMarks, mask, warnings };
}
