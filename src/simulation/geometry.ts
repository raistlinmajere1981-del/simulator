export const MEAN_EARTH_RADIUS_M = 6_371_008.8;

export function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} sonlu ve sıfırdan büyük veya eşit olmalıdır.`);
  }
}

export function horizonDistanceM(
  observerHeightM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(observerHeightM, 'Gözlemci yüksekliği');

  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new RangeError('Yarıçap sonlu ve sıfırdan büyük olmalıdır.');
  }

  return Math.sqrt(2 * radiusM * observerHeightM + observerHeightM ** 2);
}

export function surfaceDropFromTangentM(
  surfaceDistanceM: number,
  radiusM = MEAN_EARTH_RADIUS_M
): number {
  assertFiniteNonNegative(surfaceDistanceM, 'Yüzey mesafesi');

  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new RangeError('Yarıçap sonlu ve sıfırdan büyük olmalıdır.');
  }

  const centralAngleRad = surfaceDistanceM / radiusM;
  return radiusM * (1 - Math.cos(centralAngleRad));
}

export function effectiveRadiusM(
  radiusM: number,
  refractionCoefficient: number
): number {
  if (!Number.isFinite(radiusM) || radiusM <= 0) {
    throw new RangeError('Yarıçap sonlu ve sıfırdan büyük olmalıdır.');
  }

  if (!Number.isFinite(refractionCoefficient) || refractionCoefficient >= 1) {
    throw new RangeError('Kırılma katsayısı sonlu ve 1 değerinden küçük olmalıdır.');
  }

  return radiusM / (1 - refractionCoefficient);
}
