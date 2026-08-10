import { useEffect, useState } from 'react';
import { BRIGHT_STAR_CATALOG, BRIGHT_STAR_CATALOG_SOURCE } from '../../simulation/bright-star-catalog';
import {
  STELLAR_LOCAL_HORIZON_DIRECTIONS,
  type StellarObservationResult,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';
import { DraftNumberInput } from './DraftNumberInput';
import { StellarDemSkylineControl } from './StellarDemSkylineControl';
import { projectStellarSkyPoint, stellarSkyMarkerRadius } from './stellar-sky-visualization';
import './stellar-observation-panel.css';

const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const preciseFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 5 });

type LocalHorizonDirectionKey = (typeof STELLAR_LOCAL_HORIZON_DIRECTIONS)[number]['key'];
type LocalHorizonDraft = Pick<
  StellarObservationSettings,
  'localHorizonEnabled' | 'localHorizonSourceMode' | LocalHorizonDirectionKey
>;

const horizonClassLabels: Record<StellarObservationResult['position']['horizonClass'], string> = {
  'circumpolar-above': 'Çevresel · ufkun üstünde',
  'rises-and-sets': 'Doğar ve batar',
  'never-rises': 'Bu enlemde doğmaz',
  'grazes-horizon': 'Ufka teğet / sınır'
};

function formatAngle(value: number | null): string {
  return value === null ? 'Tanımsız' : `${angleFormatter.format(value)}°`;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return 'Tanımsız';
  if (minutes < 60) return `${angleFormatter.format(minutes)} dk`;
  return `${angleFormatter.format(minutes / 60)} sa`;
}

function formatClock(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC'
  }).format(new Date(iso));
}

function formatImportedAt(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hourCycle: 'h23'
  }).format(new Date(iso));
}

function graphY(altitudeDeg: number): number {
  return Math.max(4, Math.min(96, 50 - (altitudeDeg / 90) * 44));
}

function trailPolyline(result: StellarObservationResult): string {
  const samples = result.trail.samples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    return `${x.toFixed(2)},${graphY(sample.elevationDeg).toFixed(2)}`;
  }).join(' ');
}

function apparentTrailPolyline(result: StellarObservationResult): string {
  const samples = result.apparentTrailSamples;
  if (samples.length < 2) return '';
  const duration = Math.max(result.trail.durationMinutes, 1);
  return samples.map((sample) => {
    const x = 4 + (sample.elapsedMinutes / duration) * 92;
    return `${x.toFixed(2)},${graphY(sample.apparentAltitudeDeg).toFixed(2)}`;
  }).join(' ');
}

function localHorizonPolyline(result: StellarObservationResult): string {
  const localTrail = result.localHorizonTrail;
  if (!localTrail || localTrail.samples.length < 2) return '';
  const duration = Math.max(localTrail.durationMinutes, 1);
  return localTrail.samples
    .filter((sample) => sample.localHorizonAltitudeDeg !== null)
    .map((sample) => {
      const x = 4 + (sample.elapsedMinutes / duration) * 92;
      return `${x.toFixed(2)},${graphY(sample.localHorizonAltitudeDeg!).toFixed(2)}`;
    })
    .join(' ');
}

function currentLocalHorizonState(result: StellarObservationResult): {
  label: string;
  className: string;
} | null {
  const sample = result.localHorizonTrail?.samples[0];
  if (!sample) return null;
  if (sample.status === 'undefined-azimuth') {
    return { label: 'YEREL UFUK AZİMUTU TANIMSIZ', className: 'stellar-state neutral' };
  }
  if (sample.status === 'below') {
    return { label: 'YEREL UFKUN ALTINDA', className: 'stellar-state below' };
  }
  if (sample.status === 'on-horizon') {
    return { label: 'YEREL UFUK SINIRINDA', className: 'stellar-state neutral' };
  }
  return { label: 'YEREL UFKUN ÜSTÜNDE', className: 'stellar-state visible' };
}

function localHorizonDraftFromSettings(settings: StellarObservationSettings): LocalHorizonDraft {
  const draft = {
    localHorizonEnabled: settings.localHorizonEnabled,
    localHorizonSourceMode: settings.localHorizonSourceMode
  } as LocalHorizonDraft;
  for (const direction of STELLAR_LOCAL_HORIZON_DIRECTIONS) {
    draft[direction.key] = settings[direction.key];
  }
  return draft;
}

function localHorizonSignature(settings: StellarObservationSettings): string {
  return [
    settings.localHorizonEnabled ? '1' : '0',
    settings.localHorizonSourceMode,
    ...STELLAR_LOCAL_HORIZON_DIRECTIONS.map((direction) => String(settings[direction.key]))
  ].join('|');
}

