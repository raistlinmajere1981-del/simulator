import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const text = fs.readFileSync(path, 'utf8');
  const count = text.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: beklenen parça ${count} kez bulundu`);
  fs.writeFileSync(path, text.replace(before, after));
}

function appendOnce(path, marker, content) {
  const text = fs.readFileSync(path, 'utf8');
  if (text.includes(marker)) return;
  fs.writeFileSync(path, `${text.trimEnd()}\n\n${content.trim()}\n`);
}

// stellar-observation.ts
const observation = 'src/simulation/stellar-observation.ts';
replaceOnce(
  observation,
  "import { calculateStellarPosition, type StellarPositionResult } from './stellar-position';",
  "import { calculateStellarSkySnapshot, type StellarSkySnapshotResult } from './stellar-sky-snapshot';\nimport { calculateStellarPosition, type StellarPositionResult } from './stellar-position';"
);
replaceOnce(
  observation,
  "export const STELLAR_OBSERVATION_MODEL_VERSION = '0.4.0';",
  "export const STELLAR_OBSERVATION_MODEL_VERSION = '0.5.0';"
);
replaceOnce(
  observation,
  "  apparentDiagnostic: StellarApparentDiagnosticResult;\n  apparentTrailSamples: StellarObservationApparentTrailSample[];\n  traceId: string;",
  "  apparentDiagnostic: StellarApparentDiagnosticResult;\n  apparentTrailSamples: StellarObservationApparentTrailSample[];\n  skySnapshot: StellarSkySnapshotResult;\n  traceId: string;"
);
replaceOnce(
  observation,
  "  const apparentTrailSamples: StellarObservationApparentTrailSample[] = trail.samples.map((sample) => {\n    const refraction = calculateStellarAtmosphericRefraction(sample.elevationDeg);\n    return {\n      observedAtIso: sample.observedAtIso,\n      elapsedMinutes: sample.elapsedMinutes,\n      geometricAltitudeDeg: sample.elevationDeg,\n      apparentAltitudeDeg: refraction.apparentAltitudeDeg,\n      refractionCorrectionArcmin: refraction.refractionCorrectionArcmin,\n      aboveApparentAstronomicalHorizon: refraction.aboveApparentAstronomicalHorizon\n    };\n  });\n\n  const localHorizonWarning",
  "  const apparentTrailSamples: StellarObservationApparentTrailSample[] = trail.samples.map((sample) => {\n    const refraction = calculateStellarAtmosphericRefraction(sample.elevationDeg);\n    return {\n      observedAtIso: sample.observedAtIso,\n      elapsedMinutes: sample.elapsedMinutes,\n      geometricAltitudeDeg: sample.elevationDeg,\n      apparentAltitudeDeg: refraction.apparentAltitudeDeg,\n      refractionCorrectionArcmin: refraction.refractionCorrectionArcmin,\n      aboveApparentAstronomicalHorizon: refraction.aboveApparentAstronomicalHorizon\n    };\n  });\n  const skySnapshot = calculateStellarSkySnapshot({\n    observedAtIso: input.observedAtIso,\n    latitudeDeg: input.latitudeDeg,\n    longitudeDeg: input.longitudeDeg,\n    horizonMask: localHorizon.mask ?? undefined\n  });\n\n  const localHorizonWarning"
);
replaceOnce(
  observation,
  "      {\n        id: 'standard-refraction-diagnostic',",
  "      {\n        id: 'sky-snapshot-summary',\n        title: 'Çoklu yıldız gökyüzü snapshotı',\n        formula: 'BSC5P altkümesi → her yıldız için precession → (h,A)',\n        substitution: `${skySnapshot.starCount} katalog yıldızı · t=${skySnapshot.observedAtIso}`,\n        result: `geometrik 0° üstü=${skySnapshot.aboveGeometricHorizonCount}; altı=${skySnapshot.belowGeometricHorizonCount}${skySnapshot.localHorizonCounts ? `; yerel skyline üstü=${skySnapshot.localHorizonCounts.above}` : ''}`\n      },\n      {\n        id: 'standard-refraction-diagnostic',"
);
replaceOnce(
  observation,
  "    apparentDiagnostic,\n    apparentTrailSamples,\n    traceId,",
  "    apparentDiagnostic,\n    apparentTrailSamples,\n    skySnapshot,\n    traceId,"
);
replaceOnce(
  observation,
  "  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.',",
  "  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü ve 19-yıldız çoklu gökyüzü snapshotını gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.',"
);
replaceOnce(
  observation,
  "      { key: 'starAboveGeometricHorizon', label: 'Geometrik 0° ufkun üstünde', value: result.position.aboveGeometricHorizon ? 1 : 0, unit: 'boolean' },\n      { key: 'stellarTrailDurationMinutes'",
  "      { key: 'starAboveGeometricHorizon', label: 'Geometrik 0° ufkun üstünde', value: result.position.aboveGeometricHorizon ? 1 : 0, unit: 'boolean' },\n      { key: 'stellarSkySnapshotStarCount', label: 'Çoklu yıldız snapshot katalog sayısı', value: result.skySnapshot.starCount, unit: 'count' },\n      { key: 'stellarSkySnapshotGeometricAboveCount', label: 'Çoklu yıldız snapshot geometrik 0° üstü', value: result.skySnapshot.aboveGeometricHorizonCount, unit: 'count' },\n      { key: 'stellarSkySnapshotLocalAboveCount', label: 'Çoklu yıldız snapshot yerel skyline üstü', value: result.skySnapshot.localHorizonCounts?.above ?? null, unit: 'count' },\n      { key: 'stellarTrailDurationMinutes'"
);

// StellarObservationPanel.tsx
const panel = 'src/renderer/src/StellarObservationPanel.tsx';
replaceOnce(
  panel,
  "import { DraftNumberInput } from './DraftNumberInput';\nimport './stellar-observation-panel.css';",
  "import { DraftNumberInput } from './DraftNumberInput';\nimport { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';\nimport './stellar-observation-panel.css';"
);
replaceOnce(
  panel,
  "  const [showRefractionDiagnostic, setShowRefractionDiagnostic] = useState(false);",
  "  const [showRefractionDiagnostic, setShowRefractionDiagnostic] = useState(false);\n  const [showSkySnapshot, setShowSkySnapshot] = useState(false);"
);
replaceOnce(
  panel,
  "  const apparent = result.apparentDiagnostic;\n  const sourceDraftDirty",
  "  const apparent = result.apparentDiagnostic;\n  const skyStars = result.skySnapshot.stars.filter((star) => star.aboveGeometricHorizon && star.azimuthDeg !== null);\n  const brightestSkyStarIds = new Set(\n    [...skyStars]\n      .sort((left, right) => left.visualMagnitude - right.visualMagnitude)\n      .slice(0, 5)\n      .map((star) => star.starId)\n  );\n  brightestSkyStarIds.add(settings.starId);\n  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);\n  const sourceDraftDirty"
);
const skyPanel = `      <div className={showSkySnapshot ? 'stellar-sky-panel active' : 'stellar-sky-panel'}>\n        <div className="stellar-sky-heading">\n          <div>\n            <strong>Çoklu yıldız gökyüzü · geometrik</strong>\n            <span>Zenit merkezde, 0° astronomik ufuk dış çemberde. Katalogdaki 19 yıldız aynı gözlem anında çözülür.</span>\n          </div>\n          <label className="stellar-sky-toggle">\n            <input\n              type="checkbox"\n              checked={showSkySnapshot}\n              onChange={(event) => setShowSkySnapshot(event.currentTarget.checked)}\n            />\n            <span>{showSkySnapshot ? 'Gösteriliyor' : 'Kapalı'}</span>\n          </label>\n        </div>\n        {showSkySnapshot && (\n          <>\n            <div className="stellar-sky-summary">\n              <span>Geometrik 0° üstü <strong>{result.skySnapshot.aboveGeometricHorizonCount}/{result.skySnapshot.starCount}</strong></span>\n              {result.skySnapshot.localHorizonCounts && (\n                <span>Yerel skyline <strong>üstünde {result.skySnapshot.localHorizonCounts.above} · sınır {result.skySnapshot.localHorizonCounts.onHorizon} · altında {result.skySnapshot.localHorizonCounts.below}</strong></span>\n              )}\n              {selectedSkyStar && !selectedSkyStar.aboveGeometricHorizon && (\n                <span>Seçili yıldız <strong>0° geometrik ufkun altında · haritada çizilmez</strong></span>\n              )}\n            </div>\n            <div className="stellar-sky-chart-wrap">\n              <svg aria-label="Katalog yıldızlarının zenit merkezli geometrik polar gökyüzü görünümü" role="img" viewBox="0 0 100 100">\n                <circle className="stellar-sky-horizon" cx="50" cy="50" r="43" />\n                <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="28.67" />\n                <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="14.33" />\n                <line className="stellar-sky-axis" x1="50" y1="7" x2="50" y2="93" />\n                <line className="stellar-sky-axis" x1="7" y1="50" x2="93" y2="50" />\n                <text className="stellar-sky-cardinal north" x="50" y="4.5">K</text>\n                <text className="stellar-sky-cardinal east" x="96" y="51.5">D</text>\n                <text className="stellar-sky-cardinal south" x="50" y="98.5">G</text>\n                <text className="stellar-sky-cardinal west" x="4" y="51.5">B</text>\n                <text className="stellar-sky-altitude-label" x="50" y="20.5">60°</text>\n                <text className="stellar-sky-altitude-label" x="50" y="35">30°</text>\n                {skyStars.map((star) => {\n                  const point = projectStellarSkyPoint({ elevationDeg: star.elevationDeg, azimuthDeg: star.azimuthDeg! });\n                  const selected = star.starId === settings.starId;\n                  const locallyBlocked = star.localHorizonStatus === 'below';\n                  const onLocalHorizon = star.localHorizonStatus === 'on-horizon';\n                  const className = selected\n                    ? 'stellar-sky-star selected'\n                    : locallyBlocked\n                      ? 'stellar-sky-star locally-blocked'\n                      : onLocalHorizon\n                        ? 'stellar-sky-star local-boundary'\n                        : 'stellar-sky-star';\n                  return (\n                    <g key={star.starId} className={className}>\n                      <title>{star.commonName} · h {angleFormatter.format(star.elevationDeg)}° · A {angleFormatter.format(star.azimuthDeg!)}° · V {angleFormatter.format(star.visualMagnitude)}</title>\n                      <circle cx={point.x} cy={point.y} r={stellarSkyMarkerRadius(star.visualMagnitude) + (selected ? 0.5 : 0)} />\n                      {brightestSkyStarIds.has(star.starId) && (\n                        <text x={point.x + 2.2} y={point.y - 1.8}>{star.commonName}</text>\n                      )}\n                    </g>\n                  );\n                })}\n              </svg>\n              <div className="stellar-sky-legend">\n                <span className="catalog-star">Geometrik 0° üstü katalog yıldızı</span>\n                <span className="selected-star">Seçili yıldız</span>\n                {result.skySnapshot.localHorizonApplied && <span className="blocked-star">Geometrik olarak yerel skyline altında</span>}\n              </div>\n            </div>\n            <p className="stellar-sky-note">\n              Bu harita üst geometrik yarımküreyi gösterir. Nokta büyüklüğü katalog görsel kadrini yalnız ayırt edici ölçek olarak kullanır; atmosferik sönümleme, gökyüzü parlaklığı ve çıplak-göz eşiği uygulanmadığı için optik görünürlük haritası değildir. Standart apparent tanı bu haritaya uygulanmaz.\n            </p>\n          </>\n        )}\n      </div>\n\n`;
replaceOnce(
  panel,
  "      <div className=\"stellar-coordinate-grid\">",
  `${skyPanel}      <div className="stellar-coordinate-grid">`
);

// CSS: append display-only sky chart styles.
appendOnce('src/renderer/src/stellar-observation-panel.css', '.stellar-sky-panel {', `
.stellar-sky-panel {
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 9px;
  padding: 11px 12px;
  background: rgba(6, 10, 18, 0.24);
  display: grid;
  gap: 10px;
}

