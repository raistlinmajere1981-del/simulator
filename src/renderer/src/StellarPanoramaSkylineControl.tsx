import { useMemo, useState } from 'react';
import type {
  SavedStellarLocalHorizonSource,
  StellarPanoramaGeometry,
  StellarPanoramaGeometrySource,
  StellarPanoramaMarkingMethod,
  StellarPanoramaSkylineDraft
} from '../../shared/stellar-local-horizon-import';
import {
  buildPanoramaSkylineProfile,
  panoramaPixelToLocalDirection,
  validateEquirectangularPanoramaGeometry,
  type PanoramaSkylinePixelMark
} from '../../simulation/equirectangular-panorama';
import { suggestPanoramaSkyline } from '../../simulation/panorama-skyline-assist';
import { savedStellarLocalHorizonSourceFromPanorama } from '../../simulation/stellar-panorama-skyline-source';
import { DraftNumberInput } from './DraftNumberInput';
import { useI18n } from './I18nProvider';
import { appLocaleTag, translate, type AppLocale } from './i18n';
import { getStellarPanoramaMarkingMethodLabel, getStellarPanoramaMetadataStatusLabel } from './astronomy-result-presentation';
import './stellar-panorama-skyline-control.css';

interface StellarPanoramaSkylineControlProps {
  onPreparedSource(source: SavedStellarLocalHorizonSource): void;
}

interface AssistedSkylineDraft {
  marks: PanoramaSkylinePixelMark[];
  confidence: number;
  algorithmVersion: string;
  warnings: string[];
}

function formatBytes(bytes: number, formatter: Intl.NumberFormat): string {
  if (bytes >= 1024 * 1024) return `${formatter.format(bytes / (1024 * 1024))} MB`;
  return `${formatter.format(bytes / 1024)} KB`;
}

function defaultManualGeometry(draft: StellarPanoramaSkylineDraft): StellarPanoramaGeometry {
  return {
    imageWidthPx: draft.imageWidthPx,
    imageHeightPx: draft.imageHeightPx,
    fullPanoWidthPx: draft.imageWidthPx,
    fullPanoHeightPx: draft.imageHeightPx,
    croppedAreaLeftPx: 0,
    croppedAreaTopPx: 0,
    poseHeadingDeg: 0,
    posePitchDeg: 0,
    poseRollDeg: 0
  };
}

function cloneGeometry(geometry: StellarPanoramaGeometry): StellarPanoramaGeometry {
  return { ...geometry };
}

function editedMarkingMethod(method: StellarPanoramaMarkingMethod): StellarPanoramaMarkingMethod {
  return method === 'manual' ? 'manual' : 'assisted-gradient-v1-edited';
}

function markPercent(mark: PanoramaSkylinePixelMark, draft: StellarPanoramaSkylineDraft): { left: string; top: string } {
  return {
    left: `${((mark.xPx + 0.5) / draft.imageWidthPx) * 100}%`,
    top: `${((mark.yPx + 0.5) / draft.imageHeightPx) * 100}%`
  };
}

async function createAssistedDraft(draft: StellarPanoramaSkylineDraft, locale: AppLocale): Promise<AssistedSkylineDraft> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(translate(locale, 'stellar.panorama.assist.bitmapOpenError')));
    image.src = draft.dataUrl;
  });

  const maximumAnalysisWidth = 720;
  const scale = Math.min(1, maximumAnalysisWidth / image.naturalWidth);
  const width = Math.max(16, Math.round(image.naturalWidth * scale));
  const height = Math.max(16, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(translate(locale, 'stellar.panorama.assist.canvasError'));
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const result = suggestPanoramaSkyline({ width, height, data: pixels.data }, { sampleCount: 72 });
  const marks = result.marks.map((mark) => ({
    xPx: Math.max(0, Math.min(
      draft.imageWidthPx - 1,
      ((mark.xPx + 0.5) / width) * draft.imageWidthPx - 0.5
    )),
    yPx: Math.max(0, Math.min(
      draft.imageHeightPx - 1,
      ((mark.yPx + 0.5) / height) * draft.imageHeightPx - 0.5
    ))
  }));
  return {
    marks,
    confidence: result.confidence,
    algorithmVersion: result.algorithmVersion,
    warnings: result.warnings
  };
}

