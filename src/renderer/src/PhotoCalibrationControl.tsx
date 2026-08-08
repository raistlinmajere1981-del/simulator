import { useEffect, useMemo, useRef, useState } from 'react';
import type { ModelPrediction } from '../../shared/domain';
import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
import {
  createPhotoCalibrationRecord,
  type PhotoCalibrationRecord
} from '../../simulation/photo-calibration';
import { containedImagePointerToPixel } from '../../simulation/photo-overlay';
import './photo-calibration-control.css';

type MarkKey = keyof PhotoCalibrationMarks;
type CalibrationSource = 'field-of-view' | 'sensor-focal';

interface DraftState {
  source?: PhotoSourceMetadata;
  calibrationSource: CalibrationSource;
  horizontalFovDeg: string;
  verticalFovDeg: string;
  focalLengthMm: string;
  sensorWidthMm: string;
  sensorHeightMm: string;
  principalPointXPx: string;
  principalPointYPx: string;
  defaultMarkUncertaintyPx: string;
  cameraUncertaintyCombination: CameraCalibrationUncertainty['combination'];
  horizontalFovUncertaintyDeg: string;
  verticalFovUncertaintyDeg: string;
  focalLengthUncertaintyMm: string;
  sensorWidthUncertaintyMm: string;
  sensorHeightUncertaintyMm: string;
  principalPointXUncertaintyPx: string;
  principalPointYUncertaintyPx: string;
  distortionCorrected: boolean;
  referenceKind: PhotoReferenceKind;
  marks?: PhotoCalibrationMarks;
  notes: string;
}

const markOrder: MarkKey[] = [
  'horizonStart',
  'horizonEnd',
  'targetBase',
  'targetTop'
];

const markLabels: Record<MarkKey, string> = {
  horizonStart: 'Ufuk / referans sol',
  horizonEnd: 'Ufuk / referans sağ',
  targetBase: 'Hedef tabanı',
  targetTop: 'Hedef tepesi'
};

const markShortLabels: Record<MarkKey, string> = {
  horizonStart: 'U1',
  horizonEnd: 'U2',
  targetBase: 'TABAN',
  targetTop: 'TEPE'
};

function emptyDraft(): DraftState {
  return {
    calibrationSource: 'field-of-view',
    horizontalFovDeg: '',
    verticalFovDeg: '',
    focalLengthMm: '',
    sensorWidthMm: '',
    sensorHeightMm: '',
    principalPointXPx: '',
    principalPointYPx: '',
    defaultMarkUncertaintyPx: '1',
    cameraUncertaintyCombination: 'linear-conservative',
    horizontalFovUncertaintyDeg: '',
    verticalFovUncertaintyDeg: '',
    focalLengthUncertaintyMm: '',
    sensorWidthUncertaintyMm: '',
    sensorHeightUncertaintyMm: '',
    principalPointXUncertaintyPx: '',
    principalPointYUncertaintyPx: '',
    distortionCorrected: false,
    referenceKind: 'visual-reference',
    notes: ''
  };
}

