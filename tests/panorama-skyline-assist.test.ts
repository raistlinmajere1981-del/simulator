import { describe, expect, it } from 'vitest';
import {
  PANORAMA_SKYLINE_ASSIST_ALGORITHM_ID,
  PANORAMA_SKYLINE_ASSIST_ALGORITHM_VERSION,
  PanoramaSkylineAssistError,
  suggestPanoramaSkyline
} from '../src/simulation/panorama-skyline-assist';

function syntheticSkylineImage(width: number, height: number): {
  data: Uint8ClampedArray;
  expectedY(x: number): number;
} {
  const data = new Uint8ClampedArray(width * height * 4);
  const expectedY = (x: number): number =>
    Math.round(height * (0.47 + 0.08 * Math.sin((x / width) * Math.PI * 4)));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const sky = y < expectedY(x);
      data[index] = sky ? 91 : 39;
      data[index + 1] = sky ? 161 : 70;
      data[index + 2] = sky ? 207 : 57;
      data[index + 3] = 255;
    }
  }
  return { data, expectedY };
}

describe('panorama skyline assist', () => {
  it('follows a strong synthetic sky/terrain boundary without claiming authority', () => {
    const width = 320;
    const height = 160;
    const image = syntheticSkylineImage(width, height);
    const result = suggestPanoramaSkyline({ width, height, data: image.data }, { sampleCount: 64 });

    expect(result.algorithmId).toBe(PANORAMA_SKYLINE_ASSIST_ALGORITHM_ID);
    expect(result.algorithmVersion).toBe(PANORAMA_SKYLINE_ASSIST_ALGORITHM_VERSION);
    expect(result.marks).toHaveLength(64);
    const meanAbsoluteError = result.marks.reduce((total, mark) =>
      total + Math.abs(mark.yPx - image.expectedY(mark.xPx)), 0) / result.marks.length;
    expect(meanAbsoluteError).toBeLessThan(5);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('keeps marks ordered across the panorama width', () => {
    const width = 240;
    const height = 120;
    const image = syntheticSkylineImage(width, height);
    const result = suggestPanoramaSkyline({ width, height, data: image.data }, { sampleCount: 48 });

    for (let index = 1; index < result.marks.length; index += 1) {
      expect(result.marks[index]!.xPx).toBeGreaterThan(result.marks[index - 1]!.xPx);
    }
    expect(result.marks.every((mark) => mark.yPx >= 0 && mark.yPx < height)).toBe(true);
  });

  it('rejects malformed pixel buffers', () => {
    expect(() => suggestPanoramaSkyline({
      width: 64,
      height: 32,
      data: new Uint8ClampedArray(10)
    })).toThrow(PanoramaSkylineAssistError);
  });

  it('rejects unsafe sample counts', () => {
    const image = syntheticSkylineImage(64, 32);
    expect(() => suggestPanoramaSkyline({ width: 64, height: 32, data: image.data }, {
      sampleCount: 8
    })).toThrow('16–360');
  });
});