.stellar-sky-panel.active {
  border-color: rgba(126, 153, 214, 0.3);
  background: rgba(87, 110, 167, 0.06);
}

.stellar-sky-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stellar-sky-heading > div { display: grid; gap: 3px; }
.stellar-sky-heading strong { font-size: 12px; }
.stellar-sky-heading > div > span,
.stellar-sky-note {
  color: var(--text-muted, #8f9aae);
  font-size: 10px;
  line-height: 1.45;
}

.stellar-sky-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: max-content;
  font-size: 11px;
  font-weight: 700;
}

.stellar-sky-toggle input {
  width: 16px;
  height: 16px;
  accent-color: #7d9bd7;
}

.stellar-sky-summary {
  display: flex;
  gap: 9px 18px;
  flex-wrap: wrap;
  color: var(--text-muted, #8f9aae);
  font-size: 10px;
}

.stellar-sky-summary strong { color: #dfe8f4; font-weight: 700; }

.stellar-sky-chart-wrap {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px 7px;
  background: rgba(4, 8, 15, 0.34);
}

.stellar-sky-chart-wrap svg {
  display: block;
  width: 100%;
  height: min(430px, 52vh);
  min-height: 300px;
}

.stellar-sky-horizon {
  fill: rgba(88, 112, 153, 0.035);
  stroke: rgba(220, 231, 244, 0.55);
  stroke-width: 0.45;
}

.stellar-sky-altitude-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.11);
  stroke-width: 0.28;
  stroke-dasharray: 1.4 1.4;
}

