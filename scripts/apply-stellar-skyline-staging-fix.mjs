import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

{
  const file = 'tests/report.test.ts';
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    `expect(html).toContain('Taşınabilir deney şeması v7');`,
    `expect(html).toContain('Taşınabilir deney şeması v8');`
  );
  fs.writeFileSync(file, source);
}

{
  const file = 'src/renderer/src/AppNext.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = replaceExactlyOnce(
    source,
    `      setStellarLocalHorizonSource(nextSource);\n      setIsDirty(true);\n      setStorageMessage(\`“\${nextSource.fileName}” skyline kaynağı hazır: \${nextSource.pointCount} nokta doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.\`);`,
    `      setStorageMessage(\`“\${nextSource.fileName}” skyline kaynağı taslak olarak hazır: \${nextSource.pointCount} nokta doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.\`);`,
    'AppNext import staging'
  );
  source = replaceExactlyOnce(
    source,
    `                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onImportLocalHorizon={importStellarLocalHorizon}\n                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}`,
    `                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onImportLocalHorizon={importStellarLocalHorizon}\n                  onApplyLocalHorizon={(settings, source) => {\n                    setStellarObservationSettings(settings);\n                    setStellarLocalHorizonSource(source);\n                    setIsDirty(true);\n                  }}\n                  onShowTrace={() => setTraceModelId(stellarObservationMetadata.id)}`,
    'AppNext panel apply source'
  );
  fs.writeFileSync(file, source);
}

