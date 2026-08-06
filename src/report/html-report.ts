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
  'azimuthal-projection': 'Azimutal Gösterim'
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

function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined
): string {
  const modelName = modelNames[prediction.modelId] ?? prediction.modelId;
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

  return `
    <div class="source-card ${stateClass}">
      <div class="source-card-heading">
        <strong>CSV / TSV kaynak kaydı</strong>
        <span>${escapeHtml(stateLabel)}</span>
      </div>
      <table><tbody>
        <tr><td>Dosya adı</td><td>${escapeHtml(source.fileName)}</td></tr>
        <tr><td>İçe aktarma zamanı</td><td>${formatDate(source.importedAtIso)}</td></tr>
        <tr><td>Ayırıcı</td><td>${escapeHtml(delimiterLabels[source.delimiter])}</td></tr>
        <tr><td>Mesafe birimi</td><td>${escapeHtml(distanceUnitLabels[source.distanceUnit])}</td></tr>
        <tr><td>Kaynak rota</td><td>${sourceRoute}</td></tr>
        <tr><td>Kaynak satır sayısı</td><td>${source.rowCount}</td></tr>
        <tr><td>Mesafe sütunu</td><td>${escapeHtml(source.distanceColumnHeader)}</td></tr>
        <tr><td>Kot sütunu</td><td>${escapeHtml(source.elevationColumnHeader)}</td></tr>
        <tr><td>CSV gözlemci uç kotu</td><td>${inputNumberFormatter.format(source.observerEndpointElevationM)} m · Deneye uygulandı: ${yesNo(source.appliedObserverEndpoint)}</td></tr>
        <tr><td>CSV hedef uç kotu</td><td>${inputNumberFormatter.format(source.targetEndpointElevationM)} m · Deneye uygulandı: ${yesNo(source.appliedTargetEndpoint)}</td></tr>
      </tbody></table>
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
        <div><h2>Düşey Referans ve Arazi</h2><span>Taşınabilir deney şeması v5</span></div>
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

export function createExperimentHtmlReport(
  experiment: SavedExperiment,
  generatedAtIso = new Date().toISOString()
): string {
  const inputs = experiment.inputs;
  const effectiveDistanceKm = experiment.geodesic?.distanceM !== undefined &&
    inputs.distanceSource === 'coordinates'
    ? experiment.geodesic.distanceM / 1_000
    : inputs.surfaceDistanceKm;
  const coordinateCards = inputs.distanceSource === 'coordinates' ? `
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Hedef koordinatı</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Mesafe kaynağı</small><strong>WGS84 koordinat çözümü</strong></div>` : `
    <div class="input-card"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;

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
        <div class="input-card"><small>Göz yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>
        <div class="input-card"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>
        <div class="input-card"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(effectiveDistanceKm)} km</strong></div>
        <div class="input-card"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>
        <div class="input-card"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>
        <div class="input-card"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>
        ${coordinateCards}
      </div>
      <div class="notice">Bu rapor, kaydedildiği andaki model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini gösterir. Tek bir deneydeki uyum, bir modelin genel doğruluğu anlamına gelmez.</div>
    </header>

    ${geodesicSection(experiment)}
    ${verticalTerrainSection(experiment, effectiveDistanceKm)}
    ${experiment.predictions.map((prediction) => predictionSection(
      prediction,
      experiment.modelVersions[prediction.modelId]
    )).join('')}

    <footer>Bu dosya çevrimdışı okunabilen, kendine yeterli bir HTML raporudur. Geometrik Gözlem Laboratuvarı tarafından üretilmiştir.</footer>
  </main>
</body>
</html>`;
}
