#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, marker: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding='utf-8')
    if marker in text:
        print(f'[ok] {path}: already applied ({marker})')
        return
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one replacement for {marker}, found {count}')
    target.write_text(text.replace(old, new), encoding='utf-8')
    print(f'[updated] {path}: {marker}')


# 1) Route prediction must carry both endpoints so report/import snapshots are self-describing.
replace_once(
    'src/simulation/solar-route-comparison.ts',
    """export function createSolarRouteComparisonPrediction(\n  result: SolarRouteComparisonResult\n): ModelPrediction {\n  return {\n""",
    """export function createSolarRouteComparisonPrediction(\n  result: SolarRouteComparisonResult\n): ModelPrediction {\n  const start = result.samples[0]!;\n  const end = result.samples[result.samples.length - 1]!;\n  return {\n""",
    'const start = result.samples[0]!;'
)
replace_once(
    'src/simulation/solar-route-comparison.ts',
    """    metrics: [\n      { key: 'routeDistanceM', label: 'WGS84 rota mesafesi', value: result.routeDistanceM, unit: 'm' },\n""",
    """    metrics: [\n      { key: 'routeStartLatitudeDeg', label: 'Rota A enlemi', value: start.latitudeDeg, unit: 'deg' },\n      { key: 'routeStartLongitudeDeg', label: 'Rota A boylamı', value: start.longitudeDeg, unit: 'deg' },\n      { key: 'routeEndLatitudeDeg', label: 'Rota B enlemi', value: end.latitudeDeg, unit: 'deg' },\n      { key: 'routeEndLongitudeDeg', label: 'Rota B boylamı', value: end.longitudeDeg, unit: 'deg' },\n      { key: 'routeDistanceM', label: 'WGS84 rota mesafesi', value: result.routeDistanceM, unit: 'm' },\n""",
    "routeEndLongitudeDeg'")

# 2) AppNext owns all Aşama 7 derived astronomy snapshots so save/reopen and portable export use the same values.
replace_once(
    'src/renderer/src/AppNext.tsx',
    """import {\n  calculateSolarDayEvents,\n  createSolarDayEventsPrediction,\n  solarDayEventsMetadata\n} from '../../simulation/solar-day-events';\nimport { calculateLunarPosition } from '../../simulation/lunar-position';\n""",
    """import {\n  calculateSolarDayEvents,\n  createSolarDayEventsPrediction,\n  solarDayEventsMetadata\n} from '../../simulation/solar-day-events';\nimport {\n  calculateSolarSeasonEvents,\n  createSolarSeasonEventsPrediction,\n  solarSeasonEventsMetadata\n} from '../../simulation/solar-season-events';\nimport {\n  calculateSolarTimeOffset,\n  createSolarTimeOffsetPrediction,\n  solarTimeOffsetMetadata\n} from '../../simulation/solar-time-offset';\nimport {\n  calculateSolarRouteComparison,\n  createSolarRouteComparisonPrediction,\n  solarRouteComparisonMetadata\n} from '../../simulation/solar-route-comparison';\nimport { calculateLunarPosition } from '../../simulation/lunar-position';\n""",
    "solarRouteComparisonMetadata\n} from '../../simulation/solar-route-comparison';"
)