.stellar-sky-axis {
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 0.24;
}

.stellar-sky-cardinal {
  fill: #cbd8e6;
  font-size: 3.2px;
  font-weight: 800;
  text-anchor: middle;
}

.stellar-sky-cardinal.east,
.stellar-sky-cardinal.west { dominant-baseline: middle; }

.stellar-sky-altitude-label {
  fill: rgba(184, 198, 215, 0.62);
  font-size: 2.2px;
  text-anchor: middle;
}

.stellar-sky-star circle {
  fill: #dce8f5;
  stroke: rgba(7, 12, 20, 0.9);
  stroke-width: 0.35;
}

.stellar-sky-star text {
  fill: #b9c9d8;
  font-size: 2.35px;
  paint-order: stroke;
  stroke: rgba(4, 8, 14, 0.9);
  stroke-width: 0.7px;
  stroke-linejoin: round;
}

.stellar-sky-star.selected circle {
  fill: #81d7ff;
  stroke: #e7f7ff;
  stroke-width: 0.55;
}

.stellar-sky-star.selected text { fill: #bcecff; font-weight: 800; }

.stellar-sky-star.locally-blocked circle {
  fill: rgba(173, 184, 200, 0.2);
  stroke: #8c98aa;
  stroke-width: 0.45;
}

.stellar-sky-star.locally-blocked text { fill: #818da0; }

.stellar-sky-star.local-boundary circle {
  fill: #d6aa62;
  stroke: #f3d39b;
}

.stellar-sky-legend {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--text-muted, #8f9aae);
  font-size: 9px;
}

.stellar-sky-legend span::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 5px;
  border-radius: 50%;
  vertical-align: -1px;
  background: #dce8f5;
}

.stellar-sky-legend .selected-star::before { background: #81d7ff; }
.stellar-sky-legend .blocked-star::before { background: #687487; border: 1px solid #9aa7ba; }
.stellar-sky-note { margin: 0; }

@media (max-width: 720px) {
  .stellar-sky-heading { flex-direction: column; align-items: stretch; }
  .stellar-sky-chart-wrap svg { min-height: 250px; height: 46vh; }
}
`);

// package version
const packagePath = 'package.json';
replaceOnce(packagePath, '"version": "1.16.1"', '"version": "1.17.0"');

console.log('stage 6.21 patch applied');
