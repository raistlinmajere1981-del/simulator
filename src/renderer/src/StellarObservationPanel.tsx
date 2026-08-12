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
import { StellarDemSkylineControl } from './StellarDemSkylineControl';
import { StellarPanoramaSkylineControl } from './StellarPanoramaSkylineControl';
import { StellarObservationResults } from './StellarObservationResults';
import { StellarSkySnapshotPanel } from './StellarSkySnapshotPanel';
import {
  angleFormatter,
  cloneExternalSource,
  cloneMotionSource,
  currentLocalHorizonState,
  externalSourceSignature,
  formatAngle,
  formatImportedAt,
  localHorizonDraftFromSettings,
  localHorizonDraftMatchesSettings,
  localHorizonSignature,
  motionSourceSignature,
  type LocalHorizonDirectionKey,
  type LocalHorizonDraft
} from './stellar-observation-view-model';
import './stellar-observation-panel.css';

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
  const localState = currentLocalHorizonState(result);
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
