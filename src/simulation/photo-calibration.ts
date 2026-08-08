import type { CalculationTrace, ModelPrediction } from '../shared/domain';
import type { CameraCalibrationUncertainty } from '../shared/photo-calibration';
import { combineUncertaintyContributions } from '../shared/uncertainty';

export const PHOTO_CALIBRATION_MODEL_ID = 'photo-calibration';
export const PHOTO_CALIBRATION_MODEL_VERSION = '0.2.0';

export type CameraCalibrationSource = 'sensor-focal' | 'field-of-view';

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

export interface CameraIntrinsicsInput {
  imageWidthPx: number;
  imageHeightPx: number;
  principalPointXPx?: number;
  principalPointYPx?: number;
  calibration: CameraCalibrationDefinition;
}

export interface CameraIntrinsics {
  imageWidthPx: number;
  imageHeightPx: number;
  principalPointXPx: number;
  principalPointYPx: number;
  focalLengthXPx: number;
  focalLengthYPx: number;
  horizontalFovDeg: number;
  verticalFovDeg: number;
  calibrationSource: CameraCalibrationSource;
}

export interface PhotoCalibrationInput extends CameraIntrinsicsInput {
  experimentId: string;
  imageSourceLabel: string;
  recordedAtIso: string;
  marks: PhotoCalibrationMarks;
  defaultMarkUncertaintyPx: number;
  cameraUncertainty?: CameraCalibrationUncertainty;
  distortionCorrected: boolean;
  notes?: string;
}

export interface PhotoCalibrationMetrics {
  horizonRollDeg: number;
  targetBaseRelativeElevationDeg: number;
  targetTopRelativeElevationDeg: number;
  targetAngularHeightDeg: number;
}

export interface PhotoCalibrationUncertainty {
  horizonRollDeg: number;
  targetBaseRelativeElevationDeg: number;
  targetTopRelativeElevationDeg: number;
  targetAngularHeightDeg: number;
}

export interface PhotoCalibrationRecord {
  prediction: ModelPrediction;
  modelVersion: typeof PHOTO_CALIBRATION_MODEL_VERSION;
  intrinsics: CameraIntrinsics;
  metrics: PhotoCalibrationMetrics;
  markUncertainty: PhotoCalibrationUncertainty;
  cameraUncertainty: PhotoCalibrationUncertainty;
  uncertainty: PhotoCalibrationUncertainty;
}

const explicitOffsetIsoPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

function degrees(radians: number): number {
  return radians * 180 / Math.PI;
}

function radians(degreesValue: number): number {
  return degreesValue * Math.PI / 180;
}

function finiteInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string
): number {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} ${minimum}…${maximum} aralığında sonlu olmalı.`);
  }
  return value;
}

function positive(value: number, maximum: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new RangeError(`${label} 0…${maximum} aralığında pozitif ve sonlu olmalı.`);
  }
  return value;
}

function requiredText(value: string, maximumLength: number, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maximumLength) {
    throw new RangeError(`${label} 1…${maximumLength} karakter olmalı.`);
  }
  return trimmed;
}

function explicitIso(value: string, label: string): string {
  const trimmed = value.trim();
  if (!explicitOffsetIsoPattern.test(trimmed) || Number.isNaN(Date.parse(trimmed))) {
    throw new RangeError(`${label} saat dilimi içeren geçerli bir ISO tarih olmalı.`);
  }
  return trimmed;
}

function pointInsideImage(
  point: PixelPoint,
  imageWidthPx: number,
  imageHeightPx: number,
  label: string
): void {
  if (
    !Number.isFinite(point.xPx) ||
    !Number.isFinite(point.yPx) ||
    point.xPx < 0 ||
    point.xPx > imageWidthPx - 1 ||
    point.yPx < 0 ||
    point.yPx > imageHeightPx - 1
  ) {
    throw new RangeError(`${label} görüntü sınırları içinde olmalı.`);
  }
}

function markUncertainty(mark: PhotoPixelMark, fallbackPx: number): number {
  if (mark.uncertaintyPx === undefined) return fallbackPx;
  return finiteInRange(mark.uncertaintyPx, 0, 100, 'İşaret belirsizliği');
}

export function resolveCameraIntrinsics(input: CameraIntrinsicsInput): CameraIntrinsics {
  const imageWidthPx = positive(input.imageWidthPx, 200_000, 'Görüntü genişliği');
  const imageHeightPx = positive(input.imageHeightPx, 200_000, 'Görüntü yüksekliği');
  if (!Number.isInteger(imageWidthPx) || !Number.isInteger(imageHeightPx)) {
    throw new RangeError('Görüntü boyutları tam piksel sayısı olmalı.');
  }

  const principalPointXPx = input.principalPointXPx ?? (imageWidthPx - 1) / 2;
  const principalPointYPx = input.principalPointYPx ?? (imageHeightPx - 1) / 2;
  pointInsideImage(
    { xPx: principalPointXPx, yPx: principalPointYPx },
    imageWidthPx,
    imageHeightPx,
    'Asal nokta'
  );

  let focalLengthXPx: number;
  let focalLengthYPx: number;
  let horizontalFovDeg: number;
  let verticalFovDeg: number;

  if (input.calibration.sourceKind === 'sensor-focal') {
    const focalLengthMm = positive(input.calibration.focalLengthMm, 10_000, 'Odak uzaklığı');
    const sensorWidthMm = positive(input.calibration.sensorWidthMm, 1_000, 'Sensör genişliği');
    const sensorHeightMm = positive(input.calibration.sensorHeightMm, 1_000, 'Sensör yüksekliği');
    focalLengthXPx = focalLengthMm * imageWidthPx / sensorWidthMm;
    focalLengthYPx = focalLengthMm * imageHeightPx / sensorHeightMm;
    horizontalFovDeg = degrees(2 * Math.atan(sensorWidthMm / (2 * focalLengthMm)));
    verticalFovDeg = degrees(2 * Math.atan(sensorHeightMm / (2 * focalLengthMm)));
  } else {
    horizontalFovDeg = finiteInRange(
      input.calibration.horizontalFovDeg,
      0.01,
      179,
      'Yatay görüş açısı'
    );
    verticalFovDeg = finiteInRange(
      input.calibration.verticalFovDeg,
      0.01,
      179,
      'Düşey görüş açısı'
    );
    focalLengthXPx = (imageWidthPx / 2) / Math.tan(radians(horizontalFovDeg) / 2);
    focalLengthYPx = (imageHeightPx / 2) / Math.tan(radians(verticalFovDeg) / 2);
  }

  return {
    imageWidthPx,
    imageHeightPx,
    principalPointXPx,
    principalPointYPx,
    focalLengthXPx,
    focalLengthYPx,
    horizontalFovDeg,
    verticalFovDeg,
    calibrationSource: input.calibration.sourceKind
  };
}

export function pixelToCameraRay(
  intrinsics: CameraIntrinsics,
  point: PixelPoint
): readonly [number, number, number] {
  pointInsideImage(
    point,
    intrinsics.imageWidthPx,
    intrinsics.imageHeightPx,
    'Piksel noktası'
  );
  const x = (point.xPx - intrinsics.principalPointXPx) / intrinsics.focalLengthXPx;
  const y = -(point.yPx - intrinsics.principalPointYPx) / intrinsics.focalLengthYPx;
  const length = Math.hypot(x, y, 1);
  return [x / length, y / length, 1 / length];
}

export function pixelElevationDeg(
  intrinsics: CameraIntrinsics,
  point: PixelPoint
): number {
  pointInsideImage(
    point,
    intrinsics.imageWidthPx,
    intrinsics.imageHeightPx,
    'Piksel noktası'
  );
  const normalizedX =
    (point.xPx - intrinsics.principalPointXPx) / intrinsics.focalLengthXPx;
  const normalizedY =
    -(point.yPx - intrinsics.principalPointYPx) / intrinsics.focalLengthYPx;
  return degrees(Math.atan2(normalizedY, Math.hypot(1, normalizedX)));
}

function horizonYAtX(
  horizonStart: PixelPoint,
  horizonEnd: PixelPoint,
  xPx: number
): number {
  const dx = horizonEnd.xPx - horizonStart.xPx;
  if (Math.abs(dx) < 1) {
    throw new RangeError('Ufuk işaretleri yatay eksende en az 1 piksel ayrılmalı.');
  }
  const fraction = (xPx - horizonStart.xPx) / dx;
  return horizonStart.yPx + fraction * (horizonEnd.yPx - horizonStart.yPx);
}

function relativeElevationDeg(
  intrinsics: CameraIntrinsics,
  horizonStart: PixelPoint,
  horizonEnd: PixelPoint,
  point: PixelPoint
): number {
  const referenceY = horizonYAtX(horizonStart, horizonEnd, point.xPx);
  return pixelElevationDeg(intrinsics, point) - pixelElevationDeg(intrinsics, {
    xPx: point.xPx,
    yPx: referenceY
  });
}

function evaluateMarks(
  intrinsics: CameraIntrinsics,
  marks: PhotoCalibrationMarks
): PhotoCalibrationMetrics {
  const horizonDx = marks.horizonEnd.xPx - marks.horizonStart.xPx;
  const horizonDy = marks.horizonEnd.yPx - marks.horizonStart.yPx;
  if (Math.abs(horizonDx) < 1) {
    throw new RangeError('Ufuk işaretleri yatay eksende en az 1 piksel ayrılmalı.');
  }
  const targetBaseRelativeElevationDeg = relativeElevationDeg(
    intrinsics,
    marks.horizonStart,
    marks.horizonEnd,
    marks.targetBase
  );
  const targetTopRelativeElevationDeg = relativeElevationDeg(
    intrinsics,
    marks.horizonStart,
    marks.horizonEnd,
    marks.targetTop
  );
  return {
    horizonRollDeg: degrees(Math.atan2(horizonDy, horizonDx)),
    targetBaseRelativeElevationDeg,
    targetTopRelativeElevationDeg,
    targetAngularHeightDeg:
      targetTopRelativeElevationDeg - targetBaseRelativeElevationDeg
  };
}

function uncertaintyEnvelope(
  intrinsics: CameraIntrinsics,
  marks: PhotoCalibrationMarks,
  defaultMarkUncertaintyPx: number
): PhotoCalibrationUncertainty {
  const names = ['horizonStart', 'horizonEnd', 'targetBase', 'targetTop'] as const;
  const uncertainties = names.map((name) => markUncertainty(marks[name], defaultMarkUncertaintyPx));
  const center = evaluateMarks(intrinsics, marks);
  const minima: PhotoCalibrationMetrics = { ...center };
  const maxima: PhotoCalibrationMetrics = { ...center };

  // Four marks × x/y sign gives eight binary perturbations (256 corners).
  for (let mask = 0; mask < 256; mask += 1) {
    const perturbed = {} as PhotoCalibrationMarks;
    names.forEach((name, markIndex) => {
      const mark = marks[name];
      const uncertainty = uncertainties[markIndex]!;
      const xSign = (mask & (1 << (markIndex * 2))) === 0 ? -1 : 1;
      const ySign = (mask & (1 << (markIndex * 2 + 1))) === 0 ? -1 : 1;
      perturbed[name] = {
        xPx: mark.xPx + xSign * uncertainty,
        yPx: mark.yPx + ySign * uncertainty,
        uncertaintyPx: mark.uncertaintyPx
      };
    });
    let metrics: PhotoCalibrationMetrics;
    try {
      metrics = evaluateMarks(intrinsics, perturbed);
    } catch {
      continue;
    }
    (Object.keys(center) as Array<keyof PhotoCalibrationMetrics>).forEach((key) => {
      minima[key] = Math.min(minima[key], metrics[key]);
      maxima[key] = Math.max(maxima[key], metrics[key]);
    });
  }

  return {
    horizonRollDeg: Math.max(
      Math.abs(center.horizonRollDeg - minima.horizonRollDeg),
      Math.abs(maxima.horizonRollDeg - center.horizonRollDeg)
    ),
    targetBaseRelativeElevationDeg: Math.max(
      Math.abs(center.targetBaseRelativeElevationDeg - minima.targetBaseRelativeElevationDeg),
      Math.abs(maxima.targetBaseRelativeElevationDeg - center.targetBaseRelativeElevationDeg)
    ),
    targetTopRelativeElevationDeg: Math.max(
      Math.abs(center.targetTopRelativeElevationDeg - minima.targetTopRelativeElevationDeg),
      Math.abs(maxima.targetTopRelativeElevationDeg - center.targetTopRelativeElevationDeg)
    ),
    targetAngularHeightDeg: Math.max(
      Math.abs(center.targetAngularHeightDeg - minima.targetAngularHeightDeg),
      Math.abs(maxima.targetAngularHeightDeg - center.targetAngularHeightDeg)
    )
  };
}


const PHOTO_UNCERTAINTY_KEYS: Array<keyof PhotoCalibrationUncertainty> = [
  'horizonRollDeg',
  'targetBaseRelativeElevationDeg',
  'targetTopRelativeElevationDeg',
  'targetAngularHeightDeg'
];

function zeroPhotoUncertainty(): PhotoCalibrationUncertainty {
  return {
    horizonRollDeg: 0,
    targetBaseRelativeElevationDeg: 0,
    targetTopRelativeElevationDeg: 0,
    targetAngularHeightDeg: 0
  };
}

function cameraUncertaintyEnvelope(
  input: PhotoCalibrationInput,
  center: PhotoCalibrationMetrics
): PhotoCalibrationUncertainty {
  const settings = input.cameraUncertainty;
  if (!settings) return zeroPhotoUncertainty();
  const buckets: Record<keyof PhotoCalibrationUncertainty, number[]> = {
    horizonRollDeg: [],
    targetBaseRelativeElevationDeg: [],
    targetTopRelativeElevationDeg: [],
    targetAngularHeightDeg: []
  };

  type CameraParameter = keyof Omit<CameraCalibrationUncertainty, 'combination'>;
  const parameters: CameraParameter[] = input.calibration.sourceKind === 'field-of-view'
    ? ['horizontalFovDeg', 'verticalFovDeg', 'principalPointXPx', 'principalPointYPx']
    : ['focalLengthMm', 'sensorWidthMm', 'sensorHeightMm', 'principalPointXPx', 'principalPointYPx'];

  const evaluateVariant = (parameter: CameraParameter, delta: number): PhotoCalibrationMetrics => {
    const calibration = { ...input.calibration } as CameraCalibrationDefinition;
    let principalPointXPx = input.principalPointXPx;
    let principalPointYPx = input.principalPointYPx;
    if (parameter === 'principalPointXPx') {
      principalPointXPx = (input.principalPointXPx ?? (input.imageWidthPx - 1) / 2) + delta;
    } else if (parameter === 'principalPointYPx') {
      principalPointYPx = (input.principalPointYPx ?? (input.imageHeightPx - 1) / 2) + delta;
    } else if (calibration.sourceKind === 'field-of-view' &&
      (parameter === 'horizontalFovDeg' || parameter === 'verticalFovDeg')) {
      calibration[parameter] += delta;
    } else if (calibration.sourceKind === 'sensor-focal' &&
      (parameter === 'focalLengthMm' || parameter === 'sensorWidthMm' || parameter === 'sensorHeightMm')) {
      calibration[parameter] += delta;
    }
    const intrinsics = resolveCameraIntrinsics({
      imageWidthPx: input.imageWidthPx,
      imageHeightPx: input.imageHeightPx,
      ...(principalPointXPx === undefined ? {} : { principalPointXPx }),
      ...(principalPointYPx === undefined ? {} : { principalPointYPx }),
      calibration
    });
    return evaluateMarks(intrinsics, input.marks);
  };

  for (const parameter of parameters) {
    const uncertainty = settings[parameter];
    if (uncertainty === undefined || uncertainty === 0) continue;
    if (!Number.isFinite(uncertainty) || uncertainty < 0) {
      throw new RangeError(`${parameter} belirsizliği negatif olmayan sonlu bir sayı olmalı.`);
    }
    let minus: PhotoCalibrationMetrics;
    let plus: PhotoCalibrationMetrics;
    try {
      minus = evaluateVariant(parameter, -uncertainty);
      plus = evaluateVariant(parameter, uncertainty);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'geçersiz aralık';
      throw new RangeError(`${parameter} ± belirsizlik aralığı geçersiz: ${message}`);
    }
    for (const key of PHOTO_UNCERTAINTY_KEYS) {
      buckets[key].push(Math.max(
        Math.abs(minus[key] - center[key]),
        Math.abs(plus[key] - center[key])
      ));
    }
  }

  return Object.fromEntries(PHOTO_UNCERTAINTY_KEYS.map((key) => [
    key,
    combineUncertaintyContributions(buckets[key], settings.combination)
  ])) as unknown as PhotoCalibrationUncertainty;
}

function combinedPhotoUncertainty(
  mark: PhotoCalibrationUncertainty,
  camera: PhotoCalibrationUncertainty,
  combination: CameraCalibrationUncertainty['combination']
): PhotoCalibrationUncertainty {
  return Object.fromEntries(PHOTO_UNCERTAINTY_KEYS.map((key) => [
    key,
    combineUncertaintyContributions([mark[key], camera[key]], combination)
  ])) as unknown as PhotoCalibrationUncertainty;
}

export function createPhotoCalibrationRecord(
  input: PhotoCalibrationInput
): PhotoCalibrationRecord {
  const experimentId = requiredText(input.experimentId, 200, 'Deney kimliği');
  const imageSourceLabel = requiredText(input.imageSourceLabel, 240, 'Görsel kaynak etiketi');
  const recordedAtIso = explicitIso(input.recordedAtIso, 'Kalibrasyon kayıt zamanı');
  const defaultMarkUncertaintyPx = finiteInRange(
    input.defaultMarkUncertaintyPx,
    0,
    100,
    'Varsayılan işaret belirsizliği'
  );
  const intrinsics = resolveCameraIntrinsics(input);

  for (const [label, mark] of [
    ['Ufuk başlangıcı', input.marks.horizonStart],
    ['Ufuk sonu', input.marks.horizonEnd],
    ['Hedef tabanı', input.marks.targetBase],
    ['Hedef tepesi', input.marks.targetTop]
  ] as const) {
    pointInsideImage(mark, intrinsics.imageWidthPx, intrinsics.imageHeightPx, label);
    markUncertainty(mark, defaultMarkUncertaintyPx);
  }

  const metrics = evaluateMarks(intrinsics, input.marks);
  if (metrics.targetAngularHeightDeg <= 0) {
    throw new RangeError(
      'Hedef tepesi kalibre edilmiş referansa göre tabanın üstünde olmalı. TABAN ve TEPE işaretlerini kontrol et.'
    );
  }
  const markUncertainty = uncertaintyEnvelope(
    intrinsics,
    input.marks,
    defaultMarkUncertaintyPx
  );
  const cameraUncertainty = cameraUncertaintyEnvelope(input, metrics);
  const uncertaintyCombination = input.cameraUncertainty?.combination ?? 'linear-conservative';
  const uncertainty = combinedPhotoUncertainty(
    markUncertainty,
    cameraUncertainty,
    uncertaintyCombination
  );

  const warnings: string[] = [];
  const hasCameraUncertainty = PHOTO_UNCERTAINTY_KEYS.some((key) => cameraUncertainty[key] > 0);
  if (!hasCameraUncertainty) {
    warnings.push('Kamera iç-parametre belirsizliği tanımlanmadı; fotoğraf açı zarfı yalnız piksel işaret belirsizliğini içerir.');
  } else if (uncertaintyCombination === 'rss-independent') {
    warnings.push('Fotoğraf belirsizlikleri RSS ile birleştirildi; işaret ve kamera parametre katkılarının bağımsız olduğu varsayılmıştır.');
  }
  if (!input.distortionCorrected) {
    warnings.push('Lens distorsiyonu düzeltilmedi; özellikle görüntü kenarlarındaki piksel-açı dönüşümü sistematik hata içerebilir.');
  }
  const horizonSpanFraction = Math.abs(
    input.marks.horizonEnd.xPx - input.marks.horizonStart.xPx
  ) / intrinsics.imageWidthPx;
  if (horizonSpanFraction < 0.25) {
    warnings.push('Ufuk işaretleri görüntü genişliğinin %25’inden daha kısa bir aralığı kapsıyor; roll ve referans çizgisi duyarlılığı zayıf olabilir.');
  }
  if (Math.abs(input.marks.targetTop.xPx - input.marks.targetBase.xPx) > intrinsics.imageWidthPx * 0.05) {
    warnings.push('Hedef tabanı ve tepesi yatayda belirgin ayrık; hedef yüksekliği eğik/karma bir görüntü doğrultusunu temsil ediyor olabilir.');
  }

  const notes = input.notes?.trim();
  const assumptions = [
    'Görüntü, EXIF yönelimi uygulanmış son piksel koordinat sistemiyle yorumlanmıştır.',
    'Pinhole kamera modeli kullanılmıştır; odak/asıl nokta tek bir küresel projeksiyonla temsil edilir.',
    input.distortionCorrected
      ? 'Lens distorsiyonunun görüntü üzerinde önceden düzeltildiği kabul edilmiştir.'
      : 'Lens distorsiyonu düzeltilmemiştir ve sistematik hata uyarısı korunmuştur.',
    'İki ufuk işareti görüntüde yerel sıfır-eğim referans çizgisi olarak kullanılmıştır; bunun fiziksel/astronomik ufuk olduğu otomatik varsayılmamıştır.',
    input.cameraUncertainty
      ? `İşaret ve kamera iç-parametre belirsizlikleri ${uncertaintyCombination === 'rss-independent' ? 'RSS bağımsızlık varsayımıyla' : 'koruyucu doğrusal toplamla'} birleştirilmiştir.`
      : 'İşaret belirsizliği x/y piksel uç durumlarının koruyucu zarfıyla yayılmıştır; kamera iç-parametre belirsizliği kullanıcı tarafından tanımlanmamıştır.'
  ];

  const trace: CalculationTrace = {
    summary: `${imageSourceLabel}: piksel işaretlerinden kamera açısı kalibrasyonu.`,
    assumptions,
    steps: [
      {
        id: 'camera-intrinsics',
        title: 'Kamera iç parametreleri',
        formula: input.calibration.sourceKind === 'sensor-focal'
          ? 'f_px = f_mm · görüntü_px / sensör_mm; FOV = 2 atan(sensör/(2f))'
          : 'f_px = (görüntü_px/2) / tan(FOV/2)',
        substitution: `${intrinsics.imageWidthPx}×${intrinsics.imageHeightPx} px; cx=${intrinsics.principalPointXPx.toFixed(3)}; cy=${intrinsics.principalPointYPx.toFixed(3)}`,
        result: `fx=${intrinsics.focalLengthXPx.toFixed(3)} px; fy=${intrinsics.focalLengthYPx.toFixed(3)} px; FOV=${intrinsics.horizontalFovDeg.toFixed(4)}°×${intrinsics.verticalFovDeg.toFixed(4)}°`
      },
      {
        id: 'horizon-reference',
        title: 'Ufuk/referans çizgisi',
        formula: 'roll = atan2(Δy, Δx); y_ref(x) = y₁ + (x-x₁)·Δy/Δx',
        substitution: `(${input.marks.horizonStart.xPx.toFixed(2)}, ${input.marks.horizonStart.yPx.toFixed(2)}) → (${input.marks.horizonEnd.xPx.toFixed(2)}, ${input.marks.horizonEnd.yPx.toFixed(2)})`,
        result: `${metrics.horizonRollDeg.toFixed(6)}° ±${uncertainty.horizonRollDeg.toFixed(6)}°`
      },
      {
        id: 'pixel-angle',
        title: 'Hedef piksel-açı dönüşümü',
        formula: 'elev = atan2(-(y-cy)/fy, √(1+((x-cx)/fx)²)); Δelev = elev_hedef - elev_ref(x)',
        substitution: `taban=(${input.marks.targetBase.xPx.toFixed(2)}, ${input.marks.targetBase.yPx.toFixed(2)}); tepe=(${input.marks.targetTop.xPx.toFixed(2)}, ${input.marks.targetTop.yPx.toFixed(2)})`,
        result: `taban=${metrics.targetBaseRelativeElevationDeg.toFixed(6)}°; tepe=${metrics.targetTopRelativeElevationDeg.toFixed(6)}°`
      },
      {
        id: 'target-angular-height',
        title: 'Hedef açısal yüksekliği',
        formula: 'α_hedef = Δelev_tepe - Δelev_taban',
        substitution: `${metrics.targetTopRelativeElevationDeg.toFixed(6)}° - ${metrics.targetBaseRelativeElevationDeg.toFixed(6)}°`,
        result: `${metrics.targetAngularHeightDeg.toFixed(6)}° ±${uncertainty.targetAngularHeightDeg.toFixed(6)}°`,
        ...(notes ? { note: notes } : {})
      }
    ]
  };

  const prediction: ModelPrediction = {
    modelId: PHOTO_CALIBRATION_MODEL_ID,
    experimentId,
    status: 'compatible',
    metrics: [
      { key: 'horizontalFovDeg', label: 'Yatay görüş açısı', value: intrinsics.horizontalFovDeg, unit: 'deg' },
      { key: 'verticalFovDeg', label: 'Düşey görüş açısı', value: intrinsics.verticalFovDeg, unit: 'deg' },
      { key: 'focalLengthXPx', label: 'Yatay odak ölçeği', value: intrinsics.focalLengthXPx, unit: 'px' },
      { key: 'focalLengthYPx', label: 'Düşey odak ölçeği', value: intrinsics.focalLengthYPx, unit: 'px' },
      { key: 'horizonRollDeg', label: 'Referans çizgisi roll açısı', value: metrics.horizonRollDeg, unit: 'deg', uncertainty: uncertainty.horizonRollDeg },
      { key: 'targetBaseRelativeElevationDeg', label: 'Hedef tabanı referans açısı', value: metrics.targetBaseRelativeElevationDeg, unit: 'deg', uncertainty: uncertainty.targetBaseRelativeElevationDeg },
      { key: 'targetTopRelativeElevationDeg', label: 'Hedef tepesi referans açısı', value: metrics.targetTopRelativeElevationDeg, unit: 'deg', uncertainty: uncertainty.targetTopRelativeElevationDeg },
      { key: 'targetAngularHeightDeg', label: 'Hedef açısal yüksekliği', value: metrics.targetAngularHeightDeg, unit: 'deg', uncertainty: uncertainty.targetAngularHeightDeg }
    ],
    warnings,
    traceId: `photo-calibration:${recordedAtIso}:${input.calibration.sourceKind}`,
    trace
  };

  return {
    prediction,
    modelVersion: PHOTO_CALIBRATION_MODEL_VERSION,
    intrinsics,
    metrics,
    markUncertainty,
    cameraUncertainty,
    uncertainty
  };
}
