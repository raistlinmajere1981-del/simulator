import type {
  CsvTerrainDelimiter,
  CsvTerrainDistanceUnit,
  SavedExperiment,
  TerrainProfileSource
} from '../shared/simulator';
import type { VerticalDatumKind } from '../shared/terrain';
import type { UiLocale } from '../shared/ui-locale';
import { PORTABLE_EXPERIMENT_SCHEMA_VERSION } from '../shared/portable';
import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints
} from '../simulation/manual-terrain-profile';
import {
  escapeHtml,
  formatCoordinate,
  formatDate,
  formatDegree,
  formatInputNumber,
  formatPercent,
  yesNo
} from './report-core';

function tx(locale: UiLocale, tr: string, en: string): string {
  return locale === 'en' ? en : tr;
}

function datumLabel(kind: VerticalDatumKind, locale: UiLocale): string {
  const labels: Record<VerticalDatumKind, [string, string]> = {
    'orthometric-msl': ['Ortalama deniz seviyesi', 'Mean sea level'],
    'ellipsoidal-wgs84': ['WGS84 elipsoidal yükseklik', 'WGS84 ellipsoidal height'],
    local: ['Yerel düşey referans', 'Local vertical reference']
  };
  const [tr, en] = labels[kind];
  return tx(locale, tr, en);
}

function delimiterLabel(kind: CsvTerrainDelimiter, locale: UiLocale): string {
  const labels: Record<CsvTerrainDelimiter, [string, string]> = {
    comma: ['Virgül', 'Comma'],
    semicolon: ['Noktalı virgül', 'Semicolon'],
    tab: ['Sekme', 'Tab']
  };
  const [tr, en] = labels[kind];
  return tx(locale, tr, en);
}

function distanceUnitLabel(kind: CsvTerrainDistanceUnit, locale: UiLocale): string {
  const labels: Record<CsvTerrainDistanceUnit, [string, string]> = {
    percent: ['Rota yüzdesi', 'Route percentage'],
    m: ['Metre', 'Metres'],
    km: ['Kilometre', 'Kilometres']
  };
  const [tr, en] = labels[kind];
  return tx(locale, tr, en);
}

