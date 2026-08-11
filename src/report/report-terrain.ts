import type {
  CsvTerrainDelimiter,
  CsvTerrainDistanceUnit,
  SavedExperiment,
  TerrainProfileSource
} from '../shared/simulator';
import type { VerticalDatumKind } from '../shared/terrain';
import { PORTABLE_EXPERIMENT_SCHEMA_VERSION } from '../shared/portable';
import {
  migrateLegacyManualTerrainPoint,
  sortManualTerrainPoints
} from '../simulation/manual-terrain-profile';
import {
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  metricNumberFormatters,
  yesNo
} from './report-core';

const datumLabels: Record<VerticalDatumKind, string> = {
  'orthometric-msl': 'Ortalama deniz seviyesi',
  'ellipsoidal-wgs84': 'WGS84 elipsoidal yükseklik',
  local: 'Yerel düşey referans'
};

const delimiterLabels: Record<CsvTerrainDelimiter, string> = {
  comma: 'Virgül',
  semicolon: 'Noktalı virgül',
  tab: 'Sekme'
};

const distanceUnitLabels: Record<CsvTerrainDistanceUnit, string> = {
  percent: 'Rota yüzdesi',
  m: 'Metre',
  km: 'Kilometre'
};

export function geodesicSection(experiment: SavedExperiment): string {
  const geodesic = experiment.geodesic;
  if (experiment.inputs.distanceSource !== 'coordinates') return '';
  if (!geodesic) {
    return `
      <section class="model-section">
        <header class="model-heading"><div><h2>WGS84 Jeodezik Çözüm</h2><span>Kayıt anlık görüntüsü yok</span></div><strong class="status status-indeterminate">Hesap verisi bulunamadı</strong></header>
        <p>Koordinatlar kaydedilmiş olsa da bu eski kayıtta jeodezik hesap anlık görüntüsü bulunmuyor.</p>
      </section>`;
  }

  return `
    <section class="model-section geodesic-section">
      <header class="model-heading">
        <div><h2>WGS84 Jeodezik Çözüm</h2><span>Sürüm ${escapeHtml(experiment.modelVersions['wgs84-geodesic'] ?? '0.1.0')}</span></div>
        <strong class="status ${geodesic.converged ? 'status-compatible' : 'status-indeterminate'}">${geodesic.method === 'vincenty' ? 'Vincenty yakınsadı' : 'Küresel yedek çözüm'}</strong>
      </header>
      <p>${escapeHtml(geodesic.trace.summary)}</p>
      <div class="two-column">
        <div>
          <h3>Koordinatlar ve sonuç</h3>
          <table><tbody>
            <tr><td>Gözlemci koordinatı</td><td>${coordinateFormatter.format(experiment.inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(experiment.inputs.observerLongitudeDeg)}°</td></tr>
            <tr><td>Hedef koordinatı</td><td>${coordinateFormatter.format(experiment.inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(experiment.inputs.targetLongitudeDeg)}°</td></tr>
            <tr><td>Elipsoidal yüzey mesafesi</td><td>${inputNumberFormatter.format(geodesic.distanceM / 1_000)} km</td></tr>
            <tr><td>Başlangıç azimutu</td><td>${metricNumberFormatters.degree.format(geodesic.initialBearingDeg)}°</td></tr>
            <tr><td>Varış azimutu</td><td>${metricNumberFormatters.degree.format(geodesic.finalBearingDeg)}°</td></tr>
            <tr><td>İterasyon</td><td>${geodesic.iterations}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>Varsayımlar</h3>
          <ul>${geodesic.trace.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ${geodesic.warnings.length > 0 ? `<h3>Uyarılar</h3><ul class="warnings">${geodesic.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <h3>Jeodezik hesap izi</h3>
      <div class="trace-list">${geodesic.trace.steps.length === 0 ? '<p class="muted">Hesap adımı bulunmuyor.</p>' : geodesic.trace.steps.map((step, index) => `
        <article class="trace-step">
          <div class="trace-number">${index + 1}</div>
          <div>
            <h4>${escapeHtml(step.title)}</h4>
            <code>${escapeHtml(step.formula)}</code>
            <p><strong>Yerine koyma:</strong> ${escapeHtml(step.substitution)}</p>
            <p class="trace-result">${escapeHtml(step.result)}</p>
            ${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}
          </div>
        </article>`).join('')}</div>
      <p class="trace-id">İz kimliği: ${escapeHtml(geodesic.traceId)}</p>
    </section>`;
}

function terrainSourceSection(source: TerrainProfileSource | undefined): string {
  if (!source) {
    return '<p class="muted">Bu deneyde kayıtlı bir dış profil kaynağı bulunmuyor; profil manuel veya eski şemadan taşınmış olabilir.</p>';
  }

  const sourceRoute = source.sourceDistanceM === null
    ? 'Yüzde tabanlı profil'
    : `${inputNumberFormatter.format(source.sourceDistanceM / 1_000)} km`;
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? 'İçe aktarımdan sonra düzenlendi'
    : 'Kayıt, içe aktarılan kaynakla eşleşiyor';
  const integrityRows = source.fileSizeBytes !== undefined && source.sha256 !== undefined
    ? `
    <tr><td>Kaynak dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
    <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>`
    : '<tr><td>Dosya bütünlüğü</td><td>Bu eski kayıtta boyut ve SHA-256 özeti bulunmuyor.</td></tr>';
  const commonRows = `
    <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
    <tr><td>İçe aktarma zamanı</td><td>${formatDate(source.importedAtIso)}</td></tr>
    ${integrityRows}
    <tr><td>Kaynak rota</td><td>${sourceRoute} · Deney mesafesine uygulandı: ${yesNo(source.appliedRouteDistance === true)}</td></tr>
    <tr><td>Kaynak başlangıç yüksekliği</td><td>${inputNumberFormatter.format(source.observerEndpointElevationM)} m · Deneye uygulandı: ${yesNo(source.appliedObserverEndpoint)}</td></tr>
    <tr><td>Kaynak bitiş yüksekliği</td><td>${inputNumberFormatter.format(source.targetEndpointElevationM)} m · Deneye uygulandı: ${yesNo(source.appliedTargetEndpoint)}</td></tr>`;

  const detailRows = source.kind === 'csv' ? `
    <tr><td>Kaynak türü</td><td>CSV / TSV</td></tr>
    <tr><td>Ayırıcı</td><td>${escapeHtml(delimiterLabels[source.delimiter])}</td></tr>
    <tr><td>Mesafe birimi</td><td>${escapeHtml(distanceUnitLabels[source.distanceUnit])}</td></tr>
    <tr><td>Kaynak satır sayısı</td><td>${source.rowCount}</td></tr>
    <tr><td>Mesafe sütunu</td><td>${escapeHtml(source.distanceColumnHeader)}</td></tr>
    <tr><td>Yükseklik sütunu</td><td>${escapeHtml(source.elevationColumnHeader)}</td></tr>` : source.kind === 'geojson' ? `
    <tr><td>Kaynak türü</td><td>GeoJSON</td></tr>
    <tr><td>Geometri</td><td>${escapeHtml(source.geometryType)}</td></tr>
    <tr><td>Koordinat sayısı</td><td>${source.coordinateCount}</td></tr>
    <tr><td>Koordinat referansı</td><td>WGS84 boylam / enlem</td></tr>
    <tr><td>Yükseklik kaynağı</td><td>Koordinatların üçüncü bileşeni (Z)</td></tr>
    <tr><td>Başlangıç koordinatı</td><td>${coordinateFormatter.format(source.startLatitudeDeg)}°, ${coordinateFormatter.format(source.startLongitudeDeg)}°</td></tr>
    <tr><td>Bitiş koordinatı</td><td>${coordinateFormatter.format(source.endLatitudeDeg)}°, ${coordinateFormatter.format(source.endLongitudeDeg)}°</td></tr>
    <tr><td>Rota koordinatları</td><td>Deneye uygulandı: ${yesNo(source.appliedRouteCoordinates === true)}</td></tr>` : `
    <tr><td>Kaynak türü</td><td>ESRI ASCII DEM</td></tr>
    <tr><td>Grid boyutu</td><td>${source.columnCount} × ${source.rowCount} hücre</td></tr>
    <tr><td>Hücre boyutu</td><td>${coordinateFormatter.format(source.cellSizeDeg)}°</td></tr>
    <tr><td>Rota örneği</td><td>${source.sampleCount} nokta · ${inputNumberFormatter.format(source.sampleSpacingM)} m aralık</td></tr>
    <tr><td>Örnek sayısı modu</td><td>${source.sampleCountMode === 'manual' ? 'Manuel' : 'Grid çözünürlüğüne göre otomatik'}</td></tr>
    <tr><td>Örnekleme</td><td>${source.samplingMethod === 'bilinear' ? 'İki doğrusal' : 'En yakın hücre'}</td></tr>
    <tr><td>Jeodezik yöntem</td><td>${source.geodesicMethod === 'vincenty' ? 'WGS84 Vincenty' : 'Küresel yedek'}</td></tr>
    ${source.diagnosticStatus ? `
    <tr><td>Örnekleme tanısı</td><td>${source.diagnosticStatus === 'good' ? 'İyi' : source.diagnosticStatus === 'caution' ? 'Dikkat' : 'Sınırlı'}</td></tr>
    <tr><td>Etkili hücre genişliği</td><td>${inputNumberFormatter.format(source.effectiveCellSpanM ?? 0)} m</td></tr>
    <tr><td>Örnek / hücre oranı</td><td>${inputNumberFormatter.format(source.sampleSpacingToCellRatio ?? 0)}</td></tr>
    <tr><td>En yakın grid kenarı</td><td>${inputNumberFormatter.format(source.minimumCoverageMarginM ?? 0)} m · ${inputNumberFormatter.format(source.coverageMarginCellRatio ?? 0)} hücre</td></tr>
    <tr><td>DEM yükseklik aralığı</td><td>${inputNumberFormatter.format(source.minimumElevationM ?? 0)} → ${inputNumberFormatter.format(source.maximumElevationM ?? 0)} m · Δ ${inputNumberFormatter.format(source.elevationRangeM ?? 0)} m</td></tr>` : `
    <tr><td>Örnekleme tanısı</td><td>Bu eski kayıtta tanı ölçümleri bulunmuyor.</td></tr>`}`;

  return `
    <div class="source-card ${stateClass}">
      <div class="source-card-heading">
        <strong>${source.kind === 'csv' ? 'CSV / TSV kaynak kaydı' : source.kind === 'geojson' ? 'GeoJSON kaynak kaydı' : 'ESRI ASCII DEM kaynak kaydı'}</strong>
        <span>${escapeHtml(stateLabel)}</span>
      </div>
      <table><tbody>${commonRows}${detailRows}</tbody></table>
    </div>`;
}

export function verticalTerrainSection(experiment: SavedExperiment, effectiveDistanceKm: number): string {
  const inputs = experiment.inputs;
  const offset = inputs.verticalDatumOffsetM;
  const observerEyeElevationM = inputs.observerGroundElevationM + offset + inputs.observerHeightM;
  const targetTopElevationM = inputs.targetGroundElevationM + offset + inputs.targetHeightM;
  const terrainEnabled = inputs.terrainMode !== 'off';
  const manualPoints = sortManualTerrainPoints(
    experiment.manualTerrainPoints ?? migrateLegacyManualTerrainPoint(
      inputs.terrainIntermediateDistancePercent,
      inputs.terrainIntermediateElevationM
    )
  );
  const interiorRows = manualPoints.map((point, index) => `
    <tr>
      <td>Ara nokta ${index + 1}</td>
      <td>%${inputNumberFormatter.format(point.distancePercent)}</td>
      <td>${inputNumberFormatter.format(effectiveDistanceKm * point.distancePercent / 100)} km</td>
      <td>${inputNumberFormatter.format(point.elevationM)} m</td>
    </tr>`).join('');
  const terrainRows = terrainEnabled ? `
    <tr><td>Gözlemci ucu</td><td>%0</td><td>0 km</td><td>${inputNumberFormatter.format(inputs.observerGroundElevationM)} m</td></tr>
    ${interiorRows}
    <tr><td>Hedef ucu</td><td>%100</td><td>${inputNumberFormatter.format(effectiveDistanceKm)} km</td><td>${inputNumberFormatter.format(inputs.targetGroundElevationM)} m</td></tr>` : `
    <tr><td colspan="4">Arazi profili kapalı; yalnızca gözlemci ve hedef zemin kotları kullanıldı.</td></tr>`;

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Düşey Referans ve Arazi</h2><span>Taşınabilir deney şeması v${PORTABLE_EXPERIMENT_SCHEMA_VERSION}</span></div>
        <strong class="status ${terrainEnabled ? 'status-compatible' : 'status-indeterminate'}">${terrainEnabled ? `${manualPoints.length} ara noktalı manuel profil` : 'Profil kapalı'}</strong>
      </header>
      <p>Kotlar ortak bir düşey datumda tutulur. Datum ofseti bütün zemin ve arazi örneklerine aynı yönde uygulanır.</p>
      <div class="two-column">
        <div>
          <h3>Düşey tanım</h3>
          <table><tbody>
            <tr><td>Datum</td><td>${escapeHtml(datumLabels[inputs.verticalDatumKind])}</td></tr>
            <tr><td>Datum / gelgit ofseti</td><td>${inputNumberFormatter.format(offset)} m</td></tr>
            <tr><td>Gözlemci zemin kotu</td><td>${inputNumberFormatter.format(inputs.observerGroundElevationM)} m</td></tr>
            <tr><td>Gözlemci mutlak göz kotu</td><td>${inputNumberFormatter.format(observerEyeElevationM)} m</td></tr>
            <tr><td>Hedef taban kotu</td><td>${inputNumberFormatter.format(inputs.targetGroundElevationM)} m</td></tr>
            <tr><td>Hedef tepe kotu</td><td>${inputNumberFormatter.format(targetTopElevationM)} m</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>Profil örnekleri</h3>
          <table><thead><tr><th>Nokta</th><th>Rota</th><th>Mesafe</th><th>Ham kot</th></tr></thead><tbody>${terrainRows}</tbody></table>
          <p class="muted">Manuel ara noktalar rota yüzdesiyle saklanır; raporda kayıt anındaki gerçek rota mesafesine dönüştürülür. Uç kotları gözlemci ve hedeften otomatik türetilir.</p>
        </div>
      </div>
      <h3>Profil kaynağı ve provenans</h3>
      ${terrainSourceSection(experiment.terrainProfileSource)}
    </section>`;
}
