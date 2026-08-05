import { useMemo, useState } from 'react';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  insertManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../../simulation/manual-terrain-profile';

interface MultiPointTerrainEditorProps {
  points: ManualTerrainPoint[];
  routeDistanceKm: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  criticalDistanceM?: number | null;
  disabled?: boolean;
  onChange(points: ManualTerrainPoint[]): void;
}

interface PreviewPoint {
  id: string;
  distancePercent: number;
  elevationM: number;
  endpoint: boolean;
}

const MAX_EDITOR_POINTS = 2_000;
const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

function newPointId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `terrain-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function interpolateElevation(
  left: PreviewPoint,
  right: PreviewPoint,
  distancePercent: number
): number {
  const span = right.distancePercent - left.distancePercent;
  if (span <= 0) return left.elevationM;
  const fraction = (distancePercent - left.distancePercent) / span;
  return left.elevationM + (right.elevationM - left.elevationM) * fraction;
}

function findLargestGapPoint(
  points: readonly ManualTerrainPoint[],
  observerGroundElevationM: number,
  targetGroundElevationM: number
): ManualTerrainPoint {
  const all: PreviewPoint[] = [
    {
      id: 'observer-endpoint',
      distancePercent: 0,
      elevationM: observerGroundElevationM,
      endpoint: true
    },
    ...sortManualTerrainPoints(points).map((point) => ({ ...point, endpoint: false })),
    {
      id: 'target-endpoint',
      distancePercent: 100,
      elevationM: targetGroundElevationM,
      endpoint: true
    }
  ];

  let bestLeft = all[0];
  let bestRight = all[1];
  let bestGap = (bestRight?.distancePercent ?? 100) - (bestLeft?.distancePercent ?? 0);

  for (let index = 1; index < all.length - 1; index += 1) {
    const left = all[index];
    const right = all[index + 1];
    if (!left || !right) continue;
    const gap = right.distancePercent - left.distancePercent;
    if (gap > bestGap) {
      bestLeft = left;
      bestRight = right;
      bestGap = gap;
    }
  }

  const distancePercent = (bestLeft.distancePercent + bestRight.distancePercent) / 2;
  return {
    id: newPointId(),
    distancePercent,
    elevationM: interpolateElevation(bestLeft, bestRight, distancePercent)
  };
}

function previewCoordinates(points: readonly PreviewPoint[]): {
  polyline: string;
  minimumElevationM: number;
  maximumElevationM: number;
} {
  const elevations = points.map((point) => point.elevationM);
  const minimumElevationM = Math.min(...elevations);
  const maximumElevationM = Math.max(...elevations);
  const range = Math.max(1, maximumElevationM - minimumElevationM);
  const polyline = points.map((point) => {
    const x = 4 + point.distancePercent * 0.92;
    const normalized = (point.elevationM - minimumElevationM) / range;
    const y = 88 - normalized * 72;
    return `${x},${y}`;
  }).join(' ');
  return { polyline, minimumElevationM, maximumElevationM };
}

export function MultiPointTerrainEditor({
  points,
  routeDistanceKm,
  observerGroundElevationM,
  targetGroundElevationM,
  criticalDistanceM,
  disabled = false,
  onChange
}: MultiPointTerrainEditorProps): React.JSX.Element {
  const [operationError, setOperationError] = useState('');
  const sortedPoints = useMemo(() => sortManualTerrainPoints(points), [points]);
  const validationErrors = useMemo(
    () => validateManualTerrainPoints(sortedPoints),
    [sortedPoints]
  );
  const previewPoints = useMemo<PreviewPoint[]>(() => [
    {
      id: 'observer-endpoint',
      distancePercent: 0,
      elevationM: observerGroundElevationM,
      endpoint: true
    },
    ...sortedPoints.map((point) => ({ ...point, endpoint: false })),
    {
      id: 'target-endpoint',
      distancePercent: 100,
      elevationM: targetGroundElevationM,
      endpoint: true
    }
  ], [observerGroundElevationM, sortedPoints, targetGroundElevationM]);
  const preview = useMemo(() => previewCoordinates(previewPoints), [previewPoints]);
  const criticalPercent = criticalDistanceM === null || criticalDistanceM === undefined ||
    routeDistanceKm <= 0
    ? null
    : Math.min(100, Math.max(0, criticalDistanceM / (routeDistanceKm * 1_000) * 100));

  const apply = (operation: () => ManualTerrainPoint[]): void => {
    try {
      const next = operation();
      setOperationError('');
      onChange(next);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Arazi noktası güncellenemedi.');
    }
  };

  const addPoint = (): void => {
    const point = findLargestGapPoint(
      sortedPoints,
      observerGroundElevationM,
      targetGroundElevationM
    );
    apply(() => insertManualTerrainPoint(sortedPoints, point));
  };

  return (
    <section className={`multi-terrain-editor ${disabled ? 'disabled' : ''}`}>
      <header className="multi-terrain-editor-heading">
        <div>
          <strong>Arazi profil noktaları</strong>
          <span>{sortedPoints.length} ara nokta · uçlar otomatik</span>
        </div>
        <button
          disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
          type="button"
          onClick={addPoint}
        >
          + Nokta ekle
        </button>
      </header>

      <div className="terrain-profile-preview" aria-label="Arazi profili önizlemesi">
        <svg preserveAspectRatio="none" viewBox="0 0 100 100" role="img">
          <line className="preview-baseline" x1="4" x2="96" y1="92" y2="92" />
          <polyline className="preview-profile-line" points={preview.polyline} />
          {previewPoints.map((point) => {
            const x = 4 + point.distancePercent * 0.92;
            const range = Math.max(1, preview.maximumElevationM - preview.minimumElevationM);
            const y = 88 - (point.elevationM - preview.minimumElevationM) / range * 72;
            return (
              <circle
                className={point.endpoint ? 'preview-endpoint' : 'preview-interior-point'}
                cx={x}
                cy={y}
                key={point.id}
                r={point.endpoint ? 1.8 : 1.45}
              />
            );
          })}
          {criticalPercent !== null && (
            <line
              className="preview-critical-line"
              x1={4 + criticalPercent * 0.92}
              x2={4 + criticalPercent * 0.92}
              y1="8"
              y2="92"
            />
          )}
        </svg>
        <div className="preview-scale">
          <span>0 km</span>
          <span>{numberFormatter.format(routeDistanceKm)} km</span>
        </div>
        <div className="preview-elevation-range">
          {numberFormatter.format(preview.minimumElevationM)}…{numberFormatter.format(preview.maximumElevationM)} m
        </div>
      </div>

      <div className="terrain-point-list">
        {sortedPoints.length === 0 ? (
          <p className="terrain-point-empty">
            Ara nokta yok. Profil gözlemci ve hedef uç kotlarını doğrusal olarak birleştirir.
          </p>
        ) : sortedPoints.map((point, index) => (
          <div className="terrain-point-row" key={point.id}>
            <span className="terrain-point-index">{index + 1}</span>
            <label>
              <span>Rota konumu</span>
              <div>
                <input
                  disabled={disabled}
                  max={99.999}
                  min={0.001}
                  step={0.1}
                  type="number"
                  value={point.distancePercent}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (!Number.isFinite(value)) return;
                    apply(() => updateManualTerrainPoint(sortedPoints, point.id, {
                      distancePercent: value
                    }));
                  }}
                />
                <b>%</b>
              </div>
            </label>
            <label>
              <span>Arazi kotu</span>
              <div>
                <input
                  disabled={disabled}
                  max={100_000}
                  min={-12_000}
                  step={0.1}
                  type="number"
                  value={point.elevationM}
                  onChange={(event) => {
                    const value = event.currentTarget.valueAsNumber;
                    if (!Number.isFinite(value)) return;
                    apply(() => updateManualTerrainPoint(sortedPoints, point.id, {
                      elevationM: value
                    }));
                  }}
                />
                <b>m</b>
              </div>
            </label>
            <span className="terrain-point-distance">
              {numberFormatter.format(routeDistanceKm * point.distancePercent / 100)} km
            </span>
            <button
              className="terrain-point-delete"
              disabled={disabled}
              title="Arazi noktasını sil"
              type="button"
              onClick={() => apply(() => removeManualTerrainPoint(sortedPoints, point.id))}
            >
              Sil
            </button>
          </div>
        ))}
      </div>

      {(operationError || validationErrors.length > 0) && (
        <div className="terrain-editor-errors" role="alert">
          {operationError && <p>{operationError}</p>}
          {validationErrors.map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
    </section>
  );
}
