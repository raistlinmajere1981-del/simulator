import type {
  ManualTerrainPoint,
  TerrainProfile,
  VerticalDatumDefinition
} from '../shared/terrain';

const DISTANCE_PERCENT_TOLERANCE = 1e-9;
const MAX_MANUAL_POINTS = 2_000;

export interface ManualTerrainProfileInput {
  id: string;
  label: string;
  datum: VerticalDatumDefinition;
  totalDistanceM: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  points: ManualTerrainPoint[];
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function sortManualTerrainPoints(
  points: readonly ManualTerrainPoint[]
): ManualTerrainPoint[] {
  return points
    .map((point) => ({ ...point }))
    .sort((left, right) => left.distancePercent - right.distancePercent);
}

export function validateManualTerrainPoints(
  points: readonly ManualTerrainPoint[]
): string[] {
  const errors: string[] = [];

  if (points.length > MAX_MANUAL_POINTS) {
    errors.push(`Manuel profil en fazla ${MAX_MANUAL_POINTS} ara nokta içerebilir.`);
  }

  const ids = new Set<string>();
  const sorted = sortManualTerrainPoints(points);

  sorted.forEach((point, index) => {
    if (!point.id.trim()) {
      errors.push(`Arazi noktası ${index + 1} kimliği boş olamaz.`);
    } else if (ids.has(point.id)) {
      errors.push(`Arazi noktası kimliği tekrarlanıyor: ${point.id}.`);
    }
    ids.add(point.id);

    if (!isFiniteNumber(point.distancePercent) ||
      point.distancePercent <= 0 || point.distancePercent >= 100) {
      errors.push(`Arazi noktası ${index + 1} konumu 0 ile 100 arasında olmalıdır.`);
    }
    if (!isFiniteNumber(point.elevationM)) {
      errors.push(`Arazi noktası ${index + 1} kotu sonlu bir sayı olmalıdır.`);
    }

    const previous = sorted[index - 1];
    if (previous &&
      Math.abs(previous.distancePercent - point.distancePercent) <= DISTANCE_PERCENT_TOLERANCE) {
      errors.push(
        `Arazi noktalarının yüzde konumları tekrarsız olmalıdır: ${point.distancePercent}.`
      );
    }
  });

  return errors;
}

export function buildManualTerrainProfile(
  input: ManualTerrainProfileInput
): TerrainProfile {
  if (!input.id.trim()) {
    throw new RangeError('Manuel arazi profili kimliği boş olamaz.');
  }
  if (!input.label.trim()) {
    throw new RangeError('Manuel arazi profili adı boş olamaz.');
  }
  if (!isFiniteNumber(input.totalDistanceM) || input.totalDistanceM <= 0) {
    throw new RangeError('Toplam profil mesafesi sıfırdan büyük olmalıdır.');
  }
  if (!isFiniteNumber(input.observerGroundElevationM) ||
    !isFiniteNumber(input.targetGroundElevationM)) {
    throw new RangeError('Profil uç kotları sonlu sayılar olmalıdır.');
  }
  if (!isFiniteNumber(input.datum.offsetM)) {
    throw new RangeError('Düşey datum ofseti sonlu bir sayı olmalıdır.');
  }

  const errors = validateManualTerrainPoints(input.points);
  if (errors.length > 0) {
    throw new RangeError(errors.join(' '));
  }

  const interiorSamples = sortManualTerrainPoints(input.points).map((point) => ({
    distanceM: input.totalDistanceM * point.distancePercent / 100,
    elevationM: point.elevationM
  }));

  return {
    id: input.id,
    label: input.label,
    source: 'manual',
    datum: { ...input.datum },
    totalDistanceM: input.totalDistanceM,
    samples: [
      { distanceM: 0, elevationM: input.observerGroundElevationM },
      ...interiorSamples,
      { distanceM: input.totalDistanceM, elevationM: input.targetGroundElevationM }
    ]
  };
}

export function migrateLegacyManualTerrainPoint(
  distancePercent: number,
  elevationM: number
): ManualTerrainPoint[] {
  return [{
    id: 'legacy-intermediate-1',
    distancePercent,
    elevationM
  }];
}

export function insertManualTerrainPoint(
  points: readonly ManualTerrainPoint[],
  point: ManualTerrainPoint
): ManualTerrainPoint[] {
  const next = [...points.map((item) => ({ ...item })), { ...point }];
  const errors = validateManualTerrainPoints(next);
  if (errors.length > 0) throw new RangeError(errors.join(' '));
  return sortManualTerrainPoints(next);
}

export function updateManualTerrainPoint(
  points: readonly ManualTerrainPoint[],
  pointId: string,
  patch: Partial<Pick<ManualTerrainPoint, 'distancePercent' | 'elevationM'>>
): ManualTerrainPoint[] {
  let found = false;
  const next = points.map((point) => {
    if (point.id !== pointId) return { ...point };
    found = true;
    return { ...point, ...patch };
  });

  if (!found) throw new RangeError(`Arazi noktası bulunamadı: ${pointId}.`);
  const errors = validateManualTerrainPoints(next);
  if (errors.length > 0) throw new RangeError(errors.join(' '));
  return sortManualTerrainPoints(next);
}

export function removeManualTerrainPoint(
  points: readonly ManualTerrainPoint[],
  pointId: string
): ManualTerrainPoint[] {
  if (!points.some((point) => point.id === pointId)) {
    throw new RangeError(`Arazi noktası bulunamadı: ${pointId}.`);
  }
  return points
    .filter((point) => point.id !== pointId)
    .map((point) => ({ ...point }));
}
