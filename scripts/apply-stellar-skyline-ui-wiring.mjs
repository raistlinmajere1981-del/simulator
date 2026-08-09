import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const file = 'src/renderer/src/AppNext.tsx';
let source = fs.readFileSync(file, 'utf8');

source = replaceExactlyOnce(
  source,
  `import type { SavedPhotoCalibration } from '../../shared/photo-calibration';`,
  `import type { SavedPhotoCalibration } from '../../shared/photo-calibration';\nimport type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';`,
  'stellar skyline source import'
);

source = replaceExactlyOnce(
  source,
  `  const [stellarObservationSettings, setStellarObservationSettings] = useState<StellarObservationSettings>(() => ({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS }));\n  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(`,
  `  const [stellarObservationSettings, setStellarObservationSettings] = useState<StellarObservationSettings>(() => ({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS }));\n  const [stellarLocalHorizonSource, setStellarLocalHorizonSource] = useState<SavedStellarLocalHorizonSource>();\n  const [manualTerrainPoints, setManualTerrainPoints] = useState<ManualTerrainPoint[]>(`,
  'stellar skyline state'
);

const oldCalculation = `  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'\n    ? calculateStellarObservation({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        settings: stellarObservationSettings\n      })\n    : undefined, [activeExperimentId, activeScenarioId, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarObservationSettings]);`;
const newCalculation = `  const appliedExternalStellarLocalHorizonSource = stellarObservationSettings.localHorizonSourceMode === 'external'\n    ? stellarLocalHorizonSource\n    : undefined;\n  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'\n    ? calculateStellarObservation({\n        experimentId: activeExperimentId,\n        observedAtIso: experimentObservedAtIso,\n        latitudeDeg: inputs.observerLatitudeDeg,\n        longitudeDeg: inputs.observerLongitudeDeg,\n        settings: stellarObservationSettings,\n        ...(appliedExternalStellarLocalHorizonSource\n          ? { externalLocalHorizonSource: appliedExternalStellarLocalHorizonSource }\n          : {})\n      })\n    : undefined, [activeExperimentId, activeScenarioId, appliedExternalStellarLocalHorizonSource, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarObservationSettings]);`;
source = replaceExactlyOnce(source, oldCalculation, newCalculation, 'stellar calculation external source');

if (!source.includes('const importStellarLocalHorizon = async')) {
  const anchor = `  const loadExperiment = (saved: SavedExperiment): void => {`;
  const handler = `  const importStellarLocalHorizon = async (): Promise<SavedStellarLocalHorizonSource | undefined> => {\n    try {\n      const result = await window.simulatorDesktop.importStellarLocalHorizon();\n      setStorageMessage(result.message);\n      if (result.status !== 'success' || !result.profile) return undefined;\n      const nextSource: SavedStellarLocalHorizonSource = {\n        ...result.profile,\n        points: result.profile.points.map((point) => ({ ...point })),\n        warnings: [...result.profile.warnings],\n        modifiedAfterImport: false\n      };\n      setStellarLocalHorizonSource(nextSource);\n      setIsDirty(true);\n      setStorageMessage(\`“\${nextSource.fileName}” skyline kaynağı hazır: \${nextSource.pointCount} nokta doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.\`);\n      return nextSource;\n    } catch (error) {\n      const message = error instanceof Error ? error.message : 'Skyline profili içe aktarılamadı.';\n      setStorageMessage(message);\n      throw error;\n    }\n  };\n\n`;
  source = replaceExactlyOnce(source, anchor, `${handler}${anchor}`, 'stellar skyline import handler');
}

const stellarPredictionBlock = `    const stellarPrediction = saved.predictions.find(\n      (prediction) => prediction.modelId === STELLAR_OBSERVATION_MODEL_ID\n    );`;
const stellarPredictionWithState = `${stellarPredictionBlock}\n    const storedStellarSettings = readStellarObservationSettings(stellarPrediction);\n    const storedStellarSource = saved.stellarLocalHorizonSource\n      ? {\n          ...saved.stellarLocalHorizonSource,\n          points: saved.stellarLocalHorizonSource.points.map((point) => ({ ...point })),\n          warnings: [...saved.stellarLocalHorizonSource.warnings]\n        }\n      : undefined;\n    const safeStellarSettings = storedStellarSettings.localHorizonSourceMode === 'external' && !storedStellarSource\n      ? { ...storedStellarSettings, localHorizonEnabled: false, localHorizonSourceMode: 'manual' as const }\n      : storedStellarSettings;`;
source = replaceExactlyOnce(source, stellarPredictionBlock, stellarPredictionWithState, 'load stored stellar source');
source = replaceExactlyOnce(
  source,
  `    setStellarObservationSettings(readStellarObservationSettings(stellarPrediction));\n    setInputs(saved.inputs);`,
  `    setStellarObservationSettings(safeStellarSettings);\n    setStellarLocalHorizonSource(storedStellarSource);\n    setInputs(saved.inputs);`,
  'load stellar source state'
);

source = replaceExactlyOnce(
  source,
  `      ...(textSetupHistory.length > 0 ? { textSetupHistory } : {}),\n      inputs,`,
  `      ...(textSetupHistory.length > 0 ? { textSetupHistory } : {}),\n      ...(stellarLocalHorizonSource ? { stellarLocalHorizonSource } : {}),\n      inputs,`,
  'save stellar source'
);

source = replaceExactlyOnce(
  source,
  `      setStellarObservationSettings(readStellarObservationSettings(savedStellarPrediction));\n      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);`,
  `      {\n        const reopenedStellarSettings = readStellarObservationSettings(savedStellarPrediction);\n        const reopenedStellarSource = saved.stellarLocalHorizonSource\n          ? {\n              ...saved.stellarLocalHorizonSource,\n              points: saved.stellarLocalHorizonSource.points.map((point) => ({ ...point })),\n              warnings: [...saved.stellarLocalHorizonSource.warnings]\n            }\n          : undefined;\n        setStellarLocalHorizonSource(reopenedStellarSource);\n        setStellarObservationSettings(reopenedStellarSettings.localHorizonSourceMode === 'external' && !reopenedStellarSource\n          ? { ...reopenedStellarSettings, localHorizonEnabled: false, localHorizonSourceMode: 'manual' }\n          : reopenedStellarSettings);\n      }\n      setExperimentObservedAtIso(saved.observedAtIso ?? saved.createdAtIso);`,
  'post-save stellar source reopen'
);

if (!source.includes('externalLocalHorizonSource={stellarLocalHorizonSource}')) {
  source = replaceExactlyOnce(
    source,
    `                  settings={stellarObservationSettings}\n                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}`,
    `                  settings={stellarObservationSettings}\n                  externalLocalHorizonSource={stellarLocalHorizonSource}\n                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onImportLocalHorizon={importStellarLocalHorizon}\n                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}`,
    'stellar panel props'
  );
}

const resetLine = `setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });`;
const resetWithSource = `setStellarObservationSettings({ ...DEFAULT_STELLAR_OBSERVATION_SETTINGS });\n      setStellarLocalHorizonSource(undefined);`;
if (!source.includes(resetWithSource)) {
  const count = source.split(resetLine).length - 1;
  if (count < 3) throw new Error(`stellar reset occurrences unexpectedly low: ${count}`);
  source = source.replaceAll(resetLine, resetWithSource);
}

fs.writeFileSync(file, source);
