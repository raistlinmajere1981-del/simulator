import { useEffect, useState } from 'react';
import { BRIGHT_STAR_CATALOG } from '../../simulation/bright-star-catalog';
import {
  STELLAR_LOCAL_HORIZON_DIRECTIONS,
  type StellarObservationResult,
  type StellarObservationSettings
} from '../../simulation/stellar-observation';
import type { ModelPrediction } from '../../shared/domain';
import type { SavedStellarLocalHorizonSource } from '../../shared/stellar-local-horizon-import';
import type { SavedStellarMotionSource } from '../../shared/stellar-motion-source';
import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag, translate, type AppLocale } from './i18n';
import { StellarDemSkylineControl } from './StellarDemSkylineControl';
import { StellarPanoramaSkylineControl } from './StellarPanoramaSkylineControl';
import { StellarObservationResults } from './StellarObservationResults';
import { StellarSkySnapshotPanel } from './StellarSkySnapshotPanel';
import {
  cloneExternalSource,
  cloneMotionSource,
  externalSourceSignature,
  localHorizonDraftFromSettings,
  localHorizonDraftMatchesSettings,
  localHorizonSignature,
  motionSourceSignature,
  type LocalHorizonDirectionKey,
  type LocalHorizonDraft
} from './stellar-observation-view-model';
import './stellar-observation-panel.css';

