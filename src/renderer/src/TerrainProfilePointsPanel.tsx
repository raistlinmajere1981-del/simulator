import type { PointerEvent } from 'react';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  removeManualTerrainPoint,
  updateManualTerrainPoint
} from '../../simulation/manual-terrain-profile';
import { DraftNumberInput } from './DraftNumberInput';
import { numberFormatter, type PreviewPoint } from './terrain-editor-view-model';

export function TerrainProfilePointsPanel({
  preview,
  previewPoints,
  sortedPoints,
  routeDistanceKm,
  criticalPercent,
  disabled,
  onBeginTerrainPointDrag,
  onMoveTerrainPointDrag,
  onEndTerrainPointDrag,
  onApplyOperation
}: {
  preview: {
    polyline: string;
    minimumElevationM: number;
    maximumElevationM: number;
  };
  previewPoints: readonly PreviewPoint[];
  sortedPoints: readonly ManualTerrainPoint[];
  routeDistanceKm: number;
  criticalPercent: number | null;
  disabled: boolean;
  onBeginTerrainPointDrag(event: PointerEvent<SVGCircleElement>, point: PreviewPoint): void;
  onMoveTerrainPointDrag(event: PointerEvent<SVGCircleElement>): void;
  onEndTerrainPointDrag(event: PointerEvent<SVGCircleElement>): void;
  onApplyOperation(operation: () => ManualTerrainPoint[]): void;
}): React.JSX.Element {
  return (
    <>
      <div className="terrain-profile-preview" aria-label="Arazi yüksekliği grafiği">
        <svg preserveAspectRatio="none" viewBox="0 0 100 100" role="img">
          <line className="preview-baseline" x1="4" x2="96" y1="92" y2="92" />
          <polyline className="preview-profile-line" points={preview.polyline} />
          {previewPoints.map((point) => {
            const x = 4 + point.distancePercent * 0.92;
            const range = Math.max(1, preview.maximumElevationM - preview.minimumElevationM);
            const y = 88 - (point.elevationM - preview.minimumElevationM) / range * 72;
            return (
              <circle
                aria-label={point.endpoint ? undefined : `Arazi noktası: rota yüzde ${numberFormatter.format(point.distancePercent)}, yükseklik ${numberFormatter.format(point.elevationM)} metre`}
                className={point.endpoint ? 'preview-endpoint' : 'preview-interior-point draggable'}
                cx={x}
                cy={y}
                key={point.id}
                onPointerCancel={point.endpoint ? undefined : onEndTerrainPointDrag}
                onPointerDown={point.endpoint ? undefined : (event) => onBeginTerrainPointDrag(event, point)}
                onPointerMove={point.endpoint ? undefined : onMoveTerrainPointDrag}
                onPointerUp={point.endpoint ? undefined : onEndTerrainPointDrag}
                r={point.endpoint ? 1.8 : 1.8}
                role={point.endpoint ? undefined : 'slider'}
                style={point.endpoint ? undefined : { cursor: 'grab', touchAction: 'none' }}
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
            Ara nokta yok. Grafik başlangıç ve bitiş zemin yüksekliğini düz çizgiyle birleştirir.
          </p>
        ) : sortedPoints.map((point, index) => (
          <div className="terrain-point-row" key={point.id}>
            <span className="terrain-point-index">{index + 1}</span>
            <label title="Başlangıçtan bitişe kadar rotanın yüzde kaçında olduğu">
              <span>Rotadaki yeri</span>
              <div>
                <DraftNumberInput
                  disabled={disabled}
                  max={99.999}
                  min={0.001}
                  step={0.1}
                  value={point.distancePercent}
                  onCommit={(value) => onApplyOperation(() => updateManualTerrainPoint(sortedPoints, point.id, {
                    distancePercent: value
                  }))}
                />
                <b>%</b>
              </div>
            </label>
            <label title="Bu noktadaki zemin veya arazi yüksekliği">
              <span>Arazi yüksekliği</span>
              <div>
                <DraftNumberInput
                  disabled={disabled}
                  max={100_000}
                  min={-12_000}
                  step={0.1}
                  value={point.elevationM}
                  onCommit={(value) => onApplyOperation(() => updateManualTerrainPoint(sortedPoints, point.id, {
                    elevationM: value
                  }))}
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
              title="Bu arazi noktasını sil"
              type="button"
              onClick={() => onApplyOperation(() => removeManualTerrainPoint(sortedPoints, point.id))}
            >
              Sil
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