replace_once(
    'src/renderer/src/AppNext.tsx',
    """  const solarDayEventsPrediction = useMemo(() => solarDayEventsResult\n    ? createSolarDayEventsPrediction(solarDayEventsResult)\n    : undefined, [solarDayEventsResult]);\n  const lunarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition\n""",
    """  const solarDayEventsPrediction = useMemo(() => solarDayEventsResult\n    ? createSolarDayEventsPrediction(solarDayEventsResult)\n    : undefined, [solarDayEventsResult]);\n  const solarTimeOffsetResult = useMemo(() => activeScenarioId === 'sun-moon-observation'\n    ? calculateSolarTimeOffset({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        utcOffsetMinutes: observationUtcOffsetMinutes,\n        longitudeDeg: inputs.observerLongitudeDeg\n      })\n    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLongitudeDeg, observationUtcOffsetMinutes]);\n  const solarTimeOffsetPrediction = useMemo(() => solarTimeOffsetResult\n    ? createSolarTimeOffsetPrediction(solarTimeOffsetResult)\n    : undefined, [solarTimeOffsetResult]);\n  const solarSeasonEventsResult = useMemo(() => {\n    if (activeScenarioId !== 'sun-moon-observation' || !solarDayEventsResult) return undefined;\n    const year = Number(solarDayEventsResult.localDate.slice(0, 4));\n    if (!Number.isInteger(year) || year < 1900 || year > 2100) return undefined;\n    return calculateSolarSeasonEvents({\n      experimentId: activeExperimentId,\n      year,\n      latitudeDeg: inputs.observerLatitudeDeg,\n      longitudeDeg: inputs.observerLongitudeDeg,\n      utcOffsetMinutes: observationUtcOffsetMinutes\n    });\n  }, [activeExperimentId, activeScenarioId, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, observationUtcOffsetMinutes, solarDayEventsResult]);\n  const solarSeasonEventsPrediction = useMemo(() => solarSeasonEventsResult\n    ? createSolarSeasonEventsPrediction(solarSeasonEventsResult)\n    : undefined, [solarSeasonEventsResult]);\n  const solarRouteComparisonCalculation = useMemo(() => {\n    if (activeScenarioId !== 'sun-moon-observation') return {} as { result?: ReturnType<typeof calculateSolarRouteComparison>; error?: string };\n    try {\n      return {\n        result: calculateSolarRouteComparison({\n          experimentId: activeExperimentId,\n          observedAtIso: experimentObservedAtIso,\n          utcOffsetMinutes: observationUtcOffsetMinutes,\n          startLatitudeDeg: inputs.observerLatitudeDeg,\n          startLongitudeDeg: inputs.observerLongitudeDeg,\n          endLatitudeDeg: inputs.targetLatitudeDeg,\n          endLongitudeDeg: inputs.targetLongitudeDeg,\n          sampleCount: 5\n        })\n      };\n    } catch (error) {\n      return { error: error instanceof Error ? error.message : 'Rota karşılaştırması hesaplanamadı.' };\n    }\n  }, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, inputs.targetLatitudeDeg, inputs.targetLongitudeDeg, observationUtcOffsetMinutes]);\n  const solarRouteComparisonResult = solarRouteComparisonCalculation.result;\n  const solarRouteComparisonPrediction = useMemo(() => solarRouteComparisonResult\n    ? createSolarRouteComparisonPrediction(solarRouteComparisonResult)\n    : undefined, [solarRouteComparisonResult]);\n  const lunarPosition = useMemo(() => (activeScenarioId === 'sun-moon-observation' || activeScenarioId === 'eclipse-simulation') && solarPosition\n""",
    'const solarRouteComparisonPrediction = useMemo(() => solarRouteComparisonResult'
)

replace_once(
    'src/renderer/src/AppNext.tsx',
    """        ...(solarDayEventsPrediction\n          ? [[solarDayEventsMetadata.id, solarDayEventsMetadata.version] as const]\n          : []),\n        ...(lunarPositionPrediction\n""",
    """        ...(solarDayEventsPrediction\n          ? [[solarDayEventsMetadata.id, solarDayEventsMetadata.version] as const]\n          : []),\n        ...(solarTimeOffsetPrediction\n          ? [[solarTimeOffsetMetadata.id, solarTimeOffsetMetadata.version] as const]\n          : []),\n        ...(solarSeasonEventsPrediction\n          ? [[solarSeasonEventsMetadata.id, solarSeasonEventsMetadata.version] as const]\n          : []),\n        ...(solarRouteComparisonPrediction\n          ? [[solarRouteComparisonMetadata.id, solarRouteComparisonMetadata.version] as const]\n          : []),\n        ...(lunarPositionPrediction\n""",
    '[[solarRouteComparisonMetadata.id, solarRouteComparisonMetadata.version] as const]'
)

replace_once(
    'src/renderer/src/AppNext.tsx',
    """        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...(solarDayEventsPrediction ? [solarDayEventsPrediction] : []),\n        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),\n""",
    """        ...(solarPositionPrediction ? [solarPositionPrediction] : []),\n        ...(solarDayEventsPrediction ? [solarDayEventsPrediction] : []),\n        ...(solarTimeOffsetPrediction ? [solarTimeOffsetPrediction] : []),\n        ...(solarSeasonEventsPrediction ? [solarSeasonEventsPrediction] : []),\n        ...(solarRouteComparisonPrediction ? [solarRouteComparisonPrediction] : []),\n        ...(lunarPositionPrediction ? [lunarPositionPrediction] : []),\n""",
    '...(solarRouteComparisonPrediction ? [solarRouteComparisonPrediction] : [])'
)

