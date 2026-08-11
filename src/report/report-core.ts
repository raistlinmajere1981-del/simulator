import type {
  CalculationTrace,
  ModelPrediction,
  PredictionMetric,
  ResultStatus
} from '../shared/domain';

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
  'solar-time-offset': 'Sivil Saat / Güneş Zamanı · Astronomik Referans',
  'solar-season-events': 'Ekinoks / Gündönümü · Yıllık Güneş Referansı',
  'solar-route-comparison': 'Güneş Rota Karşılaştırması · Astronomik Referans',
  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',
  'solar-eclipse-overlap-low-precision': 'Güneş Tutulması Anlık Geometrisi · Düşük Hassasiyetli Referans',
  'solar-eclipse-event-search-low-precision': 'Güneş Tutulması Yerel Olay Araması · Düşük Hassasiyetli Referans',
  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans',
  'dual-shadow-comparison': 'İki Konumlu Gölge Karşılaştırması · Astronomik Referans',
  'stellar-observation-reference': 'Yıldız Gözlemi · Astronomik Referans'
};

export const astronomyModelIds = new Set([
  'solar-position-noaa',
  'solar-day-events',
  'solar-time-offset',
  'solar-season-events',
  'solar-route-comparison',
  'lunar-position-low-precision',
  'solar-eclipse-overlap-low-precision',
  'solar-eclipse-event-search-low-precision',
  'solar-shadow-observation',
  'dual-shadow-comparison',
  'stellar-observation-reference'
]);

export const inputNumberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2
});

export const coordinateFormatter = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6
});

export const metricNumberFormatters = {
  fraction: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }),
  percentagePoint: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }),
  degree: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }),
  default: new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
};

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return escapeHtml(iso);
  return escapeHtml(new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'medium'
  }).format(date));
}

export function yesNo(value: boolean): string {
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
  if (metric.unit === 'unix-ms') {
    return formatDate(new Date(metric.value).toISOString());
  }
  if (metric.unit === 'boolean') {
    return metric.value >= 0.5 ? 'Evet' : 'Hayır';
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

export function predictionSection(
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
