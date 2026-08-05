import type {
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';
import type { SavedExperiment } from '../shared/simulator';

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

const inputNumberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
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

  return escapeHtml(
    new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'long',
      timeStyle: 'medium'
    }).format(date)
  );
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

  return `${metricNumberFormatters.default.format(metric.value)} ${escapeHtml(metric.unit)}`;
}

function metricRows(prediction: ModelPrediction): string {
  if (prediction.metrics.length === 0) {
    return '<tr><td colspan="2">Bu model/gösterim sayısal sonuç üretmedi.</td></tr>';
  }

  return prediction.metrics
    .map(
      (metric) => `
        <tr>
          <td>${escapeHtml(metric.label)}</td>
          <td>${formatMetric(metric)}</td>
        </tr>`
    )
    .join('');
}

function traceSteps(prediction: ModelPrediction): string {
  if (prediction.trace.steps.length === 0) {
    return '<p class="muted">Hesap adımı bulunmuyor.</p>';
  }

  return prediction.trace.steps
    .map(
      (step, index) => `
        <article class="trace-step">
          <div class="trace-number">${index + 1}</div>
          <div>
            <h4>${escapeHtml(step.title)}</h4>
            <code>${escapeHtml(step.formula)}</code>
            <p><strong>Yerine koyma:</strong> ${escapeHtml(step.substitution)}</p>
            <p class="trace-result">${escapeHtml(step.result)}</p>
            ${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}
          </div>
        </article>`
    )
    .join('');
}

function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined
): string {
  const modelName = modelNames[prediction.modelId] ?? prediction.modelId;

  return `
    <section class="model-section">
      <header class="model-heading">
        <div>
          <h2>${escapeHtml(modelName)}</h2>
          <span>Sürüm ${escapeHtml(modelVersion ?? 'bilinmiyor')}</span>
        </div>
        <strong class="status status-${escapeHtml(prediction.status)}">
          ${escapeHtml(statusLabels[prediction.status])}
        </strong>
      </header>

      <p>${escapeHtml(prediction.trace.summary)}</p>

      <div class="two-column">
        <div>
          <h3>Sonuçlar</h3>
          <table>
            <thead><tr><th>Metrik</th><th>Değer</th></tr></thead>
            <tbody>${metricRows(prediction)}</tbody>
          </table>
        </div>
        <div>
          <h3>Varsayımlar</h3>
          <ul>
            ${prediction.trace.assumptions
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join('')}
          </ul>
          ${
            prediction.warnings.length > 0
              ? `<h3>Uyarılar</h3><ul class="warnings">${prediction.warnings
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join('')}</ul>`
              : ''
          }
        </div>
      </div>

      <h3>Hesap izi</h3>
      <div class="trace-list">${traceSteps(prediction)}</div>
      <p class="trace-id">İz kimliği: ${escapeHtml(prediction.traceId)}</p>
    </section>`;
}

export function createExperimentHtmlReport(
  experiment: SavedExperiment,
  generatedAtIso = new Date().toISOString()
): string {
  const inputs = experiment.inputs;

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
    .input-card strong { font-size: 18px; }
    .model-section { margin: 18px 0; padding: 24px; page-break-inside: avoid; }
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
    footer { padding: 16px 4px; color: #70818e; font-size: 11px; text-align: center; }
    @media (max-width: 760px) { body { padding: 12px; } .input-grid, .two-column { grid-template-columns: 1fr; } .model-heading { display: block; } .status { display: inline-block; margin-top: 10px; } }
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
        <div class="input-card"><small>Gözlemci yüksekliği</small><strong>${inputNumberFormatter.format(inputs.observerHeightM)} m</strong></div>
        <div class="input-card"><small>Hedef yüksekliği</small><strong>${inputNumberFormatter.format(inputs.targetHeightM)} m</strong></div>
        <div class="input-card"><small>Yüzey mesafesi</small><strong>${inputNumberFormatter.format(inputs.surfaceDistanceKm)} km</strong></div>
        <div class="input-card"><small>Gözlenen görünürlük</small><strong>%${inputNumberFormatter.format(inputs.observedVisiblePercent)}</strong></div>
        <div class="input-card"><small>Gözlem belirsizliği</small><strong>±%${inputNumberFormatter.format(inputs.observationUncertaintyPercent)}</strong></div>
        <div class="input-card"><small>Atmosfer</small><strong>${inputs.useStandardRefraction ? `Standart kırılma (k=${inputNumberFormatter.format(inputs.refractionCoefficient)})` : 'Kapalı'}</strong></div>
      </div>
      <div class="notice">
        Bu rapor, kaydedildiği andaki model sürümlerini, sonuç anlık görüntülerini ve hesap izlerini gösterir. Tek bir deneydeki uyum, bir modelin genel doğruluğu anlamına gelmez.
      </div>
    </header>

    ${experiment.predictions
      .map((prediction) =>
        predictionSection(
          prediction,
          experiment.modelVersions[prediction.modelId]
        )
      )
      .join('')}

    <footer>
      Bu dosya çevrimdışı okunabilen, kendine yeterli bir HTML raporudur. Geometrik Gözlem Laboratuvarı tarafından üretilmiştir.
    </footer>
  </main>
</body>
</html>`;
}
