import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const current = fs.readFileSync(path, 'utf8');
  const count = current.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: beklenen parça ${count} kez bulundu`);
  fs.writeFileSync(path, current.replace(before, after));
}
function replaceExpected(path, before, after, expected) {
  const current = fs.readFileSync(path, 'utf8');
  const count = current.split(before).length - 1;
  if (count !== expected) throw new Error(`${path}: beklenen ${expected}, bulunan ${count}`);
  fs.writeFileSync(path, current.split(before).join(after));
}

// AppNext imports/state/calculation
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';\n",
  "import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';\nimport type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';\n"
);
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "} from '../../simulation/stellar-observation';\n",
  "} from '../../simulation/stellar-observation';\nimport { verifiedMotionSubsetFromSavedSource } from '../../simulation/stellar-motion-source';\n"
);
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "  const [stellarLocalHorizonSource, setStellarLocalHorizonSource] = useState<SavedStellarLocalHorizonSource>();\n",
  "  const [stellarLocalHorizonSource, setStellarLocalHorizonSource] = useState<SavedStellarLocalHorizonSource>();\n  const [stellarMotionSource, setStellarMotionSource] = useState<SavedStellarMotionSource>();\n"
);
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "  const appliedExternalStellarLocalHorizonSource = stellarObservationSettings.localHorizonSourceMode === 'external'\n    ? stellarLocalHorizonSource\n    : undefined;\n  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'\n",
  "  const appliedExternalStellarLocalHorizonSource = stellarObservationSettings.localHorizonSourceMode === 'external'\n    ? stellarLocalHorizonSource\n    : undefined;\n  const stellarMotionSubset = useMemo(() => stellarMotionSource\n    ? verifiedMotionSubsetFromSavedSource(stellarMotionSource)\n    : undefined, [stellarMotionSource]);\n  const stellarObservationResult = useMemo(() => activeScenarioId === 'stellar-observation'\n"
);
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "        ...(appliedExternalStellarLocalHorizonSource\n          ? { externalLocalHorizonSource: appliedExternalStellarLocalHorizonSource }\n          : {})\n      })\n    : undefined, [activeExperimentId, activeScenarioId, appliedExternalStellarLocalHorizonSource, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarObservationSettings]);\n",
  "        ...(appliedExternalStellarLocalHorizonSource\n          ? { externalLocalHorizonSource: appliedExternalStellarLocalHorizonSource }\n          : {}),\n        ...(stellarMotionSubset ? { motionSubset: stellarMotionSubset } : {})\n      })\n    : undefined, [activeExperimentId, activeScenarioId, appliedExternalStellarLocalHorizonSource, experimentObservedAtIso, inputs.observerLatitudeDeg, inputs.observerLongitudeDeg, stellarMotionSubset, stellarObservationSettings]);\n"
);

// Reset source whenever stellar scenario data is reset (known four reset sites).
replaceExpected(
  'src/renderer/src/AppNext.tsx',
  "      setStellarLocalHorizonSource(undefined);\n",
  "      setStellarLocalHorizonSource(undefined);\n      setStellarMotionSource(undefined);\n",
  4
);

// import handler
const loadAnchor = '  const loadExperiment = (saved: SavedExperiment): void => {';
const importMotion = `  const importStellarMotionSource = async (): Promise<SavedStellarMotionSource | undefined> => {\n    try {\n      const result = await window.simulatorDesktop.importStellarMotionSource();\n      setStorageMessage(result.message);\n      if (result.status !== 'success' || !result.source) return undefined;\n      const source: SavedStellarMotionSource = {\n        ...result.source,\n        entries: result.source.entries.map((entry) => ({ ...entry }))\n      };\n      setStorageMessage(\`“\${source.fileName}” proper-motion kaynağı taslak olarak hazır: \${source.entryCount}/19 kayıt doğrulandı. Uygula ve hesapla ile etkinleştirilebilir.\`);\n      return source;\n    } catch (error) {\n      const message = error instanceof Error ? error.message : 'BSC5P proper-motion kaynağı içe aktarılamadı.';\n      setStorageMessage(message);\n      throw error;\n    }\n  };\n\n`;
replaceOnce('src/renderer/src/AppNext.tsx', loadAnchor, importMotion + loadAnchor);

// load saved source
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "    setStellarObservationSettings(safeStellarSettings);\n    setStellarLocalHorizonSource(storedStellarSource);\n",
  "    setStellarObservationSettings(safeStellarSettings);\n    setStellarLocalHorizonSource(storedStellarSource);\n    setStellarMotionSource(saved.stellarMotionSource\n      ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }\n      : undefined);\n"
);
// save source
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "      ...(stellarLocalHorizonSource ? { stellarLocalHorizonSource } : {}),\n",
  "      ...(stellarLocalHorizonSource ? { stellarLocalHorizonSource } : {}),\n      ...(stellarMotionSource ? { stellarMotionSource } : {}),\n"
);
// post-save reopen source
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "        setStellarLocalHorizonSource(reopenedStellarSource);\n        setStellarObservationSettings(reopenedStellarSettings.localHorizonSourceMode === 'external' && !reopenedStellarSource\n",
  "        setStellarLocalHorizonSource(reopenedStellarSource);\n        setStellarMotionSource(saved.stellarMotionSource\n          ? { ...saved.stellarMotionSource, entries: saved.stellarMotionSource.entries.map((entry) => ({ ...entry })) }\n          : undefined);\n        setStellarObservationSettings(reopenedStellarSettings.localHorizonSourceMode === 'external' && !reopenedStellarSource\n"
);
// panel props
replaceOnce(
  'src/renderer/src/AppNext.tsx',
  "                  externalLocalHorizonSource={stellarLocalHorizonSource}\n                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onImportLocalHorizon={importStellarLocalHorizon}\n",
  "                  externalLocalHorizonSource={stellarLocalHorizonSource}\n                  stellarMotionSource={stellarMotionSource}\n                  onChange={(settings) => { setStellarObservationSettings(settings); setIsDirty(true); }}\n                  onImportLocalHorizon={importStellarLocalHorizon}\n                  onImportStellarMotion={importStellarMotionSource}\n                  onApplyStellarMotion={(source) => {\n                    setStellarMotionSource(source);\n                    setIsDirty(true);\n                  }}\n"
);

