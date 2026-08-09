import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const file = 'src/report/html-report.ts';
let source = fs.readFileSync(file, 'utf8');

if (!source.includes('function stellarLocalHorizonSourceSection(')) {
  const anchor = `function photoCalibrationSection(experiment: SavedExperiment): string {`;
  const section = `function stellarLocalHorizonSourceSection(experiment: SavedExperiment): string {\n  const source = experiment.stellarLocalHorizonSource;\n  if (!source) return '';\n  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';\n  const stateLabel = source.modifiedAfterImport\n    ? 'İçe aktarımdan sonra düzenlendi'\n    : 'Kaydedilen noktalar içe aktarılan kaynakla eşleşiyor';\n  return \`\n    <section class="model-section vertical-section">\n      <header class="model-heading">\n        <div><h2>Yıldız yerel skyline dosya kaynağı</h2><span>Geometrik azimut → ufuk yüksekliği profili</span></div>\n        <strong class="status status-compatible">\${source.pointCount} nokta</strong>\n      </header>\n      <div class="source-card \${stateClass}">\n        <div class="source-card-heading"><strong>\${escapeHtml(source.fileName)}</strong><span>\${escapeHtml(stateLabel)}</span></div>\n        <table><tbody>\n          <tr><td>Biçim</td><td>\${escapeHtml(source.format.toUpperCase())}</td></tr>\n          <tr><td>Nokta sayısı</td><td>\${source.pointCount}</td></tr>\n          <tr><td>En büyük azimut boşluğu</td><td>\${metricNumberFormatters.degree.format(source.maximumAzimuthGapDeg)}°</td></tr>\n          <tr><td>Dosya boyutu</td><td>\${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>\n          <tr><td>İçe aktarma</td><td>\${formatDate(source.importedAtIso)}</td></tr>\n          <tr><td>SHA-256</td><td><code>\${escapeHtml(source.sha256)}</code></td></tr>\n        </tbody></table>\n        \${source.warnings.length > 0 ? \`<h3>Kaynak uyarıları</h3><ul class="warnings">\${source.warnings.map((warning) => \`<li>\${escapeHtml(warning)}</li>\`).join('')}</ul>\` : ''}\n        <p class="muted">Bu kayıt dosyanın ham baytlarını içermez; doğrulanmış/normalize edilmiş geometrik skyline noktalarını ve kaynak bütünlük özetini taşır. Profilin yıldız hesabında uygulanıp uygulanmadığı ilgili Yıldız Gözlemi prediction anlık görüntüsünde ayrıca kaydedilir.</p>\n      </div>\n    </section>\`;\n}\n\n`;
  source = replaceExactlyOnce(source, anchor, `${section}${anchor}`, 'stellar source report section');
}

source = replaceExactlyOnce(
  source,
  `  const isCelestial = experiment.scenarioId === 'sun-moon-observation';\n  const isShadowObservation = experiment.scenarioId === 'shadow-observation';\n  const isAstronomyObservation = isCelestial || isShadowObservation;`,
  `  const isCelestial = experiment.scenarioId === 'sun-moon-observation';\n  const isShadowObservation = experiment.scenarioId === 'shadow-observation';\n  const isStellarObservation = experiment.scenarioId === 'stellar-observation';\n  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation;`,
  'stellar astronomy report classification'
);

source = replaceExactlyOnce(
  source,
  `    <div class="input-card"><small>\${isShadowObservation ? '6.3 hesap türü' : '6.1–6.2 hesap türü'}</small><strong>\${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : 'Geometrik Güneş konumu ve topocentrik Ay referansı'}</strong></div>`,
  `    <div class="input-card"><small>\${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : '6.1–6.2 hesap türü'}</small><strong>\${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : 'Geometrik Güneş konumu ve topocentrik Ay referansı'}</strong></div>`,
  'stellar report input card'
);

source = replaceExactlyOnce(
  source,
  `    \${textSetupHistorySection(experiment)}\n    \${experiment.predictions.map((prediction) => predictionSection(`,
  `    \${textSetupHistorySection(experiment)}\n    \${stellarLocalHorizonSourceSection(experiment)}\n    \${experiment.predictions.map((prediction) => predictionSection(`,
  'stellar report section insertion'
);

fs.writeFileSync(file, source);
