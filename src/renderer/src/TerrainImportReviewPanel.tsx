import type {
  CsvTerrainDistanceUnit,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import {
  delimiterLabel,
  demDiagnosticLabel,
  distanceUnitLabel,
  isDemProfile,
  isGeoJsonProfile,
  sourceDistanceLabel,
  sourceRecordCount,
  sourceRecordLabel,
  terrainNumberFormatter
} from './terrain-editor-view-model';

export function TerrainImportReviewPanel({
  mappingRequest,
  mappingDistanceIndex,
  mappingElevationIndex,
  mappingDistanceUnit,
  isImporting,
  pendingImport,
  currentPointCount,
  pendingSourceDistanceKm,
  allowRouteDistanceImport,
  applyObserverEndpoint,
  applyTargetEndpoint,
  applyRouteDistance,
  applyRouteCoordinates,
  observerGroundElevationM,
  targetGroundElevationM,
  observerHeightM,
  targetHeightM,
  verticalDatumOffsetM,
  useStandardRefraction,
  refractionCoefficient,
  onMappingDistanceIndexChange,
  onMappingElevationIndexChange,
  onMappingDistanceUnitChange,
  onCancelMapping,
  onApplyColumnMapping,
  onApplyObserverEndpointChange,
  onApplyTargetEndpointChange,
  onApplyRouteDistanceChange,
  onApplyRouteCoordinatesChange,
  onCancelImport,
  onApplyTerrainProfile
}: {
  mappingRequest?: TerrainProfileMappingRequest;
  mappingDistanceIndex: number;
  mappingElevationIndex: number;
  mappingDistanceUnit: CsvTerrainDistanceUnit;
  isImporting: boolean;
  pendingImport?: TerrainProfileImport;
  currentPointCount: number;
  pendingSourceDistanceKm: number | null;
  allowRouteDistanceImport: boolean;
  applyObserverEndpoint: boolean;
  applyTargetEndpoint: boolean;
  applyRouteDistance: boolean;
  applyRouteCoordinates: boolean;
  observerGroundElevationM: number;
  targetGroundElevationM: number;
  observerHeightM: number;
  targetHeightM: number;
  verticalDatumOffsetM: number;
  useStandardRefraction: boolean;
  refractionCoefficient: number;
  onMappingDistanceIndexChange(value: number): void;
  onMappingElevationIndexChange(value: number): void;
  onMappingDistanceUnitChange(value: CsvTerrainDistanceUnit): void;
  onCancelMapping(): void;
  onApplyColumnMapping(): Promise<void>;
  onApplyObserverEndpointChange(value: boolean): void;
  onApplyTargetEndpointChange(value: boolean): void;
  onApplyRouteDistanceChange(value: boolean): void;
  onApplyRouteCoordinatesChange(value: boolean): void;
  onCancelImport(): void;
  onApplyTerrainProfile(): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = terrainNumberFormatter(locale);
  const coordinateFormatter = new Intl.NumberFormat(appLocaleTag(locale), {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
    useGrouping: false
  });
  const cellSizeFormatter = new Intl.NumberFormat(appLocaleTag(locale), {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
    useGrouping: false
  });
  const columnFallback = (index: number): string => t('terrain.import.columnFallback', {
    index: index + 1
  });

  return (
    <>
      {mappingRequest && (
        <div className="terrain-mapping-review">
          <div className="terrain-import-review-heading">
            <div>
              <strong>{mappingRequest.fileName}</strong>
              <span>{mappingRequest.reason}</span>
            </div>
            <span className="terrain-mapping-required">{t('terrain.import.mappingRequired')}</span>
          </div>
          <p className="terrain-plain-guide">{t('terrain.import.mappingGuide')}</p>
          <div className="terrain-mapping-controls">
            <label title={t('terrain.import.distanceColumnTitle')}>
              <span>{t('terrain.import.distanceColumn')}</span>
              <select
                value={mappingDistanceIndex}
                onChange={(event) => onMappingDistanceIndexChange(Number(event.currentTarget.value))}
              >
                {mappingRequest.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || columnFallback(index)}
                  </option>
                ))}
              </select>
            </label>
            <label title={t('terrain.import.positionUnitTitle')}>
              <span>{t('terrain.import.positionUnit')}</span>
              <select
                value={mappingDistanceUnit}
                onChange={(event) => onMappingDistanceUnitChange(
                  event.currentTarget.value as CsvTerrainDistanceUnit
                )}
              >
                <option value="m">{t('terrain.import.unit.m')}</option>
                <option value="km">{t('terrain.import.unit.km')}</option>
                <option value="percent">{t('terrain.import.unit.percent')}</option>
              </select>
            </label>
            <label title={t('terrain.import.elevationColumnTitle')}>
              <span>{t('terrain.import.elevationColumn')}</span>
              <select
                value={mappingElevationIndex}
                onChange={(event) => onMappingElevationIndexChange(
                  Number(event.currentTarget.value)
                )}
              >
                {mappingRequest.headers.map((header, index) => (
                  <option key={`${header}-${index}`} value={index}>
                    {header || columnFallback(index)}
                  </option>
                ))}
              </select>
            </label>
            <div
              className="terrain-mapping-delimiter"
              title={t('terrain.import.delimiterTitle')}
            >
              <span>{t('terrain.import.delimiter')}</span>
              <strong>{delimiterLabel(locale, mappingRequest)}</strong>
            </div>
          </div>
          <div className="terrain-mapping-preview-wrap">
            <table className="terrain-mapping-preview">
              <thead>
                <tr>
                  {mappingRequest.headers.map((header, index) => (
                    <th key={`${header}-${index}`}>{header || columnFallback(index)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappingRequest.previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {mappingRequest.headers.map((_header, index) => (
                      <td key={index}>{row[index] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="terrain-import-actions">
            <button type="button" onClick={() => onCancelMapping()}>
              {t('terrain.import.cancel')}
            </button>
            <button
              className="apply"
              disabled={isImporting}
              type="button"
              onClick={() => void onApplyColumnMapping()}
            >
              {isImporting
                ? t('terrain.import.checking')
                : t('terrain.import.checkSelections')}
            </button>
          </div>
        </div>
      )}

      {pendingImport && (
        <div className="terrain-import-review">
          <div className="terrain-import-review-heading">
            <div>
              <strong>{pendingImport.fileName}</strong>
              <span>{t('terrain.import.replacesPoints', { count: currentPointCount })}</span>
            </div>
            <span className="terrain-import-ready">{t('terrain.import.ready')}</span>
          </div>
          <p className="terrain-plain-guide">{t('terrain.import.guide')}</p>
          <div className="terrain-import-metrics">
            <div>
              <small>{sourceRecordLabel(locale, pendingImport)}</small>
              <strong>{numberFormatter.format(sourceRecordCount(pendingImport))}</strong>
            </div>
            <div>
              <small>{t('terrain.import.usedIntermediatePoints')}</small>
              <strong>{numberFormatter.format(pendingImport.points.length)}</strong>
            </div>
            <div>
              <small>{t('terrain.import.positionUnits')}</small>
              <strong>{distanceUnitLabel(locale, pendingImport)}</strong>
            </div>
            <div>
              <small>{t('terrain.import.totalRoute')}</small>
              <strong>{sourceDistanceLabel(locale, pendingImport)}</strong>
            </div>
            <div>
              <small>{t('terrain.import.endpointElevations')}</small>
              <strong>
                {numberFormatter.format(pendingImport.observerEndpointElevationM)} →{' '}
                {numberFormatter.format(pendingImport.targetEndpointElevationM)} m
              </strong>
            </div>
          </div>

          {isDemProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>
                {t('terrain.import.dem.grid')}: <b>{t('terrain.import.dem.cells', {
                  columns: pendingImport.columnCount,
                  rows: pendingImport.rowCount
                })}</b>
              </span>
              <span>
                {t('terrain.import.dem.cellSize')}: <b>
                  {cellSizeFormatter.format(pendingImport.cellSizeDeg)}°
                </b>
              </span>
              <span>
                {t('terrain.import.dem.sampling')}: <b>
                  {pendingImport.samplingMethod === 'bilinear'
                    ? t('terrain.import.dem.bilinear')
                    : t('terrain.import.dem.nearest')}
                </b>
              </span>
              <span>
                {t('terrain.import.dem.sampleCountMode')}: <b>
                  {pendingImport.sampleCountMode === 'manual'
                    ? t('terrain.import.dem.manual')
                    : t('terrain.import.dem.automatic')}
                </b>
              </span>
              <span>
                {t('terrain.import.dem.sampleSpacing')}: <b>
                  {numberFormatter.format(pendingImport.sampleSpacingM)} m
                </b>
              </span>
              <span>
                {t('terrain.import.dem.geodesic')}: <b>
                  {pendingImport.geodesicMethod === 'vincenty'
                    ? 'WGS84 Vincenty'
                    : t('terrain.import.dem.sphericalFallback')}
                </b>
              </span>
              <span>
                {t('terrain.import.dem.diagnostic')}: <b>
                  {demDiagnosticLabel(locale, pendingImport.diagnosticStatus)}
                </b>
              </span>
              <span>
                {t('terrain.import.dem.effectiveCellSpan')}: <b>
                  {numberFormatter.format(pendingImport.effectiveCellSpanM)} m
                </b>
              </span>
              <span>
                {t('terrain.import.dem.sampleCellRatio')}: <b>
                  {numberFormatter.format(pendingImport.sampleSpacingToCellRatio)}
                </b>
              </span>
              <span>
                {t('terrain.import.dem.nearestGridEdge')}: <b>
                  {numberFormatter.format(pendingImport.minimumCoverageMarginM)} m (
                  {numberFormatter.format(pendingImport.coverageMarginCellRatio)}{' '}
                  {t('terrain.import.dem.cellCountSuffix')})
                </b>
              </span>
              <span>
                {t('terrain.import.dem.elevationRange')}: <b>
                  {numberFormatter.format(pendingImport.minimumElevationM)} →{' '}
                  {numberFormatter.format(pendingImport.maximumElevationM)} m (Δ{' '}
                  {numberFormatter.format(pendingImport.elevationRangeM)} m)
                </b>
              </span>
            </div>
          ) : isGeoJsonProfile(pendingImport) ? (
            <div className="terrain-import-columns">
              <span>
                {t('terrain.import.geojson.geometry')}: <b>{pendingImport.geometryType}</b>
              </span>
              <span>
                {t('terrain.import.geojson.elevationSource')}: <b>
                  {t('terrain.import.geojson.elevationSourceValue')}
                </b>
              </span>
              <span>
                {t('terrain.import.geojson.start')}: <b>
                  {coordinateFormatter.format(pendingImport.startLatitudeDeg)}°,{' '}
                  {coordinateFormatter.format(pendingImport.startLongitudeDeg)}°
                </b>
              </span>
              <span>
                {t('terrain.import.geojson.end')}: <b>
                  {coordinateFormatter.format(pendingImport.endLatitudeDeg)}°,{' '}
                  {coordinateFormatter.format(pendingImport.endLongitudeDeg)}°
                </b>
              </span>
            </div>
          ) : (
            <div className="terrain-import-columns">
              <span>
                {t('terrain.import.csv.distanceColumn')}: <b>
                  {pendingImport.distanceColumnHeader}
                </b>
              </span>
              <span>
                {t('terrain.import.csv.elevationColumn')}: <b>
                  {pendingImport.elevationColumnHeader}
                </b>
              </span>
            </div>
          )}

          <div className="terrain-endpoint-options">
            {isGeoJsonProfile(pendingImport) && (
              <label title={t('terrain.import.geojson.applyCoordinatesTitle')}>
                <input
                  checked={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    onApplyRouteCoordinatesChange(checked);
                    if (checked) onApplyRouteDistanceChange(false);
                  }}
                />
                <span>
                  {t('terrain.import.geojson.applyCoordinates')}
                  <b>
                    {' '}{coordinateFormatter.format(pendingImport.startLatitudeDeg)}°,{' '}
                    {coordinateFormatter.format(pendingImport.startLongitudeDeg)}° →{' '}
                    {coordinateFormatter.format(pendingImport.endLatitudeDeg)}°,{' '}
                    {coordinateFormatter.format(pendingImport.endLongitudeDeg)}°
                  </b>
                </span>
              </label>
            )}

            {allowRouteDistanceImport && pendingSourceDistanceKm !== null && (
              <label title={t('terrain.import.applyRouteTitle')}>
                <input
                  checked={applyRouteDistance}
                  disabled={applyRouteCoordinates}
                  type="checkbox"
                  onChange={(event) => onApplyRouteDistanceChange(event.currentTarget.checked)}
                />
                <span>
                  {t('terrain.import.applyRoute')}{' '}
                  <b>{numberFormatter.format(pendingSourceDistanceKm)} km</b>
                </span>
              </label>
            )}

            <label title={t('terrain.import.applyObserverTitle')}>
              <input
                checked={applyObserverEndpoint}
                type="checkbox"
                onChange={(event) => onApplyObserverEndpointChange(event.currentTarget.checked)}
              />
              <span>
                {t('terrain.import.applyObserver')}{' '}
                <b>{numberFormatter.format(pendingImport.observerEndpointElevationM)} m</b>
              </span>
            </label>

            <label title={t('terrain.import.applyTargetTitle')}>
              <input
                checked={applyTargetEndpoint}
                type="checkbox"
                onChange={(event) => onApplyTargetEndpointChange(event.currentTarget.checked)}
              />
              <span>
                {t('terrain.import.applyTarget')}{' '}
                <b>{numberFormatter.format(pendingImport.targetEndpointElevationM)} m</b>
              </span>
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
            <button type="button" onClick={() => onCancelImport()}>
              {t('terrain.import.cancel')}
            </button>
            <button className="apply" type="button" onClick={onApplyTerrainProfile}>
              {t('terrain.import.applyProfile')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
