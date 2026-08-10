export const PANORAMA_SKYLINE_ASSIST_ALGORITHM_ID = 'gradient-dp-skyline-draft';
export const PANORAMA_SKYLINE_ASSIST_ALGORITHM_VERSION = '1.0.0';

export interface PanoramaSkylineAssistImage {
  width: number;
  height: number;
  data: ArrayLike<number>;
}

export interface PanoramaSkylineAssistOptions {
  sampleCount?: number;
  minimumYRatio?: number;
  maximumYRatio?: number;
  smoothnessPenalty?: number;
  maximumStepRatio?: number;
  sampleRadiusPx?: number;
}

export interface PanoramaSkylineAssistMark {
  xPx: number;
  yPx: number;
}

export interface PanoramaSkylineAssistResult {
  algorithmId: typeof PANORAMA_SKYLINE_ASSIST_ALGORITHM_ID;
  algorithmVersion: typeof PANORAMA_SKYLINE_ASSIST_ALGORITHM_VERSION;
  marks: PanoramaSkylineAssistMark[];
  confidence: number;
  meanChosenGradient: number;
  seamJumpPx: number;
  warnings: string[];
}

export class PanoramaSkylineAssistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PanoramaSkylineAssistError';
  }
}

const DEFAULT_SAMPLE_COUNT = 72;
const DEFAULT_MINIMUM_Y_RATIO = 0.12;
const DEFAULT_MAXIMUM_Y_RATIO = 0.82;
const DEFAULT_SMOOTHNESS_PENALTY = 0.9;
const DEFAULT_MAXIMUM_STEP_RATIO = 0.12;
const DEFAULT_SAMPLE_RADIUS_PX = 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

function validateImage(image: PanoramaSkylineAssistImage): void {
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 16 || image.height < 16) {
    throw new PanoramaSkylineAssistError('Skyline taslağı için görüntü boyutları en az 16×16 px olmalıdır.');
  }
  if (image.data.length < image.width * image.height * 4) {
    throw new PanoramaSkylineAssistError('Skyline taslağı piksel tamponu RGBA görüntü boyutuyla eşleşmiyor.');
  }
}

function rgbaIndex(image: PanoramaSkylineAssistImage, x: number, y: number): number {
  return (y * image.width + x) * 4;
}

function sampleRgb(
  image: PanoramaSkylineAssistImage,
  x: number,
  yStart: number,
  yEnd: number,
  horizontalRadius: number
): [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  const left = Math.max(0, x - horizontalRadius);
  const right = Math.min(image.width - 1, x + horizontalRadius);
  const top = Math.max(0, yStart);
  const bottom = Math.min(image.height - 1, yEnd);
  for (let y = top; y <= bottom; y += 1) {
    for (let currentX = left; currentX <= right; currentX += 1) {
      const index = rgbaIndex(image, currentX, y);
      red += Number(image.data[index] ?? 0);
      green += Number(image.data[index + 1] ?? 0);
      blue += Number(image.data[index + 2] ?? 0);
      count += 1;
    }
  }
  if (count === 0) return [0, 0, 0];
  return [red / count, green / count, blue / count];
}

function verticalColorGradient(
  image: PanoramaSkylineAssistImage,
  x: number,
  y: number,
  radius: number
): number {
  const upper = sampleRgb(image, x, y - radius * 2, y - 1, 1);
  const lower = sampleRgb(image, x, y + 1, y + radius * 2, 1);
  const redDifference = upper[0] - lower[0];
  const greenDifference = upper[1] - lower[1];
  const blueDifference = upper[2] - lower[2];
  const colorDistance = Math.sqrt(
    redDifference * redDifference +
    greenDifference * greenDifference +
    blueDifference * blueDifference
  );
  const upperLuma = upper[0] * 0.2126 + upper[1] * 0.7152 + upper[2] * 0.0722;
  const lowerLuma = lower[0] * 0.2126 + lower[1] * 0.7152 + lower[2] * 0.0722;
  return colorDistance + Math.abs(upperLuma - lowerLuma) * 0.35;
}