replace_once(
    'src/renderer/src/AppNext.tsx',
    """                  <SolarDayEventsPanel result={solarDayEventsResult} onShowTrace={() => setTraceModelId(solarDayEventsMetadata.id)} />\n""",
    """                  <SolarDayEventsPanel\n                    result={solarDayEventsResult}\n                    solarTimeResult={solarTimeOffsetResult!}\n                    seasonResult={solarSeasonEventsResult}\n                    routeResult={solarRouteComparisonResult}\n                    routeError={solarRouteComparisonCalculation.error}\n                    routeEndLatitudeDeg={inputs.targetLatitudeDeg}\n                    routeEndLongitudeDeg={inputs.targetLongitudeDeg}\n                    onRouteEndCoordinateChange={(key, value) => handleNumberChange(\n                      key === 'latitude' ? 'targetLatitudeDeg' : 'targetLongitudeDeg',\n                      value\n                    )}\n                    onShowTrace={() => setTraceModelId(solarDayEventsMetadata.id)}\n                  />\n""",
    'routeEndLatitudeDeg={inputs.targetLatitudeDeg}'
)

# 3) Report: readable astronomy group, model names, UTC timestamps and route-B provenance.
replace_once(
    'src/report/html-report.ts',
    """  'solar-day-events': 'Gün Doğumu / Batımı · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',\n  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans',\n""",
    """  'solar-day-events': 'Gün Doğumu / Batımı · Astronomik Referans',\n  'solar-time-offset': 'Sivil Saat / Güneş Zamanı · Astronomik Referans',\n  'solar-season-events': 'Ekinoks / Gündönümü · Yıllık Güneş Referansı',\n  'solar-route-comparison': 'Güneş Rota Karşılaştırması · Astronomik Referans',\n  'lunar-position-low-precision': 'Ay Konumu ve Fazı · Astronomik Referans',\n  'solar-eclipse-overlap-low-precision': 'Güneş Tutulması Anlık Geometrisi · Düşük Hassasiyetli Referans',\n  'solar-eclipse-event-search-low-precision': 'Güneş Tutulması Yerel Olay Araması · Düşük Hassasiyetli Referans',\n  'solar-shadow-observation': 'Gölge Geometrisi · Astronomik Referans',\n""",
    "'solar-route-comparison': 'Güneş Rota Karşılaştırması · Astronomik Referans'"
)

replace_once(
    'src/report/html-report.ts',
    """};\n\nconst datumLabels: Record<VerticalDatumKind, string> = {\n""",
    """};\n\nconst astronomyModelIds = new Set([\n  'solar-position-noaa',\n  'solar-day-events',\n  'solar-time-offset',\n  'solar-season-events',\n  'solar-route-comparison',\n  'lunar-position-low-precision',\n  'solar-eclipse-overlap-low-precision',\n  'solar-eclipse-event-search-low-precision',\n  'solar-shadow-observation',\n  'dual-shadow-comparison',\n  'stellar-observation-reference'\n]);\n\nconst datumLabels: Record<VerticalDatumKind, string> = {\n""",
    'const astronomyModelIds = new Set(['
)

replace_once(
    'src/report/html-report.ts',
    """  if (metric.unit === 'deg') {\n    return `${metricNumberFormatters.degree.format(metric.value)}°`;\n  }\n  if (metric.unit === 'count') {\n""",
    """  if (metric.unit === 'deg') {\n    return `${metricNumberFormatters.degree.format(metric.value)}°`;\n  }\n  if (metric.unit === 'unix-ms') {\n    return formatDate(new Date(metric.value).toISOString());\n  }\n  if (metric.unit === 'boolean') {\n    return metric.value >= 0.5 ? 'Evet' : 'Hayır';\n  }\n  if (metric.unit === 'count') {\n""",
    "metric.unit === 'unix-ms'"
)

replace_once(
    'src/report/html-report.ts',
    """function geodesicSection(experiment: SavedExperiment): string {\n""",
    """function astronomyResultsSection(experiment: SavedExperiment): string {\n  const predictions = experiment.predictions.filter((prediction) => astronomyModelIds.has(prediction.modelId));\n  if (predictions.length === 0) return '';\n  const observedAtIso = experiment.observedAtIso ?? experiment.createdAtIso;\n  return `\n    <div class=\"astronomy-group\">\n      <div class=\"astronomy-group-heading\">\n        <div><span class=\"eyebrow\">Aşama 7 · kaydedilmiş astronomi anlık görüntüleri</span><h2>Astronomi sonuçları</h2></div>\n        <strong>${predictions.length} hesap kaydı</strong>\n      </div>\n      <p>Bu bölüm kaydedilen gözlem anı (${formatDate(observedAtIso)}), açık UTC ofseti ve model sürümleriyle birlikte saklanan Güneş, Ay, tutulma, mevsim, Güneş zamanı ve rota karşılaştırması sonuçlarını gösterir.</p>\n      ${predictions.map((prediction) => predictionSection(\n        prediction,\n        experiment.modelVersions[prediction.modelId]\n      )).join('')}\n    </div>`;\n}\n\nfunction geodesicSection(experiment: SavedExperiment): string {\n""",
    'function astronomyResultsSection(experiment: SavedExperiment)'
)