// Panel imports/props/state
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';\n",
  "import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';\nimport type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "function externalSourceSignature(source: SavedStellarLocalHorizonSource | undefined): string {\n  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}` : '';\n}\n",
  "function externalSourceSignature(source: SavedStellarLocalHorizonSource | undefined): string {\n  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}` : '';\n}\n\nfunction cloneMotionSource(source: SavedStellarMotionSource | undefined): SavedStellarMotionSource | undefined {\n  return source ? { ...source, entries: source.entries.map((entry) => ({ ...entry })) } : undefined;\n}\n\nfunction motionSourceSignature(source: SavedStellarMotionSource | undefined): string {\n  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}|${source.entryCount}` : '';\n}\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  externalLocalHorizonSource,\n  onChange,\n  onImportLocalHorizon,\n  onApplyLocalHorizon,\n",
  "  externalLocalHorizonSource,\n  stellarMotionSource,\n  onChange,\n  onImportLocalHorizon,\n  onImportStellarMotion,\n  onApplyStellarMotion,\n  onApplyLocalHorizon,\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;\n  onChange(settings: StellarObservationSettings): void;\n  onImportLocalHorizon(): Promise<SavedStellarLocalHorizonSource | undefined>;\n  onApplyLocalHorizon(settings: StellarObservationSettings, source?: SavedStellarLocalHorizonSource): void;\n",
  "  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;\n  stellarMotionSource?: SavedStellarMotionSource;\n  onChange(settings: StellarObservationSettings): void;\n  onImportLocalHorizon(): Promise<SavedStellarLocalHorizonSource | undefined>;\n  onImportStellarMotion(): Promise<SavedStellarMotionSource | undefined>;\n  onApplyStellarMotion(source?: SavedStellarMotionSource): void;\n  onApplyLocalHorizon(settings: StellarObservationSettings, source?: SavedStellarLocalHorizonSource): void;\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  const [showRefractionDiagnostic, setShowRefractionDiagnostic] = useState(false);\n  const [showSkySnapshot, setShowSkySnapshot] = useState(false);\n",
  "  const [showRefractionDiagnostic, setShowRefractionDiagnostic] = useState(false);\n  const [showSkySnapshot, setShowSkySnapshot] = useState(false);\n  const [draftMotionSource, setDraftMotionSource] = useState<SavedStellarMotionSource | undefined>(() => cloneMotionSource(stellarMotionSource));\n  const [isImportingMotion, setIsImportingMotion] = useState(false);\n  const [motionImportMessage, setMotionImportMessage] = useState('');\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  const appliedExternalSourceSignature = externalSourceSignature(externalLocalHorizonSource);\n",
  "  const appliedExternalSourceSignature = externalSourceSignature(externalLocalHorizonSource);\n  const appliedMotionSourceSignature = motionSourceSignature(stellarMotionSource);\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  useEffect(() => {\n    setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));\n  }, [appliedExternalSourceSignature]);\n",
  "  useEffect(() => {\n    setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));\n  }, [appliedExternalSourceSignature]);\n\n  useEffect(() => {\n    setDraftMotionSource(cloneMotionSource(stellarMotionSource));\n  }, [appliedMotionSourceSignature]);\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  const sourceDraftDirty = externalSourceSignature(draftExternalLocalHorizonSource) !== appliedExternalSourceSignature;\n",
  "  const sourceDraftDirty = externalSourceSignature(draftExternalLocalHorizonSource) !== appliedExternalSourceSignature;\n  const motionSourceDirty = motionSourceSignature(draftMotionSource) !== appliedMotionSourceSignature;\n  const draftMotionEntry = draftMotionSource?.entries.find((entry) => entry.starId === settings.starId);\n"
);
const updateDirectionAnchor = "  const updateLocalHorizonDirection = (key: LocalHorizonDirectionKey, value: number): void => {";
const motionHandlers = `  const importMotionSource = async (): Promise<void> => {\n    setIsImportingMotion(true);\n    setMotionImportMessage('');\n    try {\n      const imported = await onImportStellarMotion();\n      if (!imported) return;\n      setDraftMotionSource(cloneMotionSource(imported));\n      setMotionImportMessage(\`“\${imported.fileName}” doğrulandı. Uygula ve hesapla ile proper motion etkinleşecek.\`);\n    } catch (error) {\n      setMotionImportMessage(error instanceof Error ? error.message : 'BSC5P proper-motion kaynağı içe aktarılamadı.');\n    } finally {\n      setIsImportingMotion(false);\n    }\n  };\n\n  const applyMotionSource = (): void => {\n    setMotionImportMessage('');\n    onApplyStellarMotion(cloneMotionSource(draftMotionSource));\n  };\n\n`;
replaceOnce('src/renderer/src/StellarObservationPanel.tsx', updateDirectionAnchor, motionHandlers + updateDirectionAnchor);

// Insert motion source panel before refraction diagnostic
const refractionAnchor = "      <div className={showRefractionDiagnostic ? 'stellar-refraction-diagnostic active' : 'stellar-refraction-diagnostic'}>";
const motionPanel = `      <div className={stellarMotionSource ? 'stellar-motion-source active' : 'stellar-motion-source'}>\n        <div className=\"stellar-motion-heading\">\n          <div>\n            <strong>Doğrulanmış proper motion · BSC5P</strong>\n            <span>Resmi V/50 catalog dosyası 19/19 HR + J2000 konum + V kadri üzerinden doğrulanır. Dosya seçimi hesap motorunu çalıştırmaz.</span>\n          </div>\n          <button className=\"stellar-motion-import-button\" disabled={isImportingMotion} type=\"button\" onClick={() => void importMotionSource()}>\n            {isImportingMotion ? 'Katalog okunuyor…' : 'BSC5P catalog dosyasından al'}\n          </button>\n        </div>\n        {draftMotionSource ? (\n          <div className={motionSourceDirty ? 'stellar-motion-source-card draft' : 'stellar-motion-source-card'}>\n            <div>\n              <small>PROPER MOTION KAYNAĞI</small>\n              <strong>{draftMotionSource.fileName}</strong>\n              <span>{draftMotionSource.entryCount}/19 kayıt · FK5/J2000 · kaynak epok J{angleFormatter.format(draftMotionSource.sourceEpochJulianYear)}</span>\n              {draftMotionEntry && (\n                <span>Seçili yıldız: μ_α* {angleFormatter.format(draftMotionEntry.properMotionRaStarArcsecPerYear)}″/yıl · μ_δ {angleFormatter.format(draftMotionEntry.properMotionDecArcsecPerYear)}″/yıl</span>\n              )}\n            </div>\n            <div>\n              <span>SHA-256 <code title={draftMotionSource.sha256}>{draftMotionSource.sha256.slice(0, 12)}…</code></span>\n              <span>{angleFormatter.format(draftMotionSource.fileSizeBytes / 1024)} KB · {formatImportedAt(draftMotionSource.importedAtIso)}</span>\n            </div>\n          </div>\n        ) : (\n          <p className=\"stellar-motion-empty\">Kaynak uygulanmadı; yıldız sonuçları proper motion olmadan mevcut J2000 → precession zincirini kullanır.</p>\n        )}\n        {motionImportMessage && <p className=\"stellar-motion-message\" role=\"status\">{motionImportMessage}</p>}\n        <div className=\"stellar-motion-apply-row\">\n          <span>{motionSourceDirty ? 'Proper-motion kaynak değişikliği henüz hesaplanmadı.' : stellarMotionSource ? 'Doğrulanmış proper-motion kaynağı hesapta uygulanıyor.' : 'Proper motion kapalı.'}</span>\n          <div>\n            <button\n              className=\"stellar-motion-remove\"\n              disabled={!draftMotionSource}\n              type=\"button\"\n              onClick={() => { setDraftMotionSource(undefined); setMotionImportMessage(''); }}\n            >Kaynağı kaldır</button>\n            <button\n              className=\"stellar-motion-revert\"\n              disabled={!motionSourceDirty}\n              type=\"button\"\n              onClick={() => { setDraftMotionSource(cloneMotionSource(stellarMotionSource)); setMotionImportMessage(''); }}\n            >Geri al</button>\n            <button className=\"stellar-motion-apply\" disabled={!motionSourceDirty} type=\"button\" onClick={applyMotionSource}>Uygula ve hesapla</button>\n          </div>\n        </div>\n      </div>\n\n`;
replaceOnce('src/renderer/src/StellarObservationPanel.tsx', refractionAnchor, motionPanel + refractionAnchor);

// Polar count clarity
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);\n",
  "  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);\n  const plottedLocalCounts = {\n    above: skyStars.filter((star) => star.localHorizonStatus === 'above').length,\n    onHorizon: skyStars.filter((star) => star.localHorizonStatus === 'on-horizon').length,\n    below: skyStars.filter((star) => star.localHorizonStatus === 'below').length\n  };\n"
);
replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "              <span>Geometrik 0° üstü <strong>{result.skySnapshot.aboveGeometricHorizonCount}/{result.skySnapshot.starCount}</strong></span>\n              {result.skySnapshot.localHorizonCounts && (\n                <span>Yerel skyline <strong>üstünde {result.skySnapshot.localHorizonCounts.above} · sınır {result.skySnapshot.localHorizonCounts.onHorizon} · altında {result.skySnapshot.localHorizonCounts.below}</strong></span>\n              )}\n",
  "              <span>Haritada çizilen <strong>{skyStars.length}/{result.skySnapshot.starCount}</strong></span>\n              <span>Geometrik 0° <strong>üstünde {result.skySnapshot.aboveGeometricHorizonCount} · altında ve çizilmeyen {result.skySnapshot.belowGeometricHorizonCount}</strong></span>\n              {result.skySnapshot.localHorizonCounts && (\n                <span>Çizilenlerde yerel skyline <strong>üstünde {plottedLocalCounts.above} · sınır {plottedLocalCounts.onHorizon} · altında {plottedLocalCounts.below}</strong></span>\n              )}\n"
);

