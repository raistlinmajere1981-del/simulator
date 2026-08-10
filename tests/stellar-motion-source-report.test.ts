import { describe, expect, it } from 'vitest';
import { createExperimentHtmlReport } from '../src/report/html-report';
import { DEFAULT_SIMULATOR_INPUTS, type SavedExperiment } from '../src/shared/simulator';
import type { SavedStellarMotionSource } from '../src/shared/stellar-motion-source';

const source: SavedStellarMotionSource = {
  fileName: 'catalog',
  importedAtIso: '2026-08-10T00:00:00.000Z',
  fileSizeBytes: 1_804_000,
  sha256: 'b'.repeat(64),
  subsetId: 'bsc5p-bright-star-motion-subset',
  subsetVersion: '0.1.0',
  sourceCatalog: 'CDS V/50 · Bright Star Catalogue, 5th Revised Edition',
  sourceFormatId: 'cds-v50-fixed-width',
  sourceFormatVersion: '0.1.0',
  sourceEpochJulianYear: 2000,
  sourceFrame: 'fk5-j2000',
  entryCount: 19,
  entries: [],
  modifiedAfterImport: false
};

function reportExperiment(): SavedExperiment {
  return {
    id: 'motion-report',
    name: 'Proper Motion Raporu',
    createdAtIso: '2026-08-10T00:00:00.000Z',
    updatedAtIso: '2026-08-10T00:00:00.000Z',
    observedAtIso: '2026-08-10T00:00:00.000Z',
    scenarioId: 'stellar-observation',
    stellarMotionSource: source,
    inputs: { ...DEFAULT_SIMULATOR_INPUTS },
    manualTerrainPoints: [],
    modelVersions: {},
    predictions: []
  };
}

describe('stellar proper-motion report provenance', () => {
  it('renders verified BSC5P source identity, epoch and full-file integrity', () => {
    const html = createExperimentHtmlReport(reportExperiment(), '2026-08-10T00:01:00.000Z');
    expect(html).toContain('Yıldız proper-motion kaynak provenansı');
    expect(html).toContain('catalog');
    expect(html).toContain('CDS V/50');
    expect(html).toContain('bsc5p-bright-star-motion-subset@0.1.0');
    expect(html).toContain('FK5 / J2.000');
    expect(html).toContain('19/19 doğrulandı');
    expect(html).toContain('b'.repeat(64));
    expect(html).toContain('19 sabit-genişlik kaynak satırını');
  });
});