function draftFromSaved(saved: SavedPhotoCalibration | undefined): DraftState {
  if (!saved) return emptyDraft();
  return {
    source: { ...saved.source },
    calibrationSource: saved.calibration.sourceKind,
    horizontalFovDeg: saved.calibration.sourceKind === 'field-of-view'
      ? String(saved.calibration.horizontalFovDeg)
      : '',
    verticalFovDeg: saved.calibration.sourceKind === 'field-of-view'
      ? String(saved.calibration.verticalFovDeg)
      : '',
    focalLengthMm: saved.calibration.sourceKind === 'sensor-focal'
      ? String(saved.calibration.focalLengthMm)
      : '',
    sensorWidthMm: saved.calibration.sourceKind === 'sensor-focal'
      ? String(saved.calibration.sensorWidthMm)
      : '',
    sensorHeightMm: saved.calibration.sourceKind === 'sensor-focal'
      ? String(saved.calibration.sensorHeightMm)
      : '',
    principalPointXPx: saved.principalPointXPx === undefined
      ? ''
      : String(saved.principalPointXPx),
    principalPointYPx: saved.principalPointYPx === undefined
      ? ''
      : String(saved.principalPointYPx),
    defaultMarkUncertaintyPx: String(saved.defaultMarkUncertaintyPx),
    cameraUncertaintyCombination: saved.cameraUncertainty?.combination ?? 'linear-conservative',
    horizontalFovUncertaintyDeg: saved.cameraUncertainty?.horizontalFovDeg === undefined ? '' : String(saved.cameraUncertainty.horizontalFovDeg),
    verticalFovUncertaintyDeg: saved.cameraUncertainty?.verticalFovDeg === undefined ? '' : String(saved.cameraUncertainty.verticalFovDeg),
    focalLengthUncertaintyMm: saved.cameraUncertainty?.focalLengthMm === undefined ? '' : String(saved.cameraUncertainty.focalLengthMm),
    sensorWidthUncertaintyMm: saved.cameraUncertainty?.sensorWidthMm === undefined ? '' : String(saved.cameraUncertainty.sensorWidthMm),
    sensorHeightUncertaintyMm: saved.cameraUncertainty?.sensorHeightMm === undefined ? '' : String(saved.cameraUncertainty.sensorHeightMm),
    principalPointXUncertaintyPx: saved.cameraUncertainty?.principalPointXPx === undefined ? '' : String(saved.cameraUncertainty.principalPointXPx),
    principalPointYUncertaintyPx: saved.cameraUncertainty?.principalPointYPx === undefined ? '' : String(saved.cameraUncertainty.principalPointYPx),
    distortionCorrected: saved.distortionCorrected,
    referenceKind: saved.referenceKind ?? 'visual-reference',
    marks: {
      horizonStart: { ...saved.marks.horizonStart },
      horizonEnd: { ...saved.marks.horizonEnd },
      targetBase: { ...saved.marks.targetBase },
      targetTop: { ...saved.marks.targetTop }
    },
    notes: saved.notes ?? ''
  };
}

function defaultMarks(source: PhotoSourceMetadata): PhotoCalibrationMarks {
  const width = source.imageWidthPx;
  const height = source.imageHeightPx;
  return {
    horizonStart: { xPx: width * 0.15, yPx: height * 0.5 },
    horizonEnd: { xPx: width * 0.85, yPx: height * 0.5 },
    targetBase: { xPx: width * 0.5, yPx: height * 0.62 },
    targetTop: { xPx: width * 0.5, yPx: height * 0.38 }
  };
}

function finiteDraftNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function uncertaintyDraftNumber(value: string, label: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new RangeError(`${label} belirsizliği negatif olmayan sayısal bir değer olmalı.`);
  }
  return parsed;
}

function cameraUncertaintyFromDraft(draft: DraftState): CameraCalibrationUncertainty | undefined {
  const common = {
    principalPointXPx: uncertaintyDraftNumber(draft.principalPointXUncertaintyPx, 'Asal nokta X'),
    principalPointYPx: uncertaintyDraftNumber(draft.principalPointYUncertaintyPx, 'Asal nokta Y')
  };
  const sourceSpecific = draft.calibrationSource === 'field-of-view'
    ? {
        horizontalFovDeg: uncertaintyDraftNumber(draft.horizontalFovUncertaintyDeg, 'Yatay FOV'),
        verticalFovDeg: uncertaintyDraftNumber(draft.verticalFovUncertaintyDeg, 'Düşey FOV')
      }
    : {
        focalLengthMm: uncertaintyDraftNumber(draft.focalLengthUncertaintyMm, 'Odak uzaklığı'),
        sensorWidthMm: uncertaintyDraftNumber(draft.sensorWidthUncertaintyMm, 'Sensör genişliği'),
        sensorHeightMm: uncertaintyDraftNumber(draft.sensorHeightUncertaintyMm, 'Sensör yüksekliği')
      };
  const values = [...Object.values(common), ...Object.values(sourceSpecific)];
  if (values.every((value) => value === undefined)) return undefined;
  return {
    combination: draft.cameraUncertaintyCombination,
    ...Object.fromEntries(Object.entries({ ...common, ...sourceSpecific }).filter(([, value]) => value !== undefined))
  } as CameraCalibrationUncertainty;
}