// CSS append
fs.appendFileSync('src/renderer/src/stellar-observation-panel.css', `\n\n/* Stage 6.23 · verified BSC5P proper-motion source */\n.stellar-motion-source { border: 1px solid var(--line, #29404f); border-radius: 8px; padding: 12px; background: rgba(11, 24, 34, .58); }\n.stellar-motion-source.active { border-color: rgba(99, 184, 151, .48); }\n.stellar-motion-heading, .stellar-motion-apply-row, .stellar-motion-source-card { display: flex; justify-content: space-between; gap: 14px; align-items: center; }\n.stellar-motion-heading > div, .stellar-motion-source-card > div { display: grid; gap: 4px; }\n.stellar-motion-heading span, .stellar-motion-source-card span, .stellar-motion-apply-row > span, .stellar-motion-empty, .stellar-motion-message { color: var(--muted, #8ea4b3); font-size: 11px; }\n.stellar-motion-import-button, .stellar-motion-remove, .stellar-motion-revert, .stellar-motion-apply { border: 1px solid #385367; border-radius: 6px; padding: 7px 10px; background: #152631; color: #dce8ef; cursor: pointer; }\n.stellar-motion-apply { border-color: #39735d; background: #183d31; color: #a9efd2; }\n.stellar-motion-remove { border-color: #76514b; color: #e8b5ab; }\n.stellar-motion-import-button:disabled, .stellar-motion-remove:disabled, .stellar-motion-revert:disabled, .stellar-motion-apply:disabled { opacity: .45; cursor: default; }\n.stellar-motion-source-card { margin-top: 10px; padding: 10px; border: 1px solid #35586c; border-radius: 6px; background: rgba(18, 35, 46, .75); }\n.stellar-motion-source-card.draft { border-color: #806b3d; }\n.stellar-motion-source-card small { color: #8fa7b7; letter-spacing: .07em; }\n.stellar-motion-source-card code { color: #afc5d2; }\n.stellar-motion-empty, .stellar-motion-message { margin: 10px 0 0; }\n.stellar-motion-message { color: #b8d9eb; }\n.stellar-motion-apply-row { margin-top: 10px; padding-top: 9px; border-top: 1px solid rgba(92, 121, 139, .28); }\n.stellar-motion-apply-row > div { display: flex; gap: 7px; }\n@media (max-width: 900px) { .stellar-motion-heading, .stellar-motion-apply-row, .stellar-motion-source-card { align-items: stretch; flex-direction: column; } .stellar-motion-apply-row > div { flex-wrap: wrap; } }\n`);

