import { useState } from 'react';
import type {
  GenerateStellarDemSkylineResult,
  SavedStellarLocalHorizonSource,
  StellarDemSkylineDraft,
  StellarDemSkylineGenerationSettings,
  StellarDemSkylineSamplingMethod
} from '../../shared/stellar-local-horizon-import';
import { DraftNumberInput } from './DraftNumberInput';
import './stellar-dem-skyline-control.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;
  return `${numberFormatter.format(bytes / 1024)} KB`;
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
      const result = await window.simulatorDesktop.importStellarDemSkyline();
      if (result.status === 'cancelled' || !result.draft) {
        if (result.status === 'cancelled') setMessage(result.message);
        return;
      }
      setDraft(result.draft);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'DEM skyline kaynağı içe aktarılamadı.');
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
        generationSettings
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
      setMessage(error instanceof Error ? error.message : 'DEM skyline üretimi tamamlanamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="stellar-dem-skyline-control">
      <div className="stellar-dem-skyline-heading">
        <div>
          <strong>DEM’den 360° geometrik skyline</strong>
          <span>ESRI ASCII Grid seçimi yalnız taslak hazırlar. 360° tarama ayrı düğmeyle çalışır; eksik kapsama yıldız skyline’ına uygulanmaz.</span>
        </div>
        <button type="button" disabled={isImporting || isGenerating} onClick={() => void importDem()}>
          {isImporting ? 'DEM okunuyor…' : 'ESRI ASCII DEM seç'}
        </button>
      </div>

      {draft && (
        <>
          <div className="stellar-dem-source-card">
            <div>
              <small>DEM TASLAĞI · 360° TARAMA HENÜZ AYRI İŞLEM</small>
              <strong>{draft.fileName}</strong>
              <span>{draft.columnCount}×{draft.rowCount} hücre · cellsize {numberFormatter.format(draft.cellSizeDeg)}° · {formatBytes(draft.fileSizeBytes)}</span>
              <span>Kapsam: {numberFormatter.format(draft.southBoundaryDeg)}…{numberFormatter.format(draft.northBoundaryDeg)}° enlem · {numberFormatter.format(draft.westBoundaryDeg)}…{numberFormatter.format(draft.eastBoundaryDeg)}° boylam</span>
            </div>
            <div>
              <span>SHA-256 <code title={draft.sha256}>{draft.sha256.slice(0, 12)}…</code></span>
              <span>Gözlemci: {numberFormatter.format(observerLatitudeDeg)}°, {numberFormatter.format(observerLongitudeDeg)}° · göz {numberFormatter.format(observerHeightM)} m</span>
            </div>
          </div>

          <div className="stellar-dem-settings">
            <label>
              <span>Azimut adımı</span>
              <select
                disabled={isGenerating}
                value={settings.azimuthStepDeg}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  azimuthStepDeg: Number(event.currentTarget.value)
                }))}
              >
                <option value={1}>1° · 360 yön</option>
                <option value={2}>2° · 180 yön</option>
                <option value={5}>5° · 72 yön</option>
                <option value={10}>10° · 36 yön</option>
                <option value={15}>15° · 24 yön</option>
                <option value={30}>30° · 12 yön</option>
                <option value={45}>45° · 8 yön</option>
                <option value={90}>90° · 4 yön</option>
              </select>
            </label>
            <label>
              <span>Mesafe adımı · m</span>
              <DraftNumberInput
                ariaLabel="DEM skyline mesafe örnekleme adımı"
                disabled={isGenerating}
                min={10}
                max={100_000}
                step={50}
                value={settings.distanceStepM}
                onCommit={(value) => setSettings((current) => ({ ...current, distanceStepM: value }))}
              />
            </label>
            <label>
              <span>Maksimum mesafe · m</span>
              <DraftNumberInput
                ariaLabel="DEM skyline maksimum mesafesi"
                disabled={isGenerating}
                min={10}
                max={500_000}
                step={1_000}
                value={settings.maximumDistanceM}
                onCommit={(value) => setSettings((current) => ({ ...current, maximumDistanceM: value }))}
              />
            </label>
            <label>
              <span>DEM → WGS84 elipsoid ofseti · m</span>
              <DraftNumberInput
                ariaLabel="DEM WGS84 elipsoid yükseklik ofseti"
                disabled={isGenerating}
                min={-20_000}
                max={20_000}
                step={1}
                value={settings.heightDatumToEllipsoidOffsetM}
                onCommit={(value) => setSettings((current) => ({ ...current, heightDatumToEllipsoidOffsetM: value }))}
              />
            </label>
            <label>
              <span>DEM örnekleme</span>
              <select
                disabled={isGenerating}
                value={settings.samplingMethod}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  samplingMethod: event.currentTarget.value as StellarDemSkylineSamplingMethod
                }))}
              >
                <option value="bilinear">Bilinear</option>
                <option value="nearest">Nearest</option>
              </select>
            </label>
          </div>

          <div className="stellar-dem-generate-row">
            <span>Datum ofseti sabittir; geoit değişimi, kırılma, bina ve bitki örtüsü bu geometrik taramaya dahil değildir.</span>
            <button type="button" disabled={isGenerating} onClick={() => void generate()}>
              {isGenerating ? '360° taranıyor…' : 'DEM skyline üret'}
            </button>
          </div>
        </>
      )}

      {diagnostics && (
        <div className={diagnostics.completeRayCount === diagnostics.pointCount ? 'stellar-dem-diagnostics complete' : 'stellar-dem-diagnostics incomplete'}>
          <span>Tam azimut <strong>{diagnostics.completeRayCount}/{diagnostics.pointCount}</strong></span>
          <span>Bilinen <strong>{diagnostics.knownPointCount}</strong></span>
          <span>Kapsama sınırlı <strong>{diagnostics.coverageLimitedRayCount}</strong></span>
          <span>NODATA etkili <strong>{diagnostics.noDataAffectedRayCount}</strong></span>
          <span>Kapsamasız <strong>{diagnostics.noCoverageRayCount}</strong></span>
        </div>
      )}

      {message && (
        <p className={diagnostics && diagnostics.completeRayCount !== diagnostics.pointCount ? 'stellar-dem-message warning' : 'stellar-dem-message'} role="status">
          {message}
          {lastGeneratedSourceSha && ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.'}
        </p>
      )}
    </div>
  );
}