function localizedLocalHorizonState(result: StellarObservationResult, locale: AppLocale): { label: string; className: string } | null {
  const sample = result.localHorizonTrail?.samples[0];
  if (!sample) return null;
  if (sample.status === 'undefined-azimuth') return { label: translate(locale, 'stellar.controls.localUndefinedAzimuth'), className: 'stellar-state neutral' };
  if (sample.status === 'below') return { label: translate(locale, 'stellar.controls.localBelow'), className: 'stellar-state below' };
  if (sample.status === 'on-horizon') return { label: translate(locale, 'stellar.controls.localBoundary'), className: 'stellar-state neutral' };
  return { label: translate(locale, 'stellar.controls.localAbove'), className: 'stellar-state visible' };
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
  const { locale, t } = useI18n();
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const formatAngle = (value: number | null): string => value === null ? t('stellar.undefined') : `${angleFormatter.format(value)}°`;
  const importedAtFormatter = new Intl.DateTimeFormat(appLocaleTag(locale), { dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' });
  const formatImportedAt = (iso: string): string => importedAtFormatter.format(new Date(iso));
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
  const localState = localizedLocalHorizonState(result, locale);
  const apparent = result.apparentDiagnostic;
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
      setMotionImportMessage(t('stellar.motion.validated', { fileName: imported.fileName }));
    } catch (error) {
      setMotionImportMessage(error instanceof Error ? error.message : t('stellar.motion.importError'));
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

  const preparePanoramaSkylineSource = (source: SavedStellarLocalHorizonSource): void => {
    setDraftExternalLocalHorizonSource(cloneExternalSource(source));
    setLocalHorizonDraft((current) => ({
      ...current,
      localHorizonEnabled: true,
      localHorizonSourceMode: 'external'
    }));
    setHorizonImportMessage(`“${source.fileName}” panorama skyline taslağı hazır. Uygula ve hesapla ile yıldız izine bağlanacak.`);
  };

  return (
    <section className="panel stellar-observation-panel">
      <div className="stellar-panel-heading">
        <div>
          <span className="eyebrow">{t('stellar.controls.stage')}</span>
          <h3>{result.star.commonName} <small>{result.star.bayerDesignation}</small></h3>
          <p>{result.star.constellation} · HR {result.star.hrNumber} · V {angleFormatter.format(result.star.visualMagnitude)}</p>
        </div>
        <div className="stellar-heading-actions">
          <span className={position.aboveGeometricHorizon ? 'stellar-state visible' : 'stellar-state below'}>
            {position.aboveGeometricHorizon ? t('stellar.controls.aboveZero') : t('stellar.controls.belowZero')}
          </span>
          {localState && <span className={localState.className}>{localState.label}</span>}
          <button className="trace-button" type="button" onClick={onShowTrace}>{t('stellar.controls.trace')}</button>
        </div>
      </div>

      <div className="stellar-controls">
        <label>
          <span>{t('stellar.controls.catalogStar')}</span>
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
          <span>{t('stellar.controls.trailDuration')}</span>
          <select
            value={settings.trailDurationMinutes}
            onChange={(event) => onChange({ ...settings, trailDurationMinutes: Number(event.currentTarget.value) })}
          >
            <option value={180}>{t('stellar.controls.hours', { value: 3 })}</option>
            <option value={360}>{t('stellar.controls.hours', { value: 6 })}</option>
            <option value={720}>{t('stellar.controls.hours', { value: 12 })}</option>
            <option value={1440}>{t('stellar.controls.hours', { value: 24 })}</option>
            <option value={2880}>{t('stellar.controls.hours', { value: 48 })}</option>
          </select>
        </label>
        <label>
          <span>{t('stellar.controls.sampling')}</span>
          <select
            value={settings.trailSampleIntervalMinutes}
            onChange={(event) => onChange({ ...settings, trailSampleIntervalMinutes: Number(event.currentTarget.value) })}
          >
            <option value={5}>{t('stellar.controls.minutes', { value: 5 })}</option>
            <option value={10}>{t('stellar.controls.minutes', { value: 10 })}</option>
            <option value={15}>{t('stellar.controls.minutes', { value: 15 })}</option>
            <option value={30}>{t('stellar.controls.minutes', { value: 30 })}</option>
            <option value={60}>{t('stellar.controls.minutes', { value: 60 })}</option>
          </select>
        </label>
      </div>

      <div className={stellarMotionSource ? 'stellar-motion-source active' : 'stellar-motion-source'}>
        <div className="stellar-motion-heading">
          <div>
            <strong>{t('stellar.motion.title')}</strong>
            <span>{t('stellar.motion.description')}</span>
          </div>
          <button className="stellar-motion-import-button" disabled={isImportingMotion} type="button" onClick={() => void importMotionSource()}>
            {isImportingMotion ? t('stellar.motion.importing') : t('stellar.motion.import')}
          </button>
        </div>
        {draftMotionSource ? (
          <div className={motionSourceDirty ? 'stellar-motion-source-card draft' : 'stellar-motion-source-card'}>
            <div>
              <small>{t('stellar.motion.sourceLabel')}</small>
              <strong>{draftMotionSource.fileName}</strong>
              <span>{t('stellar.motion.records', { count: draftMotionSource.entryCount, epoch: angleFormatter.format(draftMotionSource.sourceEpochJulianYear) })}</span>
              {draftMotionEntry && (
                <span>{t('stellar.motion.selectedStar', { ra: angleFormatter.format(draftMotionEntry.properMotionRaStarArcsecPerYear), dec: angleFormatter.format(draftMotionEntry.properMotionDecArcsecPerYear) })}</span>
              )}
            </div>
            <div>
              <span>SHA-256 <code title={draftMotionSource.sha256}>{draftMotionSource.sha256.slice(0, 12)}…</code></span>
              <span>{angleFormatter.format(draftMotionSource.fileSizeBytes / 1024)} KB · {formatImportedAt(draftMotionSource.importedAtIso)}</span>
            </div>
          </div>
        ) : (
          <p className="stellar-motion-empty">{t('stellar.motion.empty')}</p>
        )}
        {stellarMotionSource && result.properMotion && !motionSourceDirty && (
          <div className="stellar-motion-result">
            <span>{t('stellar.motion.totalShift')} <strong>{angleFormatter.format(result.properMotion.angularShiftArcsec)}″</strong></span>
            <span>{t('stellar.motion.epochSpan', { epoch: angleFormatter.format(result.properMotion.sourceEpochJulianYear) })} <strong>{t('stellar.motion.julianYears', { value: angleFormatter.format(result.properMotion.elapsedJulianYears) })}</strong></span>
          </div>
        )}
        {motionImportMessage && <p className="stellar-motion-message" role="status">{motionImportMessage}</p>}
        <div className="stellar-motion-apply-row">
          <span>{motionSourceDirty ? t('stellar.motion.dirty') : stellarMotionSource ? t('stellar.motion.applied') : t('stellar.motion.off')}</span>
          <div>
            <button
              className="stellar-motion-remove"
              disabled={!draftMotionSource}
              type="button"
              onClick={() => { setDraftMotionSource(undefined); setMotionImportMessage(''); }}
            >{t('stellar.motion.remove')}</button>
            <button
              className="stellar-motion-revert"
              disabled={!motionSourceDirty}
              type="button"
              onClick={() => { setDraftMotionSource(cloneMotionSource(stellarMotionSource)); setMotionImportMessage(''); }}
            >{t('stellar.motion.revert')}</button>
            <button className="stellar-motion-apply" disabled={!motionSourceDirty} type="button" onClick={applyMotionSource}>{t('stellar.motion.apply')}</button>
          </div>
        </div>
      </div>

      <div className={showRefractionDiagnostic ? 'stellar-refraction-diagnostic active' : 'stellar-refraction-diagnostic'}>
        <div className="stellar-refraction-heading">
          <div>
            <strong>{t('stellar.refraction.title')}</strong>
            <span>{t('stellar.refraction.description')}</span>
          </div>
          <label className="stellar-refraction-toggle">
            <input
              type="checkbox"
              checked={showRefractionDiagnostic}
              onChange={(event) => setShowRefractionDiagnostic(event.currentTarget.checked)}
            />
            <span>{showRefractionDiagnostic ? t('stellar.sky.shown') : t('stellar.sky.off')}</span>
          </label>
        </div>
        {showRefractionDiagnostic && (
          <>
            <div className="stellar-refraction-grid">
              <article>
                <span>{t('stellar.refraction.geometricAltitude')}</span>
                <strong>{formatAngle(apparent.geometricAltitudeDeg)}</strong>
              </article>
              <article>
                <span>{t('stellar.refraction.apparentAltitude')}</span>
                <strong>{formatAngle(apparent.refraction.apparentAltitudeDeg)}</strong>
              </article>
              <article>
                <span>{t('stellar.refraction.correction')}</span>
                <strong>{angleFormatter.format(apparent.refraction.refractionCorrectionArcmin)}′</strong>
              </article>
              <article>
                <span>{t('stellar.refraction.apparentZero')}</span>
                <strong>{apparent.refraction.aboveApparentAstronomicalHorizon ? t('stellar.refraction.above') : t('stellar.refraction.below')}</strong>
              </article>
              {apparent.starOnlyApparentMinusGeometricSkylineDeg !== null && (
                <article className="mixed-reference">
                  <span>{t('stellar.refraction.mixedReference')}</span>
                  <strong>{formatAngle(apparent.starOnlyApparentMinusGeometricSkylineDeg)}</strong>
                  <b>{t('stellar.refraction.diagnosticOnly')}</b>
                </article>
              )}
            </div>
            <p className="stellar-refraction-warning">
              {t('stellar.refraction.warning')}
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

        <StellarPanoramaSkylineControl
          onPreparedSource={preparePanoramaSkylineSource}
        />

      {draftExternalLocalHorizonSource && (
          <div className={usesExternalDraft ? 'stellar-skyline-source-card selected' : 'stellar-skyline-source-card'}>
            <div>
              <small>YEREL SKYLINE KAYNAĞI</small>
              <strong>{draftExternalLocalHorizonSource.fileName}</strong>
              <span>{draftExternalLocalHorizonSource.format === 'dem' ? 'DEM · türetilmiş geometrik' : draftExternalLocalHorizonSource.format === 'panorama' ? 'PANORAMA · türetilmiş geometrik' : draftExternalLocalHorizonSource.format.toUpperCase()} · {draftExternalLocalHorizonSource.pointCount} nokta · en büyük boşluk {angleFormatter.format(draftExternalLocalHorizonSource.maximumAzimuthGapDeg)}°</span>
        {draftExternalLocalHorizonSource.demDerivation && (
          <span>ΔA {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.azimuthStepDeg)}° · Δs {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.distanceStepM)} m · menzil {angleFormatter.format(draftExternalLocalHorizonSource.demDerivation.maximumDistanceM / 1_000)} km · {draftExternalLocalHorizonSource.demDerivation.samplingMethod}</span>
        )}
        {draftExternalLocalHorizonSource.panoramaDerivation && (
          <span>{draftExternalLocalHorizonSource.panoramaDerivation.geometrySource === 'gpano-xmp' ? 'GPano XMP' : 'Manuel geometri'} · yatay {angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.horizontalCoverageDeg)}° · heading {angleFormatter.format(draftExternalLocalHorizonSource.panoramaDerivation.geometry.poseHeadingDeg)}° · {draftExternalLocalHorizonSource.panoramaDerivation.marks.length} işaret</span>
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
          <p className="stellar-skyline-source-empty">Dış profil için CSV/TSV/TXT/JSON skyline içe aktar, ESRI ASCII DEM'den profil üret veya 360° panoramayı manuel işaretle.</p>
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

      <StellarSkySnapshotPanel
        onShowChange={setShowSkySnapshot}
        result={result}
        settings={settings}
        show={showSkySnapshot}
      />

      <StellarObservationResults
        prediction={prediction}
        result={result}
        settings={settings}
        showRefractionDiagnostic={showRefractionDiagnostic}
      />
    </section>
  );
}