replace_once(
    'src/report/html-report.ts',
    """  const isStellarObservation = experiment.scenarioId === 'stellar-observation';\n  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation;\n""",
    """  const isStellarObservation = experiment.scenarioId === 'stellar-observation';\n  const isEclipseObservation = experiment.scenarioId === 'eclipse-simulation';\n  const isAstronomyObservation = isCelestial || isShadowObservation || isStellarObservation || isEclipseObservation;\n""",
    'const isEclipseObservation = experiment.scenarioId'
)

replace_once(
    'src/report/html-report.ts',
    """    <div class=\"input-card\"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>\n    <div class=\"input-card\"><small>${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : '6.1–6.2 hesap türü'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : 'Geometrik Güneş konumu ve topocentrik Ay referansı'}</strong></div>` : `\n""",
    """    <div class=\"input-card\"><small>Gözlemci koordinatı</small><strong>${coordinateFormatter.format(inputs.observerLatitudeDeg)}°, ${coordinateFormatter.format(inputs.observerLongitudeDeg)}°</strong></div>\n    ${isCelestial ? `<div class=\"input-card\"><small>Rota karşılaştırması B</small><strong>${coordinateFormatter.format(inputs.targetLatitudeDeg)}°, ${coordinateFormatter.format(inputs.targetLongitudeDeg)}°</strong></div>` : ''}\n    <div class=\"input-card\"><small>${isShadowObservation ? '6.3 hesap türü' : isStellarObservation ? 'Yıldız gözlemi' : isEclipseObservation ? 'Tutulma hesabı' : 'Aşama 7 astronomi'}</small><strong>${isShadowObservation ? 'Dikey gnomon gölge geometrisi' : isStellarObservation ? 'Katalog yıldızı, precession ve geometrik skyline izi' : isEclipseObservation ? 'Anlık Güneş–Ay disk geometrisi ve kontrollü olay araması' : 'Güneş/Ay, günlük/yıllık olaylar, Güneş zamanı ve WGS84 rota karşılaştırması'}</strong></div>` : `\n""",
    'Rota karşılaştırması B'
)

replace_once(
    'src/report/html-report.ts',
    """    .model-section { margin: 18px 0; padding: 24px; page-break-inside: avoid; }\n    .geodesic-section { border-top: 4px solid #2b79ad; }\n""",
    """    .model-section { margin: 18px 0; padding: 24px; page-break-inside: avoid; }\n    .astronomy-group { margin: 18px 0; padding: 18px; border: 1px solid #d5c58a; border-top: 4px solid #d39a28; border-radius: 10px; background: #fffdf6; }\n    .astronomy-group > .model-section { background: #fff; }\n    .astronomy-group-heading { display: flex; justify-content: space-between; gap: 16px; align-items: end; padding: 4px 6px 14px; border-bottom: 1px solid #eadfb8; }\n    .astronomy-group-heading strong { color: #7a5a18; }\n    .geodesic-section { border-top: 4px solid #2b79ad; }\n""",
    '.astronomy-group-heading {'
)

replace_once(
    'src/report/html-report.ts',
    """    ${stellarLocalHorizonSourceSection(experiment)}\n    ${stellarMotionSourceSection(experiment)}\n    ${experiment.predictions.map((prediction) => predictionSection(\n      prediction,\n      experiment.modelVersions[prediction.modelId]\n    )).join('')}\n""",
    """    ${stellarLocalHorizonSourceSection(experiment)}\n    ${stellarMotionSourceSection(experiment)}\n    ${astronomyResultsSection(experiment)}\n    ${experiment.predictions\n      .filter((prediction) => !astronomyModelIds.has(prediction.modelId))\n      .map((prediction) => predictionSection(\n        prediction,\n        experiment.modelVersions[prediction.modelId]\n      )).join('')}\n""",
    '${astronomyResultsSection(experiment)}'
)

# 4) Application version.
replace_once(
    'package.json',
    '"version": "1.26.0"',
    '"version": "1.27.0"',
    '"version": "1.27.0"'
)
replace_once(
    'src/preload/index.ts',
    "version: '1.26.0'",
    "version: '1.27.0'",
    "version: '1.27.0'"
)

print('\nStage 7.8 integration applied successfully.')
