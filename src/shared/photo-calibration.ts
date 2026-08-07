export type CameraCalibrationSource = 'sensor-focal' | 'field-of-view';
export type PhotoReferenceKind = 'visual-reference' | 'local-horizontal';

export interface PixelPoint {
  xPx: number;
  yPx: number;
}

export interface PhotoPixelMark extends PixelPoint {
  uncertaintyPx?: number;
}

export interface PhotoCalibrationMarks {
  horizonStart: PhotoPixelMark;
  horizonEnd: PhotoPixelMark;
  targetBase: PhotoPixelMark;
  targetTop: PhotoPixelMark;
}

export interface SensorFocalCalibration {
  sourceKind: 'sensor-focal';
  focalLengthMm: number;
  sensorWidthMm: number;
  sensorHeightMm: number;
}

export interface FieldOfViewCalibration {
  sourceKind: 'field-of-view';
  horizontalFovDeg: number;
  verticalFovDeg: number;
}

export type CameraCalibrationDefinition =
  | SensorFocalCalibration
  | FieldOfViewCalibration;

export interface PhotoSourceMetadata {
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  mimeType: 'image/jpeg' | 'image/png';
  imageWidthPx: number;
  imageHeightPx: number;
  importedAtIso: string;
}

/**
 * Session-only image payload returned by Electron. dataUrl is deliberately not
 * part of SavedPhotoCalibration so portable experiment files never embed the
 * source image bytes.
 */
export interface ImportedObservationPhoto extends PhotoSourceMetadata {
  dataUrl: string;
}

export interface SavedPhotoCalibration {
  source: PhotoSourceMetadata;
  calibration: CameraCalibrationDefinition;
  principalPointXPx?: number;
  principalPointYPx?: number;
  defaultMarkUncertaintyPx: number;
  distortionCorrected: boolean;
  marks: PhotoCalibrationMarks;
  recordedAtIso: string;
  /**
   * Omitted legacy records are treated as visual-reference. Only an explicitly
   * declared local-horizontal reference permits absolute base/top model-angle
   * comparisons.
   */
  referenceKind?: PhotoReferenceKind;
  notes?: string;
}
