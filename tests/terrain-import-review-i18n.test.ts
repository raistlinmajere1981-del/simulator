import { describe, expect, it } from 'vitest';
import {
  demDiagnosticLabel,
  terrainNumberFormatter
} from '../src/renderer/src/terrain-editor-view-model';
import { translate } from '../src/renderer/src/i18n';

describe('terrain import-review localization', () => {
  it('localizes mapping and staged-import presentation', () => {
    expect(translate('tr', 'terrain.import.mappingRequired')).toBe('CSV SÜTUNLARINI SEÇ');
    expect(translate('en', 'terrain.import.mappingRequired')).toBe('SELECT CSV COLUMNS');
    expect(translate('en', 'terrain.import.replacesPoints', { count: 4 }))
      .toBe('The file points will replace the current 4 intermediate points.');
    expect(translate('en', 'terrain.import.applyProfile')).toBe('Apply terrain profile');
  });

  it('maps DEM diagnostics at the renderer boundary', () => {
    const status = 'caution' as const;
    expect(demDiagnosticLabel('tr', status)).toBe('dikkat');
    expect(demDiagnosticLabel('en', status)).toBe('caution');
    expect(status).toBe('caution');
  });

  it('uses the active locale for human numeric formatting', () => {
    expect(terrainNumberFormatter('tr').format(1234.5)).toBe('1.234,5');
    expect(terrainNumberFormatter('en').format(1234.5)).toBe('1,234.5');
  });

  it('localizes DEM traceability and line-of-sight labels', () => {
    expect(translate('en', 'terrain.demReview.trace.complete'))
      .toBe('COMPLETE SOURCE TRACE');
    expect(translate('en', 'terrain.demReview.blockedBadge')).toBe('BLOCKED');
    expect(translate('en', 'terrain.demReview.geometryStandard'))
      .toBe('effective radius / standard refraction');
  });
});
