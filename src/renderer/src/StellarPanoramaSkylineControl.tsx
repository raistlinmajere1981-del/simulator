import { useMemo, useState } from 'react';
import type {
  SavedStellarLocalHorizonSource,
  StellarPanoramaGeometry,
  StellarPanoramaGeometrySource,
  StellarPanoramaSkylineDraft
} from '../../shared/stellar-local-horizon-import';
import {
  buildPanoramaSkylineProfile,
  panoramaPixelToLocalDirection,
  validateEquirectangularPanoramaGeometry,
  type PanoramaSkylinePixelMark
} from '../../simulation/equirectangular-panorama';
import { savedStellarLocalHorizonSourceFromPanorama } from '../../simulation/stellar-panorama-skyline-source';
import { DraftNumberInput } from './DraftNumberInput';
import './stellar-panorama-skyline-control.css';

const numberFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const angleFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 });

interface StellarPanoramaSkylineControlProps {
  onPreparedSource(source: SavedStellarLocalHorizonSource): void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${numberFormatter.format(bytes / (1024 * 1024))} MB`;
  return `${numberFormatter.format(bytes / 1024)} KB`;
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

function metadataStatusLabel(draft: StellarPanoramaSkylineDraft): string {
  switch (draft.metadata.status) {
    case 'complete':
      return draft.metadata.metadataScaledToImage ? 'GPano XMP · doğrulandı ve ölçeklendi' : 'GPano XMP · doğrulandı';
    case 'incomplete':
      return 'GPano XMP · eksik';
    case 'unsupported-projection':
      return `GPano · desteklenmeyen projeksiyon${draft.metadata.projectionType ? ` (${draft.metadata.projectionType})` : ''}`;
    case 'incompatible-scale':
      return 'GPano XMP · bitmap ölçeği uyumsuz';
    default:
      return 'GPano geometrisi yok · manuel giriş';
  }
}

function markPercent(mark: PanoramaSkylinePixelMark, draft: StellarPanoramaSkylineDraft): { left: string; top: string } {
  return {
    left: `${((mark.xPx + 0.5) / draft.imageWidthPx) * 100}%`,
    top: `${((mark.yPx + 0.5) / draft.imageHeightPx) * 100}%`
  };
}

export function StellarPanoramaSkylineControl({
  onPreparedSource
}: StellarPanoramaSkylineControlProps): React.JSX.Element {
  const [draft, setDraft] = useState<StellarPanoramaSkylineDraft>();
  const [geometrySource, setGeometrySource] = useState<StellarPanoramaGeometrySource>('manual');
  const [geometry, setGeometry] = useState<StellarPanoramaGeometry>();
  const [marks, setMarks] = useState<PanoramaSkylinePixelMark[]>([]);
  const [isImporting, setIsImporting] = useState(false);
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
        error: error instanceof Error ? error.message : 'Panorama geometri önizlemesi üretilemedi.'
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
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Panorama görüntüsü içe aktarılamadı.');
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
    setPreparedSha('');
    setMessage('');
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

  return (
    <div className="stellar-panorama-control">
      <div className="stellar-panorama-heading">
        <div>
          <strong>Panoramadan 360° geometrik skyline</strong>
          <span>JPEG/PNG seçilir; görüntü üzerinde skyline noktaları elle işaretlenir. Otomatik görüntü segmentasyonu uygulanmaz.</span>
        </div>
        <button type="button" disabled={isImporting} onClick={() => void importPanorama()}>
          {isImporting ? 'Panorama okunuyor…' : 'Panorama seç'}
        </button>
      </div>

      {draft && geometry && (
        <>
          <div className="stellar-panorama-source-card">
            <div>
              <small>PANORAMA TASLAĞI · GÖRÜNTÜ BAYTLARI KALICI KAYDA GİRMEZ</small>
              <strong>{draft.fileName}</strong>
              <span>{draft.imageWidthPx}×{draft.imageHeightPx} px · {formatBytes(draft.fileSizeBytes)}</span>
              <span>{metadataStatusLabel(draft)}</span>
            </div>
            <div>
              <span>SHA-256 <code title={draft.sha256}>{draft.sha256.slice(0, 12)}…</code></span>
              <span>Standart XMP {draft.metadata.standardXmpPacketFound ? 'var' : 'yok'} · Extended XMP {draft.metadata.extendedXmpPacketFound ? 'var' : 'yok'}</span>
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
            >Manuel geometri</button>
            <span>{geometrySource === 'gpano-xmp' ? 'Doğrulanmış metadata kilitli kullanılıyor.' : 'Yön ve crop değerleri kullanıcı girdisi olarak kaydedilecek.'}</span>
          </div>

          <div className="stellar-panorama-geometry-grid">
            <label>
              <span>Bitmap genişliği</span>
              <input value={geometry.imageWidthPx} disabled readOnly />
            </label>
            <label>
              <span>Bitmap yüksekliği</span>
              <input value={geometry.imageHeightPx} disabled readOnly />
            </label>
            <label>
              <span>Tam pano genişliği · px</span>
              <DraftNumberInput ariaLabel="Panorama tam genişliği" disabled={geometrySource !== 'manual'} min={1} max={200_000} step={1} value={geometry.fullPanoWidthPx} onCommit={(value) => updateGeometry('fullPanoWidthPx', Math.round(value))} />
            </label>
            <label>
              <span>Tam pano yüksekliği · px</span>
              <DraftNumberInput ariaLabel="Panorama tam yüksekliği" disabled={geometrySource !== 'manual'} min={1} max={200_000} step={1} value={geometry.fullPanoHeightPx} onCommit={(value) => updateGeometry('fullPanoHeightPx', Math.round(value))} />
            </label>
            <label>
              <span>Crop sol · px</span>
              <DraftNumberInput ariaLabel="Panorama crop sol" disabled={geometrySource !== 'manual'} min={0} max={200_000} step={1} value={geometry.croppedAreaLeftPx} onCommit={(value) => updateGeometry('croppedAreaLeftPx', Math.round(value))} />
            </label>
            <label>
              <span>Crop üst · px</span>
              <DraftNumberInput ariaLabel="Panorama crop üst" disabled={geometrySource !== 'manual'} min={0} max={200_000} step={1} value={geometry.croppedAreaTopPx} onCommit={(value) => updateGeometry('croppedAreaTopPx', Math.round(value))} />
            </label>
            <label>
              <span>Heading · °</span>
              <DraftNumberInput ariaLabel="Panorama heading" disabled={geometrySource !== 'manual'} min={0} max={359.999999} step={0.1} value={geometry.poseHeadingDeg} onCommit={(value) => updateGeometry('poseHeadingDeg', value)} />
            </label>
            <label>
              <span>Pitch · °</span>
              <DraftNumberInput ariaLabel="Panorama pitch" disabled={geometrySource !== 'manual'} min={-90} max={90} step={0.1} value={geometry.posePitchDeg} onCommit={(value) => updateGeometry('posePitchDeg', value)} />
            </label>
            <label>
              <span>Roll · °</span>
              <DraftNumberInput ariaLabel="Panorama roll" disabled={geometrySource !== 'manual'} min={-179.999999} max={180} step={0.1} value={geometry.poseRollDeg} onCommit={(value) => updateGeometry('poseRollDeg', value)} />
            </label>
          </div>

          <div className="stellar-panorama-image-help">
            <span>Skyline çizgisini görüntü üzerinde soldan sağa noktalayın. En az 8 nokta gerekir; azimutta 90°’den büyük boşluk kabul edilmez.</span>
            <div>
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks((current) => current.slice(0, -1)); setPreparedSha(''); setMessage(''); }}>Son noktayı geri al</button>
              <button type="button" disabled={marks.length === 0} onClick={() => { setMarks([]); setPreparedSha(''); setMessage(''); }}>Temizle</button>
            </div>
          </div>

          <div className="stellar-panorama-image-stage">
            <img src={draft.dataUrl} alt="Skyline noktaları işaretlenecek panorama" draggable={false} onClick={addMark} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {mappedMarks.length > 1 && (
                <polyline
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
                  className="stellar-panorama-mark"
                  style={position}
                  title={mark.azimuthDeg === null
                    ? `Nokta ${index + 1}`
                    : `Nokta ${index + 1} · A ${angleFormatter.format(mark.azimuthDeg)}° · h ${angleFormatter.format(mark.altitudeDeg ?? 0)}°`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMarks((current) => current.filter((_, markIndex) => markIndex !== index));
                    setPreparedSha('');
                    setMessage('');
                  }}
                >{index + 1}</button>
              );
            })}
          </div>

          <div className="stellar-panorama-diagnostics">
            <span>Nokta <strong>{marks.length}</strong>/8+</span>
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
