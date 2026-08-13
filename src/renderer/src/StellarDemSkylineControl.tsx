import { useState } from 'react';
import type {
  GenerateStellarDemSkylineResult,
  SavedStellarLocalHorizonSource,
  StellarDemSkylineDraft,
  StellarDemSkylineGenerationSettings,
  StellarDemSkylineSamplingMethod
} from '../../shared/stellar-local-horizon-import';
import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag } from './i18n';
import './stellar-dem-skyline-control.css';

interface StellarDemSkylineControlProps {
  observerLatitudeDeg: number;
  observerLongitudeDeg: number;
  observerHeightM: number;
  onPreparedSource(source: SavedStellarLocalHorizonSource): void;
}

interface DemSkylineDraftSettings {
  samplingMethod: StellarDemSkylineSamplingMethod;
  azimuthStepDeg: number;
  distanceStepM: number;
  maximumDistanceM: number;
  heightDatumToEllipsoidOffsetM: number;
}

const DEFAULT_SETTINGS: DemSkylineDraftSettings = {
  samplingMethod: 'bilinear',
  azimuthStepDeg: 2,
  distanceStepM: 250,
  maximumDistanceM: 20_000,
  heightDatumToEllipsoidOffsetM: 0
};

function formatBytes(bytes: number, formatter: Intl.NumberFormat): string {
  if (bytes >= 1024 * 1024) return `${formatter.format(bytes / (1024 * 1024))} MB`;
  return `${formatter.format(bytes / 1024)} KB`;
}

function settingsForGeneration(
  settings: DemSkylineDraftSettings,
  props: Pick<StellarDemSkylineControlProps, 'observerLatitudeDeg' | 'observerLongitudeDeg' | 'observerHeightM'>
): StellarDemSkylineGenerationSettings {
  return {
    observerLatitudeDeg: props.observerLatitudeDeg,
    observerLongitudeDeg: props.observerLongitudeDeg,
    observerHeightM: props.observerHeightM,
    heightDatumToEllipsoidOffsetM: settings.heightDatumToEllipsoidOffsetM,
    azimuthStepDeg: settings.azimuthStepDeg,
    distanceStepM: settings.distanceStepM,
    maximumDistanceM: settings.maximumDistanceM,
    samplingMethod: settings.samplingMethod
  };
}

