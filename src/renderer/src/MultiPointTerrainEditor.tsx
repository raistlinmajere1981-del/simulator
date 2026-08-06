import { useMemo, useState } from 'react';
import type {
  CsvTerrainDistanceUnit,
  ImportedTerrainProfile,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  insertManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../../simulation/manual-terrain-profile';

export interface TerrainProfileImportOptions {
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
}

interface MultiPointTerrainEditorProps {
  points: ManualTerrainPoint[];
  routeDistanceKm: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  criticalDistanceM?: number | null;
  disabled?: boolean;
  onChange(points: ManualTerrainPoint[]): void;
  onApplyImport(
    profile: ImportedTerrainProfile,
    options: TerrainProfileImportOptions
  ): void;
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

  const first = all[0];
  const second = all[1];
  if (!first || !second) {
    throw new RangeError('Profilin başlangıç ve bitiş noktaları oluşturulamadı.');
  }

  let bestLeft: PreviewPoint = first;
  let bestRight: PreviewPoint = second;
  let bestGap = bestRight.distancePercent - bestLeft.distancePercent;

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

function distanceUnitLabel(profile: ImportedTerrainProfile): string {
  if (profile.distanceUnit === 'percent') return 'rotanın yüzdesi';
  if (profile.distanceUnit === 'km') return 'kilometre';
  return 'metre';
}

function sourceDistanceLabel(profile: ImportedTerrainProfile): string {
  if (profile.sourceDistanceM === null) return 'Konumlar yüzde olarak verilmiş';
  return `${numberFormatter.format(profile.sourceDistanceM / 1_000)} km CSV rotası`;
}

function delimiterLabel(request: TerrainProfileMappingRequest): string {
  if (request.delimiter === 'semicolon') return 'noktalı virgül (;)';
  if (request.delimiter === 'tab') return 'sekme';
  return 'virgül (,)';
}

export function MultiPointTerrainEditor({
  points,
  routeDistanceKm,
  observerGroundElevationM,
  targetGroundElevationM,
  criticalDistanceM,
  disabled = false,
  onChange,
  onApplyImport
}: MultiPointTerrainEditorProps): React.JSX.Element {
  const [operationError, setOperationError] = useState('');
  const [pendingImport, setPendingImport] = useState<ImportedTerrainProfile>();
  const [mappingRequest, setMappingRequest] = useState<TerrainProfileMappingRequest>();
  const [mappingDistanceIndex, setMappingDistanceIndex] = useState(0);
  const [mappingElevationIndex, setMappingElevationIndex] = useState(1);
  const [mappingDistanceUnit, setMappingDistanceUnit] = useState<CsvTerrainDistanceUnit>('m');
  const [applyObserverEndpoint, setApplyObserverEndpoint] = useState(false);
  const [applyTargetEndpoint, setApplyTargetEndpoint] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
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
      setImportMessage('');
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

  const stageProfile = (profile: ImportedTerrainProfile): void => {
    setMappingRequest(undefined);
    setPendingImport(profile);
    setApplyObserverEndpoint(false);
    setApplyTargetEndpoint(false);
  };

  const chooseCsvProfile = async (): Promise<void> => {
    setOperationError('');
    setImportMessage('');
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importTerrainProfile({
        routeDistanceM: routeDistanceKm * 1_000,
        observerGroundElevationM,
        targetGroundElevationM
      });
      if (result.status === 'cancelled') {
        setPendingImport(undefined);
        setMappingRequest(undefined);
        setImportMessage(result.message);
        return;
      }
      if (result.mappingRequest) {
        const request = result.mappingRequest;
        setPendingImport(undefined);
        setMappingRequest(request);
        setMappingDistanceIndex(0);
        setMappingElevationIndex(Math.min(1, Math.max(0, request.headers.length - 1)));
        setMappingDistanceUnit('m');
        return;
      }
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setPendingImport(undefined);
      setMappingRequest(undefined);
      setOperationError(
        error instanceof Error ? error.message : 'CSV arazi profili okunamadı.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyColumnMapping = async (): Promise<void> => {
    if (!mappingRequest) return;
    if (mappingDistanceIndex === mappingElevationIndex) {
      setOperationError(
        'Rota üzerindeki konum ve arazi yüksekliği için farklı sütunlar seçin.'
      );
      return;
    }

    setOperationError('');
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importTerrainProfileWithMapping(
        mappingRequest.requestId,
        {
          distanceColumnIndex: mappingDistanceIndex,
          elevationColumnIndex: mappingElevationIndex,
          distanceUnit: mappingDistanceUnit
        },
        {
          routeDistanceM: routeDistanceKm * 1_000,
          observerGroundElevationM,
          targetGroundElevationM
        }
      );
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'Seçilen CSV sütunları kullanılamadı.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyCsvProfile = (): void => {
    if (!pendingImport) return;
    const imported = pendingImport;
    setOperationError('');
    setPendingImport(undefined);
    setImportMessage(
      `“${imported.fileName}” arazi profili uygulandı: ${imported.points.length} ara nokta.`
    );
    onApplyImport(imported, {
      applyObserverEndpoint,
      applyTargetEndpoint
    });
  };

  return (
    <section className={`multi-terrain-editor ${disabled ? 'disabled' : ''}`}>
      <header className="multi-terrain-editor-heading">
        <div>
          <strong>Arazi yüksekliği noktaları</strong>
          <span>{sortedPoints.length} ara nokta · başlangıç ve bitiş otomatik eklenir</span>
        </div>
        <div className="terrain-editor-heading-actions">
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || routeDistanceKm <= 0}
            title="Bir CSV veya TSV dosyasındaki rota ve arazi yüksekliği değerlerini kullan"
            type="button"
            onClick={() => void chooseCsvProfile()}
          >
            {isImporting ? 'CSV okunuyor…' : 'CSV dosyasından al'}
          </button>
          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
            type="button"
            onClick={addPoint}
          >
            + Nokta ekle
          </button>
        </div>
      </header>

      {mappingRequest && (
        <div className="terrain-mapping-review">
          <div className="terrain-import-review-heading">
            <div>
              <strong>{mappingRequest.fileName}</strong>
              <span>{mappingRequest.reason}</span>
            </div>
            <span className="terrain-mapping-required">CSV SÜTUNLARINI SEÇ</span>
          </div>
          <p className="terrain-plain-guide">
            Program iki sütunu kesin olarak tanıyamadı. Rotada ne kadar ilerlenildiğini
            gösteren sütunu ve arazi yüksekliğini gösteren sütunu aşağıdan seçin.
          </p>
          <div className="terrain-mapping-controls">
            <label title="Başlangıçtan itibaren metre, kilometre veya rota yüzdesi değerlerini içeren sütun">
              <span>Rotadaki yeri gösteren sütun</span>
              <select
                value={mappingDistanceIndex}
                onChange={(event) => setMappingDistanceIndex(Number(event.currentTarget.value))}
              >
                {mappingRequest.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>{header || `Sütun ${index + 1}`}</option>
                ))}
              </select>
            </label>
            <label title="Seçtiğiniz konum sütunundaki sayıların birimi">
              <span>Konum birimi</span>
              <select
                value={mappingDistanceUnit}
                onChange={(event) => setMappingDistanceUnit(event.currentTarget.value as CsvTerrainDistanceUnit)}
              >
                <option value="m">metre</option>
                <option value="km">kilometre</option>
                <option value="percent">rotanın yüzdesi</option>
              </select>
            </label>
            <label title="Her konumdaki zemin veya arazi yüksekliğini metre olarak içeren sütun">
              <span>Arazi yüksekliğini gösteren sütun</span>
              <select
                value={mappingElevationIndex}
                onChange={(event) => setMappingElevationIndex(Number(event.currentTarget.value))}
              >
                {mappingRequest.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>{header || `Sütun ${index + 1}`}</option>
                ))}
              </select>
            </label>
            <div className="terrain-mapping-delimiter" title="CSV dosyasındaki sütunları birbirinden ayıran işaret">
              <span>Dosyadaki ayırıcı</span>
              <strong>{delimiterLabel(mappingRequest)}</strong>
            </div>
          </div>
          <div className="terrain-mapping-preview-wrap">
            <table className="terrain-mapping-preview">
              <thead><tr>{mappingRequest.headers.map((header, index) => <th key={`${header}-${index}`}>{header || `Sütun ${index + 1}`}</th>)}</tr></thead>
              <tbody>
                {mappingRequest.previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>{mappingRequest.headers.map((_header, index) => <td key={index}>{row[index] ?? ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="terrain-import-actions">
            <button type="button" onClick={() => setMappingRequest(undefined)}>Vazgeç</button>
            <button className="apply" disabled={isImporting} type="button" onClick={() => void applyColumnMapping()}>
              {isImporting ? 'Kontrol ediliyor…' : 'Seçimleri kontrol et'}
            </button>
          </div>
        </div>
      )}

      {pendingImport && (
        <div className="terrain-import-review">
          <div className="terrain-import-review-heading">
            <div>
              <strong>{pendingImport.fileName}</strong>
              <span>Dosyadaki noktalar mevcut {sortedPoints.length} ara noktanın yerine geçecek.</span>
            </div>
            <span className="terrain-import-ready">UYGULAMAYA HAZIR</span>
          </div>
          <p className="terrain-plain-guide">
            Ara noktalar dosyadan alınır. Aşağıdaki iki kutu yalnız başlangıç ve bitiş
            zemin yüksekliğinin de dosyadan alınmasını sağlar.
          </p>
          <div className="terrain-import-metrics">
            <div><small>Dosyadaki veri satırı</small><strong>{pendingImport.rowCount}</strong></div>
            <div><small>Kullanılacak ara nokta</small><strong>{pendingImport.points.length}</strong></div>
            <div><small>Konumların birimi</small><strong>{distanceUnitLabel(pendingImport)}</strong></div>
            <div><small>CSV'deki toplam rota</small><strong>{sourceDistanceLabel(pendingImport)}</strong></div>
            <div><small>Başlangıç → bitiş yüksekliği</small><strong>{numberFormatter.format(pendingImport.observerEndpointElevationM)} → {numberFormatter.format(pendingImport.targetEndpointElevationM)} m</strong></div>
          </div>
          <div className="terrain-import-columns">
            <span>Rotadaki yer sütunu: <b>{pendingImport.distanceColumnHeader}</b></span>
            <span>Arazi yüksekliği sütunu: <b>{pendingImport.elevationColumnHeader}</b></span>
          </div>
          <div className="terrain-endpoint-options">
            <label title="İşaretlenirse üst bölümdeki Gözlemci zemin kotu bu değerle değiştirilir">
              <input
                checked={applyObserverEndpoint}
                type="checkbox"
                onChange={(event) => setApplyObserverEndpoint(event.currentTarget.checked)}
              />
              <span>Başlangıç zemin yüksekliğini dosyadan al: <b>{numberFormatter.format(pendingImport.observerEndpointElevationM)} m</b></span>
            </label>
            <label title="İşaretlenirse üst bölümdeki Hedef taban kotu bu değerle değiştirilir">
              <input
                checked={applyTargetEndpoint}
                type="checkbox"
                onChange={(event) => setApplyTargetEndpoint(event.currentTarget.checked)}
              />
              <span>Bitiş zemin yüksekliğini dosyadan al: <b>{numberFormatter.format(pendingImport.targetEndpointElevationM)} m</b></span>
            </label>
          </div>
          {pendingImport.warnings.length > 0 && (
            <ul className="terrain-import-warnings">
              {pendingImport.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          <div className="terrain-import-actions">
            <button type="button" onClick={() => setPendingImport(undefined)}>Vazgeç</button>
            <button className="apply" type="button" onClick={applyCsvProfile}>Arazi profilini uygula</button>
          </div>
        </div>
      )}

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
            Ara nokta yok. Grafik başlangıç ve bitiş zemin yüksekliğini düz çizgiyle birleştirir.
          </p>
        ) : sortedPoints.map((point, index) => (
          <div className="terrain-point-row" key={point.id}>
            <span className="terrain-point-index">{index + 1}</span>
            <label title="Başlangıçtan bitişe kadar rotanın yüzde kaçında olduğu">
              <span>Rotadaki yeri</span>
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
            <label title="Bu noktadaki zemin veya arazi yüksekliği">
              <span>Arazi yüksekliği</span>
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
              title="Bu arazi noktasını sil"
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
      {importMessage && !operationError && (
        <div className="terrain-import-status" role="status">{importMessage}</div>
      )}
    </section>
  );
}
