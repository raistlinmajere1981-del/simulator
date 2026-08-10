import { describe, expect, it } from 'vitest';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import {
  PORTABLE_EXPERIMENT_SCHEMA_VERSION,
  createPortableExperimentFile,
  parsePortableExperimentFile
} from '../src/shared/portable';
import { BRIGHT_STAR_CATALOG } from '../src/simulation/bright-star-catalog';
import {
  BSC5P_FIXED_WIDTH_RECORD_LENGTH
} from '../src/simulation/bsc5p-fixed-width';
import { buildVerifiedBrightStarMotionSubset } from '../src/simulation/bsc5p-motion-subset';
import {
  savedStellarMotionSourceFromVerifiedSubset,
  verifiedMotionSubsetFromSavedSource,
  StellarMotionSourceError
} from '../src/simulation/stellar-motion-source';

function put(line: string[], startByte: number, endByte: number, value: string): void {
  const width = endByte - startByte + 1;
  if (value.length > width) throw new Error(`fixture değeri ${width} karaktere sığmıyor: ${value}`);
  const padded = value.padStart(width, ' ');
  for (let index = 0; index < width; index += 1) line[startByte - 1 + index] = padded[index] ?? ' ';
}

function raParts(rightAscensionDeg: number): { hours: number; minutes: number; seconds: number } {
  const tenthSecondsPerDay = 24 * 60 * 60 * 10;
  let totalTenths = Math.round((rightAscensionDeg / 15) * 3600 * 10) % tenthSecondsPerDay;
  if (totalTenths < 0) totalTenths += tenthSecondsPerDay;
  const hours = Math.floor(totalTenths / 36_000);
  totalTenths -= hours * 36_000;
  const minutes = Math.floor(totalTenths / 600);
  totalTenths -= minutes * 600;
  return { hours, minutes, seconds: totalTenths / 10 };
}

function decParts(declinationDeg: number): {
  sign: '+' | '-'; degrees: number; minutes: number; seconds: number;
} {
  const sign: '+' | '-' = declinationDeg < 0 ? '-' : '+';
  let totalSeconds = Math.round(Math.abs(declinationDeg) * 3600);
  const degrees = Math.floor(totalSeconds / 3600);
  totalSeconds -= degrees * 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  return { sign, degrees, minutes, seconds };
}

function sourceLine(starIndex: number): string {
  const star = BRIGHT_STAR_CATALOG[starIndex];
  if (!star) throw new Error(`fixture yıldızı yok: ${starIndex}`);
  const line = Array<string>(BSC5P_FIXED_WIDTH_RECORD_LENGTH).fill(' ');
  const ra = raParts(star.rightAscensionJ2000Deg);
  const dec = decParts(star.declinationJ2000Deg);
  const pmRa = (starIndex + 1) * 0.001;
  const pmDec = -(starIndex + 1) * 0.0015;
  put(line, 1, 4, String(star.hrNumber));
  put(line, 5, 14, star.commonName.slice(0, 10));
  put(line, 76, 77, String(ra.hours));
  put(line, 78, 79, String(ra.minutes));
  put(line, 80, 83, ra.seconds.toFixed(1));
  put(line, 84, 84, dec.sign);
  put(line, 85, 86, String(dec.degrees));
  put(line, 87, 88, String(dec.minutes));
  put(line, 89, 90, String(dec.seconds));
  put(line, 103, 107, star.visualMagnitude.toFixed(2));
  put(line, 149, 154, pmRa.toFixed(3));
  put(line, 155, 160, pmDec.toFixed(3));
  return line.join('');
}

function validSource() {
  const catalogText = `${BRIGHT_STAR_CATALOG.map((_, index) => sourceLine(index)).join('\n')}\n`;
  const subset = buildVerifiedBrightStarMotionSubset(catalogText);
  return savedStellarMotionSourceFromVerifiedSubset({
    subset,
    fileName: 'catalog',
    importedAtIso: '2026-08-10T00:00:00.000Z',
    fileSizeBytes: 1_804_000,
    sha256: 'a'.repeat(64)
  });
}

function experimentWithMotionSource(): SavedExperiment {
  return {
    id: 'stellar-motion-portable',
    name: 'Proper Motion Kaynak Testi',
    createdAtIso: '2026-08-10T00:00:00.000Z',
    updatedAtIso: '2026-08-10T00:00:00.000Z',
    observedAtIso: '2026-08-10T00:00:00.000Z',
    observationUtcOffsetMinutes: 180,
    scenarioId: 'stellar-observation',
    stellarMotionSource: validSource(),
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    manualTerrainPoints: [],
    modelVersions: {},
    predictions: []
  };
}

describe('stellar proper-motion source persistence', () => {
  it('revalidates all 19 persisted source rows into the canonical subset', () => {
    const source = validSource();
    const subset = verifiedMotionSubsetFromSavedSource(source);
    expect(source.entryCount).toBe(19);
    expect(subset.entries).toHaveLength(19);
    expect(subset.entries.map((entry) => entry.starId)).toEqual(BRIGHT_STAR_CATALOG.map((star) => star.id));
  });

  it('rejects an edited persisted PM value even when the source row is unchanged', () => {
    const source = validSource();
    source.entries[0] = {
      ...source.entries[0]!,
      properMotionRaStarArcsecPerYear: source.entries[0]!.properMotionRaStarArcsecPerYear + 0.1
    };
    expect(() => verifiedMotionSubsetFromSavedSource(source)).toThrow(StellarMotionSourceError);
  });

  it('rejects a changed source row instead of trusting copied numeric fields', () => {
    const source = validSource();
    const line = source.entries[0]!.sourceRecord.split('');
    const replacement = ' 0.101';
    for (let index = 0; index < replacement.length; index += 1) line[148 + index] = replacement[index]!;
    source.entries[0] = { ...source.entries[0]!, sourceRecord: line.join('') };
    expect(() => verifiedMotionSubsetFromSavedSource(source)).toThrow();
  });

  it('round-trips the verified source through current portable schema v10', () => {
    const portable = createPortableExperimentFile(
      experimentWithMotionSource(),
      '1.19.0',
      '2026-08-10T00:01:00.000Z'
    );
    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(10);
    expect(portable.schemaVersion).toBe(10);
    const parsed = parsePortableExperimentFile(JSON.parse(JSON.stringify(portable)));
    expect(parsed.sourceVersion).toBe(10);
    expect(parsed.migrated).toBe(false);
    expect(parsed.experiment.stellarMotionSource?.entryCount).toBe(19);
    expect(parsed.experiment.stellarMotionSource?.sha256).toBe('a'.repeat(64));
    expect(verifiedMotionSubsetFromSavedSource(parsed.experiment.stellarMotionSource!).entries).toHaveLength(19);
  });

  it('rejects portable tampering of a verified motion value', () => {
    const portable = createPortableExperimentFile(experimentWithMotionSource(), '1.19.0');
    const raw = JSON.parse(JSON.stringify(portable));
    raw.experiment.stellarMotionSource.entries[2].properMotionDecArcsecPerYear += 0.2;
    expect(() => parsePortableExperimentFile(raw)).toThrow('eksik, bozuk');
  });
});
