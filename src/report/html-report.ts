import type {
  CalculationTrace,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';
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

const statusLabels: Record<ResultStatus, string> = {
  compatible: 'Gözlem aralığıyla uyumlu',
  incompatible: 'Gözlem aralığıyla uyumsuz',
  indeterminate: 'Belirsizlik nedeniyle karar verilemedi',
  unsupported: 'Bu deney için fiziksel kurallar tanımsız'
};

const modelNames: Record<string, string> = {
  'ideal-sphere': 'İdeal Küre',
  'defined-plane': 'Tanımlı Düzlem',
  'azimuthal-projection': 'Azimutal Gösterim',
  'photo-calibration': 'Fotoğraf / Kamera Kalibrasyonu',
  'solar-position-noaa': 'Güneş Konumu · Astronomik Referans',
  'solar-day-events': 'Gün Doğumu / Batımı · Astronomik Referans',
  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',
  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans',
  'dual-shadow-comparison': 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans',
  'stellar-observation-reference': 'Yıldız Gözlemi · Astronomik Referans'
};

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

const inputNumberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});
const coordinateFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});
const metricNumberFormatters = {
  fraction: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }),
  percentagePoint: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }),
  degree: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }),
  default: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
};

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return escapeHtml(iso);
  return escapeHtml(new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'medium'
  }).format(date));
}

function yesNo(value: boolean): string {
  return value ? 'Evet' : 'Hayır';
}

function formatMetric(metric: PredictionMetric): string {
  if (metric.value === null) return '—';
  if (metric.unit === 'fraction') {
    return `%${metricNumberFormatters.fraction.format(metric.value * 100)}`;
  }
  if (metric.unit === 'percentage-point') {
    return `${metricNumberFormatters.percentagePoint.format(metric.value)} yüzde puan`;
  }
  if (metric.unit === 'deg') {
    return `${metricNumberFormatters.degree.format(metric.value)}°`;
  }
  if (metric.unit === 'count') {
    return metricNumberFormatters.default.format(metric.value);
  }
  return `${metricNumberFormatters.default.format(metric.value)} ${escapeHtml(metric.unit)}`;
}

function metricRows(prediction: ModelPrediction): string {
  if (prediction.metrics.length === 0) {
    return '<tr><td colspan="2">Bu model/gösterim sayısal sonuç üretmedi.</td></tr>';
  }
  return prediction.metrics.map((metric) => `
    <tr><td>${escapeHtml(metric.label)}</td><td>${formatMetric(metric)}</td></tr>`).join('');
}

function traceSteps(trace: CalculationTrace): string {
  if (trace.steps.length === 0) {
    return '<p class="muted">Hesap adımı bulunmuyor.</p>';
  }
  return trace.steps.map((step, index) => `
    <article class="trace-step">
      <div class="trace-number">${index + 1}</div>
      <div>
        <h4>${escapeHtml(step.title)}</h4>
        <code>${escapeHtml(step.formula)}</code>
        <p><strong>Yerine koyma:</strong> ${escapeHtml(step.substitution)}</p>
        <p class="trace-result">${escapeHtml(step.result)}</p>
        ${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}
      </div>
    </article>`).join('');
}

function predictionDisplayName(modelId: string): string {
  const comparisonPrefix = 'photo-angular-comparison:';
  if (modelId.startsWith(comparisonPrefix)) {
    const sourceModelId = modelId.slice(comparisonPrefix.length);
    return `Fotoğraf Açısal Karşılaştırması · ${modelNames[sourceModelId] ?? sourceModelId}`;
  }
  return modelNames[modelId] ?? modelId;
}

