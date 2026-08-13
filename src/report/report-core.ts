import type {
  CalculationTrace,
  ModelPrediction,
  PredictionMetric
} from '../shared/domain';
import type { UiLocale } from '../shared/ui-locale';
import { uiLocaleTag } from '../shared/ui-locale';
import { reportMessages } from './report-i18n';

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

// Backward-compatible Turkish formatters used by report sub-sections that are
// localized separately in part 12b.
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

function formatter(
  locale: UiLocale,
  options: Intl.NumberFormatOptions
): Intl.NumberFormat {
  return new Intl.NumberFormat(uiLocaleTag(locale), options);
}

export function formatInputNumber(value: number, locale: UiLocale = 'tr'): string {
  return formatter(locale, { maximumFractionDigits: 2 }).format(value);
}

export function formatCoordinate(value: number, locale: UiLocale = 'tr'): string {
  return formatter(locale, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value);
}

export function formatDegree(value: number, locale: UiLocale = 'tr'): string {
  return formatter(locale, { maximumFractionDigits: 3 }).format(value);
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatDate(iso: string, locale: UiLocale = 'tr'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return escapeHtml(iso);
  return escapeHtml(new Intl.DateTimeFormat(uiLocaleTag(locale), {
    dateStyle: 'long',
    timeStyle: 'medium'
  }).format(date));
}

export function yesNo(value: boolean, locale: UiLocale = 'tr'): string {
  const messages = reportMessages(locale);
  return value ? messages.yes : messages.no;
}

export function formatPercent(
  value: number,
  locale: UiLocale = 'tr',
  uncertainty = false
): string {
  const formatted = formatter(locale, { maximumFractionDigits: 2 }).format(value);
  if (locale === 'tr') return `${uncertainty ? '±' : ''}%${formatted}`;
  return `${uncertainty ? '±' : ''}${formatted}%`;
}

function formatMetric(metric: PredictionMetric, locale: UiLocale): string {
  if (metric.value === null) return '—';
  const messages = reportMessages(locale);
  if (metric.unit === 'fraction') {
    return formatPercent(metric.value * 100, locale);
  }
  if (metric.unit === 'percentage-point') {
    return `${formatter(locale, { maximumFractionDigits: 2 }).format(metric.value)} ${messages.percentagePoint}`;
  }
  if (metric.unit === 'deg') {
    return `${formatDegree(metric.value, locale)}°`;
  }
  if (metric.unit === 'unix-ms') {
    return formatDate(new Date(metric.value).toISOString(), locale);
  }
  if (metric.unit === 'boolean') {
    return metric.value >= 0.5 ? messages.yes : messages.no;
  }
  if (metric.unit === 'count') {
    return formatter(locale, { maximumFractionDigits: 2 }).format(metric.value);
  }
  return `${formatter(locale, { maximumFractionDigits: 2 }).format(metric.value)} ${escapeHtml(metric.unit)}`;
}

function metricRows(prediction: ModelPrediction, locale: UiLocale): string {
  const messages = reportMessages(locale);
  if (prediction.metrics.length === 0) {
    return `<tr><td colspan="2">${messages.noNumericResult}</td></tr>`;
  }
  // Metric labels are stored in the prediction snapshot. They remain raw in
  // this slice so persisted calculation semantics are not rewritten.
  return prediction.metrics.map((metric) => `
    <tr><td>${escapeHtml(metric.label)}</td><td>${formatMetric(metric, locale)}</td></tr>`).join('');
}

function traceSteps(trace: CalculationTrace, locale: UiLocale): string {
  const messages = reportMessages(locale);
  if (trace.steps.length === 0) {
    return `<p class="muted">${messages.noTraceSteps}</p>`;
  }
  // Step titles, formulas, substitutions, results and notes are calculation
  // evidence stored by the engine. Only the surrounding report chrome is localized.
  return trace.steps.map((step, index) => `
    <article class="trace-step">
      <div class="trace-number">${index + 1}</div>
      <div>
        <h4>${escapeHtml(step.title)}</h4>
        <code>${escapeHtml(step.formula)}</code>
        <p><strong>${messages.substitution}:</strong> ${escapeHtml(step.substitution)}</p>
        <p class="trace-result">${escapeHtml(step.result)}</p>
        ${step.note ? `<small>${escapeHtml(step.note)}</small>` : ''}
      </div>
    </article>`).join('');
}

function predictionDisplayName(modelId: string, locale: UiLocale): string {
  const messages = reportMessages(locale);
  const comparisonPrefix = 'photo-angular-comparison:';
  if (modelId.startsWith(comparisonPrefix)) {
    const sourceModelId = modelId.slice(comparisonPrefix.length);
    return `${messages.photoAngularComparison} · ${messages.modelNames[sourceModelId] ?? sourceModelId}`;
  }
  return messages.modelNames[modelId] ?? modelId;
}

export function predictionSection(
  prediction: ModelPrediction,
  modelVersion: string | undefined,
  locale: UiLocale = 'tr'
): string {
  const messages = reportMessages(locale);
  const modelName = predictionDisplayName(prediction.modelId, locale);
  return `
    <section class="model-section">
      <header class="model-heading">
        <div><h2>${escapeHtml(modelName)}</h2><span>${messages.version} ${escapeHtml(modelVersion ?? messages.unknown)}</span></div>
        <strong class="status status-${escapeHtml(prediction.status)}">${escapeHtml(messages.status[prediction.status])}</strong>
      </header>
      <p>${escapeHtml(prediction.trace.summary)}</p>
      <div class="two-column">
        <div><h3>${messages.results}</h3><table><thead><tr><th>${messages.metric}</th><th>${messages.value}</th></tr></thead><tbody>${metricRows(prediction, locale)}</tbody></table></div>
        <div>
          <h3>${messages.assumptions}</h3>
          <ul>${prediction.trace.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
          ${prediction.warnings.length > 0 ? `<h3>${messages.warnings}</h3><ul class="warnings">${prediction.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
      <h3>${messages.calculationTrace}</h3>
      <div class="trace-list">${traceSteps(prediction.trace, locale)}</div>
      <p class="trace-id">${messages.traceId}: ${escapeHtml(prediction.traceId)}</p>
    </section>`;
}
