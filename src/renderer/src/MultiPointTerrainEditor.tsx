import { useMemo, useRef, useState } from 'react';
import type {
  CsvTerrainDistanceUnit,
  DemTerrainSamplingMethod,
  ImportedDemTerrainProfile,
  ImportedGeoJsonTerrainProfile,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import type { ManualTerrainPoint } from '../../shared/terrain';
import {
  getApplicableImportedRouteDistanceKm,
  type TerrainProfileApplicationOptions
} from '../../simulation/terrain-import-application';
import {
  insertManualTerrainPoint,
  removeManualTerrainPoint,
  sortManualTerrainPoints,
  updateManualTerrainPoint,
  validateManualTerrainPoints
} from '../../simulation/manual-terrain-profile';
import {
  getTerrainPointDragBounds,
  terrainPointFromDragDelta
} from '../../simulation/terrain-profile-drag';
import {
  requestedDemSampleCount,
  type DemSampleCountMode
} from '../../simulation/dem-import-options';
import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';
import { DraftNumberInput } from './DraftNumberInput';

export type TerrainProfileImportOptions = TerrainProfileApplicationOptions;

interface MultiPointTerrainEditorProps {
  points: ManualTerrainPoint[];
  routeDistanceKm: number;
  allowRouteDistanceImport: boolean;
  allowDemImport: boolean;
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  targetLatitudeDeg: number;
  targetLongitudeDeg: number;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observerHeightM: number;
  targetHeightM: number;
  verticalDatumOffsetM: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
  criticalDistanceM?: number | null;
  disabled?: boolean;
  onChange(points: ManualTerrainPoint[]): void;
  onApplyImport(
    profile: TerrainProfileImport,
    options: TerrainProfileImportOptions
  ): void;
}

interface PreviewPoint {
  id: string;
  distancePercent: number;
  elevationM: number;
  endpoint: boolean;
}

interface TerrainPointDragState {
  pointerId: number;
  pointId: string;
  startClientX: number;
  startClientY: number;
  startDistancePercent: number;
  startElevationM: number;
  minimumDistancePercent: number;
  maximumDistancePercent: number;
  elevationSpanM: number;
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

function isGeoJsonProfile(
  profile: TerrainProfileImport
): profile is ImportedGeoJsonTerrainProfile {
  return 'kind' in profile && profile.kind === 'geojson';
}

function isDemProfile(
  profile: TerrainProfileImport
): profile is ImportedDemTerrainProfile {
  return 'kind' in profile && profile.kind === 'dem';
}

function distanceUnitLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'WGS84 rota örnekleri';
  if (isGeoJsonProfile(profile)) return 'WGS84 koordinatları';
  if (profile.distanceUnit === 'percent') return 'rotanın yüzdesi';
  if (profile.distanceUnit === 'km') return 'kilometre';
  return 'metre';
}

function sourceDistanceLabel(profile: TerrainProfileImport): string {
  if (profile.sourceDistanceM === null) return 'Konumlar yüzde olarak verilmiş';
  const sourceLabel = isDemProfile(profile)
    ? 'DEM örnek rotası'
    : isGeoJsonProfile(profile)
      ? 'GeoJSON rotası'
      : 'CSV rotası';
  return `${numberFormatter.format(profile.sourceDistanceM / 1_000)} km ${sourceLabel}`;
}

function sourceRecordLabel(profile: TerrainProfileImport): string {
  if (isDemProfile(profile)) return 'DEM rota örneği';
  if (isGeoJsonProfile(profile)) return 'GeoJSON koordinatı';
  return 'Dosyadaki veri satırı';
}

function demDiagnosticLabel(status: ImportedDemTerrainProfile['diagnosticStatus']): string {
  if (status === 'good') return 'iyi';
  if (status === 'caution') return 'dikkat';
  return 'sınırlı';
}

function sourceRecordCount(profile: TerrainProfileImport): number {
  if (isDemProfile(profile)) return profile.sampleCount;
  if (isGeoJsonProfile(profile)) return profile.coordinateCount;
  return profile.rowCount;
}

function delimiterLabel(request: TerrainProfileMappingRequest): string {
  if (request.delimiter === 'semicolon') return 'noktalı virgül (;)';
  if (request.delimiter === 'tab') return 'sekme';
  return 'virgül (,)';
}

export function MultiPointTerrainEditor({
  points,
  routeDistanceKm,
  allowRouteDistanceImport,
  allowDemImport,
  observerLatitudeDeg,
  observerLongitudeDeg,
  targetLatitudeDeg,
  targetLongitudeDeg,
  observerGroundElevationM,
  targetGroundElevationM,
  observerHeightM,
  targetHeightM,
  verticalDatumOffsetM,
  useStandardRefraction,
  refractionCoefficient,
  criticalDistanceM,
  disabled = false,
  onChange,
  onApplyImport
}: MultiPointTerrainEditorProps): React.JSX.Element {
  const [operationError, setOperationError] = useState('');
  const [pendingImport, setPendingImport] = useState<TerrainProfileImport>();
  const [mappingRequest, setMappingRequest] = useState<TerrainProfileMappingRequest>();
  const [mappingDistanceIndex, setMappingDistanceIndex] = useState(0);
  const [mappingElevationIndex, setMappingElevationIndex] = useState(1);
  const [mappingDistanceUnit, setMappingDistanceUnit] = useState<CsvTerrainDistanceUnit>('m');
  const [applyObserverEndpoint, setApplyObserverEndpoint] = useState(false);
  const [applyTargetEndpoint, setApplyTargetEndpoint] = useState(false);
  const [applyRouteDistance, setApplyRouteDistance] = useState(false);
  const [applyRouteCoordinates, setApplyRouteCoordinates] = useState(false);
  const [demSamplingMethod, setDemSamplingMethod] = useState<DemTerrainSamplingMethod>('bilinear');
  const [demSampleCountMode, setDemSampleCountMode] = useState<DemSampleCountMode>('automatic');
  const [demManualSampleCount, setDemManualSampleCount] = useState(101);
  const [importMessage, setImportMessage] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const dragState = useRef<TerrainPointDragState | undefined>(undefined);
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
  const pendingSourceDistanceKm = pendingImport
    ? getApplicableImportedRouteDistanceKm(pendingImport)
    : null;
  const criticalPercent = criticalDistanceM === null || criticalDistanceM === undefined ||
    routeDistanceKm <= 0
    ? null
    : Math.min(100, Math.max(0, criticalDistanceM / (routeDistanceKm * 1_000) * 100));

  const beginTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>,
    point: PreviewPoint
  ): void => {
    if (disabled || point.endpoint) return;
    const bounds = getTerrainPointDragBounds(sortedPoints, point.id);
    const elevationSpanM = Math.max(
      10,
      preview.maximumElevationM - preview.minimumElevationM
    ) * 1.5;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      pointId: point.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startDistancePercent: point.distancePercent,
      startElevationM: point.elevationM,
      minimumDistancePercent: bounds.minimumDistancePercent,
      maximumDistancePercent: bounds.maximumDistancePercent,
      elevationSpanM
    };
  };

  const moveTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>
  ): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const viewport = svg.getBoundingClientRect();
    const patch = terrainPointFromDragDelta({
      startDistancePercent: drag.startDistancePercent,
      startElevationM: drag.startElevationM,
      deltaXpx: event.clientX - drag.startClientX,
      deltaYpx: event.clientY - drag.startClientY,
      viewportWidthPx: viewport.width,
      viewportHeightPx: viewport.height,
      elevationSpanM: drag.elevationSpanM,
      minimumDistancePercent: drag.minimumDistancePercent,
      maximumDistancePercent: drag.maximumDistancePercent
    });
    event.preventDefault();
    apply(() => updateManualTerrainPoint(sortedPoints, drag.pointId, patch));
  };

  const endTerrainPointDrag = (
    event: React.PointerEvent<SVGCircleElement>
  ): void => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = undefined;
  };

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

  const stageProfile = (profile: TerrainProfileImport): void => {
    setMappingRequest(undefined);
    setPendingImport(profile);
    setApplyObserverEndpoint(false);
    setApplyTargetEndpoint(false);
    setApplyRouteDistance(false);
    setApplyRouteCoordinates(false);
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

  const chooseGeoJsonProfile = async (): Promise<void> => {
    setOperationError('');
    setImportMessage('');
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importGeoJsonTerrainProfile({
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
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setPendingImport(undefined);
      setMappingRequest(undefined);
      setOperationError(
        error instanceof Error ? error.message : 'GeoJSON arazi profili okunamadı.'
      );
    } finally {
      setIsImporting(false);
    }
  };

  const chooseDemProfile = async (): Promise<void> => {
    if (!allowDemImport) {
      setOperationError('DEM profili için deney mesafe kaynağı koordinat olmalı.');
      return;
    }
    setOperationError('');
    setImportMessage('');
    let sampleCount: number | undefined;
    try {
      sampleCount = requestedDemSampleCount(demSampleCountMode, demManualSampleCount);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : 'DEM örnek sayısı geçersiz.'
      );
      return;
    }
    setIsImporting(true);
    try {
      const result = await window.simulatorDesktop.importDemTerrainProfile({
        observerLatitudeDeg,
        observerLongitudeDeg,
        targetLatitudeDeg,
        targetLongitudeDeg,
        samplingMethod: demSamplingMethod,
        ...(sampleCount === undefined ? {} : { sampleCount })
      });
      if (result.status === 'cancelled') {
        setPendingImport(undefined);
        setMappingRequest(undefined);
        setImportMessage(result.message);
        return;
      }
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setPendingImport(undefined);
      setMappingRequest(undefined);
      setOperationError(
        error instanceof Error ? error.message : 'ESRI ASCII DEM profili oluşturulamadı.'
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

  const applyTerrainProfile = (): void => {
    if (!pendingImport) return;
    const imported = pendingImport;
    setOperationError('');
    setPendingImport(undefined);
    setImportMessage(
      `“${imported.fileName}” arazi profili uygulandı: ${imported.points.length} ara nokta.`
    );
    onApplyImport(imported, {
      applyObserverEndpoint,
      applyTargetEndpoint,
      applyRouteDistance,
      applyRouteCoordinates
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
            className="terrain-csv-button"
            disabled={disabled || isImporting || routeDistanceKm <= 0}
            title="WGS84 boylam, enlem ve yükseklik taşıyan bir GeoJSON rotasını kullan"
            type="button"
            onClick={() => void chooseGeoJsonProfile()}
          >
            {isImporting ? 'Dosya okunuyor…' : 'GeoJSON dosyasından al'}
          </button>
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || !allowDemImport}
            title={allowDemImport
              ? 'Geçerli gözlemci-hedef koordinatları boyunca ESRI ASCII DEM dosyasını iki doğrusal yöntemle örnekle'
              : 'DEM profili için önce mesafe kaynağını koordinat yapın'}
            type="button"
            onClick={() => void chooseDemProfile()}
          >
            {isImporting ? 'Dosya okunuyor…' : 'DEM dosyasından al'}
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

      {allowDemImport && (
        <div className="terrain-mapping-controls terrain-dem-controls">
          <label title="DEM hücrelerinden rota yüksekliği üretme yöntemi">
            <span>DEM örnekleme yöntemi</span>
            <select
              value={demSamplingMethod}
              onChange={(event) => setDemSamplingMethod(
                event.currentTarget.value as DemTerrainSamplingMethod
              )}
            >
              <option value="bilinear">İki doğrusal</option>
              <option value="nearest">En yakın hücre</option>
            </select>
          </label>
          <label title="Otomatik mod grid çözünürlüğüne göre örnek sayısını belirler">
            <span>Rota örnek sayısı</span>
            <select
              value={demSampleCountMode}
              onChange={(event) => setDemSampleCountMode(
                event.currentTarget.value as DemSampleCountMode
              )}
            >
              <option value="automatic">Grid çözünürlüğüne göre otomatik</option>
              <option value="manual">Manuel sayı</option>
            </select>
          </label>
          {demSampleCountMode === 'manual' && (
            <label title="Başlangıç ve bitiş dahil 3…2002 rota örneği">
              <span>Manuel örnek sayısı</span>
              <DraftNumberInput
                max={2_002}
                min={3}
                step={1}
                value={demManualSampleCount}
                onCommit={setDemManualSampleCount}
              />
            </label>
          )}
        </div>
      )}

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
            Ara noktalar dosyadan alınır. Aşağıdaki seçenekler kaynak rota bilgisinin
            ve başlangıç-bitiş zemin yüksekliğinin deneye aktarılmasını sağlar.
          </p>
          <div className="terrain-import-metrics">
            <div>
              <small>{sourceRecordLabel(pendingImport)}</small>
              <strong>{sourceRecordCount(pendingImport)}</strong>
            </div>
            <div><small>Kullanılacak ara nokta</small><strong>{pendingImport.points.length}</strong></div>
            <div><small>Konumların birimi</small><strong>{distanceUnitLabel(pendingImport)}</strong></div>
            <div><small>Dosyadaki toplam rota</small><strong>{sourceDistanceLabel(pendingImport)}</strong></div>
            <div><small>Başlangıç → bitiş yüksekliği</small><strong>{numberFormatter.format(pendingImport.observerEndpointElevationM)} → {numberFormatter.format(pendingImport.targetEndpointElevationM)} m</strong></div>
          </div>
          {isDemProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>Grid: <b>{pendingImport.columnCount} × {pendingImport.rowCount} hücre</b></span>
              <span>Hücre boyutu: <b>{pendingImport.cellSizeDeg.toFixed(8)}°</b></span>
              <span>Örnekleme: <b>{pendingImport.samplingMethod === 'bilinear' ? 'iki doğrusal' : 'en yakın hücre'}</b></span>
              <span>Örnek sayısı modu: <b>{pendingImport.sampleCountMode === 'manual' ? 'manuel' : 'grid çözünürlüğüne göre otomatik'}</b></span>
              <span>Örnek aralığı: <b>{numberFormatter.format(pendingImport.sampleSpacingM)} m</b></span>
              <span>Jeodezik yöntem: <b>{pendingImport.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'küresel yedek'}</b></span>
              <span>Örnekleme tanısı: <b>{demDiagnosticLabel(pendingImport.diagnosticStatus)}</b></span>
              <span>Etkili hücre genişliği: <b>{numberFormatter.format(pendingImport.effectiveCellSpanM)} m</b></span>
              <span>Örnek / hücre oranı: <b>{numberFormatter.format(pendingImport.sampleSpacingToCellRatio)}</b></span>
              <span>En yakın grid kenarı: <b>{numberFormatter.format(pendingImport.minimumCoverageMarginM)} m ({numberFormatter.format(pendingImport.coverageMarginCellRatio)} hücre)</b></span>
              <span>Yükseklik aralığı: <b>{numberFormatter.format(pendingImport.minimumElevationM)} → {numberFormatter.format(pendingImport.maximumElevationM)} m (Δ {numberFormatter.format(pendingImport.elevationRangeM)} m)</b></span>
            </div>
          ) : isGeoJsonProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>Geometri: <b>{pendingImport.geometryType}</b></span>
              <span>Yükseklik kaynağı: <b>koordinatların üçüncü bileşeni (Z)</b></span>
              <span>Başlangıç: <b>{pendingImport.startLatitudeDeg.toFixed(6)}°, {pendingImport.startLongitudeDeg.toFixed(6)}°</b></span>
              <span>Bitiş: <b>{pendingImport.endLatitudeDeg.toFixed(6)}°, {pendingImport.endLongitudeDeg.toFixed(6)}°</b></span>
            </div>
          ) : (
            <div className="terrain-import-columns">
              <span>Rotadaki yer sütunu: <b>{pendingImport.distanceColumnHeader}</b></span>
              <span>Arazi yüksekliği sütunu: <b>{pendingImport.elevationColumnHeader}</b></span>
            </div>
          )}
          <div className="terrain-endpoint-options">
            {isGeoJsonProfile(pendingImport) && (
              <label title="İşaretlenirse gözlemci ve hedef koordinatları GeoJSON rotasının uçlarından alınır ve mesafe WGS84 ile yeniden hesaplanır">
                <input
                  checked={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setApplyRouteCoordinates(checked);
                    if (checked) setApplyRouteDistance(false);
                  }}
                />
                <span>
                  Deney koordinatlarını GeoJSON rotasından al:
                  <b> {pendingImport.startLatitudeDeg.toFixed(6)}°, {pendingImport.startLongitudeDeg.toFixed(6)}° → {pendingImport.endLatitudeDeg.toFixed(6)}°, {pendingImport.endLongitudeDeg.toFixed(6)}°</b>
                </span>
              </label>
            )}
            {allowRouteDistanceImport && pendingSourceDistanceKm !== null && (
              <label title="İşaretlenirse manuel yüzey mesafesi dosyanın toplam rotasıyla değiştirilir">
                <input
                  checked={applyRouteDistance}
                  disabled={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => setApplyRouteDistance(event.currentTarget.checked)}
                />
                <span>Deney mesafesini dosyadaki rotaya ayarla: <b>{numberFormatter.format(pendingSourceDistanceKm)} km</b></span>
              </label>
            )}
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
          {isDemProfile(pendingImport) && (
            <DemLineOfSightReviewCard
              profile={pendingImport}
              applyObserverEndpoint={applyObserverEndpoint}
              applyTargetEndpoint={applyTargetEndpoint}
              observerGroundElevationM={observerGroundElevationM}
              targetGroundElevationM={targetGroundElevationM}
              observerHeightM={observerHeightM}
              targetHeightM={targetHeightM}
              verticalDatumOffsetM={verticalDatumOffsetM}
              useStandardRefraction={useStandardRefraction}
              refractionCoefficient={refractionCoefficient}
            />
          )}
          {pendingImport.warnings.length > 0 && (
            <ul className="terrain-import-warnings">
              {pendingImport.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          <div className="terrain-import-actions">
            <button type="button" onClick={() => setPendingImport(undefined)}>Vazgeç</button>
            <button className="apply" type="button" onClick={applyTerrainProfile}>Arazi profilini uygula</button>
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
                aria-label={point.endpoint ? undefined : `Arazi noktası: rota yüzde ${numberFormatter.format(point.distancePercent)}, yükseklik ${numberFormatter.format(point.elevationM)} metre`}
                className={point.endpoint ? 'preview-endpoint' : 'preview-interior-point draggable'}
                cx={x}
                cy={y}
                key={point.id}
                onPointerCancel={point.endpoint ? undefined : endTerrainPointDrag}
                onPointerDown={point.endpoint ? undefined : (event) => beginTerrainPointDrag(event, point)}
                onPointerMove={point.endpoint ? undefined : moveTerrainPointDrag}
                onPointerUp={point.endpoint ? undefined : endTerrainPointDrag}
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
                  onCommit={(value) => apply(() => updateManualTerrainPoint(sortedPoints, point.id, {
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
                  onCommit={(value) => apply(() => updateManualTerrainPoint(sortedPoints, point.id, {
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
