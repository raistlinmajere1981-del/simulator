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
import { appLocaleTag } from './i18n';
import { getStellarPanoramaMetadataStatusLabel } from './astronomy-result-presentation';
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

function markingMethodLabel(method: StellarPanoramaMarkingMethod): string {
  if (method === 'assisted-gradient-v1') return 'Yardımcı gradyan taslağı · kullanıcı kabul etti';
  if (method === 'assisted-gradient-v1-edited') return 'Yardımcı gradyan taslağı · elle düzenlendi';
  return 'Manuel işaretleme';
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

async function createAssistedDraft(draft: StellarPanoramaSkylineDraft): Promise<AssistedSkylineDraft> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Panorama yardımcı taslak için bitmap olarak açılamadı.'));
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
  if (!context) throw new Error('Panorama yardımcı taslak için Canvas 2D bağlamı açılamadı.');
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
  }, [draft, geometry, marks]);

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
      const suggestion = await createAssistedDraft(draft);
      setAssistedDraft(suggestion);
      setMessage(`Yardımcı skyline taslağı üretildi (${suggestion.marks.length} nokta · güven ${confidenceFormatter.format(suggestion.confidence)}). Hesaba girmeden önce çizgiyi kontrol edip açıkça kabul et.`);
    } catch (error) {
      setAssistedDraft(undefined);
      setMessage(error instanceof Error ? error.message : 'Panorama yardımcı skyline taslağı üretilemedi.');
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
    setMessage('Yardımcı skyline taslağı işaretlere aktarıldı. Noktaları silebilir veya elle yeni noktalar ekleyebilirsin; böyle bir değişiklik provenansta ayrıca işaretlenir.');
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
      setMessage(`“${source.fileName}” panorama skyline taslağı hazırlandı.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Panorama skyline kaynağı hazırlanamadı.');
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
            <span>Elle noktalayabilir veya “Skyline taslağı öner” ile yalnız editör içinde çalışan gradyan yardımcısını kullanabilirsin. Öneri kendiliğinden kaynak veya hesap sonucu olmaz.</span>
            <div>
              <button type="button" disabled={isSuggesting} onClick={() => void suggestDraft()}>{isSuggesting ? 'Taslak aranıyor…' : 'Skyline taslağı öner'}</button>
              {assistedDraft && <button type="button" className="assist-accept" onClick={acceptAssistedDraft}>Taslağı işaretlere aktar</button>}
              {assistedDraft && <button type="button" onClick={() => { setAssistedDraft(undefined); setMessage('Yardımcı skyline taslağı atıldı; mevcut işaretler değiştirilmedi.'); }}>Taslağı at</button>}
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks((current) => current.slice(0, -1)); markEdited(); }}>Son noktayı geri al</button>
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks([]); markEdited(); }}>Temizle</button>
            </div>
          </div>

          {assistedDraft && (
            <div className="stellar-panorama-assist-status">
              <div>
                <strong>Yardımcı taslak · henüz uygulanmadı</strong>
                <span>{assistedDraft.marks.length} nokta · güven göstergesi {confidenceFormatter.format(assistedDraft.confidence)} · gradient-dp v{assistedDraft.algorithmVersion}</span>
              </div>
              <span>Çizgiyi özellikle ağaç, bina, bulut ve 0°/360° seam çevresinde kontrol et. Güven göstergesi bilimsel doğruluk olasılığı değildir.</span>
              {assistedDraft.warnings.map((warning, index) => <small key={`${warning}-${index}`}>{warning}</small>)}
            </div>
          )}

          <div className="stellar-panorama-image-stage">
            <img src={draft.dataUrl} alt="Skyline noktaları işaretlenecek panorama" draggable={false} onClick={addMark} />
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
                  aria-label={`Skyline noktası ${index + 1}`}
                  title={mark.azimuthDeg === null
                    ? `Nokta ${index + 1}`
                    : `Nokta ${index + 1} · A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}
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
            <span>Nokta <strong>{marks.length}</strong>/8+</span>
            <span>İşaret kaynağı <strong>{markingMethodLabel(markingMethod)}</strong></span>
            <span>Yatay kapsam <strong>{preview?.horizontalCoverageDeg === null || preview?.horizontalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.horizontalCoverageDeg)}°`}</strong></span>
            <span>Düşey kapsam <strong>{preview?.verticalCoverageDeg === null || preview?.verticalCoverageDeg === undefined ? '—' : `${angleFormatter.format(preview.verticalCoverageDeg)}°`}</strong></span>
            <span>En büyük azimut boşluğu <strong>{preview?.maximumGapDeg === null || preview?.maximumGapDeg === undefined ? '—' : `${angleFormatter.format(preview.maximumGapDeg)}°`}</strong></span>
          </div>

          {mappedMarks.length > 0 && (
            <div className="stellar-panorama-mark-readout">
              {mappedMarks.slice(-4).map((mark, index) => (
                <span key={`${mark.xPx}-${mark.yPx}-${index}`}>
                  x {numberFormatter.format(mark.xPx)} · y {numberFormatter.format(mark.yPx)} → {mark.azimuthDeg === null ? 'geometri geçersiz' : `A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}
                </span>
              ))}
            </div>
          )}

          <div className="stellar-panorama-prepare-row">
            <span>{preview?.error || (!coverageReady ? '360° yatay panorama kapsamı gerekir.' : !marksReady ? 'En az 8 skyline noktası gerekir.' : !gapReady ? 'Azimut işaretleri arasındaki boşluk 90°’yi aşamaz.' : 'Kaynak taslağı hazırlanabilir; yıldız hesabı ayrıca uygulanacaktır.')}</span>
            <button type="button" disabled={!canPrepare} onClick={prepare}>Panorama skyline hazırla</button>
          </div>
        </>
      )}

      {draft?.metadata.warnings.map((warning, index) => (
        <p className="stellar-panorama-warning" key={`${warning}-${index}`}>{warning}</p>
      ))}
      {message && (
        <p className={preparedSha ? 'stellar-panorama-message prepared' : 'stellar-panorama-message'} role="status">
          {message}{preparedSha ? ' Profil yerel ufuk taslağına aktarıldı; yıldız hesabı için alttaki “Uygula ve hesapla” düğmesini kullan.' : ''}
        </p>
      )}
    </div>
  );
}
