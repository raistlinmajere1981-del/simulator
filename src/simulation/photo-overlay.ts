import type { PixelPoint } from '../shared/photo-calibration';

export interface ContainedImageMappingInput {
  containerWidthPx: number;
  containerHeightPx: number;
  imageWidthPx: number;
  imageHeightPx: number;
  pointerXPx: number;
  pointerYPx: number;
}

/** Maps a pointer in an object-fit: contain viewport to natural image pixels. */
export function containedImagePointerToPixel(
  input: ContainedImageMappingInput
): PixelPoint | null {
  const values = [
    input.containerWidthPx,
    input.containerHeightPx,
    input.imageWidthPx,
    input.imageHeightPx,
    input.pointerXPx,
    input.pointerYPx
  ];
  if (!values.every(Number.isFinite) ||
    input.containerWidthPx <= 0 || input.containerHeightPx <= 0 ||
    input.imageWidthPx <= 0 || input.imageHeightPx <= 0) {
    throw new RangeError('Görüntü/pointer eşleme boyutları geçerli ve pozitif olmalı.');
  }

  const scale = Math.min(
    input.containerWidthPx / input.imageWidthPx,
    input.containerHeightPx / input.imageHeightPx
  );
  const renderedWidth = input.imageWidthPx * scale;
  const renderedHeight = input.imageHeightPx * scale;
  const offsetX = (input.containerWidthPx - renderedWidth) / 2;
  const offsetY = (input.containerHeightPx - renderedHeight) / 2;

  if (input.pointerXPx < offsetX || input.pointerXPx > offsetX + renderedWidth ||
    input.pointerYPx < offsetY || input.pointerYPx > offsetY + renderedHeight) {
    return null;
  }

  const xPx = (input.pointerXPx - offsetX) / scale;
  const yPx = (input.pointerYPx - offsetY) / scale;
  return {
    xPx: Math.min(input.imageWidthPx - 1, Math.max(0, xPx)),
    yPx: Math.min(input.imageHeightPx - 1, Math.max(0, yPx))
  };
}