function localHorizonDraftMatchesSettings(
  draft: LocalHorizonDraft,
  settings: StellarObservationSettings
): boolean {
  return draft.localHorizonEnabled === settings.localHorizonEnabled &&
    draft.localHorizonSourceMode === settings.localHorizonSourceMode &&
    STELLAR_LOCAL_HORIZON_DIRECTIONS.every((direction) => draft[direction.key] === settings[direction.key]);
}

function cloneExternalSource(
  source: SavedStellarLocalHorizonSource | undefined
): SavedStellarLocalHorizonSource | undefined {
  return source
    ? {
        ...source,
        points: source.points.map((point) => ({ ...point })),
        warnings: [...source.warnings],
        ...(source.demDerivation ? { demDerivation: { ...source.demDerivation } } : {})
      }
    : undefined;
}

function externalSourceSignature(source: SavedStellarLocalHorizonSource | undefined): string {
  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}` : '';
}

function cloneMotionSource(source: SavedStellarMotionSource | undefined): SavedStellarMotionSource | undefined {
  return source ? { ...source, entries: source.entries.map((entry) => ({ ...entry })) } : undefined;
}

function motionSourceSignature(source: SavedStellarMotionSource | undefined): string {
  return source ? `${source.sha256}|${source.fileName}|${source.importedAtIso}|${source.entryCount}` : '';
}

export function StellarObservationPanel({
  result,
  prediction,
  settings,
  observerHeightM,
  externalLocalHorizonSource,
  stellarMotionSource,
  onChange,
  onImportLocalHorizon,
  onImportStellarMotion,
  onApplyStellarMotion,
  onApplyLocalHorizon,
  onShowTrace
}: {
  result: StellarObservationResult;
  prediction: ModelPrediction;
  settings: StellarObservationSettings;
  observerHeightM: number;
  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;
  stellarMotionSource?: SavedStellarMotionSource;
  onChange(settings: StellarObservationSettings): void;
  onImportLocalHorizon(): Promise<SavedStellarLocalHorizonSource | undefined>;
  onImportStellarMotion(): Promise<SavedStellarMotionSource | undefined>;
  onApplyStellarMotion(source?: SavedStellarMotionSource): void;
  onApplyLocalHorizon(settings: StellarObservationSettings, source?: SavedStellarLocalHorizonSource): void;
  onShowTrace(): void;
}): React.JSX.Element {
  const [localHorizonDraft, setLocalHorizonDraft] = useState<LocalHorizonDraft>(() =>
    localHorizonDraftFromSettings(settings)
  );
  const [draftExternalLocalHorizonSource, setDraftExternalLocalHorizonSource] = useState<SavedStellarLocalHorizonSource | undefined>(() =>
    cloneExternalSource(externalLocalHorizonSource)
  );
  const [isImportingHorizon, setIsImportingHorizon] = useState(false);
  const [horizonImportMessage, setHorizonImportMessage] = useState('');
  const [showRefractionDiagnostic, setShowRefractionDiagnostic] = useState(false);
  const [showSkySnapshot, setShowSkySnapshot] = useState(false);
  const [draftMotionSource, setDraftMotionSource] = useState<SavedStellarMotionSource | undefined>(() => cloneMotionSource(stellarMotionSource));
  const [isImportingMotion, setIsImportingMotion] = useState(false);
  const [motionImportMessage, setMotionImportMessage] = useState('');
  const appliedLocalHorizonSignature = localHorizonSignature(settings);
  const appliedExternalSourceSignature = externalSourceSignature(externalLocalHorizonSource);
  const appliedMotionSourceSignature = motionSourceSignature(stellarMotionSource);

  useEffect(() => {
    setLocalHorizonDraft(localHorizonDraftFromSettings(settings));
  }, [appliedLocalHorizonSignature]);

  useEffect(() => {
    setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));
  }, [appliedExternalSourceSignature]);

  useEffect(() => {
    setDraftMotionSource(cloneMotionSource(stellarMotionSource));
  }, [appliedMotionSourceSignature]);

  const position = result.position;
  const crossings = result.trail.horizonCrossings;
  const localCrossings = result.localHorizonTrail?.localHorizonCrossings ?? [];
  const polyline = trailPolyline(result);
  const apparentPolyline = apparentTrailPolyline(result);
  const skylinePolyline = localHorizonPolyline(result);
  const localState = currentLocalHorizonState(result);
  const firstLocalSample = result.localHorizonTrail?.samples[0];
  const apparent = result.apparentDiagnostic;
  const skyStars = result.skySnapshot.stars.filter((star) => star.aboveGeometricHorizon && star.azimuthDeg !== null);
  const brightestSkyStarIds = new Set(
    [...skyStars]
      .sort((left, right) => left.visualMagnitude - right.visualMagnitude)
      .slice(0, 5)
      .map((star) => star.starId)
  );
  brightestSkyStarIds.add(settings.starId);
  const selectedSkyStar = result.skySnapshot.stars.find((star) => star.starId === settings.starId);
  const plottedLocalCounts = {
    above: skyStars.filter((star) => star.localHorizonStatus === 'above').length,
    onHorizon: skyStars.filter((star) => star.localHorizonStatus === 'on-horizon').length,
    below: skyStars.filter((star) => star.localHorizonStatus === 'below').length
  };
  const sourceDraftDirty = externalSourceSignature(draftExternalLocalHorizonSource) !== appliedExternalSourceSignature;
  const motionSourceDirty = motionSourceSignature(draftMotionSource) !== appliedMotionSourceSignature;
  const draftMotionEntry = draftMotionSource?.entries.find((entry) => entry.starId === settings.starId);
  const localHorizonDirty = !localHorizonDraftMatchesSettings(localHorizonDraft, settings) || sourceDraftDirty;
  const usesExternalDraft = localHorizonDraft.localHorizonSourceMode === 'external';

  const importMotionSource = async (): Promise<void> => {
    setIsImportingMotion(true);
    setMotionImportMessage('');
    try {
      const imported = await onImportStellarMotion();
      if (!imported) return;
      setDraftMotionSource(cloneMotionSource(imported));
      setMotionImportMessage(`“${imported.fileName}” doğrulandı. Uygula ve hesapla ile proper motion etkinleşecek.`);
    } catch (error) {
      setMotionImportMessage(error instanceof Error ? error.message : 'BSC5P proper-motion kaynağı içe aktarılamadı.');
    } finally {
      setIsImportingMotion(false);
    }
  };

  const applyMotionSource = (): void => {
    setMotionImportMessage('');
    onApplyStellarMotion(cloneMotionSource(draftMotionSource));
  };

  const updateLocalHorizonDirection = (key: LocalHorizonDirectionKey, value: number): void => {
    setLocalHorizonDraft((current) => ({ ...current, [key]: value }));
  };

  const applyLocalHorizonDraft = (): void => {
    if (localHorizonDraft.localHorizonEnabled && usesExternalDraft && !draftExternalLocalHorizonSource) {
      setHorizonImportMessage('Dış skyline modu için önce doğrulanmış bir dosya içe aktarılmalıdır.');
      return;
    }
    setHorizonImportMessage('');
    onApplyLocalHorizon(
      { ...settings, ...localHorizonDraft },
      cloneExternalSource(draftExternalLocalHorizonSource)
    );
  };

  const importLocalHorizon = async (): Promise<void> => {
    setIsImportingHorizon(true);
    setHorizonImportMessage('');
    try {
      const imported = await onImportLocalHorizon();
      if (!imported) return;
      setDraftExternalLocalHorizonSource(cloneExternalSource(imported));
      setLocalHorizonDraft((current) => ({
        ...current,
        localHorizonEnabled: true,
        localHorizonSourceMode: 'external'
      }));
      setHorizonImportMessage(`“${imported.fileName}” hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);
    } catch (error) {
      setHorizonImportMessage(error instanceof Error ? error.message : 'Skyline dosyası içe aktarılamadı.');
    } finally {
      setIsImportingHorizon(false);
    }
  };

  const prepareDemSkylineSource = (source: SavedStellarLocalHorizonSource): void => {
  setDraftExternalLocalHorizonSource(cloneExternalSource(source));
  setLocalHorizonDraft((current) => ({
    ...current,
    localHorizonEnabled: true,
    localHorizonSourceMode: 'external'
  }));
  setHorizonImportMessage(`“${source.fileName}” DEM skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);
};

  return (
    <section className="panel stellar-observation-panel">
      <div className="stellar-panel-heading">
        <div>
          <span className="eyebrow">Astronomik referans · yıldız</span>
          <h3>{result.star.commonName} <small>{result.star.bayerDesignation}</small></h3>
          <p>{result.star.constellation} · HR {result.star.hrNumber} · V {angleFormatter.format(result.star.visualMagnitude)}</p>
        </div>
        <div className="stellar-heading-actions">
          <span className={position.aboveGeometricHorizon ? 'stellar-state visible' : 'stellar-state below'}>
            {position.aboveGeometricHorizon ? '0° UFKUN ÜSTÜNDE' : '0° UFKUN ALTINDA'}
          </span>
          {localState && <span className={localState.className}>{localState.label}</span>}
          <button className="trace-button" type="button" onClick={onShowTrace}>Hesap izini aç</button>
        </div>
      </div>

      <div className="stellar-controls">
        <label>
          <span>Katalog yıldızı</span>
          <select
            value={settings.starId}
            onChange={(event) => onChange({ ...settings, starId: event.currentTarget.value })}
          >
            {BRIGHT_STAR_CATALOG.map((star) => (
              <option key={star.id} value={star.id}>
                {star.commonName} · {star.bayerDesignation} · V {star.visualMagnitude.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>İz süresi</span>
          <select
            value={settings.trailDurationMinutes}
            onChange={(event) => onChange({ ...settings, trailDurationMinutes: Number(event.currentTarget.value) })}
          >
            <option value={180}>3 saat</option>
            <option value={360}>6 saat</option>
            <option value={720}>12 saat</option>
            <option value={1440}>24 saat</option>
            <option value={2880}>48 saat</option>
          </select>
        </label>
        <label>
          <span>Örnekleme</span>
          <select
            value={settings.trailSampleIntervalMinutes}
            onChange={(event) => onChange({ ...settings, trailSampleIntervalMinutes: Number(event.currentTarget.value) })}
          >
            <option value={5}>5 dk</option>
            <option value={10}>10 dk</option>
            <option value={15}>15 dk</option>
            <option value={30}>30 dk</option>
            <option value={60}>60 dk</option>
          </select>
        </label>
      </div>

      <div className={stellarMotionSource ? 'stellar-motion-source active' : 'stellar-motion-source'}>
        <div className="stellar-motion-heading">
          <div>
            <strong>Doğrulanmış proper motion · BSC5P</strong>
            <span>Resmi V/50 catalog dosyası 19/19 HR + J2000 konum + V kadri üzerinden doğrulanır. Dosya seçimi hesap motorunu çalıştırmaz.</span>
          </div>
          <button className="stellar-motion-import-button" disabled={isImportingMotion} type="button" onClick={() => void importMotionSource()}>
            {isImportingMotion ? 'Katalog okunuyor…' : 'BSC5P catalog dosyasından al'}
          </button>
        </div>
        {draftMotionSource ? (
          <div className={motionSourceDirty ? 'stellar-motion-source-card draft' : 'stellar-motion-source-card'}>
            <div>
              <small>PROPER MOTION KAYNAĞI</small>
              <strong>{draftMotionSource.fileName}</strong>
              <span>{draftMotionSource.entryCount}/19 kayıt · FK5/J2000 · kaynak epok J{angleFormatter.format(draftMotionSource.sourceEpochJulianYear)}</span>
              {draftMotionEntry && (
                <span>Seçili yıldız: μ_α* {angleFormatter.format(draftMotionEntry.properMotionRaStarArcsecPerYear)}″/yıl · μ_δ {angleFormatter.format(draftMotionEntry.properMotionDecArcsecPerYear)}″/yıl</span>
              )}
            </div>
            <div>
              <span>SHA-256 <code title={draftMotionSource.sha256}>{draftMotionSource.sha256.slice(0, 12)}…</code></span>
              <span>{angleFormatter.format(draftMotionSource.fileSizeBytes / 1024)} KB · {formatImportedAt(draftMotionSource.importedAtIso)}</span>
            </div>
          </div>
        ) : (
          <p className="stellar-motion-empty">Kaynak uygulanmadı; yıldız sonuçları proper motion olmadan mevcut J2000 → precession zincirini kullanır.</p>
        )}
        {stellarMotionSource && result.properMotion && !motionSourceDirty && (
          <div className="stellar-motion-result">
            <span>Uygulanan toplam PM kayması <strong>{angleFormatter.format(result.properMotion.angularShiftArcsec)}″</strong></span>
            <span>J{angleFormatter.format(result.properMotion.sourceEpochJulianYear)} → gözlem epoch'u <strong>{angleFormatter.format(result.properMotion.elapsedJulianYears)} Jülyen yıl</strong></span>
          </div>
        )}
        {motionImportMessage && <p className="stellar-motion-message" role="status">{motionImportMessage}</p>}
        <div className="stellar-motion-apply-row">
          <span>{motionSourceDirty ? 'Proper-motion kaynak değişikliği henüz hesaplanmadı.' : stellarMotionSource ? 'Doğrulanmış proper-motion kaynağı hesapta uygulanıyor.' : 'Proper motion kapalı.'}</span>
          <div>
            <button
              className="stellar-motion-remove"
              disabled={!draftMotionSource}
              type="button"
              onClick={() => { setDraftMotionSource(undefined); setMotionImportMessage(''); }}
            >Kaynağı kaldır</button>
            <button
              className="stellar-motion-revert"
              disabled={!motionSourceDirty}
              type="button"
              onClick={() => { setDraftMotionSource(cloneMotionSource(stellarMotionSource)); setMotionImportMessage(''); }}
            >Geri al</button>
            <button className="stellar-motion-apply" disabled={!motionSourceDirty} type="button" onClick={applyMotionSource}>Uygula ve hesapla</button>
          </div>
        </div>
      </div>

      <div className={showRefractionDiagnostic ? 'stellar-refraction-diagnostic active' : 'stellar-refraction-diagnostic'}>
        <div className="stellar-refraction-heading">
          <div>
            <strong>Standart atmosferik kırılma tanısı</strong>
            <span>NOAA standart yaklaşımı yalnız yıldız ışınına uygulanır. Geometrik yıldız/skyline sonuçlarını değiştirmez.</span>
          </div>
          <label className="stellar-refraction-toggle">
            <input
              type="checkbox"
              checked={showRefractionDiagnostic}
              onChange={(event) => setShowRefractionDiagnostic(event.currentTarget.checked)}
            />
            <span>{showRefractionDiagnostic ? 'Gösteriliyor' : 'Kapalı'}</span>
          </label>
        </div>
        {showRefractionDiagnostic && (
          <>
            <div className="stellar-refraction-grid">
              <article>
                <span>Geometrik yükseklik</span>
                <strong>{formatAngle(apparent.geometricAltitudeDeg)}</strong>
              </article>
              <article>
                <span>Standart apparent yükseklik</span>
                <strong>{formatAngle(apparent.refraction.apparentAltitudeDeg)}</strong>
              </article>
              <article>
                <span>Kırılma düzeltmesi</span>
                <strong>{angleFormatter.format(apparent.refraction.refractionCorrectionArcmin)}′</strong>
              </article>
              <article>
                <span>Apparent astronomik 0°</span>
                <strong>{apparent.refraction.aboveApparentAstronomicalHorizon ? 'Üstünde' : 'Altında'}</strong>
              </article>
              {apparent.starOnlyApparentMinusGeometricSkylineDeg !== null && (
                <article className="mixed-reference">
                  <span>Apparent yıldız − geometrik skyline</span>
                  <strong>{formatAngle(apparent.starOnlyApparentMinusGeometricSkylineDeg)}</strong>
                  <b>Tanı · yerel görünürlük değildir</b>
                </article>
              )}
            </div>
            <p className="stellar-refraction-warning">
              Apparent yıldız yüksekliği ile geometrik skyline farklı referanslardadır. Skyline/terrain ışını aynı atmosfer modeliyle çözülmediği için bu farktan yerel görünür/görünmez kararı üretilmez.
            </p>
          </>
        )}
      </div>

      <div className={localHorizonDraft.localHorizonEnabled ? 'stellar-local-horizon-editor active' : 'stellar-local-horizon-editor'}>
        <div className="stellar-local-horizon-heading">
          <div>
            <strong>Yerel ufuk · manuel veya dosya skyline</strong>
            <span>Kaynak ve değer düzenlemeleri hesap motorunu çalıştırmaz; seçilen profil tek seferde uygulanır.</span>
          </div>
          <label className="stellar-local-horizon-toggle">
            <input
              type="checkbox"
              checked={localHorizonDraft.localHorizonEnabled}
              onChange={(event) => {
                const localHorizonEnabled = event.currentTarget.checked;
                setLocalHorizonDraft((current) => ({ ...current, localHorizonEnabled }));
              }}
            />
            <span>{localHorizonDraft.localHorizonEnabled ? 'Etkin' : 'Kapalı'}</span>
          </label>
        </div>

        <div className="stellar-local-horizon-source-switch">
          <div>
            <button
              className={localHorizonDraft.localHorizonSourceMode === 'manual' ? 'selected' : ''}
              type="button"
              onClick={() => setLocalHorizonDraft((current) => ({ ...current, localHorizonSourceMode: 'manual' }))}
            >
              8 yönlü manuel
            </button>
            <button
              className={usesExternalDraft ? 'selected' : ''}
              disabled={!draftExternalLocalHorizonSource}
              type="button"
              onClick={() => setLocalHorizonDraft((current) => ({ ...current, localHorizonSourceMode: 'external' }))}
            >
              Dosya profili
            </button>
          </div>
          <button className="stellar-skyline-import-button" disabled={isImportingHorizon} type="button" onClick={() => void importLocalHorizon()}>
            {isImportingHorizon ? 'Dosya okunuyor…' : 'Skyline dosyasından al'}
          </button>
        </div>

        <StellarDemSkylineControl
        observerLatitudeDeg={result.latitudeDeg}
        observerLongitudeDeg={result.longitudeDeg}
        observerHeightM={observerHeightM}
        onPreparedSource={prepareDemSkylineSource}
      />

      {draftExternalLocalHorizonSource && (
          <div className={usesExternalDraft ? 'stellar-skyline-source-card selected' : 'stellar-skyline-source-card'}>
            <div>
              <small>DOSYA SKYLINE KAYNAĞI</small>
              <strong>{draftExternalLocalHorizonSource.fileName}</strong>
              <span>{draftExternalLocalHorizonSource.format === 'dem' ? 'DEM · türetilmiş geometrik' : draftExternalLocalHorizonSource.format.toUpperCase()} · {draftExternalLocalHorizonSource.pointCount} nokta · en büyük boşluk {angleFormatter.format(draftExternalLocalHorizonSource.maximumAzimuthGapDeg)}°</span>
        {draftExternalLocalHorizonSource.demDerivation && (
          <span>ΔA {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.azimuthStepDeg)}° · Δs {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.distanceStepM)} m · menzil {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.maximumDistanceM / 1_000)} km · {draftExternalLocalHorizonSource.demDerivation.samplingMethod}</span>
        )}
            </div>
            <div>
              <span>SHA-256 <code title={draftExternalLocalHorizonSource.sha256}>{draftExternalLocalHorizonSource.sha256.slice(0, 12)}…</code></span>
              <span>{angleFormatter.format(draftExternalLocalHorizonSource.fileSizeBytes / 1024)} KB · {formatImportedAt(draftExternalLocalHorizonSource.importedAtIso)}</span>
            </div>
          </div>
        )}

        {localHorizonDraft.localHorizonEnabled && localHorizonDraft.localHorizonSourceMode === 'manual' && (
          <div className="stellar-local-horizon-grid">
            {STELLAR_LOCAL_HORIZON_DIRECTIONS.map((direction) => (
              <label key={direction.key}>
                <span>{direction.label} · {direction.azimuthDeg}°</span>
                <div>
                  <DraftNumberInput
                    ariaLabel={`${direction.label} yerel ufuk yüksekliği`}
                    min={-90}
                    max={90}
                    step={0.1}
                    value={localHorizonDraft[direction.key]}
                    onValidDraftChange={(value) => updateLocalHorizonDirection(direction.key, value)}
                    onCommit={(value) => updateLocalHorizonDirection(direction.key, value)}
                  />
                  <b>°</b>
                </div>
              </label>
            ))}
          </div>
        )}

        {localHorizonDraft.localHorizonEnabled && usesExternalDraft && !draftExternalLocalHorizonSource && (
          <p className="stellar-skyline-source-empty">Dış profil için CSV/TSV/TXT/JSON skyline içe aktar veya üstteki ESRI ASCII DEM'den tam 360° geometrik profil üret.</p>
        )}
        {draftExternalLocalHorizonSource && draftExternalLocalHorizonSource.warnings.length > 0 && usesExternalDraft && (
          <div className="stellar-skyline-source-warnings">
            {draftExternalLocalHorizonSource.warnings.map((warning) => <span key={warning}>{warning}</span>)}
          </div>
        )}
        {horizonImportMessage && <p className="stellar-skyline-import-message" role="status">{horizonImportMessage}</p>}

        <div className="stellar-local-horizon-apply-row">
          <span className={localHorizonDirty ? 'stellar-local-horizon-draft dirty' : 'stellar-local-horizon-draft'}>
            {localHorizonDirty ? 'Değişiklikler henüz hesaplanmadı.' : 'Editör ile hesaplanan sonuç eşleşiyor.'}
          </span>
          <div>
            <button
              className="stellar-local-horizon-revert"
              disabled={!localHorizonDirty}
              type="button"
              onClick={() => {
                setHorizonImportMessage('');
                setLocalHorizonDraft(localHorizonDraftFromSettings(settings));
                setDraftExternalLocalHorizonSource(cloneExternalSource(externalLocalHorizonSource));
              }}
            >
              Geri al
            </button>
            <button
              className="stellar-local-horizon-apply"
              disabled={!localHorizonDirty || (localHorizonDraft.localHorizonEnabled && usesExternalDraft && !draftExternalLocalHorizonSource)}
              type="button"
              onClick={applyLocalHorizonDraft}
            >
              Uygula ve hesapla
            </button>
          </div>
        </div>
      </div>

      <div className={showSkySnapshot ? 'stellar-sky-panel active' : 'stellar-sky-panel'}>
        <div className="stellar-sky-heading">
          <div>
            <strong>Çoklu yıldız gökyüzü · geometrik</strong>
            <span>Zenit merkezde, 0° astronomik ufuk dış çemberde. Katalogdaki 19 yıldız aynı gözlem anında çözülür.</span>
          </div>
          <label className="stellar-sky-toggle">
            <input
              type="checkbox"
              checked={showSkySnapshot}
              onChange={(event) => setShowSkySnapshot(event.currentTarget.checked)}
            />
            <span>{showSkySnapshot ? 'Gösteriliyor' : 'Kapalı'}</span>
          </label>
        </div>
        {showSkySnapshot && (
          <>
            <div className="stellar-sky-summary">
              <span>Haritada çizilen <strong>{skyStars.length}/{result.skySnapshot.starCount}</strong></span>
              <span>Geometrik 0° <strong>üstünde {result.skySnapshot.aboveGeometricHorizonCount} · altında ve çizilmeyen {result.skySnapshot.belowGeometricHorizonCount}</strong></span>
              {result.skySnapshot.localHorizonCounts && (
                <span>Çizilenlerde yerel skyline <strong>üstünde {plottedLocalCounts.above} · sınır {plottedLocalCounts.onHorizon} · altında {plottedLocalCounts.below}</strong></span>
              )}
              {selectedSkyStar && !selectedSkyStar.aboveGeometricHorizon && (
                <span>Seçili yıldız <strong>0° geometrik ufkun altında · haritada çizilmez</strong></span>
              )}
            </div>
            <div className="stellar-sky-chart-wrap">
              <svg aria-label="Katalog yıldızlarının zenit merkezli geometrik polar gökyüzü görünümü" role="img" viewBox="0 0 100 100">
                <circle className="stellar-sky-horizon" cx="50" cy="50" r="43" />
                <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="28.67" />
                <circle className="stellar-sky-altitude-ring" cx="50" cy="50" r="14.33" />
                <line className="stellar-sky-axis" x1="50" y1="7" x2="50" y2="93" />
                <line className="stellar-sky-axis" x1="7" y1="50" x2="93" y2="50" />
                <text className="stellar-sky-cardinal north" x="50" y="4.5">K</text>
                <text className="stellar-sky-cardinal east" x="96" y="51.5">D</text>
                <text className="stellar-sky-cardinal south" x="50" y="98.5">G</text>
                <text className="stellar-sky-cardinal west" x="4" y="51.5">B</text>
                <text className="stellar-sky-altitude-label" x="50" y="20.5">60°</text>
                <text className="stellar-sky-altitude-label" x="50" y="35">30°</text>
                {skyStars.map((star) => {
                  const point = projectStellarSkyPoint({ elevationDeg: star.elevationDeg, azimuthDeg: star.azimuthDeg! });
                  const selected = star.starId === settings.starId;
                  const locallyBlocked = star.localHorizonStatus === 'below';
                  const onLocalHorizon = star.localHorizonStatus === 'on-horizon';
                  const className = selected
                    ? 'stellar-sky-star selected'
                    : locallyBlocked
                      ? 'stellar-sky-star locally-blocked'
                      : onLocalHorizon
                        ? 'stellar-sky-star local-boundary'
                        : 'stellar-sky-star';
                  return (
                    <g key={star.starId} className={className}>
                      <title>{star.commonName} · h {angleFormatter.format(star.elevationDeg)}° · A {angleFormatter.format(star.azimuthDeg!)}° · V {angleFormatter.format(star.visualMagnitude)}</title>
                      <circle cx={point.x} cy={point.y} r={stellarSkyMarkerRadius(star.visualMagnitude) + (selected ? 0.5 : 0)} />
                      {brightestSkyStarIds.has(star.starId) && (
                        <text x={point.x + 2.2} y={point.y - 1.8}>{star.commonName}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
              <div className="stellar-sky-legend">
                <span className="catalog-star">Geometrik 0° üstü katalog yıldızı</span>
                <span className="selected-star">Seçili yıldız</span>
                {result.skySnapshot.localHorizonApplied && <span className="blocked-star">Geometrik olarak yerel skyline altında</span>}
              </div>
            </div>
            <p className="stellar-sky-note">
              Bu harita üst geometrik yarımküreyi gösterir. Nokta büyüklüğü katalog görsel kadrini yalnız ayırt edici ölçek olarak kullanır; atmosferik sönümleme, gökyüzü parlaklığı ve çıplak-göz eşiği uygulanmadığı için optik görünürlük haritası değildir. Standart apparent tanı bu haritaya uygulanmaz.
            </p>
          </>
        )}
      </div>

      <div className="stellar-coordinate-grid">
        <article>
          <span>Katalog · J2000</span>
          <strong>α {preciseFormatter.format(result.sourceRightAscensionJ2000Deg)}°</strong>
          <b>δ {preciseFormatter.format(result.sourceDeclinationJ2000Deg)}°</b>
        </article>
        <article>
          <span>Gözlem tarihi · ortalama</span>
          <strong>α {preciseFormatter.format(result.meanOfDateRightAscensionDeg)}°</strong>
          <b>δ {preciseFormatter.format(result.meanOfDateDeclinationDeg)}°</b>
        </article>
        <article>
          <span>Precession kayması</span>
          <strong>{angleFormatter.format(result.precessionAngularShiftArcsec)}″</strong>
          <b>IAU 2006</b>
        </article>
        <article>
          <span>Yerel yıldız zamanı</span>
          <strong>{angleFormatter.format(position.localMeanSiderealTimeDeg)}°</strong>
          <b>LMST</b>
        </article>
      </div>

      <div className="stellar-position-grid">
        <article><span>Yükseklik</span><strong>{formatAngle(position.elevationDeg)}</strong></article>
        <article><span>Azimut</span><strong>{formatAngle(position.azimuthDeg)}</strong></article>
        <article><span>Saat açısı</span><strong>{formatAngle(position.hourAngleDeg)}</strong></article>
        <article><span>Günlük sınıf</span><strong>{horizonClassLabels[position.horizonClass]}</strong></article>
        {settings.localHorizonEnabled && (
          <>
            <article><span>Bu azimutta yerel ufuk</span><strong>{formatAngle(firstLocalSample?.localHorizonAltitudeDeg ?? null)}</strong></article>
            <article><span>Yerel ufuk açıklığı</span><strong>{formatAngle(firstLocalSample?.geometricClearanceDeg ?? null)}</strong></article>
          </>
        )}
      </div>

      <div className="stellar-trail-card">
        <div className="stellar-trail-title">
          <div>
            <span>Geometrik yıldız izi</span>
            <strong>{formatDuration(result.trail.durationMinutes)} pencere · {result.trail.samples.length} örnek</strong>
          </div>
          <div>
            <span>0° ufuk üstü</span>
            <strong>{formatDuration(result.trail.visibleDurationMinutes)}</strong>
          </div>
          {result.localHorizonTrail && (
            <div>
              <span>Yerel ufuk üstü</span>
              <strong>{formatDuration(result.localHorizonTrail.visibleDurationMinutes)}</strong>
            </div>
          )}
        </div>
        <svg aria-label="Geometrik yıldız yüksekliği, isteğe bağlı standart apparent yıldız yüksekliği ve yerel skyline zaman izi" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="stellar-horizon-line" x1="4" x2="96" y1="50" y2="50" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="6" y2="6" />
          <line className="stellar-guide-line" x1="4" x2="96" y1="94" y2="94" />
          {skylinePolyline && <polyline className="stellar-local-horizon-line" points={skylinePolyline} fill="none" />}
          <polyline className="stellar-trail-line" points={polyline} fill="none" />
          {showRefractionDiagnostic && apparentPolyline && <polyline className="stellar-apparent-trail-line" points={apparentPolyline} fill="none" />}
        </svg>
        <div className="stellar-trail-axis"><span>+90°</span><span>0° astronomik ufuk</span><span>−90°</span></div>
        {(result.localHorizonTrail || showRefractionDiagnostic) && (
          <div className="stellar-trail-legend">
            <span className="star-line-key">Geometrik yıldız</span>
            {showRefractionDiagnostic && <span className="apparent-line-key">Standart apparent</span>}
            {result.localHorizonTrail && <span className="skyline-line-key">Yerel skyline</span>}
          </div>
        )}
      </div>

      <div className="stellar-crossings">
        <span>0° astronomik ufuk geçişleri</span>
        {crossings.length === 0 ? (
          <strong>Bu zaman penceresinde 0° doğuş/batış geçişi yok.</strong>
        ) : crossings.map((crossing) => (
          <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>
            {crossing.kind === 'rise' ? 'Doğuş' : 'Batış'} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)}
          </strong>
        ))}
      </div>

      {result.localHorizonTrail && (
        <div className="stellar-crossings local">
          <span>Yerel skyline geçişleri</span>
          {localCrossings.length === 0 ? (
            <strong>Bu zaman penceresinde yerel ufuk geçişi yok.</strong>
          ) : localCrossings.map((crossing) => (
            <strong key={`${crossing.kind}-${crossing.observedAtIso}`}>
              {crossing.kind === 'rise' ? 'Yerel doğuş' : 'Yerel batış'} · UTC {formatClock(crossing.observedAtIso)} · A {formatAngle(crossing.azimuthDeg)} · ufuk {formatAngle(crossing.localHorizonAltitudeDeg)}
            </strong>
          ))}
        </div>
      )}

      <p className="stellar-source-note">
        {BRIGHT_STAR_CATALOG_SOURCE}. Geometrik yıldız izi ve yerel skyline ana sonuçlardır. Standart kırılma tanısı yalnız yıldız ışını için yaklaşık apparent yüksekliği ayrı gösterir; geometrik skyline ile karma fark yerel optik görünürlük değildir. Sönümleme, gökyüzü parlaklığı, gerçek hava profili, bulut, seeing ve çıplak-göz algı eşiği uygulanmaz.
      </p>
      {prediction.warnings.length > 0 && <p className="stellar-warning">{prediction.warnings[2]}</p>}
    </section>
  );
}
