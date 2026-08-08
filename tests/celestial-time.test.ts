import { describe, expect, it } from 'vitest';
import {
  CelestialTimeError,
  formatLocalDateTime24,
  formatUtcOffset,
  instantIsoFromLocalDateTime,
  localDateTimeValueFromInstant
} from '../src/shared/celestial-time';

describe('celestial time helpers', () => {
  it('converts a local clock plus explicit offset to a reproducible UTC instant', () => {
    expect(instantIsoFromLocalDateTime('2026-08-08T21:30:00', 180))
      .toBe('2026-08-08T18:30:00.000Z');
  });

  it('round-trips an instant through the selected display offset', () => {
    const local = localDateTimeValueFromInstant('2026-08-08T18:30:00.000Z', 180);
    expect(local).toBe('2026-08-08T21:30:00');
    expect(instantIsoFromLocalDateTime(local, 180)).toBe('2026-08-08T18:30:00.000Z');
  });

  it('formats the selected instant as an explicit 24-hour local clock', () => {
    expect(formatLocalDateTime24('2026-08-08T20:06:28.642Z', 180))
      .toBe('08.08.2026 · 23:06:28');
  });

  it('formats fractional-hour UTC offsets without losing minutes', () => {
    expect(formatUtcOffset(330)).toBe('UTC+05:30');
    expect(formatUtcOffset(-210)).toBe('UTC-03:30');
  });

  it('rejects impossible dates and unsupported offsets', () => {
    expect(() => instantIsoFromLocalDateTime('2026-02-30T12:00:00', 0)).toThrow(CelestialTimeError);
    expect(() => instantIsoFromLocalDateTime('2026-08-08T12:00:00', 900)).toThrow(CelestialTimeError);
  });
});