// HTML report proper-motion provenance
const photoAnchor = 'function photoCalibrationSection(experiment: SavedExperiment): string {';
const reportSection = `function stellarMotionSourceSection(experiment: SavedExperiment): string {\n  const source = experiment.stellarMotionSource;\n  if (!source) return '';\n  const stateClass = source.modifiedAfterImport ? 'source-modified' : 'source-matching';\n  const stateLabel = source.modifiedAfterImport\n    ? 'İçe aktarımdan sonra düzenlendi'\n    : '19 kaynak satırı doğrulanmış kayıtla eşleşiyor';\n  return \`\n    <section class=\"model-section vertical-section\">\n      <header class=\"model-heading\">\n        <div><h2>Yıldız proper-motion kaynak provenansı</h2><span>BSC5P fixed-width doğrulanmış 19-yıldız altkümesi</span></div>\n        <strong class=\"status status-compatible\">\${source.entryCount}/19 doğrulandı</strong>\n      </header>\n      <div class=\"source-card \${stateClass}\">\n        <div class=\"source-card-heading\"><strong>\${escapeHtml(source.fileName)}</strong><span>\${escapeHtml(stateLabel)}</span></div>\n        <table><tbody>\n          <tr><td>Katalog</td><td>\${escapeHtml(source.sourceCatalog)}</td></tr>\n          <tr><td>Subset</td><td>\${escapeHtml(source.subsetId)}@\${escapeHtml(source.subsetVersion)}</td></tr>\n          <tr><td>Kaynak biçim</td><td>\${escapeHtml(source.sourceFormatId)}@\${escapeHtml(source.sourceFormatVersion)}</td></tr>\n          <tr><td>Koordinat / epok</td><td>FK5 / J\${inputNumberFormatter.format(source.sourceEpochJulianYear)}</td></tr>\n          <tr><td>Doğrulanmış yıldız</td><td>\${source.entryCount}/19</td></tr>\n          <tr><td>Dosya boyutu</td><td>\${inputNumberFormatter.format(source.fileSizeBytes)} bayt</td></tr>\n          <tr><td>İçe aktarma</td><td>\${formatDate(source.importedAtIso)}</td></tr>\n          <tr><td>SHA-256</td><td><code>\${escapeHtml(source.sha256)}</code></td></tr>\n        </tbody></table>\n        <p class=\"muted\">Portable kayıt tüm BSC5P kataloğunu gömmez; doğrulanmış 19 sabit-genişlik kaynak satırını ve seçilen tam dosyanın SHA-256 özetini taşır. Yeniden açılışta bu 19 satır parser ve HR/J2000/V-kadir eşleşmesiyle tekrar doğrulanır.</p>\n      </div>\n    </section>\`;\n}\n\n`;
replaceOnce('src/report/html-report.ts', photoAnchor, reportSection + photoAnchor);
replaceOnce(
  'src/report/html-report.ts',
  "    ${stellarLocalHorizonSourceSection(experiment)}\n    ${experiment.predictions.map((prediction) => predictionSection(\n",
  "    ${stellarLocalHorizonSourceSection(experiment)}\n    ${stellarMotionSourceSection(experiment)}\n    ${experiment.predictions.map((prediction) => predictionSection(\n"
);

console.log('stage 6.23 UI patch applied');
