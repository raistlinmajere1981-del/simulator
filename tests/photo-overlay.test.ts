import { describe, expect, it } from 'vitest';
import { containedImagePointerToPixel } from '../src/simulation/photo-overlay';

describe('contained photo pointer mapping', () => {
  it('maps a centered pointer to natural image coordinates', () => {
    const point = containedImagePointerToPixel({
      containerWidthPx: 800,
      containerHeightPx: 600,
      imageWidthPx: 1600,
      imageHeightPx: 1200,
      pointerXPx: 400,
      pointerYPx: 300
    });
    expect(point?.xPx).toBeCloseTo(800, 8);
    expect(point?.yPx).toBeCloseTo(600, 8);
  });

  it('accounts for horizontal letterboxing', () => {
    const point = containedImagePointerToPixel({
      containerWidthPx: 1000,
      containerHeightPx: 500,
      imageWidthPx: 1000,
      imageHeightPx: 1000,
      pointerXPx: 500,
      pointerYPx: 250
    });
    expect(point?.xPx).toBeCloseTo(500, 8);
    expect(point?.yPx).toBeCloseTo(500, 8);

    expect(containedImagePointerToPixel({
      containerWidthPx: 1000,
      containerHeightPx: 500,
      imageWidthPx: 1000,
      imageHeightPx: 1000,
      pointerXPx: 100,
      pointerYPx: 250
    })).toBeNull();
  });

  it('accounts for vertical letterboxing', () => {
    expect(containedImagePointerToPixel({
      containerWidthPx: 500,
      containerHeightPx: 1000,
      imageWidthPx: 1000,
      imageHeightPx: 500,
      pointerXPx: 250,
      pointerYPx: 100
    })).toBeNull();
  });
});