export function StellarPanoramaSkylineControl({
  onPreparedSource
}: StellarPanoramaSkylineControlProps): React.JSX.Element {
  const { locale, t } = useI18n();
  const numberFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 2 });
  const angleFormatter = new Intl.NumberFormat(appLocaleTag(locale), { maximumFractionDigits: 3 });
  const confidenceFormatter = new Intl.NumberFormat(appLocaleTag(locale), { style: 'percent', maximumFractionDigits: 0 });
  const [draft, setDraft] = useState<StellarPanoramaSkylineDraft>();
  const [geometrySource, setGeometrySource] = useState<StellarPanoramaGeometrySource>('manual');
  const [geometry, setGeometry] = useState<StellarPanoramaGeometry>();
  const [marks, setMarks] = useState<PanoramaSkylinePixelMark[]>([]);
  const [markingMethod, setMarkingMethod] = useState<StellarPanoramaMarkingMethod>('manual');
  const [assistedDraft, setAssistedDraft] = useState<AssistedSkylineDraft>();
  const [isImporting, setIsImporting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [message, setMessage] = useState('');
  const [preparedSha, setPreparedSha] = useState('');

  const preview = useMemo(() => {
    if (!draft || !geometry || marks.length < 3) return null;
    try {
      const profile = buildPanoramaSkylineProfile({
        geometry,
        sourceLabel: draft.fileName,
        marks
      });
      return {
        maximumGapDeg: profile.mask.maximumAzimuthGapDeg,
        horizontalCoverageDeg: profile.geometry.horizontalCoverageDeg,
        verticalCoverageDeg: profile.geometry.verticalCoverageDeg,
        fullSphereCoverage: profile.geometry.fullSphereCoverage,
        error: ''
      };
    } catch (error) {
      return {
        maximumGapDeg: null,
        horizontalCoverageDeg: null,
        verticalCoverageDeg: null,
        fullSphereCoverage: false,
        error: error instanceof Error ? error.message : t('stellar.panorama.previewError')
      };
    }
  }, [draft, geometry, marks, t]);

  const mappedMarks = useMemo(() => {
    if (!geometry) return [];
    return marks.map((mark) => {
      try {
        const direction = panoramaPixelToLocalDirection(geometry, mark);
        return { ...mark, azimuthDeg: direction.azimuthDeg, altitudeDeg: direction.altitudeDeg };
      } catch {
        return { ...mark, azimuthDeg: null, altitudeDeg: null };
      }
    });
  }, [geometry, marks]);

  const importPanorama = async (): Promise<void> => {
    setIsImporting(true);
    setMessage('');
    setPreparedSha('');
    try {
      const result = await window.simulatorDesktop.importStellarPanoramaSkyline();
      if (result.status === 'cancelled' || !result.draft) {
        if (result.status === 'cancelled') setMessage(result.message);
        return;
      }
      const imported = result.draft;
      const hasVerifiedGpano = imported.metadata.status === 'complete' && imported.metadata.geometry;
      setDraft(imported);
      setGeometrySource(hasVerifiedGpano ? 'gpano-xmp' : 'manual');
      setGeometry(cloneGeometry(hasVerifiedGpano ? imported.metadata.geometry! : defaultManualGeometry(imported)));
      setMarks([]);
      setMarkingMethod('manual');
      setAssistedDraft(undefined);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('stellar.panorama.importError'));
    } finally {
      setIsImporting(false);
    }
  };

  const switchGeometrySource = (next: StellarPanoramaGeometrySource): void => {
    if (!draft) return;
    setPreparedSha('');
    setMessage('');
    if (next === 'gpano-xmp') {
      if (draft.metadata.status !== 'complete' || !draft.metadata.geometry) return;
      setGeometrySource('gpano-xmp');
      setGeometry(cloneGeometry(draft.metadata.geometry));
      return;
    }
    setGeometrySource('manual');
    setGeometry((current) => cloneGeometry(current ?? draft.metadata.geometry ?? defaultManualGeometry(draft)));
  };

  const updateGeometry = (key: keyof StellarPanoramaGeometry, value: number): void => {
    if (!draft || geometrySource !== 'manual') return;
    setPreparedSha('');
    setMessage('');
    setGeometry((current) => {
      const base = current ?? defaultManualGeometry(draft);
      return { ...base, [key]: value };
    });
  };

  const markEdited = (): void => {
    setMarkingMethod((current) => editedMarkingMethod(current));
    setAssistedDraft(undefined);
    setPreparedSha('');
    setMessage('');
  };

  const addMark = (event: React.MouseEvent<HTMLImageElement>): void => {
    if (!draft || !geometry || marks.length >= 1_440) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return;
    const xPx = Math.max(0, Math.min(
      draft.imageWidthPx - 1,
      ((event.clientX - rect.left) / rect.width) * draft.imageWidthPx - 0.5
    ));
    const yPx = Math.max(0, Math.min(
      draft.imageHeightPx - 1,
      ((event.clientY - rect.top) / rect.height) * draft.imageHeightPx - 0.5
    ));
    setMarks((current) => [...current, { xPx, yPx }]);
    markEdited();
  };

  const suggestDraft = async (): Promise<void> => {
    if (!draft) return;
    setIsSuggesting(true);
    setPreparedSha('');
    setMessage('');
    try {
      const suggestion = await createAssistedDraft(draft, locale);
      setAssistedDraft(suggestion);
      setMessage(t('stellar.panorama.assist.generated', { count: suggestion.marks.length, confidence: confidenceFormatter.format(suggestion.confidence) }));
    } catch (error) {
      setAssistedDraft(undefined);
      setMessage(error instanceof Error ? error.message : t('stellar.panorama.assist.generationError'));
    } finally {
      setIsSuggesting(false);
    }
  };

  const acceptAssistedDraft = (): void => {
    if (!assistedDraft) return;
    setMarks(assistedDraft.marks.map((mark) => ({ ...mark })));
    setMarkingMethod('assisted-gradient-v1');
    setAssistedDraft(undefined);
    setPreparedSha('');
    setMessage(t('stellar.panorama.assist.accepted'));
  };

  const prepare = (): void => {
    if (!draft || !geometry) return;
    setMessage('');
    setPreparedSha('');
    try {
      validateEquirectangularPanoramaGeometry(geometry);
      const source = savedStellarLocalHorizonSourceFromPanorama({
        draft,
        geometry,
        geometrySource,
        markingMethod,
        marks
      });
      onPreparedSource({
        ...source,
        points: source.points.map((point) => ({ ...point })),
        warnings: [...source.warnings],
        ...(source.panoramaDerivation
          ? {
              panoramaDerivation: {
                ...source.panoramaDerivation,
                geometry: { ...source.panoramaDerivation.geometry },
                marks: source.panoramaDerivation.marks.map((mark) => ({ ...mark }))
              }
            }
          : {})
      });
      setPreparedSha(source.sha256);
      setMessage(t('stellar.panorama.prepared', { fileName: source.fileName }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('stellar.panorama.prepareError'));
    }
  };

  const gpanoAvailable = Boolean(draft?.metadata.status === 'complete' && draft.metadata.geometry);
  const coverageReady = preview?.horizontalCoverageDeg !== null &&
    preview?.horizontalCoverageDeg !== undefined && preview.horizontalCoverageDeg >= 360 - 1e-9;
  const gapReady = preview?.maximumGapDeg !== null &&
    preview?.maximumGapDeg !== undefined && preview.maximumGapDeg <= 90 + 1e-9;
  const marksReady = marks.length >= 8;
  const canPrepare = Boolean(draft && geometry && marksReady && coverageReady && gapReady && !preview?.error);
  const compactMarks = markingMethod !== 'manual' && marks.length > 24;

  return (
    <div className="stellar-panorama-control">
      <div className="stellar-panorama-heading">
        <div>
          <strong>{t('stellar.panorama.title')}</strong>
          <span>{t('stellar.panorama.description')}</span>
        </div>
        <button type="button" disabled={isImporting} onClick={() => void importPanorama()}>
          {isImporting ? t('stellar.panorama.importing') : t('stellar.panorama.import')}
        </button>
      </div>

      {draft && geometry && (
        <>
          <div className="stellar-panorama-source-card">
            <div>
              <small>{t('stellar.panorama.sourceLabel')}</small>
              <strong>{draft.fileName}</strong>
              <span>{t('stellar.panorama.dimensions', { width: draft.imageWidthPx, height: draft.imageHeightPx, size: formatBytes(draft.fileSizeBytes, numberFormatter) })}</span>
              <span>{getStellarPanoramaMetadataStatusLabel(locale, draft.metadata.status, draft.metadata.metadataScaledToImage, draft.metadata.projectionType)}</span>
            </div>
            <div>
              <span>SHA-256 <code title={draft.sha256}>{draft.sha256.slice(0, 12)}…</code></span>
              <span>{t('stellar.panorama.xmpSummary', { standard: draft.metadata.standardXmpPacketFound ? t('stellar.panorama.yes') : t('stellar.panorama.no'), extended: draft.metadata.extendedXmpPacketFound ? t('stellar.panorama.yes') : t('stellar.panorama.no') })}</span>
            </div>
          </div>

          <div className="stellar-panorama-geometry-mode">
            <button
              type="button"
              disabled={!gpanoAvailable}
              className={geometrySource === 'gpano-xmp' ? 'selected' : ''}
              onClick={() => switchGeometrySource('gpano-xmp')}
            >GPano XMP</button>
            <button
              type="button"
              className={geometrySource === 'manual' ? 'selected' : ''}
              onClick={() => switchGeometrySource('manual')}
            >{t('stellar.panorama.geometryManual')}</button>
            <span>{geometrySource === 'gpano-xmp' ? t('stellar.panorama.geometryGpanoLocked') : t('stellar.panorama.geometryManualNote')}</span>
          </div>

          <div className="stellar-panorama-geometry-grid">
            <label>
              <span>{t('stellar.panorama.bitmapWidth')}</span>
              <input value={geometry.imageWidthPx} disabled readOnly />
            </label>
            <label>
              <span>{t('stellar.panorama.bitmapHeight')}</span>
              <input value={geometry.imageHeightPx} disabled readOnly />
            </label>
            <label>
              <span>{t('stellar.panorama.fullPanoWidth')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.fullPanoWidthAria')} disabled={geometrySource !== 'manual'} min={1} max={200_000} step={1} value={geometry.fullPanoWidthPx} onCommit={(value) => updateGeometry('fullPanoWidthPx', Math.round(value))} />
            </label>
            <label>
              <span>{t('stellar.panorama.fullPanoHeight')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.fullPanoHeightAria')} disabled={geometrySource !== 'manual'} min={1} max={200_000} step={1} value={geometry.fullPanoHeightPx} onCommit={(value) => updateGeometry('fullPanoHeightPx', Math.round(value))} />
            </label>
            <label>
              <span>{t('stellar.panorama.cropLeft')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.cropLeftAria')} disabled={geometrySource !== 'manual'} min={0} max={200_000} step={1} value={geometry.croppedAreaLeftPx} onCommit={(value) => updateGeometry('croppedAreaLeftPx', Math.round(value))} />
            </label>
            <label>
              <span>{t('stellar.panorama.cropTop')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.cropTopAria')} disabled={geometrySource !== 'manual'} min={0} max={200_000} step={1} value={geometry.croppedAreaTopPx} onCommit={(value) => updateGeometry('croppedAreaTopPx', Math.round(value))} />
            </label>
            <label>
              <span>{t('stellar.panorama.heading')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.headingAria')} disabled={geometrySource !== 'manual'} min={0} max={359.999999} step={0.1} value={geometry.poseHeadingDeg} onCommit={(value) => updateGeometry('poseHeadingDeg', value)} />
            </label>
            <label>
              <span>{t('stellar.panorama.pitch')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.pitchAria')} disabled={geometrySource !== 'manual'} min={-90} max={90} step={0.1} value={geometry.posePitchDeg} onCommit={(value) => updateGeometry('posePitchDeg', value)} />
            </label>
            <label>
              <span>{t('stellar.panorama.roll')}</span>
              <DraftNumberInput ariaLabel={t('stellar.panorama.rollAria')} disabled={geometrySource !== 'manual'} min={-179.999999} max={180} step={0.1} value={geometry.poseRollDeg} onCommit={(value) => updateGeometry('poseRollDeg', value)} />
            </label>
          </div>

          <div className="stellar-panorama-image-help">
            <span>{t('stellar.panorama.assist.help')}</span>
            <div>
              <button type="button" disabled={isSuggesting} onClick={() => void suggestDraft()}>{isSuggesting ? t('stellar.panorama.assist.suggesting') : t('stellar.panorama.assist.suggest')}</button>
              {assistedDraft && <button type="button" className="assist-accept" onClick={acceptAssistedDraft}>{t('stellar.panorama.assist.accept')}</button>}
              {assistedDraft && <button type="button" onClick={() => { setAssistedDraft(undefined); setMessage(t('stellar.panorama.assist.discarded')); }}>{t('stellar.panorama.assist.discard')}</button>}
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks((current) => current.slice(0, -1)); markEdited(); }}>{t('stellar.panorama.assist.undoLast')}</button>
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks([]); markEdited(); }}>{t('stellar.panorama.assist.clear')}</button>
            </div>
          </div>

          {assistedDraft && (
            <div className="stellar-panorama-assist-status">
              <div>
                <strong>{t('stellar.panorama.assist.pending')}</strong>
                <span>{t('stellar.panorama.assist.summary', { count: assistedDraft.marks.length, confidence: confidenceFormatter.format(assistedDraft.confidence), version: assistedDraft.algorithmVersion })}</span>
              </div>
              <span>{t('stellar.panorama.assist.reviewWarning')}</span>
              {assistedDraft.warnings.map((warning, index) => <small key={`${warning}-${index}`}>{warning}</small>)}
            </div>
          )}

          <div className="stellar-panorama-image-stage">
            <img src={draft.dataUrl} alt={t('stellar.panorama.imageAlt')} draggable={false} onClick={addMark} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {assistedDraft && assistedDraft.marks.length > 1 && (
                <polyline
                  className="stellar-panorama-assist-line"
                  points={assistedDraft.marks
                    .map((mark) => `${((mark.xPx + 0.5) / draft.imageWidthPx) * 100},${((mark.yPx + 0.5) / draft.imageHeightPx) * 100}`)
                    .join(' ')}
                />
              )}
              {mappedMarks.length > 1 && (
                <polyline
                  className="stellar-panorama-active-line"
                  points={[...mappedMarks]
                    .sort((left, right) => left.xPx - right.xPx)
                    .map((mark) => `${((mark.xPx + 0.5) / draft.imageWidthPx) * 100},${((mark.yPx + 0.5) / draft.imageHeightPx) * 100}`)
                    .join(' ')}
                />
              )}
            </svg>
            {mappedMarks.map((mark, index) => {
              const position = markPercent(mark, draft);
              return (
                <button
                  key={`${mark.xPx}-${mark.yPx}-${index}`}
                  type="button"
                  className={`stellar-panorama-mark${compactMarks ? ' compact' : ''}`}
                  style={position}
                  aria-label={t('stellar.panorama.markAria', { index: index + 1 })}
                  title={mark.azimuthDeg === null
                    ? t('stellar.panorama.markTitleInvalid', { index: index + 1 })
                    : t('stellar.panorama.markTitle', { index: index + 1, azimuth: angleFormatter.format(mark.azimuthDeg), altitude: angleFormatter.format(mark.altitudeDeg ?? 0) })}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMarks((current) => current.filter((_, markIndex) => markIndex !== index));
                    markEdited();
                  }}
                >{compactMarks ? '' : index + 1}</button>
              );
            })}
          </div>

          <div className="stellar-panorama-diagnostics">
            <span>{t('stellar.panorama.diagnostics.points')} <strong>{marks.length}</strong>/8+</span>
            <span>{t('stellar.panorama.diagnostics.markSource')} <strong>{getStellarPanoramaMarkingMethodLabel(locale, markingMethod)}</strong></span>
            <span>{t('stellar.panorama.diagnostics.horizontalCoverage')} <strong>{preview?.horizontalCoverageDeg === null || preview?.horizontalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.horizontalCoverageDeg)}°`}</strong></span>
            <span>{t('stellar.panorama.diagnostics.verticalCoverage')} <strong>{preview?.verticalCoverageDeg === null || preview?.verticalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.verticalCoverageDeg)}°`}</strong></span>
            <span>{t('stellar.panorama.diagnostics.maximumGap')} <strong>{preview?.maximumGapDeg === null || preview?.maximumGapDeg === undefined ? '—' : `${angleFormatter.format(preview.maximumGapDeg)}°`}</strong></span>
          </div>

          {mappedMarks.length > 0 && (
            <div className="stellar-panorama-mark-readout">
              {mappedMarks.slice(-4).map((mark, index) => (
                <span key={`${mark.xPx}-${mark.yPx}-${index}`}>
                  x {numberFormatter.format(mark.xPx)} · y {numberFormatter.format(mark.yPx)} → {mark.azimuthDeg === null ? t('stellar.panorama.invalidGeometry') : `A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}
                </span>
              ))}
            </div>
          )}

          <div className="stellar-panorama-prepare-row">
            <span>{preview?.error || (!coverageReady ? t('stellar.panorama.needCoverage') : !marksReady ? t('stellar.panorama.needMarks') : !gapReady ? t('stellar.panorama.needGap') : t('stellar.panorama.ready'))}</span>
            <button type="button" disabled={!canPrepare} onClick={prepare}>{t('stellar.panorama.prepare')}</button>
          </div>
        </>
      )}

      {draft?.metadata.warnings.map((warning, index) => (
        <p className="stellar-panorama-warning" key={`${warning}-${index}`}>{warning}</p>
      ))}
      {message && (
        <p className={preparedSha ? 'stellar-panorama-message prepared' : 'stellar-panorama-message'} role="status">
          {message}{preparedSha ? t('stellar.panorama.profileTransferred') : ''}
        </p>
      )}
    </div>
  );
}
