import type {
  CameraCalibrationUncertainty,
  ImportedObservationPhoto,
  PhotoCalibrationMarks,
  PhotoReferenceKind,
  PhotoSourceMetadata,
  SavedPhotoCalibration
} from '../../shared/photo-calibration';
import { createPhotoCalibrationRecord } from '../../simulation/photo-calibration';
import {
  appLocaleTag,
  translate,
  type AppLocale,
  type TranslationKey
} from './i18n';

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

const markLabelKeys: Record<MarkKey, TranslationKey> = {
  horizonStart: 'photo.marker.label.horizonStart',
  horizonEnd: 'photo.marker.label.horizonEnd',
  targetBase: 'photo.marker.label.targetBase',
  targetTop: 'photo.marker.label.targetTop'
};

const markShortLabelKeys: Record<MarkKey, TranslationKey> = {
  horizonStart: 'photo.marker.short.horizonStart',
  horizonEnd: 'photo.marker.short.horizonEnd',
  targetBase: 'photo.marker.short.targetBase',
  targetTop: 'photo.marker.short.targetTop'
};

export function markLabel(locale: AppLocale, key: MarkKey): string {
  return translate(locale, markLabelKeys[key]);
}

export function markShortLabel(locale: AppLocale, key: MarkKey): string {
  return translate(locale, markShortLabelKeys[key]);
}

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
    horizontalFovUncertaintyDeg: saved.cameraUncertainty?.horizontalFovDeg === undefined
      ? ''
      : String(saved.cameraUncertainty.horizontalFovDeg),
    verticalFovUncertaintyDeg: saved.cameraUncertainty?.verticalFovDeg === undefined
      ? ''
      : String(saved.cameraUncertainty.verticalFovDeg),
    focalLengthUncertaintyMm: saved.cameraUncertainty?.focalLengthMm === undefined
      ? ''
      : String(saved.cameraUncertainty.focalLengthMm),
    sensorWidthUncertaintyMm: saved.cameraUncertainty?.sensorWidthMm === undefined
      ? ''
      : String(saved.cameraUncertainty.sensorWidthMm),
    sensorHeightUncertaintyMm: saved.cameraUncertainty?.sensorHeightMm === undefined
      ? ''
      : String(saved.cameraUncertainty.sensorHeightMm),
    principalPointXUncertaintyPx: saved.cameraUncertainty?.principalPointXPx === undefined
      ? ''
      : String(saved.cameraUncertainty.principalPointXPx),
    principalPointYUncertaintyPx: saved.cameraUncertainty?.principalPointYPx === undefined
      ? ''
      : String(saved.cameraUncertainty.principalPointYPx),
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

function uncertaintyDraftNumber(
  locale: AppLocale,
  value: string,
  labelKey: TranslationKey
): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new RangeError(translate(locale, 'photo.calibration.error.uncertainty', {
      label: translate(locale, labelKey)
    }));
  }
  return parsed;
}

export function cameraUncertaintyFromDraft(
  draft: DraftState,
  locale: AppLocale = 'tr'
): CameraCalibrationUncertainty | undefined {
  const common = {
    principalPointXPx: uncertaintyDraftNumber(
      locale,
      draft.principalPointXUncertaintyPx,
      'photo.calibration.principalX'
    ),
    principalPointYPx: uncertaintyDraftNumber(
      locale,
      draft.principalPointYUncertaintyPx,
      'photo.calibration.principalY'
    )
  };
  const sourceSpecific = draft.calibrationSource === 'field-of-view'
    ? {
        horizontalFovDeg: uncertaintyDraftNumber(
          locale,
          draft.horizontalFovUncertaintyDeg,
          'photo.calibration.horizontalFov'
        ),
        verticalFovDeg: uncertaintyDraftNumber(
          locale,
          draft.verticalFovUncertaintyDeg,
          'photo.calibration.verticalFov'
        )
      }
    : {
        focalLengthMm: uncertaintyDraftNumber(
          locale,
          draft.focalLengthUncertaintyMm,
          'photo.calibration.focalLength'
        ),
        sensorWidthMm: uncertaintyDraftNumber(
          locale,
          draft.sensorWidthUncertaintyMm,
          'photo.calibration.sensorWidth'
        ),
        sensorHeightMm: uncertaintyDraftNumber(
          locale,
          draft.sensorHeightUncertaintyMm,
          'photo.calibration.sensorHeight'
        )
      };
  const values = [...Object.values(common), ...Object.values(sourceSpecific)];
  if (values.every((value) => value === undefined)) return undefined;
  return {
    combination: draft.cameraUncertaintyCombination,
    ...Object.fromEntries(
      Object.entries({ ...common, ...sourceSpecific }).filter(([, value]) => value !== undefined)
    )
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

export function formatBytes(locale: AppLocale, value: number): string {
  const format = (candidate: number, maximumFractionDigits: number): string =>
    new Intl.NumberFormat(appLocaleTag(locale), {
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits
    }).format(candidate);
  if (value < 1024) {
    return `${new Intl.NumberFormat(appLocaleTag(locale)).format(value)} B`;
  }
  if (value < 1024 * 1024) return `${format(value / 1024, 1)} KiB`;
  return `${format(value / (1024 * 1024), 2)} MiB`;
}

export function formatAngle(
  locale: AppLocale,
  value: number,
  uncertainty?: number
): string {
  const formatter = new Intl.NumberFormat(appLocaleTag(locale), {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
  return uncertainty === undefined
    ? `${formatter.format(value)}°`
    : `${formatter.format(value)}° ±${formatter.format(uncertainty)}°`;
}

export function markSummary(
  locale: AppLocale,
  mark: PhotoCalibrationMarks[MarkKey]
): string {
  const formatter = new Intl.NumberFormat(appLocaleTag(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return `${formatter.format(mark.xPx)}, ${formatter.format(mark.yPx)} px`;
}

export function buildPhotoCalibrationCandidate(
  draft: DraftState,
  experimentId: string,
  touchedMarks: ReadonlySet<MarkKey>,
  locale: AppLocale = 'tr'
) {
  if (!draft.source || !draft.marks || touchedMarks.size < markOrder.length) {
    return { record: undefined, error: '' };
  }
  const defaultMarkUncertaintyPx = finiteDraftNumber(draft.defaultMarkUncertaintyPx);
  if (defaultMarkUncertaintyPx === undefined) {
    return {
      record: undefined,
      error: translate(locale, 'photo.calibration.error.markUncertainty')
    };
  }

  const principalPointXPx = finiteDraftNumber(draft.principalPointXPx);
  const principalPointYPx = finiteDraftNumber(draft.principalPointYPx);
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
        ? translate(locale, 'photo.calibration.error.fovRequired')
        : translate(locale, 'photo.calibration.error.sensorRequired')
    };
  }

  try {
    const cameraUncertainty = cameraUncertaintyFromDraft(draft, locale);
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
      error: caught instanceof Error
        ? caught.message
        : translate(locale, 'photo.calibration.error.calculationFallback')
    };
  }
}
