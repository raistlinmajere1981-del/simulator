import { useMemo, useRef, useState } from 'react';
import type {
  CsvTerrainDistanceUnit,
  DemTerrainSamplingMethod,
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
import { DraftNumberInput } from './DraftNumberInput';
import { TerrainImportReviewPanel } from './TerrainImportReviewPanel';
import { TerrainProfilePointsPanel } from './TerrainProfilePointsPanel';
import { useI18n } from './I18nProvider';
import {
  MAX_EDITOR_POINTS,
  findLargestGapPoint,
  previewCoordinates,
  type PreviewPoint,
  type TerrainPointDragState
} from './terrain-editor-view-model';

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
  const { locale, t } = useI18n();
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
      setOperationError(error instanceof Error ? error.message : t('terrain.editor.updateError'));
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
      }, locale);
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
        error instanceof Error ? error.message : t('terrain.editor.csvReadError')
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
      }, locale);
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
        error instanceof Error ? error.message : t('terrain.editor.geoJsonReadError')
      );
    } finally {
      setIsImporting(false);
    }
  };

  const chooseDemProfile = async (): Promise<void> => {
    if (!allowDemImport) {
      setOperationError(t('terrain.editor.demNeedsCoordinatesError'));
      return;
    }
    setOperationError('');
    setImportMessage('');
    let sampleCount: number | undefined;
    try {
      sampleCount = requestedDemSampleCount(demSampleCountMode, demManualSampleCount);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : t('terrain.editor.demCountError')
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
      }, locale);
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
        error instanceof Error ? error.message : t('terrain.editor.demCreateError')
      );
    } finally {
      setIsImporting(false);
    }
  };

  const applyColumnMapping = async (): Promise<void> => {
    if (!mappingRequest) return;
    if (mappingDistanceIndex === mappingElevationIndex) {
      setOperationError(t('terrain.editor.mappingDistinctColumns'));
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
        },
        locale
      );
      if (result.profile) stageProfile(result.profile);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : t('terrain.editor.mappingApplyError')
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
    setImportMessage(t('terrain.editor.profileApplied', {
      fileName: imported.fileName,
      count: imported.points.length
    }));
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
          <strong>{t('terrain.editor.title')}</strong>
          <span>{t('terrain.editor.pointSummary', { count: sortedPoints.length })}</span>
        </div>
        <div className="terrain-editor-heading-actions">
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || routeDistanceKm <= 0}
            title={t('terrain.editor.csvTitle')}
            type="button"
            onClick={() => void chooseCsvProfile()}
          >
            {isImporting ? t('terrain.editor.csvReading') : t('terrain.editor.csvImport')}
          </button>
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || routeDistanceKm <= 0}
            title={t('terrain.editor.geoJsonTitle')}
            type="button"
            onClick={() => void chooseGeoJsonProfile()}
          >
            {isImporting ? t('terrain.editor.fileReading') : t('terrain.editor.geoJsonImport')}
          </button>
          <button
            className="terrain-csv-button"
            disabled={disabled || isImporting || !allowDemImport}
            title={allowDemImport
              ? t('terrain.editor.demTitle')
              : t('terrain.editor.demNeedsCoordinatesTitle')}
            type="button"
            onClick={() => void chooseDemProfile()}
          >
            {isImporting ? t('terrain.editor.fileReading') : t('terrain.editor.demImport')}
          </button>
          <button
            disabled={disabled || sortedPoints.length >= MAX_EDITOR_POINTS}
            type="button"
            onClick={addPoint}
          >
            + {t('terrain.editor.addPoint')}
          </button>
        </div>
      </header>

      {allowDemImport && (
        <div className="terrain-mapping-controls terrain-dem-controls">
          <label title={t('terrain.editor.demSamplingTitle')}>
            <span>{t('terrain.editor.demSamplingLabel')}</span>
            <select
              value={demSamplingMethod}
              onChange={(event) => setDemSamplingMethod(
                event.currentTarget.value as DemTerrainSamplingMethod
              )}
            >
              <option value="bilinear">{t('terrain.editor.demSamplingBilinear')}</option>
              <option value="nearest">{t('terrain.editor.demSamplingNearest')}</option>
            </select>
          </label>
          <label title={t('terrain.editor.demCountTitle')}>
            <span>{t('terrain.editor.demCountLabel')}</span>
            <select
              value={demSampleCountMode}
              onChange={(event) => setDemSampleCountMode(
                event.currentTarget.value as DemSampleCountMode
              )}
            >
              <option value="automatic">{t('terrain.editor.demCountAutomatic')}</option>
              <option value="manual">{t('terrain.editor.demCountManual')}</option>
            </select>
          </label>
          {demSampleCountMode === 'manual' && (
            <label title={t('terrain.editor.demManualCountTitle')}>
              <span>{t('terrain.editor.demManualCountLabel')}</span>
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

      <TerrainImportReviewPanel
        allowRouteDistanceImport={allowRouteDistanceImport}
        applyObserverEndpoint={applyObserverEndpoint}
        applyRouteCoordinates={applyRouteCoordinates}
        applyRouteDistance={applyRouteDistance}
        applyTargetEndpoint={applyTargetEndpoint}
        currentPointCount={sortedPoints.length}
        isImporting={isImporting}
        mappingDistanceIndex={mappingDistanceIndex}
        mappingDistanceUnit={mappingDistanceUnit}
        mappingElevationIndex={mappingElevationIndex}
        mappingRequest={mappingRequest}
        observerGroundElevationM={observerGroundElevationM}
        observerHeightM={observerHeightM}
        onApplyColumnMapping={applyColumnMapping}
        onApplyObserverEndpointChange={setApplyObserverEndpoint}
        onApplyRouteCoordinatesChange={setApplyRouteCoordinates}
        onApplyRouteDistanceChange={setApplyRouteDistance}
        onApplyTargetEndpointChange={setApplyTargetEndpoint}
        onApplyTerrainProfile={applyTerrainProfile}
        onCancelImport={() => setPendingImport(undefined)}
        onCancelMapping={() => setMappingRequest(undefined)}
        onMappingDistanceIndexChange={setMappingDistanceIndex}
        onMappingDistanceUnitChange={setMappingDistanceUnit}
        onMappingElevationIndexChange={setMappingElevationIndex}
        pendingImport={pendingImport}
        pendingSourceDistanceKm={pendingSourceDistanceKm}
        refractionCoefficient={refractionCoefficient}
        targetGroundElevationM={targetGroundElevationM}
        targetHeightM={targetHeightM}
        useStandardRefraction={useStandardRefraction}
        verticalDatumOffsetM={verticalDatumOffsetM}
      />

      <TerrainProfilePointsPanel
        criticalPercent={criticalPercent}
        disabled={disabled}
        onApplyOperation={apply}
        onBeginTerrainPointDrag={beginTerrainPointDrag}
        onEndTerrainPointDrag={endTerrainPointDrag}
        onMoveTerrainPointDrag={moveTerrainPointDrag}
        preview={preview}
        previewPoints={previewPoints}
        routeDistanceKm={routeDistanceKm}
        sortedPoints={sortedPoints}
      />

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