function circularSmooth(rows: number[], minimumRow: number, maximumRow: number): number[] {
  if (rows.length < 3) return [...rows];
  let current = [...rows];
  for (let pass = 0; pass < 2; pass += 1) {
    current = current.map((row, index) => {
      const previous = current[(index - 1 + current.length) % current.length]!;
      const next = current[(index + 1) % current.length]!;
      return clamp(Math.round((previous + row * 2 + next) / 4), minimumRow, maximumRow);
    });
  }
  return current;
}

export function suggestPanoramaSkyline(
  image: PanoramaSkylineAssistImage,
  options: PanoramaSkylineAssistOptions = {}
): PanoramaSkylineAssistResult {
  validateImage(image);

  const sampleCount = Math.round(options.sampleCount ?? DEFAULT_SAMPLE_COUNT);
  const minimumYRatio = options.minimumYRatio ?? DEFAULT_MINIMUM_Y_RATIO;
  const maximumYRatio = options.maximumYRatio ?? DEFAULT_MAXIMUM_Y_RATIO;
  const smoothnessPenalty = options.smoothnessPenalty ?? DEFAULT_SMOOTHNESS_PENALTY;
  const maximumStepRatio = options.maximumStepRatio ?? DEFAULT_MAXIMUM_STEP_RATIO;
  const sampleRadiusPx = Math.round(options.sampleRadiusPx ?? DEFAULT_SAMPLE_RADIUS_PX);

  if (!Number.isInteger(sampleCount) || sampleCount < 16 || sampleCount > 360) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı 16–360 yatay örnek kullanmalıdır.');
  }
  if (!finite(minimumYRatio) || !finite(maximumYRatio) || minimumYRatio < 0 || maximumYRatio > 1 || minimumYRatio >= maximumYRatio) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı düşey arama oranları geçersiz.');
  }
  if (!finite(smoothnessPenalty) || smoothnessPenalty < 0 || smoothnessPenalty > 20) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı yumuşaklık cezası geçersiz.');
  }
  if (!finite(maximumStepRatio) || maximumStepRatio <= 0 || maximumStepRatio > 0.5) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı maksimum adım oranı geçersiz.');
  }
  if (!Number.isInteger(sampleRadiusPx) || sampleRadiusPx < 1 || sampleRadiusPx > 12) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı örnek yarıçapı geçersiz.');
  }

  const minimumRow = clamp(Math.round(image.height * minimumYRatio), sampleRadiusPx * 2 + 1, image.height - 2);
  const maximumRow = clamp(Math.round(image.height * maximumYRatio), minimumRow + 1, image.height - sampleRadiusPx * 2 - 2);
  const rowCount = maximumRow - minimumRow + 1;
  if (rowCount < 2) {
    throw new PanoramaSkylineAssistError('Skyline yardımcı taslağı için yeterli düşey arama alanı kalmadı.');
  }

  const xPositions = Array.from({ length: sampleCount }, (_, index) =>
    clamp(Math.round(((index + 0.5) / sampleCount) * image.width - 0.5), 0, image.width - 1)
  );
  const gradients = xPositions.map((x) => {
    const scores = new Float64Array(rowCount);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      scores[rowIndex] = verticalColorGradient(image, x, minimumRow + rowIndex, sampleRadiusPx);
    }
    return scores;
  });

  const maximumStep = Math.max(2, Math.round(image.height * maximumStepRatio));
  let previousScores = new Float64Array(rowCount);
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = minimumRow + rowIndex;
    const centerPrior = Math.abs(row / image.height - 0.48) * 4;
    previousScores[rowIndex] = gradients[0]![rowIndex]! - centerPrior;
  }

  const backPointers: Int32Array[] = [];
  backPointers.push(new Int32Array(rowCount).fill(-1));
  for (let sampleIndex = 1; sampleIndex < sampleCount; sampleIndex += 1) {
    const currentScores = new Float64Array(rowCount);
    const pointers = new Int32Array(rowCount);
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const currentRow = minimumRow + rowIndex;
      const minimumPrevious = Math.max(0, rowIndex - maximumStep);
      const maximumPrevious = Math.min(rowCount - 1, rowIndex + maximumStep);
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestPrevious = rowIndex;
      for (let previousIndex = minimumPrevious; previousIndex <= maximumPrevious; previousIndex += 1) {
        const previousRow = minimumRow + previousIndex;
        const transition = smoothnessPenalty * Math.abs(currentRow - previousRow);
        const candidateScore = previousScores[previousIndex]! - transition;
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestPrevious = previousIndex;
        }
      }
      const centerPrior = Math.abs(currentRow / image.height - 0.48) * 4;
      currentScores[rowIndex] = bestScore + gradients[sampleIndex]![rowIndex]! - centerPrior;
      pointers[rowIndex] = bestPrevious;
    }
    previousScores = currentScores;
    backPointers.push(pointers);
  }

  let bestFinalIndex = 0;
  let bestFinalScore = previousScores[0]!;
  for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
    if (previousScores[rowIndex]! > bestFinalScore) {
      bestFinalScore = previousScores[rowIndex]!;
      bestFinalIndex = rowIndex;
    }
  }

  const pathRows = new Array<number>(sampleCount);
  let currentIndex = bestFinalIndex;
  for (let sampleIndex = sampleCount - 1; sampleIndex >= 0; sampleIndex -= 1) {
    pathRows[sampleIndex] = minimumRow + currentIndex;
    if (sampleIndex > 0) currentIndex = backPointers[sampleIndex]![currentIndex]!;
  }
  const smoothedRows = circularSmooth(pathRows, minimumRow, maximumRow);

  let gradientTotal = 0;
  let chosenToMaximumTotal = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const chosenIndex = clamp(smoothedRows[sampleIndex]! - minimumRow, 0, rowCount - 1);
    const chosen = gradients[sampleIndex]![chosenIndex]!;
    let maximum = gradients[sampleIndex]![0]!;
    for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
      maximum = Math.max(maximum, gradients[sampleIndex]![rowIndex]!);
    }
    gradientTotal += chosen;
    chosenToMaximumTotal += maximum <= 1e-9 ? 0 : chosen / maximum;
  }
  const meanChosenGradient = gradientTotal / sampleCount;
  const meanChoiceRatio = chosenToMaximumTotal / sampleCount;
  const gradientStrength = clamp(meanChosenGradient / 120, 0, 1);
  const confidence = clamp(meanChoiceRatio * 0.7 + gradientStrength * 0.3, 0, 1);
  const seamJumpPx = Math.abs(smoothedRows[0]! - smoothedRows[smoothedRows.length - 1]!);

  const warnings: string[] = [];
  if (confidence < 0.5) {
    warnings.push('Görüntüdeki gökyüzü/arazi kenarı zayıf veya karmaşık; yardımcı taslak mutlaka elle kontrol edilmelidir.');
  }
  if (seamJumpPx > maximumStep) {
    warnings.push('Panorama 0°/360° birleşiminde yardımcı skyline yolu keskin bir sıçrama gösteriyor; seam çevresi elle kontrol edilmelidir.');
  }

  return {
    algorithmId: PANORAMA_SKYLINE_ASSIST_ALGORITHM_ID,
    algorithmVersion: PANORAMA_SKYLINE_ASSIST_ALGORITHM_VERSION,
    marks: xPositions.map((xPx, index) => ({ xPx, yPx: smoothedRows[index]! })),
    confidence,
    meanChosenGradient,
    seamJumpPx,
    warnings
  };
}