export function geodesicSection(
  experiment: SavedExperiment,
  locale: UiLocale = 'tr'
): string {
  const geodesic = experiment.geodesic;
  if (experiment.inputs.distanceSource !== 'coordinates') return '';
  if (!geodesic) {
    return `
      <section class="model-section">
        <header class="model-heading"><div><h2>${tx(locale, 'WGS84 Jeodezik Çözüm', 'WGS84 Geodesic Solution')}</h2><span>${tx(locale, 'Kayıt anlık görüntüsü yok', 'No saved snapshot')}</span></div><strong class="status status-indeterminate">${tx(locale, 'Hesap verisi bulunamadı', 'Calculation data unavailable')}</strong></header>
        <p>${tx(
          locale,
          'Koordinatlar kaydedilmiş olsa da bu eski kayıtta jeodezik hesap anlık görüntüsü bulunmuyor.',
          'Although coordinates were saved, this legacy record does not contain a geodesic calculation snapshot.'
        )}</p>
      </section>`;
  }

  return `
    <section class="model-section geodesic-section">
      <header class="model-heading">
        <div><h2>${tx(locale, 'WGS84 Jeodezik Çözüm', 'WGS84 Geodesic Solution')}</h2><span>${tx(locale, 'Sürüm', 'Version')} ${escapeHtml(experiment.modelVersions['wgs84-geodesic'] ?? '0.1.0')}</span></div>
        <strong class="status ${geodesic.converged ? 'status-compatible' : 'status-indeterminate'}">${geodesic.method === 'vincenty' ? tx(locale, 'Vincenty yakınsadı', 'Vincenty converged') : tx(locale, 'Küresel yedek çözüm', 'Spherical fallback solution')}</strong>
      </header>
      <p>${escapeHtml(geodesic.trace.summary)}</p>
      <div class="two-column">
        <div>
          <h3>${tx(locale, 'Koordinatlar ve sonuç', 'Coordinates and result')}</h3>
          <table><tbody>
            <tr><td>${tx(locale, 'Gözlemci koordinatı', 'Observer coordinates')}</td><td>${formatCoordinate(experiment.inputs.observerLatitudeDeg, locale)}°, ${formatCoordinate(experiment.inputs.observerLongitudeDeg, locale)}°</td></tr>
            <tr><td>${tx(locale, 'Hedef koordinatı', 'Target coordinates')}</td><td>${formatCoordinate(experiment.inputs.targetLatitudeDeg, locale)}°, ${formatCoordinate(experiment.inputs.targetLongitudeDeg, locale)}°</td></tr>
            <tr><td>${tx(locale, 'Elipsoidal yüzey mesafesi', 'Ellipsoidal surface distance')}</td><td>${formatInputNumber(geodesic.distanceM / 1_000, locale)} km</td></tr>
            <tr><td>${tx(locale, 'Başlangıç azimutu', 'Initial bearing')}</td><td>${formatDegree(geodesic.initialBearingDeg, locale)}°</td></tr>
            <tr><td>${tx(locale, 'Varış azimutu', 'Final bearing')}</td><td>${formatDegree(geodesic.finalBearingDeg, locale)}°</td></tr>
            <tr><td>${tx(locale, 'İterasyon', 'Iterations')}</td><td>${geodesic.iterations}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>${tx(locale, 'Varsayımlar', 'Assumptions')}</h3>
          <ul>${geodesic.trace.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ${geodesic.warnings.length > 0 ? `<h3>${tx(locale, 'Uyarılar', 'Warnings')}</h3><ul class="warnings">${geodesic.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <h3>${tx(locale, 'Jeodezik hesap izi', 'Geodesic calculation trace')}</h3>
      <div class="trace-list">${geodesic.trace.steps.length === 0 ? `<p class="muted">${tx(locale, 'Hesap adımı bulunmuyor.', 'No calculation steps are available.')}</p>` : geodesic.trace.steps.map((step, index) => `
        <article class="trace-step">
          <div class="trace-number">${index + 1}</div>
          <div>
            <h4>${escapeHtml(step.title)}</h4>
            <code>${escapeHtml(step.formula)}</code>
            <p><strong>${tx(locale, 'Yerine koyma', 'Substitution')}:</strong> ${escapeHtml(step.substitution)}</p>
            <p class="trace-result">${escapeHtml(step.result)}</p>
            ${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}
          </div>
        </article>`).join('')}</div>
      <p class="trace-id">${tx(locale, 'İz kimliği', 'Trace id')}: ${escapeHtml(geodesic.traceId)}</p>
    </section>`;
}

function terrainSourceSection(
  source: TerrainProfileSource | undefined,
  locale: UiLocale
): string {
  if (!source) {
    return `<p class="muted">${tx(
      locale,
      'Bu deneyde kayıtlı bir dış profil kaynağı bulunmuyor; profil manuel veya eski şemadan taşınmış olabilir.',
      'No external profile source is stored with this experiment; the profile may be manual or migrated from a legacy schema.'
    )}</p>`;
  }

  const sourceRoute = source.sourceDistanceM === null
    ? tx(locale, 'Yüzde tabanlı profil', 'Percentage-based profile')
    : `${formatInputNumber(source.sourceDistanceM / 1_000, locale)} km`;
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? tx(locale, 'İçe aktarımdan sonra düzenlendi', 'Modified after import')
    : tx(locale, 'Kayıt, içe aktarılan kaynakla eşleşiyor', 'Record matches imported source');
  const integrityRows = source.fileSizeBytes !== undefined && source.sha256 !== undefined
    ? `
    <tr><td>${tx(locale, 'Kaynak dosya boyutu', 'Source file size')}</td><td>${formatInputNumber(source.fileSizeBytes, locale)} ${tx(locale, 'bayt', 'bytes')}</td></tr>
    <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>`
    : `<tr><td>${tx(locale, 'Dosya bütünlüğü', 'File integrity')}</td><td>${tx(locale, 'Bu eski kayıtta boyut ve SHA-256 özeti bulunmuyor.', 'This legacy record does not contain file size or a SHA-256 digest.')}</td></tr>`;
  const commonRows = `
    <tr><td>${tx(locale, 'Dosya adı', 'File name')}</td><td>${escapeHtml(source.fileName)}</td></tr>
    <tr><td>${tx(locale, 'İçe aktarma zamanı', 'Imported at')}</td><td>${formatDate(source.importedAtIso, locale)}</td></tr>
    ${integrityRows}
    <tr><td>${tx(locale, 'Kaynak rota', 'Source route')}</td><td>${sourceRoute} · ${tx(locale, 'Deney mesafesine uygulandı', 'Applied to experiment distance')}: ${yesNo(source.appliedRouteDistance === true, locale)}</td></tr>
    <tr><td>${tx(locale, 'Kaynak başlangıç yüksekliği', 'Source start elevation')}</td><td>${formatInputNumber(source.observerEndpointElevationM, locale)} m · ${tx(locale, 'Deneye uygulandı', 'Applied to experiment')}: ${yesNo(source.appliedObserverEndpoint, locale)}</td></tr>
    <tr><td>${tx(locale, 'Kaynak bitiş yüksekliği', 'Source end elevation')}</td><td>${formatInputNumber(source.targetEndpointElevationM, locale)} m · ${tx(locale, 'Deneye uygulandı', 'Applied to experiment')}: ${yesNo(source.appliedTargetEndpoint, locale)}</td></tr>`;

  const detailRows = source.kind === 'csv' ? `
    <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>CSV / TSV</td></tr>
    <tr><td>${tx(locale, 'Ayırıcı', 'Delimiter')}</td><td>${escapeHtml(delimiterLabel(source.delimiter, locale))}</td></tr>
    <tr><td>${tx(locale, 'Mesafe birimi', 'Distance unit')}</td><td>${escapeHtml(distanceUnitLabel(source.distanceUnit, locale))}</td></tr>
    <tr><td>${tx(locale, 'Kaynak satır sayısı', 'Source row count')}</td><td>${source.rowCount}</td></tr>
    <tr><td>${tx(locale, 'Mesafe sütunu', 'Distance column')}</td><td>${escapeHtml(source.distanceColumnHeader)}</td></tr>
    <tr><td>${tx(locale, 'Yükseklik sütunu', 'Elevation column')}</td><td>${escapeHtml(source.elevationColumnHeader)}</td></tr>` : source.kind === 'geojson' ? `
    <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>GeoJSON</td></tr>
    <tr><td>${tx(locale, 'Geometri', 'Geometry')}</td><td>${escapeHtml(source.geometryType)}</td></tr>
    <tr><td>${tx(locale, 'Koordinat sayısı', 'Coordinate count')}</td><td>${source.coordinateCount}</td></tr>
    <tr><td>${tx(locale, 'Koordinat referansı', 'Coordinate reference')}</td><td>${tx(locale, 'WGS84 boylam / enlem', 'WGS84 longitude / latitude')}</td></tr>
    <tr><td>${tx(locale, 'Yükseklik kaynağı', 'Elevation source')}</td><td>${tx(locale, 'Koordinatların üçüncü bileşeni (Z)', 'Third coordinate component (Z)')}</td></tr>
    <tr><td>${tx(locale, 'Başlangıç koordinatı', 'Start coordinate')}</td><td>${formatCoordinate(source.startLatitudeDeg, locale)}°, ${formatCoordinate(source.startLongitudeDeg, locale)}°</td></tr>
    <tr><td>${tx(locale, 'Bitiş koordinatı', 'End coordinate')}</td><td>${formatCoordinate(source.endLatitudeDeg, locale)}°, ${formatCoordinate(source.endLongitudeDeg, locale)}°</td></tr>
    <tr><td>${tx(locale, 'Rota koordinatları', 'Route coordinates')}</td><td>${tx(locale, 'Deneye uygulandı', 'Applied to experiment')}: ${yesNo(source.appliedRouteCoordinates === true, locale)}</td></tr>` : `
    <tr><td>${tx(locale, 'Kaynak türü', 'Source type')}</td><td>ESRI ASCII DEM</td></tr>
    <tr><td>${tx(locale, 'Grid boyutu', 'Grid size')}</td><td>${source.columnCount} × ${source.rowCount} ${tx(locale, 'hücre', 'cells')}</td></tr>
    <tr><td>${tx(locale, 'Hücre boyutu', 'Cell size')}</td><td>${formatCoordinate(source.cellSizeDeg, locale)}°</td></tr>
    <tr><td>${tx(locale, 'Rota örneği', 'Route sampling')}</td><td>${source.sampleCount} ${tx(locale, 'nokta', 'points')} · ${formatInputNumber(source.sampleSpacingM, locale)} m ${tx(locale, 'aralık', 'spacing')}</td></tr>
    <tr><td>${tx(locale, 'Örnek sayısı modu', 'Sample-count mode')}</td><td>${source.sampleCountMode === 'manual' ? tx(locale, 'Manuel', 'Manual') : tx(locale, 'Grid çözünürlüğüne göre otomatik', 'Automatic from grid resolution')}</td></tr>
    <tr><td>${tx(locale, 'Örnekleme', 'Sampling')}</td><td>${source.samplingMethod === 'bilinear' ? tx(locale, 'İki doğrusal', 'Bilinear') : tx(locale, 'En yakın hücre', 'Nearest cell')}</td></tr>
    <tr><td>${tx(locale, 'Jeodezik yöntem', 'Geodesic method')}</td><td>${source.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : tx(locale, 'Küresel yedek', 'Spherical fallback')}</td></tr>
    ${source.diagnosticStatus ? `
    <tr><td>${tx(locale, 'Örnekleme tanısı', 'Sampling diagnostic')}</td><td>${source.diagnosticStatus === 'good' ? tx(locale, 'İyi', 'Good') : source.diagnosticStatus === 'caution' ? tx(locale, 'Dikkat', 'Caution') : tx(locale, 'Sınırlı', 'Limited')}</td></tr>
    <tr><td>${tx(locale, 'Etkili hücre genişliği', 'Effective cell span')}</td><td>${formatInputNumber(source.effectiveCellSpanM ?? 0, locale)} m</td></tr>
    <tr><td>${tx(locale, 'Örnek / hücre oranı', 'Sample / cell ratio')}</td><td>${formatInputNumber(source.sampleSpacingToCellRatio ?? 0, locale)}</td></tr>
    <tr><td>${tx(locale, 'En yakın grid kenarı', 'Nearest grid edge')}</td><td>${formatInputNumber(source.minimumCoverageMarginM ?? 0, locale)} m · ${formatInputNumber(source.coverageMarginCellRatio ?? 0, locale)} ${tx(locale, 'hücre', 'cells')}</td></tr>
    <tr><td>${tx(locale, 'DEM yükseklik aralığı', 'DEM elevation range')}</td><td>${formatInputNumber(source.minimumElevationM ?? 0, locale)} → ${formatInputNumber(source.maximumElevationM ?? 0, locale)} m · Δ ${formatInputNumber(source.elevationRangeM ?? 0, locale)} m</td></tr>` : `
    <tr><td>${tx(locale, 'Örnekleme tanısı', 'Sampling diagnostic')}</td><td>${tx(locale, 'Bu eski kayıtta tanı ölçümleri bulunmuyor.', 'This legacy record does not contain diagnostic measurements.')}</td></tr>`}`;

  return `
    <div class="source-card ${stateClass}">
      <div class="source-card-heading">
        <strong>${source.kind === 'csv' ? tx(locale, 'CSV / TSV kaynak kaydı', 'CSV / TSV source record') : source.kind === 'geojson' ? tx(locale, 'GeoJSON kaynak kaydı', 'GeoJSON source record') : tx(locale, 'ESRI ASCII DEM kaynak kaydı', 'ESRI ASCII DEM source record')}</strong>
        <span>${escapeHtml(stateLabel)}</span>
      </div>
      <table><tbody>${commonRows}${detailRows}</tbody></table>
    </div>`;
}

export function verticalTerrainSection(
  experiment: SavedExperiment,
  effectiveDistanceKm: number,
  locale: UiLocale = 'tr'
): string {
  const inputs = experiment.inputs;
  const offset = inputs.verticalDatumOffsetM;
  const observerEyeElevationM =
    inputs.observerGroundElevationM + offset + inputs.observerHeightM;
  const targetTopElevationM =
    inputs.targetGroundElevationM + offset + inputs.targetHeightM;
  const terrainEnabled = inputs.terrainMode !== 'off';
  const manualPoints = sortManualTerrainPoints(
    experiment.manualTerrainPoints ?? migrateLegacyManualTerrainPoint(
      inputs.terrainIntermediateDistancePercent,
      inputs.terrainIntermediateElevationM
    )
  );
  const interiorRows = manualPoints.map((point, index) => `
    <tr>
      <td>${tx(locale, 'Ara nokta', 'Point')} ${index + 1}</td>
      <td>${formatPercent(point.distancePercent, locale)}</td>
      <td>${formatInputNumber(effectiveDistanceKm * point.distancePercent / 100, locale)} km</td>
      <td>${formatInputNumber(point.elevationM, locale)} m</td>
    </tr>`).join('');
  const terrainRows = terrainEnabled ? `
    <tr><td>${tx(locale, 'Gözlemci ucu', 'Observer endpoint')}</td><td>${formatPercent(0, locale)}</td><td>0 km</td><td>${formatInputNumber(inputs.observerGroundElevationM, locale)} m</td></tr>
    ${interiorRows}
    <tr><td>${tx(locale, 'Hedef ucu', 'Target endpoint')}</td><td>${formatPercent(100, locale)}</td><td>${formatInputNumber(effectiveDistanceKm, locale)} km</td><td>${formatInputNumber(inputs.targetGroundElevationM, locale)} m</td></tr>` : `
    <tr><td colspan="4">${tx(locale, 'Arazi profili kapalı; yalnızca gözlemci ve hedef zemin kotları kullanıldı.', 'Terrain profile is off; only observer and target ground elevations were used.')}</td></tr>`;

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>${tx(locale, 'Düşey Referans ve Arazi', 'Vertical Reference and Terrain')}</h2><span>${tx(locale, 'Taşınabilir deney şeması', 'Portable experiment schema')} v${PORTABLE_EXPERIMENT_SCHEMA_VERSION}</span></div>
        <strong class="status ${terrainEnabled ? 'status-compatible' : 'status-indeterminate'}">${terrainEnabled ? `${manualPoints.length} ${tx(locale, 'ara noktalı manuel profil', 'point manual profile')}` : tx(locale, 'Profil kapalı', 'Profile off')}</strong>
      </header>
      <p>${tx(
        locale,
        'Kotlar ortak bir düşey datumda tutulur. Datum ofseti bütün zemin ve arazi örneklerine aynı yönde uygulanır.',
        'Elevations use a common vertical datum. The datum offset is applied in the same direction to all ground and terrain samples.'
      )}</p>
      <div class="two-column">
        <div>
          <h3>${tx(locale, 'Düşey tanım', 'Vertical definition')}</h3>
          <table><tbody>
            <tr><td>Datum</td><td>${escapeHtml(datumLabel(inputs.verticalDatumKind, locale))}</td></tr>
            <tr><td>${tx(locale, 'Datum / gelgit ofseti', 'Datum / tide offset')}</td><td>${formatInputNumber(offset, locale)} m</td></tr>
            <tr><td>${tx(locale, 'Gözlemci zemin kotu', 'Observer ground elevation')}</td><td>${formatInputNumber(inputs.observerGroundElevationM, locale)} m</td></tr>
            <tr><td>${tx(locale, 'Gözlemci mutlak göz kotu', 'Observer absolute eye elevation')}</td><td>${formatInputNumber(observerEyeElevationM, locale)} m</td></tr>
            <tr><td>${tx(locale, 'Hedef taban kotu', 'Target base elevation')}</td><td>${formatInputNumber(inputs.targetGroundElevationM, locale)} m</td></tr>
            <tr><td>${tx(locale, 'Hedef tepe kotu', 'Target top elevation')}</td><td>${formatInputNumber(targetTopElevationM, locale)} m</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>${tx(locale, 'Profil örnekleri', 'Profile samples')}</h3>
          <table><thead><tr><th>${tx(locale, 'Nokta', 'Point')}</th><th>${tx(locale, 'Rota', 'Route')}</th><th>${tx(locale, 'Mesafe', 'Distance')}</th><th>${tx(locale, 'Ham kot', 'Raw elevation')}</th></tr></thead><tbody>${terrainRows}</tbody></table>
          <p class="muted">${tx(
            locale,
            'Manuel ara noktalar rota yüzdesiyle saklanır; raporda kayıt anındaki gerçek rota mesafesine dönüştürülür. Uç kotları gözlemci ve hedeften otomatik türetilir.',
            'Manual interior points are stored as route percentages; the report converts them using the actual route distance saved with the record. Endpoint elevations are derived automatically from observer and target values.'
          )}</p>
        </div>
      </div>
      <h3>${tx(locale, 'Profil kaynağı ve provenans', 'Profile source and provenance')}</h3>
      ${terrainSourceSection(experiment.terrainProfileSource, locale)}
    </section>`;
}