{
  const file = 'src/renderer/src/StellarObservationPanel.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = replaceExactlyOnce(
    source,
    `function localHorizonDraftMatchesSettings(\n  draft: LocalHorizonDraft,\n  settings: StellarObservationSettings\n): boolean {\n  return draft.localHorizonEnabled === settings.localHorizonEnabled &&\n    draft.localHorizonSourceMode === settings.localHorizonSourceMode &&\n    STELLAR_LOCAL_HORIZON_DIRECTIONS.every((direction) => draft[direction.key] === settings[direction.key]);\n}\n`,
    `function localHorizonDraftMatchesSettings(\n  draft: LocalHorizonDraft,\n  settings: StellarObservationSettings\n): boolean {\n  return draft.localHorizonEnabled === settings.localHorizonEnabled &&\n    draft.localHorizonSourceMode === settings.localHorizonSourceMode &&\n    STELLAR_LOCAL_HORIZON_DIRECTIONS.every((direction) => draft[direction.key] === settings[direction.key]);\n}\n\nfunction cloneExternalSource(\n  source: SavedStellarLocalHorizonSource | undefined\n): SavedStellarLocalHorizonSource | undefined {\n  return source\n    ? { ...source, points: source.points.map((point) => ({ ...point })), warnings: [...source.warnings] }\n    : undefined;\n}\n\nfunction externalSourceSignature(source: SavedStellarLocalHorizonSource | undefined): string {\n  return source ? \`\${source.sha256}|\${source.fileName}|\${source.importedAtIso}\` : '';\n}\n`
  , 'panel source helpers');
  source = replaceExactlyOnce(
    source,
    `  onChange,\n  onImportLocalHorizon,\n  onShowTrace`,
    `  onChange,\n  onImportLocalHorizon,\n  onApplyLocalHorizon,\n  onShowTrace`,
    'panel destructure apply'
  );
  source = replaceExactlyOnce(
    source,
    `  onChange(settings: StellarObservationSettings): void;\n  onImportLocalHorizon(): Promise<SavedStellarLocalHorizonSource | undefined>;\n  onShowTrace(): void;`,
    `  onChange(settings: StellarObservationSettings): void;\n  onImportLocalHorizon(): Promise<SavedStellarLocalHorizonSource | undefined>;\n  onApplyLocalHorizon(settings: StellarObservationSettings, source?: SavedStellarLocalHorizonSource): void;\n  onShowTrace(): void;`,
    'panel apply prop type'
  );
  source = replaceExactlyOnce(
    source,
    `  const [isImportingHorizon, setIsImportingHorizon] = useState(false);\n  const [horizonImportMessage, setHorizonImportMessage] = useState('');\n  const appliedLocalHorizonSignature = localHorizonSignature(settings);`,
    `  const [draftExternalLocalHorizonSource, setDraftExternalLocalHorizonSource] = useState<SavedStellarLocalHorizonSource | undefined>(() =>\n    cloneExternalSource(externalLocalHorizonSource)\n  );\n  const [isImportingHorizon, setIsImportingHorizon] = useState(false);\n  const [horizonImportMessage, setHorizonImportMessage] = useState('');\n  const appliedLocalHorizonSignature = localHorizonSignature(settings);\n  const appliedExternalSourceSignature = externalSourceSignature(externalLocalHorizonSource);`,
    'panel draft source state'
  );
  source = replaceExactlyOnce(
    source,
    `  useEffect(() => {\n    setLocalHorizonDraft(localHorizonDraftFromSettings(settings));\n  }, [appliedLocalHorizonSignature]);`,
    `  useEffect(() => {\n    setLocalHorizonDraft(localHorizonDraftFromSettings(settings));\n  }, [appliedLocalHorizonSignature]);\n\n  useEffect(() => {\n    setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));\n  }, [appliedExternalSourceSignature]);`,
    'panel draft source sync'
  );
  source = replaceExactlyOnce(
    source,
    `  const firstLocalSample = result.localHorizonTrail?.samples[0];\n  const localHorizonDirty = !localHorizonDraftMatchesSettings(localHorizonDraft, settings);\n  const usesExternalDraft = localHorizonDraft.localHorizonSourceMode === 'external';`,
    `  const firstLocalSample = result.localHorizonTrail?.samples[0];\n  const sourceDraftDirty = externalSourceSignature(draftExternalLocalHorizonSource) !== appliedExternalSourceSignature;\n  const localHorizonDirty = !localHorizonDraftMatchesSettings(localHorizonDraft, settings) || sourceDraftDirty;\n  const usesExternalDraft = localHorizonDraft.localHorizonSourceMode === 'external';`,
    'panel source dirty state'
  );
  source = replaceExactlyOnce(
    source,
    `    if (localHorizonDraft.localHorizonEnabled && usesExternalDraft && !externalLocalHorizonSource) {`,
    `    if (localHorizonDraft.localHorizonEnabled && usesExternalDraft && !draftExternalLocalHorizonSource) {`,
    'panel apply validate draft source'
  );
  source = replaceExactlyOnce(
    source,
    `    onChange({\n      ...settings,\n      ...localHorizonDraft\n    });`,
    `    onApplyLocalHorizon(\n      { ...settings, ...localHorizonDraft },\n      cloneExternalSource(draftExternalLocalHorizonSource)\n    );`,
    'panel atomic apply'
  );
  source = replaceExactlyOnce(
    source,
    `      setLocalHorizonDraft((current) => ({\n        ...current,\n        localHorizonEnabled: true,\n        localHorizonSourceMode: 'external'\n      }));`,
    `      setDraftExternalLocalHorizonSource(cloneExternalSource(imported));\n      setLocalHorizonDraft((current) => ({\n        ...current,\n        localHorizonEnabled: true,\n        localHorizonSourceMode: 'external'\n      }));`,
    'panel stage imported source'
  );
  source = source.replaceAll('disabled={!externalLocalHorizonSource}', 'disabled={!draftExternalLocalHorizonSource}');
  source = source.replaceAll('{externalLocalHorizonSource && (', '{draftExternalLocalHorizonSource && (');
  source = source.replaceAll('externalLocalHorizonSource.fileName', 'draftExternalLocalHorizonSource.fileName');
  source = source.replaceAll('externalLocalHorizonSource.format', 'draftExternalLocalHorizonSource.format');
  source = source.replaceAll('externalLocalHorizonSource.pointCount', 'draftExternalLocalHorizonSource.pointCount');
  source = source.replaceAll('externalLocalHorizonSource.maximumAzimuthGapDeg', 'draftExternalLocalHorizonSource.maximumAzimuthGapDeg');
  source = source.replaceAll('externalLocalHorizonSource.sha256', 'draftExternalLocalHorizonSource.sha256');
  source = source.replaceAll('externalLocalHorizonSource.fileSizeBytes', 'draftExternalLocalHorizonSource.fileSizeBytes');
  source = source.replaceAll('externalLocalHorizonSource.importedAtIso', 'draftExternalLocalHorizonSource.importedAtIso');
  source = source.replaceAll('!externalLocalHorizonSource && (', '!draftExternalLocalHorizonSource && (');
  source = source.replaceAll('externalLocalHorizonSource.warnings.length', 'draftExternalLocalHorizonSource.warnings.length');
  source = source.replaceAll('externalLocalHorizonSource.warnings.map', 'draftExternalLocalHorizonSource.warnings.map');
  source = replaceExactlyOnce(
    source,
    `                setHorizonImportMessage('');\n                setLocalHorizonDraft(localHorizonDraftFromSettings(settings));`,
    `                setHorizonImportMessage('');\n                setLocalHorizonDraft(localHorizonDraftFromSettings(settings));\n                setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));`,
    'panel revert source'
  );
  source = source.replaceAll(
    `(localHorizonDraft.localHorizonEnabled && usesExternalDraft && !externalLocalHorizonSource)`,
    `(localHorizonDraft.localHorizonEnabled && usesExternalDraft && !draftExternalLocalHorizonSource)`
  );
  fs.writeFileSync(file, source);
}
