import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModelPrediction } from '../../shared/domain';
import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoReferenceKind,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
import {
  createPhotoCalibrationRecord,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';
import { containedImagePointerToPixel } from '../../simulation/photo-overlay';
import {
  buildPhotoCalibrationCandidate,
  cameraUncertaintyFromDraft,
  defaultMarks,
  draftFromSaved,
  emptyDraft,
  finiteDraftNumber,
  formatAngle,
  formatBytes,
  markOrder,
  sourceMetadata,
  type CalibrationSource,
  type DraftState,
  type MarkKey
} from './photo-calibration-state';
import './photo-calibration-control.css';
import { PanelHelpButton } from './HelpSystem';
import { useI18n } from './I18nProvider';
import { PhotoCalibrationMarkerPanel } from './PhotoCalibrationMarkerPanel';

interface PhotoSessionStatus {
  photoLoaded: boolean;
  calibrationCommitted: boolean;
}

export function PhotoCalibrationControl({
  experimentId,
  savedCalibration,
  savedPrediction,
  onSave,
  onClear,
  onPhotoSessionChange
}: {
  experimentId: string;
  savedCalibration?: SavedPhotoCalibration;
  savedPrediction?: ModelPrediction;
  onSave(calibration: SavedPhotoCalibration, record: PhotoCalibrationRecord): void;
  onClear(): void;
  onPhotoSessionChange(status: PhotoSessionStatus): void;
}): React.JSX.Element {
  const { locale, t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<ImportedObservationPhoto>();
  const [draft, setDraft] = useState<DraftState>(() => draftFromSaved(savedCalibration));
  const [selectedMark, setSelectedMark] = useState<MarkKey>('horizonStart');
  const [touchedMarks, setTouchedMarks] = useState<Set<MarkKey>>(
    () => new Set(savedCalibration ? markOrder : [])
  );
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setPreview(undefined);
    setDraft(draftFromSaved(savedCalibration));
    setSelectedMark('horizonStart');
    setTouchedMarks(new Set(savedCalibration ? markOrder : []));
    setIsDirty(false);
    setMessage('');

    if (savedCalibration) {
      void window.simulatorDesktop.loadObservationPhoto(savedCalibration.source)
        .then((result) => {
          if (cancelled) return;
          if (result.status === 'success' && result.photo) {
            setPreview(result.photo);
            setMessage(result.message);
          } else {
            setMessage(result.message);
          }
        })
        .catch((caught) => {
          if (!cancelled) {
            setMessage(caught instanceof Error ? caught.message : t('photo.calibration.savedPhotoLoadFallback'));
          }
        });
    }

    return () => {
      cancelled = true;
    };
  // Parent calibration updates in the same experiment must not discard the session photo preview.
  }, [experimentId]);

  useEffect(() => {
    onPhotoSessionChange({
      photoLoaded: draft.source !== undefined,
      calibrationCommitted: savedCalibration !== undefined
    });
  }, [draft.source, savedCalibration, onPhotoSessionChange]);

  const candidate = useMemo(
    () => buildPhotoCalibrationCandidate(draft, experimentId, touchedMarks, locale),
    [draft, experimentId, locale, touchedMarks]
  );

  const loadPhoto = async (): Promise<void> => {
    setMessage('');
    try {
      const result = await window.simulatorDesktop.importObservationPhoto();
      if (result.status === 'cancelled' || !result.photo) {
        setMessage(result.message);
        return;
      }
      const photo = result.photo;
      setPreview(photo);
      const sameSource = savedCalibration?.source.sha256 === photo.sha256 &&
        savedCalibration.source.imageWidthPx === photo.imageWidthPx &&
        savedCalibration.source.imageHeightPx === photo.imageHeightPx;
      if (sameSource && savedCalibration) {
        setDraft(draftFromSaved(savedCalibration));
        setTouchedMarks(new Set(markOrder));
        setIsDirty(false);
        setMessage(t('photo.calibration.sourceMatched'));
        return;
      }

      const source = sourceMetadata(photo);
      setDraft({
        ...emptyDraft(),
        source,
        marks: defaultMarks(source)
      });
      setSelectedMark('horizonStart');
      setTouchedMarks(new Set());
      setIsDirty(true);
      onClear();
      setMessage(t('photo.calibration.newPhoto'));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : t('photo.calibration.loadFallback'));
    }
  };

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const placeSelectedMark = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!draft.source || !draft.marks || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const point = containedImagePointerToPixel({
      containerWidthPx: rect.width,
      containerHeightPx: rect.height,
      imageWidthPx: draft.source.imageWidthPx,
      imageHeightPx: draft.source.imageHeightPx,
      pointerXPx: event.clientX - rect.left,
      pointerYPx: event.clientY - rect.top
    });
    if (!point) return;

    setDraft((current) => current.marks ? {
      ...current,
      marks: {
        ...current.marks,
        [selectedMark]: {
          ...current.marks[selectedMark],
          xPx: point.xPx,
          yPx: point.yPx
        }
      }
    } : current);
    setTouchedMarks((current) => new Set(current).add(selectedMark));
    setIsDirty(true);
    const index = markOrder.indexOf(selectedMark);
    if (index >= 0 && index < markOrder.length - 1) {
      setSelectedMark(markOrder[index + 1]!);
    }
  };

  const saveCalibration = (): void => {
    if (!candidate.record || !draft.source || !draft.marks) return;
    const defaultMarkUncertaintyPx = Number(draft.defaultMarkUncertaintyPx);
    const principalPointXPx = finiteDraftNumber(draft.principalPointXPx);
    const principalPointYPx = finiteDraftNumber(draft.principalPointYPx);
    const cameraUncertainty = cameraUncertaintyFromDraft(draft, locale);
    const calibration = draft.calibrationSource === 'field-of-view'
      ? {
          sourceKind: 'field-of-view' as const,
          horizontalFovDeg: Number(draft.horizontalFovDeg),
          verticalFovDeg: Number(draft.verticalFovDeg)
        }
      : {
          sourceKind: 'sensor-focal' as const,
          focalLengthMm: Number(draft.focalLengthMm),
          sensorWidthMm: Number(draft.sensorWidthMm),
          sensorHeightMm: Number(draft.sensorHeightMm)
        };
    const saved: SavedPhotoCalibration = {
      source: { ...draft.source },
      calibration,
      ...(principalPointXPx === undefined ? {} : { principalPointXPx }),
      ...(principalPointYPx === undefined ? {} : { principalPointYPx }),
      defaultMarkUncertaintyPx,
      ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),
      distortionCorrected: draft.distortionCorrected,
      referenceKind: draft.referenceKind,
      marks: {
        horizonStart: { ...draft.marks.horizonStart },
        horizonEnd: { ...draft.marks.horizonEnd },
        targetBase: { ...draft.marks.targetBase },
        targetTop: { ...draft.marks.targetTop }
      },
      recordedAtIso: new Date().toISOString(),
      ...(draft.notes.trim() === '' ? {} : { notes: draft.notes.trim() })
    };

    // Recompute once with the exact persisted timestamp so prediction provenance matches state.
    const record = createPhotoCalibrationRecord({
      experimentId,
      imageSourceLabel: saved.source.fileName,
      recordedAtIso: saved.recordedAtIso,
      imageWidthPx: saved.source.imageWidthPx,
      imageHeightPx: saved.source.imageHeightPx,
      ...(saved.principalPointXPx === undefined ? {} : { principalPointXPx: saved.principalPointXPx }),
      ...(saved.principalPointYPx === undefined ? {} : { principalPointYPx: saved.principalPointYPx }),
      calibration: saved.calibration,
      marks: saved.marks,
      defaultMarkUncertaintyPx: saved.defaultMarkUncertaintyPx,
      ...(saved.cameraUncertainty === undefined ? {} : { cameraUncertainty: saved.cameraUncertainty }),
      distortionCorrected: saved.distortionCorrected,
      ...(saved.notes === undefined ? {} : { notes: saved.notes })
    });
    onSave(saved, record);
    setIsDirty(false);
    setMessage(t('photo.calibration.savedPrepared'));
  };

  const displayedPrediction = isDirty ? candidate.record?.prediction : savedPrediction ?? candidate.record?.prediction;
  const metrics = displayedPrediction ? Object.fromEntries(
    displayedPrediction.metrics.map((metric) => [metric.key, metric])
  ) : {};

  const source = draft.source;
  const marks = draft.marks;

  return (
    <section className="photo-calibration-panel">
      <div className="photo-calibration-heading">
        <div>
          <span className="eyebrow">{t('photo.calibration.eyebrow')}</span>
          <strong>{source ? source.fileName : t('photo.calibration.noPhoto')}</strong>
        </div>
        <div className="photo-calibration-actions">
          <PanelHelpButton panelId="photo-calibration" />
          {savedCalibration && !isDirty && <span className="photo-state saved">{t('photo.calibration.saved')}</span>}
          {isDirty && <span className="photo-state dirty">{t('photo.calibration.edited')}</span>}
          <button type="button" onClick={() => void loadPhoto()}>
            {source ? t('photo.calibration.selectReload') : t('photo.calibration.load')}
          </button>
        </div>
      </div>

      <p className="photo-calibration-note">{t('photo.calibration.assetNote')}</p>

      {source && (
        <div className="photo-source-strip">
          <span>{source.imageWidthPx}×{source.imageHeightPx} px</span>
          <span>{formatBytes(locale, source.fileSizeBytes)}</span>
          <span>{source.mimeType}</span>
          <code title={source.sha256}>SHA-256 {source.sha256.slice(0, 12)}…</code>
        </div>
      )}

      <PhotoCalibrationMarkerPanel
        marks={marks}
        onPlaceSelectedMark={placeSelectedMark}
        onSelectMark={setSelectedMark}
        preview={preview}
        selectedMark={selectedMark}
        source={source}
        touchedMarks={touchedMarks}
        viewportRef={viewportRef}
      />

      {source && marks && (
        <>
          <div className="photo-camera-grid">
            <label>
              <span>{t('photo.calibration.method')}</span>
              <select
                value={draft.calibrationSource}
                onChange={(event) => updateDraft('calibrationSource', event.currentTarget.value as CalibrationSource)}
              >
                <option value="field-of-view">{t('photo.calibration.method.fov')}</option>
                <option value="sensor-focal">{t('photo.calibration.method.sensorFocal')}</option>
              </select>
            </label>
            <label>
              <span>{t('photo.calibration.referenceKind')}</span>
              <select
                value={draft.referenceKind}
                onChange={(event) => updateDraft('referenceKind', event.currentTarget.value as PhotoReferenceKind)}
              >
                <option value="visual-reference">{t('photo.calibration.reference.visual')}</option>
                <option value="local-horizontal">{t('photo.calibration.reference.horizontal')}</option>
              </select>
            </label>

            {draft.calibrationSource === 'field-of-view' ? (
              <>
                <label><span>{t('photo.calibration.horizontalFov')}</span><div><input inputMode="decimal" value={draft.horizontalFovDeg} onChange={(event) => updateDraft('horizontalFovDeg', event.currentTarget.value)} /><em>°</em></div></label>
                <label><span>{t('photo.calibration.verticalFov')}</span><div><input inputMode="decimal" value={draft.verticalFovDeg} onChange={(event) => updateDraft('verticalFovDeg', event.currentTarget.value)} /><em>°</em></div></label>
              </>
            ) : (
              <>
                <label><span>{t('photo.calibration.focalLength')}</span><div><input inputMode="decimal" value={draft.focalLengthMm} onChange={(event) => updateDraft('focalLengthMm', event.currentTarget.value)} /><em>mm</em></div></label>
                <label><span>{t('photo.calibration.sensorWidth')}</span><div><input inputMode="decimal" value={draft.sensorWidthMm} onChange={(event) => updateDraft('sensorWidthMm', event.currentTarget.value)} /><em>mm</em></div></label>
                <label><span>{t('photo.calibration.sensorHeight')}</span><div><input inputMode="decimal" value={draft.sensorHeightMm} onChange={(event) => updateDraft('sensorHeightMm', event.currentTarget.value)} /><em>mm</em></div></label>
              </>
            )}

            <label><span>{t('photo.calibration.principalX')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.imageCenter')} value={draft.principalPointXPx} onChange={(event) => updateDraft('principalPointXPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label><span>{t('photo.calibration.principalY')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.imageCenter')} value={draft.principalPointYPx} onChange={(event) => updateDraft('principalPointYPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label><span>{t('photo.calibration.markUncertainty')}</span><div><input inputMode="decimal" value={draft.defaultMarkUncertaintyPx} onChange={(event) => updateDraft('defaultMarkUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label className="photo-checkbox"><input type="checkbox" checked={draft.distortionCorrected} onChange={(event) => updateDraft('distortionCorrected', event.currentTarget.checked)} /><span>{t('photo.calibration.distortionCorrected')}</span></label>
            <label className="photo-notes"><span>{t('photo.calibration.notes')}</span><input value={draft.notes} onChange={(event) => updateDraft('notes', event.currentTarget.value)} placeholder={t('photo.calibration.notesPlaceholder')} /></label>
          </div>

          <div className="photo-camera-uncertainty">
            <div className="photo-camera-uncertainty-heading">
              <div>
                <span className="eyebrow">{t('photo.calibration.cameraUncertainty')}</span>
                <strong>{t('photo.calibration.optionalRanges')}</strong>
              </div>
              <select
                value={draft.cameraUncertaintyCombination}
                onChange={(event) => updateDraft(
                  'cameraUncertaintyCombination',
                  event.currentTarget.value as CameraCalibrationUncertainty['combination']
                )}
              >
                <option value="linear-conservative">{t('photo.uncertainty.linear')}</option>
                <option value="rss-independent">{t('photo.uncertainty.rss')}</option>
              </select>
            </div>
            <p>{t('photo.calibration.cameraUncertaintyNote')}</p>
            <div className="photo-camera-grid photo-camera-uncertainty-grid">
              {draft.calibrationSource === 'field-of-view' ? (
                <>
                  <label><span>{t('photo.calibration.horizontalFovUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.horizontalFovUncertaintyDeg} onChange={(event) => updateDraft('horizontalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                  <label><span>{t('photo.calibration.verticalFovUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.verticalFovUncertaintyDeg} onChange={(event) => updateDraft('verticalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                </>
              ) : (
                <>
                  <label><span>{t('photo.calibration.focalLengthUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.focalLengthUncertaintyMm} onChange={(event) => updateDraft('focalLengthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>{t('photo.calibration.sensorWidthUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.sensorWidthUncertaintyMm} onChange={(event) => updateDraft('sensorWidthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>{t('photo.calibration.sensorHeightUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.sensorHeightUncertaintyMm} onChange={(event) => updateDraft('sensorHeightUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                </>
              )}
              <label><span>{t('photo.calibration.principalXUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.principalPointXUncertaintyPx} onChange={(event) => updateDraft('principalPointXUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
              <label><span>{t('photo.calibration.principalYUncertainty')}</span><div><input inputMode="decimal" placeholder={t('photo.calibration.undefined')} value={draft.principalPointYUncertaintyPx} onChange={(event) => updateDraft('principalPointYUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
            </div>
            {draft.cameraUncertaintyCombination === 'rss-independent' && (
              <p className="photo-warning">{t('photo.calibration.rssWarning')}</p>
            )}
          </div>

          {(candidate.error || (savedCalibration && isDirty)) && (
            <p className="photo-warning">
              {candidate.error || t('photo.calibration.dirtyWarning')}
            </p>
          )}

          {(candidate.record || savedPrediction) && (
            <div className="photo-result-grid">
              <div><span>{t('photo.calibration.result.roll')}</span><strong>{metrics.horizonRollDeg?.value === undefined ? '—' : formatAngle(locale, metrics.horizonRollDeg.value ?? 0, metrics.horizonRollDeg.uncertainty)}</strong></div>
              <div><span>{t('photo.calibration.result.base')}</span><strong>{metrics.targetBaseRelativeElevationDeg?.value === undefined ? '—' : formatAngle(locale, metrics.targetBaseRelativeElevationDeg.value ?? 0, metrics.targetBaseRelativeElevationDeg.uncertainty)}</strong></div>
              <div><span>{t('photo.calibration.result.top')}</span><strong>{metrics.targetTopRelativeElevationDeg?.value === undefined ? '—' : formatAngle(locale, metrics.targetTopRelativeElevationDeg.value ?? 0, metrics.targetTopRelativeElevationDeg.uncertainty)}</strong></div>
              <div><span>{t('photo.calibration.result.angularHeight')}</span><strong>{metrics.targetAngularHeightDeg?.value === undefined ? '—' : formatAngle(locale, metrics.targetAngularHeightDeg.value ?? 0, metrics.targetAngularHeightDeg.uncertainty)}</strong></div>
            </div>
          )}

          {candidate.record?.prediction.warnings.map((warning) => (
            <p className="photo-warning" key={warning}>{warning}</p>
          ))}

          <div className="photo-save-row">
            <button
              className="photo-save-button"
              disabled={!candidate.record || touchedMarks.size < markOrder.length}
              type="button"
              onClick={saveCalibration}
            >
              {t('photo.calibration.save')}
            </button>
            {savedCalibration && (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  onClear();
                  setDraft((current) => ({ ...current }));
                  setIsDirty(true);
                  setMessage(t('photo.calibration.removed'));
                }}
              >
                {t('photo.calibration.remove')}
              </button>
            )}
          </div>
        </>
      )}

      {message && <p className="photo-message">{message}</p>}
    </section>
  );
}