function sourceMetadata(photo: ImportedObservationPhoto): PhotoSourceMetadata {
  return {
    fileName: photo.fileName,
    fileSizeBytes: photo.fileSizeBytes,
    sha256: photo.sha256,
    mimeType: photo.mimeType,
    imageWidthPx: photo.imageWidthPx,
    imageHeightPx: photo.imageHeightPx,
    importedAtIso: photo.importedAtIso
  };
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

function formatAngle(value: number, uncertainty?: number): string {
  return uncertainty === undefined
    ? `${value.toFixed(4)}°`
    : `${value.toFixed(4)}° ±${uncertainty.toFixed(4)}°`;
}

function markSummary(mark: PhotoCalibrationMarks[MarkKey]): string {
  return `${mark.xPx.toFixed(1)}, ${mark.yPx.toFixed(1)} px`;
}

export function PhotoCalibrationControl({
  experimentId,
  savedCalibration,
  savedPrediction,
  onSave,
  onClear
}: {
  experimentId: string;
  savedCalibration?: SavedPhotoCalibration;
  savedPrediction?: ModelPrediction;
  onSave(calibration: SavedPhotoCalibration, record: PhotoCalibrationRecord): void;
  onClear(): void;
}): React.JSX.Element {
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
    setPreview(undefined);
    setDraft(draftFromSaved(savedCalibration));
    setSelectedMark('horizonStart');
    setTouchedMarks(new Set(savedCalibration ? markOrder : []));
    setIsDirty(false);
    setMessage('');
  // Parent calibration updates in the same experiment must not discard the session photo preview.
  }, [experimentId]);

  const candidate = useMemo(() => {
    if (!draft.source || !draft.marks || touchedMarks.size < markOrder.length) {
      return { record: undefined, error: '' };
    }
    const defaultMarkUncertaintyPx = finiteDraftNumber(draft.defaultMarkUncertaintyPx);
    if (defaultMarkUncertaintyPx === undefined) {
      return { record: undefined, error: 'İşaret belirsizliği sayısal olmalı.' };
    }

    const principalPointXPx = finiteDraftNumber(draft.principalPointXPx);
    const principalPointYPx = finiteDraftNumber(draft.principalPointYPx);
    const cameraUncertainty = cameraUncertaintyFromDraft(draft);
    const calibration = draft.calibrationSource === 'field-of-view'
      ? {
          sourceKind: 'field-of-view' as const,
          horizontalFovDeg: finiteDraftNumber(draft.horizontalFovDeg),
          verticalFovDeg: finiteDraftNumber(draft.verticalFovDeg)
        }
      : {
          sourceKind: 'sensor-focal' as const,
          focalLengthMm: finiteDraftNumber(draft.focalLengthMm),
          sensorWidthMm: finiteDraftNumber(draft.sensorWidthMm),
          sensorHeightMm: finiteDraftNumber(draft.sensorHeightMm)
        };

    const requiredCalibrationValues = Object.values(calibration).slice(1);
    if (requiredCalibrationValues.some((value) => value === undefined)) {
      return {
        record: undefined,
        error: draft.calibrationSource === 'field-of-view'
          ? 'Yatay ve düşey görüş açısını gir.'
          : 'Odak uzaklığı ile sensör genişlik/yüksekliğini gir.'
      };
    }

    try {
      const cameraUncertainty = cameraUncertaintyFromDraft(draft);
      const record = createPhotoCalibrationRecord({
        experimentId,
        imageSourceLabel: draft.source.fileName,
        recordedAtIso: new Date().toISOString(),
        imageWidthPx: draft.source.imageWidthPx,
        imageHeightPx: draft.source.imageHeightPx,
        ...(principalPointXPx === undefined ? {} : { principalPointXPx }),
        ...(principalPointYPx === undefined ? {} : { principalPointYPx }),
        calibration: calibration as Parameters<typeof createPhotoCalibrationRecord>[0]['calibration'],
        marks: draft.marks,
        defaultMarkUncertaintyPx,
        ...(cameraUncertainty === undefined ? {} : { cameraUncertainty }),
        distortionCorrected: draft.distortionCorrected,
        ...(draft.notes.trim() === '' ? {} : { notes: draft.notes.trim() })
      });
      return { record, error: '' };
    } catch (caught) {
      return {
        record: undefined,
        error: caught instanceof Error ? caught.message : 'Kalibrasyon hesaplanamadı.'
      };
    }
  }, [draft, experimentId, touchedMarks]);

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
        setMessage('Kayıtlı fotoğraf SHA-256 ile eşleşti; mevcut işaretler yeniden gösterildi.');
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
      setMessage('Yeni fotoğraf yüklendi. Dört örnek işaretin her birini fotoğraf üzerinde yeniden yerleştir.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Fotoğraf yüklenemedi.');
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
    const cameraUncertainty = cameraUncertaintyFromDraft(draft);
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
    setMessage('Fotoğraf kalibrasyonu deney kaydına hazırlandı. Deneyi kaydettiğinde provenans ve hesap izi korunacak.');
  };

  const displayedPrediction = isDirty ? candidate.record?.prediction : savedPrediction ?? candidate.record?.prediction;
  const metrics = displayedPrediction ? Object.fromEntries(
    displayedPrediction.metrics.map((metric) => [metric.key, metric])
  ) : {};

  const source = draft.source;
  const marks = draft.marks;
  const markerRadius = source ? Math.max(8, source.imageWidthPx * 0.012) : 10;
  const markerLabelSize = source ? Math.max(14, source.imageWidthPx * 0.018) : 20;

  return (
    <section className="photo-calibration-panel">
      <div className="photo-calibration-heading">
        <div>
          <span className="eyebrow">Fotoğraf / kamera kalibrasyonu</span>
          <strong>{source ? source.fileName : 'Henüz fotoğraf yüklenmedi'}</strong>
        </div>
        <div className="photo-calibration-actions">
          {savedCalibration && !isDirty && <span className="photo-state saved">KAYITLI</span>}
          {isDirty && <span className="photo-state dirty">DÜZENLENDİ</span>}
          <button type="button" onClick={() => void loadPhoto()}>
            {source ? 'Fotoğraf seç / yeniden yükle' : 'Fotoğraf yükle'}
          </button>
        </div>
      </div>

      <p className="photo-calibration-note">
        Fotoğraf dosyası deney JSON’una gömülmez. Kayıtta dosya adı, boyut, SHA-256,
        görüntü ölçüsü, kamera parametreleri, işaretler ve hesap sonucu tutulur.
      </p>

      {source && (
        <div className="photo-source-strip">
          <span>{source.imageWidthPx}×{source.imageHeightPx} px</span>
          <span>{formatBytes(source.fileSizeBytes)}</span>
          <span>{source.mimeType}</span>
          <code title={source.sha256}>SHA-256 {source.sha256.slice(0, 12)}…</code>
        </div>
      )}

      {preview && (
        <p className="photo-calibration-note">
          Sıradaki işaret: <strong>{markLabels[selectedMark]}</strong>. Fotoğraf üzerinde ilgili noktaya tıkla;
          seçim otomatik olarak sonraki işarete geçer.
        </p>
      )}

      {preview ? (
        <div
          className="photo-marking-viewport"
          ref={viewportRef}
          style={{ aspectRatio: `${preview.imageWidthPx} / ${preview.imageHeightPx}` }}
        >
          <img alt="Kalibrasyon için yüklenen gözlem" src={preview.dataUrl} />
          {marks && (
            <svg
              aria-label="Fotoğraf kalibrasyon işaretleri"
              onPointerDown={placeSelectedMark}
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${preview.imageWidthPx} ${preview.imageHeightPx}`}
            >
              <line
                className="photo-horizon-line"
                x1={marks.horizonStart.xPx}
                y1={marks.horizonStart.yPx}
                x2={marks.horizonEnd.xPx}
                y2={marks.horizonEnd.yPx}
              />
              {markOrder.map((key) => {
                const mark = marks[key];
                return (
                  <g className={`photo-mark ${selectedMark === key ? 'active' : ''}`} key={key}>
                    <circle cx={mark.xPx} cy={mark.yPx} r={markerRadius} />
                    <text
                      style={{ fontSize: `${markerLabelSize}px` }}
                      x={mark.xPx + markerRadius * 1.35}
                      y={mark.yPx - markerRadius * 1.35}
                    >{markShortLabels[key]}</text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : source ? (
        <div className="photo-preview-missing">
          Bu kayıt fotoğrafın kendisini saklamaz. İşaretleri görüntü üzerinde görmek için
          aynı dosyayı yeniden seç; SHA-256 eşleşirse mevcut kalibrasyon korunur.
        </div>
      ) : null}

      {source && marks && (
        <>
          <div className="photo-mark-tools">
            {markOrder.map((key) => (
              <button
                className={selectedMark === key ? 'active' : ''}
                key={key}
                type="button"
                onClick={() => setSelectedMark(key)}
              >
                <b>{markShortLabels[key]}</b>
                <span>{markLabels[key]}</span>
                <small>{touchedMarks.has(key) ? markSummary(marks[key]) : 'fotoğrafta tıkla'}</small>
              </button>
            ))}
          </div>
          {touchedMarks.size < markOrder.length && (
            <p className="photo-warning">
              Yeni fotoğraftaki örnek işaretler ölçüm değildir. Kalibrasyon için dört işaretin
              her birini fotoğraf üzerinde bir kez yerleştir ({touchedMarks.size}/4).
            </p>
          )}

          <div className="photo-camera-grid">
            <label>
              <span>Kalibrasyon yöntemi</span>
              <select
                value={draft.calibrationSource}
                onChange={(event) => updateDraft('calibrationSource', event.currentTarget.value as CalibrationSource)}
              >
                <option value="field-of-view">Yatay / düşey görüş açısı</option>
                <option value="sensor-focal">Sensör + odak uzaklığı</option>
              </select>
            </label>
            <label>
              <span>U1–U2 referans anlamı</span>
              <select
                value={draft.referenceKind}
                onChange={(event) => updateDraft('referenceKind', event.currentTarget.value as PhotoReferenceKind)}
              >
                <option value="visual-reference">Görsel referans · yalnız açısal yükseklik</option>
                <option value="local-horizontal">Fiziksel yerel yatay · taban/tepe de karşılaştır</option>
              </select>
            </label>

            {draft.calibrationSource === 'field-of-view' ? (
              <>
                <label><span>Yatay FOV</span><div><input inputMode="decimal" value={draft.horizontalFovDeg} onChange={(event) => updateDraft('horizontalFovDeg', event.currentTarget.value)} /><em>°</em></div></label>
                <label><span>Düşey FOV</span><div><input inputMode="decimal" value={draft.verticalFovDeg} onChange={(event) => updateDraft('verticalFovDeg', event.currentTarget.value)} /><em>°</em></div></label>
              </>
            ) : (
              <>
                <label><span>Odak uzaklığı</span><div><input inputMode="decimal" value={draft.focalLengthMm} onChange={(event) => updateDraft('focalLengthMm', event.currentTarget.value)} /><em>mm</em></div></label>
                <label><span>Sensör genişliği</span><div><input inputMode="decimal" value={draft.sensorWidthMm} onChange={(event) => updateDraft('sensorWidthMm', event.currentTarget.value)} /><em>mm</em></div></label>
                <label><span>Sensör yüksekliği</span><div><input inputMode="decimal" value={draft.sensorHeightMm} onChange={(event) => updateDraft('sensorHeightMm', event.currentTarget.value)} /><em>mm</em></div></label>
              </>
            )}

            <label><span>Asal nokta X (opsiyonel)</span><div><input inputMode="decimal" placeholder="görüntü merkezi" value={draft.principalPointXPx} onChange={(event) => updateDraft('principalPointXPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label><span>Asal nokta Y (opsiyonel)</span><div><input inputMode="decimal" placeholder="görüntü merkezi" value={draft.principalPointYPx} onChange={(event) => updateDraft('principalPointYPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label><span>İşaret belirsizliği</span><div><input inputMode="decimal" value={draft.defaultMarkUncertaintyPx} onChange={(event) => updateDraft('defaultMarkUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
            <label className="photo-checkbox"><input type="checkbox" checked={draft.distortionCorrected} onChange={(event) => updateDraft('distortionCorrected', event.currentTarget.checked)} /><span>Lens distorsiyonu önceden düzeltildi</span></label>
            <label className="photo-notes"><span>Not</span><input value={draft.notes} onChange={(event) => updateDraft('notes', event.currentTarget.value)} placeholder="Kamera, lens, çekim veya işaretleme notu" /></label>
          </div>

          <div className="photo-camera-uncertainty">
            <div className="photo-camera-uncertainty-heading">
              <div>
                <span className="eyebrow">Kamera iç-parametre belirsizliği</span>
                <strong>Opsiyonel ± aralıklar</strong>
              </div>
              <select
                value={draft.cameraUncertaintyCombination}
                onChange={(event) => updateDraft(
                  'cameraUncertaintyCombination',
                  event.currentTarget.value as CameraCalibrationUncertainty['combination']
                )}
              >
                <option value="linear-conservative">Koruyucu doğrusal toplam</option>
                <option value="rss-independent">RSS · bağımsız bileşenler</option>
              </select>
            </div>
            <p>
              Boş alan “belirsizlik tanımlanmadı” demektir. Kamera için ölçmediğin ± değerleri doldurma;
              uygulama varsayımsal hata payı üretmez.
            </p>
            <div className="photo-camera-grid photo-camera-uncertainty-grid">
              {draft.calibrationSource === 'field-of-view' ? (
                <>
                  <label><span>Yatay FOV ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.horizontalFovUncertaintyDeg} onChange={(event) => updateDraft('horizontalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                  <label><span>Düşey FOV ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.verticalFovUncertaintyDeg} onChange={(event) => updateDraft('verticalFovUncertaintyDeg', event.currentTarget.value)} /><em>°</em></div></label>
                </>
              ) : (
                <>
                  <label><span>Odak uzaklığı ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.focalLengthUncertaintyMm} onChange={(event) => updateDraft('focalLengthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>Sensör genişliği ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.sensorWidthUncertaintyMm} onChange={(event) => updateDraft('sensorWidthUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                  <label><span>Sensör yüksekliği ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.sensorHeightUncertaintyMm} onChange={(event) => updateDraft('sensorHeightUncertaintyMm', event.currentTarget.value)} /><em>mm</em></div></label>
                </>
              )}
              <label><span>Asal nokta X ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.principalPointXUncertaintyPx} onChange={(event) => updateDraft('principalPointXUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
              <label><span>Asal nokta Y ±</span><div><input inputMode="decimal" placeholder="tanımsız" value={draft.principalPointYUncertaintyPx} onChange={(event) => updateDraft('principalPointYUncertaintyPx', event.currentTarget.value)} /><em>px</em></div></label>
            </div>
            {draft.cameraUncertaintyCombination === 'rss-independent' && (
              <p className="photo-warning">RSS seçimi kamera belirsizlik bileşenlerinin bağımsız olduğu varsayımını gerektirir.</p>
            )}
          </div>

          {(candidate.error || (savedCalibration && isDirty)) && (
            <p className="photo-warning">
              {candidate.error || 'Kalibrasyon girdileri değişti; kaydedilmiş hesap artık güncel değil.'}
            </p>
          )}

          {(candidate.record || savedPrediction) && (
            <div className="photo-result-grid">
              <div><span>Referans roll</span><strong>{metrics.horizonRollDeg?.value === undefined ? '—' : formatAngle(metrics.horizonRollDeg.value ?? 0, metrics.horizonRollDeg.uncertainty)}</strong></div>
              <div><span>Hedef tabanı</span><strong>{metrics.targetBaseRelativeElevationDeg?.value === undefined ? '—' : formatAngle(metrics.targetBaseRelativeElevationDeg.value ?? 0, metrics.targetBaseRelativeElevationDeg.uncertainty)}</strong></div>
              <div><span>Hedef tepesi</span><strong>{metrics.targetTopRelativeElevationDeg?.value === undefined ? '—' : formatAngle(metrics.targetTopRelativeElevationDeg.value ?? 0, metrics.targetTopRelativeElevationDeg.uncertainty)}</strong></div>
              <div><span>Açısal yükseklik</span><strong>{metrics.targetAngularHeightDeg?.value === undefined ? '—' : formatAngle(metrics.targetAngularHeightDeg.value ?? 0, metrics.targetAngularHeightDeg.uncertainty)}</strong></div>
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
              Kalibrasyon kaydını oluştur / güncelle
            </button>
            {savedCalibration && (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  onClear();
                  setDraft((current) => ({ ...current }));
                  setIsDirty(true);
                  setMessage('Kayıtlı kalibrasyon kaldırıldı; fotoğraf oturumda açık kalır.');
                }}
              >
                Kayıtlı kalibrasyonu kaldır
              </button>
            )}
          </div>
        </>
      )}

      {message && <p className="photo-message">{message}</p>}
    </section>
  );
}