function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined
): string {
  const modelName = predictionDisplayName(prediction.modelId);
  return `
    <section class="model-section">
      <header class="model-heading">
        <div><h2>${escapeHtml(modelName)}</h2><span>Sürüm ${escapeHtml(modelVersion ?? 'bilinmiyor')}</span></div>
        <strong class="status status-${escapeHtml(prediction.status)}">${escapeHtml(statusLabels[prediction.status])}</strong>
      </header>
      <p>${escapeHtml(prediction.trace.summary)}</p>
      <div class="two-column">
        <div><h3>Sonuçlar</h3><table><thead><tr><th>Metrik</th><th>Değer</th></tr></thead><tbody>${metricRows(prediction)}</tbody></table></div>
        <div>
          <h3>Varsayımlar</h3>
          <ul>${prediction.trace.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ${prediction.warnings.length > 0 ? `<h3>Uyarılar</h3><ul class="warnings">${prediction.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <h3>Hesap izi</h3>
      <div class="trace-list">${traceSteps(prediction.trace)}</div>
      <p class="trace-id">İz kimliği: ${escapeHtml(prediction.traceId)}</p>
    </section>`;
}

function geodesicSection(experiment: SavedExperiment): string {
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
      <div class="trace-list">${traceSteps(geodesic.trace)}</div>
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

function verticalTerrainSection(experiment: SavedExperiment, effectiveDistanceKm: number): string {
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


function stellarLocalHorizonSourceSection(experiment: SavedExperiment): string {
  const source = experiment.stellarLocalHorizonSource;
  if (!source) return '';
  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';
  const stateLabel = source.modifiedAfterImport
    ? 'İçe aktarımdan sonra düzenlendi'
    : 'Kaydedilen noktalar içe aktarılan kaynakla eşleşiyor';
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Yıldız yerel skyline dosya kaynağı</h2><span>Geometrik azimut → ufuk yüksekliği profili</span></div>
        <strong class="status status-compatible">${source.pointCount} nokta</strong>
      </header>
      <div class="source-card ${stateClass}">
        <div class="source-card-heading"><strong>${escapeHtml(source.fileName)}</strong><span>${escapeHtml(stateLabel)}</span></div>
        <table><tbody>
          <tr><td>Biçim</td><td>${escapeHtml(source.format.toUpperCase())}</td></tr>
          <tr><td>Nokta sayısı</td><td>${source.pointCount}</td></tr>
          <tr><td>En büyük azimut boşluğu</td><td>${metricNumberFormatters.degree.format(source.maximumAzimuthGapDeg)}°</td></tr>
          <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
          <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
          <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
        </tbody></table>
        ${source.warnings.length > 0 ? `<h3>Kaynak uyarıları</h3><ul class="warnings">${source.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}
        <p class="muted">Bu kayıt dosyanın ham baytlarını içermez; doğrulanmış/normalize edilmiş geometrik skyline noktalarını ve kaynak bütünlük özetini taşır. Profilin yıldız hesabında uygulanıp uygulanmadığı ilgili Yıldız Gözlemi prediction anlık görüntüsünde ayrıca kaydedilir.</p>
      </div>
    </section>`;
}

function photoCalibrationSection(experiment: SavedExperiment): string {
  const calibration = experiment.photoCalibration;
  if (!calibration) return '';
  const source = calibration.source;
  const cameraRows = calibration.calibration.sourceKind === 'field-of-view'
    ? `<tr><td>Kalibrasyon yöntemi</td><td>Yatay / düşey FOV</td></tr>
       <tr><td>Yatay FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.horizontalFovDeg)}°</td></tr>
       <tr><td>Düşey FOV</td><td>${metricNumberFormatters.degree.format(calibration.calibration.verticalFovDeg)}°</td></tr>`
    : `<tr><td>Kalibrasyon yöntemi</td><td>Sensör + odak uzaklığı</td></tr>
       <tr><td>Odak uzaklığı</td><td>${inputNumberFormatter.format(calibration.calibration.focalLengthMm)} mm</td></tr>
       <tr><td>Sensör</td><td>${inputNumberFormatter.format(calibration.calibration.sensorWidthMm)} × ${inputNumberFormatter.format(calibration.calibration.sensorHeightMm)} mm</td></tr>`;
  const cameraUncertaintyRows = calibration.cameraUncertainty
    ? Object.entries({
        'Yatay FOV ±': calibration.cameraUncertainty.horizontalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.horizontalFovDeg)}°`,
        'Düşey FOV ±': calibration.cameraUncertainty.verticalFovDeg === undefined ? undefined : `${metricNumberFormatters.degree.format(calibration.cameraUncertainty.verticalFovDeg)}°`,
        'Odak uzaklığı ±': calibration.cameraUncertainty.focalLengthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.focalLengthMm)} mm`,
        'Sensör genişliği ±': calibration.cameraUncertainty.sensorWidthMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorWidthMm)} mm`,
        'Sensör yüksekliği ±': calibration.cameraUncertainty.sensorHeightMm === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.sensorHeightMm)} mm`,
        'Asal nokta X ±': calibration.cameraUncertainty.principalPointXPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointXPx)} px`,
        'Asal nokta Y ±': calibration.cameraUncertainty.principalPointYPx === undefined ? undefined : `${inputNumberFormatter.format(calibration.cameraUncertainty.principalPointYPx)} px`
      }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')
    : '<tr><td>Kamera iç-parametre belirsizliği</td><td>Tanımlanmadı</td></tr>';
  const cameraCombinationRow = calibration.cameraUncertainty
    ? `<tr><td>Kamera belirsizlik birleşimi</td><td>${calibration.cameraUncertainty.combination === 'rss-independent' ? 'RSS · bağımsız bileşenler' : 'Koruyucu doğrusal toplam'}</td></tr>`
    : '';
  const markRows = Object.entries({
    'Ufuk / referans sol': calibration.marks.horizonStart,
    'Ufuk / referans sağ': calibration.marks.horizonEnd,
    'Hedef tabanı': calibration.marks.targetBase,
    'Hedef tepesi': calibration.marks.targetTop
  }).map(([label, mark]) => `<tr><td>${escapeHtml(label)}</td><td>${inputNumberFormatter.format(mark.xPx)}, ${inputNumberFormatter.format(mark.yPx)} px${mark.uncertaintyPx === undefined ? '' : ` · ±${inputNumberFormatter.format(mark.uncertaintyPx)} px`}</td></tr>`).join('');

  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf kaynak ve işaretleme provenansı</h2><span>Görüntü baytları rapora veya deney JSON’una gömülmez</span></div>
        <strong class="status status-compatible">Kalibrasyon kaydı</strong>
      </header>
      <div class="two-column">
        <div>
          <h3>Kaynak fotoğraf</h3>
          <table><tbody>
            <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
            <tr><td>Görüntü boyutu</td><td>${source.imageWidthPx} × ${source.imageHeightPx} px</td></tr>
            <tr><td>Dosya boyutu</td><td>${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>
            <tr><td>MIME</td><td>${escapeHtml(source.mimeType)}</td></tr>
            <tr><td>İçe aktarma</td><td>${formatDate(source.importedAtIso)}</td></tr>
            <tr><td>SHA-256</td><td><code>${escapeHtml(source.sha256)}</code></td></tr>
            ${cameraRows}
            ${cameraCombinationRow}
            ${cameraUncertaintyRows}
            <tr><td>Asal nokta</td><td>${calibration.principalPointXPx === undefined || calibration.principalPointYPx === undefined ? 'Görüntü merkezi (varsayılan)' : `${inputNumberFormatter.format(calibration.principalPointXPx)}, ${inputNumberFormatter.format(calibration.principalPointYPx)} px`}</td></tr>
            <tr><td>Distorsiyon önceden düzeltildi</td><td>${yesNo(calibration.distortionCorrected)}</td></tr>
            <tr><td>Varsayılan işaret belirsizliği</td><td>±${inputNumberFormatter.format(calibration.defaultMarkUncertaintyPx)} px</td></tr>
          </tbody></table>
        </div>
        <div>
          <h3>İşaretler</h3>
          <table><tbody>${markRows}</tbody></table>
          <p class="muted">Kalibrasyon kayıt zamanı: ${formatDate(calibration.recordedAtIso)}</p>
          ${calibration.notes ? `<p>${escapeHtml(calibration.notes)}</p>` : ''}
        </div>
      </div>
    </section>`;
}


function photoModelUncertaintySection(experiment: SavedExperiment): string {
  const settings = experiment.photoModelUncertainty;
  if (!settings) return '';
  const rows = Object.entries({
    'Etkin yüzey mesafesi ±': settings.surfaceDistanceM === undefined ? undefined : `${inputNumberFormatter.format(settings.surfaceDistanceM)} m`,
    'Göz yüksekliği ±': settings.observerEyeHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerEyeHeightM)} m`,
    'Gözlemci zemin kotu ±': settings.observerGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.observerGroundElevationM)} m`,
    'Hedef yüksekliği ±': settings.targetHeightM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetHeightM)} m`,
    'Hedef taban kotu ±': settings.targetGroundElevationM === undefined ? undefined : `${inputNumberFormatter.format(settings.targetGroundElevationM)} m`,
    'Kırılma katsayısı k ±': settings.refractionCoefficient === undefined ? undefined : inputNumberFormatter.format(settings.refractionCoefficient)
  }).filter(([, value]) => value !== undefined).map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading">
        <div><h2>Fotoğraf / model belirsizlik ayarları</h2><span>Nominal model girdilerini değiştirmeyen hassasiyet aralıkları</span></div>
        <strong class="status status-compatible">${settings.combination === 'rss-independent' ? 'RSS' : 'Koruyucu toplam'}</strong>
      </header>
      <p>Boş bırakılan bileşenler sıfır belirsizlik sayılmaz; bu raporda yalnız kullanıcı tarafından açıkça tanımlanan ± aralıklar listelenir.</p>
      <table><tbody>${rows || '<tr><td colspan="2">Model girdi belirsizliği tanımlanmadı.</td></tr>'}</tbody></table>
    </section>`;
}

function textSetupHistorySection(experiment: SavedExperiment): string {
  const history = experiment.textSetupHistory;
  if (!history || history.length === 0) return '';
  const entries = history.map((item, index) => `
    <div class="source-card">
      <div class="source-card-heading"><strong>Metinden uygulama ${index + 1}</strong><span>${formatDate(item.appliedAtIso)} · parser ${escapeHtml(item.parserVersion)}</span></div>
      <p>${escapeHtml(item.sourceText)}</p>
      <table><thead><tr><th>Alan</th><th>Uygulanan değer</th><th>Kaynak ifade</th></tr></thead><tbody>
        ${item.appliedFields.map((field) => `<tr><td>${escapeHtml(field.fieldId)}</td><td>${escapeHtml(field.displayValue)}</td><td>${escapeHtml(field.sourceExcerpt)}</td></tr>`).join('')}
      </tbody></table>
    </div>`).join('');
  return `
    <section class="model-section vertical-section">
      <header class="model-heading"><div><h2>Metinden deney hazırlama provenansı</h2><span>Kullanıcı onayıyla forma uygulanan serbest metin alanları</span></div><strong class="status status-compatible">${history.length} uygulama</strong></header>
      <p>Bu metin parser girdisidir; fiziksel ölçüm kaynağının kendisi değildir. Yalnız hangi UI değerlerinin hangi ifadelerden çıkarılıp kullanıcı onayıyla uygulandığını izler.</p>
      <div class="trace-list">${entries}</div>
    </section>`;
}

export function createExperimentHtmlReport(
  experiment: SavedExperiment,
  generatedAtIso = new Date().toISOString()
): string {
  const inputs = experiment.inputs;
  const effectiveDistanceKm = experiment.geodesic?.distanceM !== undefined &&
    inputs.distanceSource === 'coordinates'
    ? experiment.geodesic.distanceM / 1_000
    : inputs.surfaceDistanceKm;
  const isCelestial = experiment.scenarioId === 'sun-moon-observation';
  const isShadowObservation = experiment.scenarioId === 'shadow-observation';
  const isStellarObservation = experiment.scenarioId === 'stellar-observation';
  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation;
  const coordinateCards = inputs.distanceSource === 'coordinates' ? `
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Hedef koordinatı</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Mesafe kaynağı</small><strong>WGS84 koordinat çözümü</strong></div>` : `
    <div class="input-card"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;
  const reportInputCards = isAstronomyObservation ? `
    <div class="input-card"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>
    <div class="input-card"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : '6.1–6.2 hesap türü'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : 'Geometrik Güneş konumu ve topocentrik Ay referansı'}</strong></div>` : `
    <div class="input-card"><small>Göz yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>
    <div class="input-card"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>
    <div class="input-card"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(effectiveDistanceKm)} km</strong></div>
    <div class="input-card"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>
    <div class="input-card"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>
    <div class="input-card"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>
    ${coordinateCards}`;

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(experiment.name)} · Deney Raporu</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Arial, sans-serif; color: #18232d; background: #eef2f5; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; }
    .report-header, section { background: white; border: 1px solid #d7e0e7; border-radius: 10px; box-shadow: 0 8px 24px rgba(20,35,50,.06); }
    .report-header { padding: 28px; margin-bottom: 18px; }
    .eyebrow { color: #527087; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 8px 0 4px; font-size: 30px; }
    h2 { margin: 0; }
    h3 { margin: 18px 0 8px; font-size: 16px; }
    h4 { margin: 0 0 8px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 24px; color: #5b6f7f; font-size: 13px; }
    .notice { margin-top: 18px; padding: 12px 14px; border-left: 4px solid #d79b2c; background: #fff8e8; font-size: 13px; }
    .input-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
    .input-card { padding: 12px; border: 1px solid #dce5eb; border-radius: 7px; background: #f8fafb; }
    .input-card small { display: block; color: #687d8d; margin-bottom: 5px; }
    .input-card strong { font-size: 17px; }
    .model-section { margin: 18px 0; padding: 24px; page-break-inside: avoid; }
    .geodesic-section { border-top: 4px solid #2b79ad; }
    .vertical-section { border-top: 4px solid #4b8a58; }
    .model-heading { display: flex; justify-content: space-between; gap: 16px; align-items: start; border-bottom: 1px solid #e0e7ec; padding-bottom: 14px; }
    .model-heading span { display: block; color: #718492; margin-top: 4px; font-size: 12px; }
    .status { max-width: 330px; padding: 7px 10px; border-radius: 999px; font-size: 12px; text-align: center; }
    .status-compatible { color: #19622d; background: #e4f5e8; }
    .status-incompatible { color: #8a2d22; background: #fbe8e5; }
    .status-indeterminate { color: #725a13; background: #fff4cf; }
    .status-unsupported { color: #63417c; background: #f1e7f8; }
    .two-column { display: grid; grid-template-columns: 1.25fr 1fr; gap: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 9px 10px; border: 1px solid #dce4e9; text-align: left; }
    th { background: #f2f6f8; }
    ul { margin: 8px 0; padding-left: 20px; line-height: 1.55; }
    .warnings { color: #8b4e12; }
    .trace-list { display: grid; gap: 10px; }
    .trace-step { display: grid; grid-template-columns: 32px 1fr; gap: 12px; padding: 14px; border: 1px solid #dbe4ea; border-radius: 7px; background: #f9fbfc; }
    .trace-number { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #174f75; background: #dcecf7; font-weight: 700; }
    code { display: block; padding: 9px; overflow-wrap: anywhere; border: 1px solid #ccdce7; border-radius: 4px; background: #edf4f8; }
    .trace-result { display: inline-block; padding: 5px 8px; color: #155e2b; background: #e0f3e5; border-radius: 4px; font-weight: 700; }
    .trace-id, .muted { color: #71828f; font-size: 11px; overflow-wrap: anywhere; }
    .source-card { padding: 14px; border: 1px solid #b9d9c1; border-left: 4px solid #4d985e; border-radius: 7px; background: #f3fbf5; }
    .source-card.source-modified { border-color: #e0c98e; border-left-color: #c58c27; background: #fff9e9; }
    .source-card-heading { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 10px; }
    .source-card-heading span { color: #4c7656; font-size: 12px; font-weight: 700; }
    .source-modified .source-card-heading span { color: #87621d; }
    footer { padding: 16px 4px; color: #70818e; font-size: 11px; text-align: center; }
    @media (max-width: 760px) { body { padding: 12px; } .input-grid, .two-column { grid-template-columns: 1fr; } .model-heading, .source-card-heading { display: block; } .status { display: inline-block; margin-top: 10px; } .source-card-heading span { display: block; margin-top: 6px; } }
    @media print { body { padding: 0; background: white; } .report-header, section { box-shadow: none; } .model-section { break-before: auto; } }
  </style>
</head>
<body>
  <main>
    <header class="report-header">
      <span class="eyebrow">Geometrik Gözlem Laboratuvarı · Deney Raporu</span>
      <h1>${escapeHtml(experiment.name)}</h1>
      <div class="meta">
        <span>Kayıt kimliği: ${escapeHtml(experiment.id)}</span>
        <span>Oluşturma: ${formatDate(experiment.createdAtIso)}</span>
        <span>Son güncelleme: ${formatDate(experiment.updatedAtIso)}</span>
        <span>Rapor üretimi: ${formatDate(generatedAtIso)}</span>
      </div>
      <div class="input-grid">
        ${reportInputCards}
      </div>
      <div class="notice">Bu rapor, kaydedildiği andaki model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini gösterir. Tek bir deneydeki uyum, bir modelin genel doğruluğu anlamına gelmez.</div>
    </header>

    ${geodesicSection(experiment)}
    ${verticalTerrainSection(experiment, effectiveDistanceKm)}
    ${photoCalibrationSection(experiment)}
    ${photoModelUncertaintySection(experiment)}
    ${textSetupHistorySection(experiment)}
    ${stellarLocalHorizonSourceSection(experiment)}
    ${experiment.predictions.map((prediction) => predictionSection(
      prediction,
      experiment.modelVersions[prediction.modelId]
    )).join('')}

    <footer>Bu dosya çevrimdışı okunabilen, kendine yeterli bir HTML raporudur. Geometrik Gözlem Laboratuvarı tarafından üretilmiştir.</footer>
  </main>
</body>
</html>`;
}
