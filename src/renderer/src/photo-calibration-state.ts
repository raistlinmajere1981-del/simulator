import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
import { createPhotoCalibrationRecord } from '../../simulation/photo-calibration';

export type MarkKey = keyof PhotoCalibrationMarks;
export type CalibrationSource = 'field-of-view' | 'sensor-focal';

export interface DraftState {
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

export const markOrder: MarkKey[] = [
  'horizonStart',
  'horizonEnd',
  'targetBase',
  'targetTop'
];

export const markLabels: Record<MarkKey, string> = {
  horizonStart: 'Ufuk / referans sol',
  horizonEnd: 'Ufuk / referans sağ',
  targetBase: 'Hedef tabanı',
  targetTop: 'Hedef tepesi'
};

export const markShortLabels: Record<MarkKey, string> = {
  horizonStart: 'U1',
  horizonEnd: 'U2',
  targetBase: 'TABAN',
  targetTop: 'TEPE'
};

export function emptyDraft(): DraftState {
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

export function draftFromSaved(saved: SavedPhotoCalibration | undefined): DraftState {
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

export function defaultMarks(source: PhotoSourceMetadata): PhotoCalibrationMarks {
  const width = source.imageWidthPx;
  const height = source.imageHeightPx;
  return {
    horizonStart: { xPx: width * 0.15, yPx: height * 0.5 },
    horizonEnd: { xPx: width * 0.85, yPx: height * 0.5 },
    targetBase: { xPx: width * 0.5, yPx: height * 0.62 },
    targetTop: { xPx: width * 0.5, yPx: height * 0.38 }
  };
}

export function finiteDraftNumber(value: string): number | undefined {
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

export function cameraUncertaintyFromDraft(draft: DraftState): CameraCalibrationUncertainty | undefined {
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

export function sourceMetadata(photo: ImportedObservationPhoto): PhotoSourceMetadata {
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

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

export function formatAngle(value: number, uncertainty?: number): string {
  return uncertainty === undefined
    ? `${value.toFixed(4)}°`
    : `${value.toFixed(4)}° ±${uncertainty.toFixed(4)}°`;
}

export function markSummary(mark: PhotoCalibrationMarks[MarkKey]): string {
  return `${mark.xPx.toFixed(1)}, ${mark.yPx.toFixed(1)} px`;
}

export function buildPhotoCalibrationCandidate(
  draft: DraftState,
  experimentId: string,
  touchedMarks: ReadonlySet<MarkKey>
) {
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
}
