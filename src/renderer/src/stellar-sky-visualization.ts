export interface StellarSkyPlotPoint {
  x: number;
  y: number;
}

export const STELLAR_SKY_VIEWBOX_CENTER = 50;
export const STELLAR_SKY_HORIZON_RADIUS = 43;

export function projectStellarSkyPoint(input: {
  elevationDeg: number;
  azimuthDeg: number;
}): StellarSkyPlotPoint {
  if (!Number.isFinite(input.elevationDeg) || input.elevationDeg < 0 || input.elevationDeg > 90) {
    throw new Error('Polar gökyüzü görünümü yalnız 0°–90° geometrik yükseklikleri projekte eder.');
  }
  if (!Number.isFinite(input.azimuthDeg)) {
    throw new Error('Polar gökyüzü görünümü için sonlu bir azimut gerekir.');
  }
  const azimuthDeg = ((input.azimuthDeg % 360) + 360) % 360;
  const radius = ((90 - input.elevationDeg) / 90) * STELLAR_SKY_HORIZON_RADIUS;
  const angleRad = azimuthDeg * Math.PI / 180;
  return {
    x: STELLAR_SKY_VIEWBOX_CENTER + radius * Math.sin(angleRad),
    y: STELLAR_SKY_VIEWBOX_CENTER - radius * Math.cos(angleRad)
  };
}

export function stellarSkyMarkerRadius(visualMagnitude: number): number {
  if (!Number.isFinite(visualMagnitude)) return 1.1;
  return Math.max(0.9, Math.min(2.1, 1.7 - visualMagnitude * 0.28));
}
