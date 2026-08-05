export const MEAN_EARTH_RADIUS_M = 6_371_008.8;

const RAD_TO_DEG = 180 / Math.PI;

export function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} sonlu ve sıfırdan büyük veya eşit olmalıdır.`);
  }
}

function assertRadius(radiusM: number): void {
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new RangeError('Yarıçap sonlu ve sıfırdan büyük olmalıdır.');
  }
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function horizonDistanceM(
  observerHeightM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');
  assertRadius(radiusM);

  return Math.sqrt(2 * radiusM * observerHeightM + observerHeightM ** 2);
}

export function surfaceHorizonDistanceM(
  observerHeightM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');
  assertRadius(radiusM);

  const centralAngleRad = Math.acos(radiusM / (radiusM + observerHeightM));
  return radiusM * centralAngleRad;
}

export function surfaceDropFromTangentM(
  surfaceDistanceM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(surfaceDistanceM, 'Yüzey mesafesi');
  assertRadius(radiusM);

  const centralAngleRad = surfaceDistanceM / radiusM;
  return radiusM * (1 - Math.cos(centralAngleRad));
}

export function effectiveRadiusM(
  radiusM: number,
  refractionCoefficient: number
): number {
  assertRadius(radiusM);

  if (!Number.isFinite(refractionCoefficient) || refractionCoefficient >= 1) {
    throw new RangeError('Kırılma katsayısı sonlu ve 1 değerinden küçük olmalıdır.');
  }

  return radiusM / (1 - refractionCoefficient);
}

export function minimumVisiblePointHeightM(
  surfaceDistanceM: number,
  observerHeightM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(surfaceDistanceM, 'Yüzey mesafesi');
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');
  assertRadius(radiusM);

  const observerHorizonAngleRad = Math.acos(
    radiusM / (radiusM + observerHeightM)
  );
  const remainingAngleRad = surfaceDistanceM / radiusM - observerHorizonAngleRad;

  if (remainingAngleRad <= 0) {
    return 0;
  }

  if (remainingAngleRad >= Math.PI / 2) {
    return Number.POSITIVE_INFINITY;
  }

  return radiusM / Math.cos(remainingAngleRad) - radiusM;
}

export function sphericalElevationAngleDeg(
  surfaceDistanceM: number,
  observerHeightM: number,
  targetPointHeightM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(surfaceDistanceM, 'Yüzey mesafesi');
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');
  assertFiniteNonNegative(targetPointHeightM, 'Hedef nokta yüksekliği');
  assertRadius(radiusM);

  if (surfaceDistanceM === 0) {
    return targetPointHeightM >= observerHeightM ? 90 : -90;
  }

  const centralAngleRad = surfaceDistanceM / radiusM;
  const targetRadiusM = radiusM + targetPointHeightM;
  const horizontalM = targetRadiusM * Math.sin(centralAngleRad);
  const verticalM =
    targetRadiusM * Math.cos(centralAngleRad) -
    (radiusM + observerHeightM);

  return Math.atan2(verticalM, horizontalM) * RAD_TO_DEG;
}

export function planarElevationAngleDeg(
  horizontalDistanceM: number,
  observerHeightM: number,
  targetPointHeightM: number
): number {
  assertFiniteNonNegative(horizontalDistanceM, 'Yatay mesafe');
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');
  assertFiniteNonNegative(targetPointHeightM, 'Hedef nokta yüksekliği');

  if (horizontalDistanceM === 0) {
    return targetPointHeightM >= observerHeightM ? 90 : -90;
  }

  return (
    Math.atan2(targetPointHeightM - observerHeightM, horizontalDistanceM) *
    RAD_TO_DEG
  );
}