export function StellarDemSkylineControl({
  observerLatitudeDeg,
  observerLongitudeDeg,
  observerHeightM,
  onPreparedSource
}: StellarDemSkylineControlProps): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const [draft, setDraft] = useState<StellarDemSkylineDraft>();
  const [settings, setSettings] = useState<DemSkylineDraftSettings>({ ...DEFAULT_SETTINGS });
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [diagnostics, setDiagnostics] = useState<GenerateStellarDemSkylineResult['diagnostics']>();
  const [lastGeneratedSourceSha, setLastGeneratedSourceSha] = useState('');

  const importDem = async (): Promise<void> => {
    setIsImporting(true);
    setMessage('');
    setDiagnostics(undefined);
    setLastGeneratedSourceSha('');
    try {
      const result = await window.simulatorDesktop.importStellarDemSkyline(locale);
      if (result.status === 'cancelled' || !result.draft) {
        if (result.status === 'cancelled') setMessage(result.message);
        return;
      }
      setDraft(result.draft);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('stellar.dem.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  const generate = async (): Promise<void> => {
    if (!draft) return;
    setIsGenerating(true);
    setMessage('');
    setDiagnostics(undefined);
    setLastGeneratedSourceSha('');
    try {
      const generationSettings = settingsForGeneration(settings, {
        observerLatitudeDeg,
        observerLongitudeDeg,
        observerHeightM
      });
      const result = await window.simulatorDesktop.generateStellarDemSkyline(
        draft.requestId,
        generationSettings,
        locale
      );
      setDiagnostics(result.diagnostics);
      setMessage(result.message);
      if (!result.completeCoverage || !result.source) return;
      setLastGeneratedSourceSha(result.source.sha256);
      onPreparedSource({
        ...result.source,
        points: result.source.points.map((point) => ({ ...point })),
        warnings: [...result.source.warnings],
        ...(result.source.demDerivation
          ? { demDerivation: { ...result.source.demDerivation } }
          : {})
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('stellar.dem.generationError'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="stellar-dem-skyline-control">
      <div className="stellar-dem-skyline-heading">
        <div>
          <strong>{t('stellar.dem.title')}</strong>
          <span>{t('stellar.dem.description')}</span>
        </div>
        <button type="button" disabled={isImporting || isGenerating} onClick={() => void importDem()}>
          {isImporting ? t('stellar.dem.importing') : t('stellar.dem.import')}
        </button>
      </div>

      {draft && (
        <>
          <div className="stellar-dem-source-card">
            <div>
              <small>{t('stellar.dem.sourceLabel')}</small>
              <strong>{draft.fileName}</strong>
              <span>{t('stellar.dem.cellsSummary', { columns: draft.columnCount, rows: draft.rowCount, cellSize: numberFormatter.format(draft.cellSizeDeg), size: formatBytes(draft.fileSizeBytes, numberFormatter) })}</span>
              <span>{t('stellar.dem.coverage', { south: numberFormatter.format(draft.southBoundaryDeg), north: numberFormatter.format(draft.northBoundaryDeg), west: numberFormatter.format(draft.westBoundaryDeg), east: numberFormatter.format(draft.eastBoundaryDeg) })}</span>
            </div>
            <div>
              <span>SHA-256 <code title={draft.sha256}>{draft.sha256.slice(0, 12)}…</code></span>
              <span>{t('stellar.dem.observer', { latitude: numberFormatter.format(observerLatitudeDeg), longitude: numberFormatter.format(observerLongitudeDeg), height: numberFormatter.format(observerHeightM) })}</span>
            </div>
          </div>

          <div className="stellar-dem-settings">
            <label>
              <span>{t('stellar.dem.azimuthStep')}</span>
              <select
                disabled={isGenerating}
                value={settings.azimuthStepDeg}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  azimuthStepDeg: Number(event.currentTarget.value)
                }))}
              >
                <option value={1}>1° · {t('stellar.dem.directionCount', { count: 360 })}</option>
                <option value={2}>2° · {t('stellar.dem.directionCount', { count: 180 })}</option>
                <option value={5}>5° · {t('stellar.dem.directionCount', { count: 72 })}</option>
                <option value={10}>10° · {t('stellar.dem.directionCount', { count: 36 })}</option>
                <option value={15}>15° · {t('stellar.dem.directionCount', { count: 24 })}</option>
                <option value={30}>30° · {t('stellar.dem.directionCount', { count: 12 })}</option>
                <option value={45}>45° · {t('stellar.dem.directionCount', { count: 8 })}</option>
                <option value={90}>90° · {t('stellar.dem.directionCount', { count: 4 })}</option>
              </select>
            </label>
            <label>
              <span>{t('stellar.dem.distanceStep')}</span>
              <DraftNumberInput
                ariaLabel={t('stellar.dem.distanceStepAria')}
                disabled={isGenerating}
                min={10}
                max={100_000}
                step={50}
                value={settings.distanceStepM}
                onCommit={(value) => setSettings((current) => ({ ...current, distanceStepM: value }))}
              />
            </label>
            <label>
              <span>{t('stellar.dem.maximumDistance')}</span>
              <DraftNumberInput
                ariaLabel={t('stellar.dem.maximumDistanceAria')}
                disabled={isGenerating}
                min={10}
                max={500_000}
                step={1_000}
                value={settings.maximumDistanceM}
                onCommit={(value) => setSettings((current) => ({ ...current, maximumDistanceM: value }))}
              />
            </label>
            <label>
              <span>{t('stellar.dem.ellipsoidOffset')}</span>
              <DraftNumberInput
                ariaLabel={t('stellar.dem.ellipsoidOffsetAria')}
                disabled={isGenerating}
                min={-20_000}
                max={20_000}
                step={1}
                value={settings.heightDatumToEllipsoidOffsetM}
                onCommit={(value) => setSettings((current) => ({ ...current, heightDatumToEllipsoidOffsetM: value }))}
              />
            </label>
            <label>
              <span>{t('stellar.dem.sampling')}</span>
              <select
                disabled={isGenerating}
                value={settings.samplingMethod}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  samplingMethod: event.currentTarget.value as StellarDemSkylineSamplingMethod
                }))}
              >
                <option value="bilinear">{t('terrain.editor.demSamplingBilinear')}</option>
                <option value="nearest">{t('terrain.editor.demSamplingNearest')}</option>
              </select>
            </label>
          </div>

          <div className="stellar-dem-generate-row">
            <span>{t('stellar.dem.geometryNote')}</span>
            <button type="button" disabled={isGenerating} onClick={() => void generate()}>
              {isGenerating ? t('stellar.dem.generating') : t('stellar.dem.generate')}
            </button>
          </div>
        </>
      )}

      {diagnostics && (
        <div className={diagnostics.completeRayCount === diagnostics.pointCount ? 'stellar-dem-diagnostics complete' : 'stellar-dem-diagnostics incomplete'}>
          <span>{t('stellar.dem.completeAzimuth')} <strong>{diagnostics.completeRayCount}/{diagnostics.pointCount}</strong></span>
          <span>{t('stellar.dem.known')} <strong>{diagnostics.knownPointCount}</strong></span>
          <span>{t('stellar.dem.coverageLimited')} <strong>{diagnostics.coverageLimitedRayCount}</strong></span>
          <span>{t('stellar.dem.noData')} <strong>{diagnostics.noDataAffectedRayCount}</strong></span>
          <span>{t('stellar.dem.noCoverage')} <strong>{diagnostics.noCoverageRayCount}</strong></span>
        </div>
      )}

      {message && (
        <p className={diagnostics && diagnostics.completeRayCount !== diagnostics.pointCount ? 'stellar-dem-message warning' : 'stellar-dem-message'} role="status">
          {message}
          {lastGeneratedSourceSha && t('stellar.dem.profileTransferred')}
        </p>
      )}
    </div>
  );
}
