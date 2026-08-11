import type { SavedExperiment } from '../shared/simulator';
import {
  astronomyModelIds,
  coordinateFormatter,
  escapeHtml,
  formatDate,
  inputNumberFormatter,
  predictionSection
} from './report-core';
import {
  photoCalibrationSection,
  photoModelUncertaintySection,
  stellarLocalHorizonSourceSection,
  stellarMotionSourceSection,
  textSetupHistorySection
} from './report-provenance';
import { geodesicSection, verticalTerrainSection } from './report-terrain';

function astronomyResultsSection(experiment: SavedExperiment): string {
  const predictions = experiment.predictions.filter((prediction) => astronomyModelIds.has(prediction.modelId));
  if (predictions.length === 0) return '';
  const observedAtIso = experiment.observedAtIso ?? experiment.createdAtIso;
  return `
    <div class="astronomy-group">
      <div class="astronomy-group-heading">
        <div><span class="eyebrow">Aşama 7 · kaydedilmiş astronomi anlık görüntüleri</span><h2>Astronomi sonuçları</h2></div>
        <strong>${predictions.length} hesap kaydı</strong>
      </div>
      <p>Bu bölüm kaydedilen gözlem anı (${formatDate(observedAtIso)}), açık UTC ofseti ve model sürümleriyle birlikte saklanan Güneş, Ay, tutulma, mevsim, Güneş zamanı ve rota karşılaştırması sonuçlarını gösterir.</p>
      ${predictions.map((prediction) => predictionSection(
        prediction,
        experiment.modelVersions[prediction.modelId]
      )).join('')}
    </div>`;
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
  const isEclipseObservation = experiment.scenarioId === 'eclipse-simulation';
  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation || isEclipseObservation;
  const coordinateCards = inputs.distanceSource === 'coordinates' ? `
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Hedef koordinatı</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>
    <div class="input-card"><small>Mesafe kaynağı</small><strong>WGS84 koordinat çözümü</strong></div>` : `
    <div class="input-card"><small>Mesafe kaynağı</small><strong>Manuel giriş</strong></div>`;
  const reportInputCards = isAstronomyObservation ? `
    <div class="input-card"><small>Gözlem zamanı · UTC</small><strong>${formatDate(experiment.observedAtIso ?? experiment.createdAtIso)}</strong></div>
    <div class="input-card"><small>UTC ofset provenansı</small><strong>${experiment.observationUtcOffsetMinutes === undefined ? 'Tanımlanmadı' : `${experiment.observationUtcOffsetMinutes >= 0 ? '+' : ''}${inputNumberFormatter.format(experiment.observationUtcOffsetMinutes / 60)} saat`}</strong></div>
    <div class="input-card"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>
    ${isCelestial ? `<div class="input-card"><small>Rota karşılaştırması B</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>` : ''}
    <div class="input-card"><small>${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : isEclipseObservation ? 'Tutulma hesabı' : 'Aşama 7 astronomi'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : isEclipseObservation ? 'Anlık Güneş–Ay disk geometrisi ve kontrollü olay araması' : 'Güneş/Ay, günlük/yıllık olaylar, Güneş zamanı ve WGS84 rota karşılaştırması'}</strong></div>` : `
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
    .astronomy-group { margin: 18px 0; padding: 18px; border: 1px solid #d5c58a; border-top: 4px solid #d39a28; border-radius: 10px; background: #fffdf6; }
    .astronomy-group > .model-section { background: #fff; }
    .astronomy-group-heading { display: flex; justify-content: space-between; gap: 16px; align-items: end; padding: 4px 6px 14px; border-bottom: 1px solid #eadfb8; }
    .astronomy-group-heading strong { color: #7a5a18; }
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
    ${stellarMotionSourceSection(experiment)}
    ${astronomyResultsSection(experiment)}
    ${experiment.predictions
      .filter((prediction) => !astronomyModelIds.has(prediction.modelId))
      .map((prediction) => predictionSection(
        prediction,
        experiment.modelVersions[prediction.modelId]
      )).join('')}

    <footer>Bu dosya çevrimdışı okunabilen, kendine yeterli bir HTML raporudur. Geometrik Gözlem Laboratuvarı tarafından üretilmiştir.</footer>
  </main>
</body>
</html>`;
}
