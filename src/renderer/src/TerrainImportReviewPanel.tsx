import type {
  CsvTerrainDistanceUnit,
  TerrainProfileImport,
  TerrainProfileMappingRequest
} from '../../shared/simulator';
import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';
import {
  delimiterLabel,
  demDiagnosticLabel,
  distanceUnitLabel,
  isDemProfile,
  isGeoJsonProfile,
  numberFormatter,
  sourceDistanceLabel,
  sourceRecordCount,
  sourceRecordLabel
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
  return (
    <>
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
                onChange={(event) => onMappingDistanceIndexChange(Number(event.currentTarget.value))}
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
                onChange={(event) => onMappingDistanceUnitChange(event.currentTarget.value as CsvTerrainDistanceUnit)}
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
                onChange={(event) => onMappingElevationIndexChange(Number(event.currentTarget.value))}
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
            <button type="button" onClick={() => onCancelMapping()}>Vazgeç</button>
            <button className="apply" disabled={isImporting} type="button" onClick={() => void onApplyColumnMapping()}>
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
              <span>Dosyadaki noktalar mevcut {currentPointCount} ara noktanın yerine geçecek.</span>
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
                    onApplyRouteCoordinatesChange(checked);
                    if (checked) onApplyRouteDistanceChange(false);
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
                  onChange={(event) => onApplyRouteDistanceChange(event.currentTarget.checked)}
                />
                <span>Deney mesafesini dosyadaki rotaya ayarla: <b>{numberFormatter.format(pendingSourceDistanceKm)} km</b></span>
              </label>
            )}
            <label title="İşaretlenirse üst bölümdeki Gözlemci zemin kotu bu değerle değiştirilir">
              <input
                checked={applyObserverEndpoint}
                type="checkbox"
                onChange={(event) => onApplyObserverEndpointChange(event.currentTarget.checked)}
              />
              <span>Başlangıç zemin yüksekliğini dosyadan al: <b>{numberFormatter.format(pendingImport.observerEndpointElevationM)} m</b></span>
            </label>
            <label title="İşaretlenirse üst bölümdeki Hedef taban kotu bu değerle değiştirilir">
              <input
                checked={applyTargetEndpoint}
                type="checkbox"
                onChange={(event) => onApplyTargetEndpointChange(event.currentTarget.checked)}
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
            <button type="button" onClick={() => onCancelImport()}>Vazgeç</button>
            <button className="apply" type="button" onClick={onApplyTerrainProfile}>Arazi profilini uygula</button>
          </div>
        </div>
      )}
    </>
  );
}
