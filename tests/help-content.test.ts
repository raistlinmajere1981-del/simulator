import { describe, expect, it } from 'vitest';
import { HELP_PANELS, HELP_TERMS, getHelpPanel, searchHelp } from '../src/shared/help-content';

describe('contextual help registry', () => {
  it('keeps panel and term identifiers unique', () => {
    expect(new Set(HELP_PANELS.map((panel) => panel.id)).size).toBe(HELP_PANELS.length);
    expect(new Set(HELP_TERMS.map((term) => term.id)).size).toBe(HELP_TERMS.length);
  });

  it('covers the major laboratory panels from one registry', () => {
    expect(getHelpPanel('scenario-summary').title).toContain('senaryo');
    expect(getHelpPanel('atmosphere').relatedTerms).toContain('ciddor');
    expect(getHelpPanel('terrain-datum').relatedTerms).toContain('dem');
    expect(getHelpPanel('photo-calibration').relatedTerms).toContain('fov');
    expect(getHelpPanel('model-uncertainty').commonMistakes.join(' ')).toContain('Boş alan');
    expect(getHelpPanel('data-manager').summary).toContain('.ggl.json');
  });

  it('searches both panel content and the shared glossary', () => {
    const dem = searchHelp('DEM');
    expect(dem.panels.some((panel) => panel.id === 'terrain-datum')).toBe(true);
    expect(dem.terms.some((term) => term.id === 'dem')).toBe(true);

    const fov = searchHelp('FOV');
    expect(fov.panels.some((panel) => panel.id === 'photo-calibration')).toBe(true);
    expect(fov.terms.some((term) => term.id === 'fov')).toBe(true);
  });

  it('returns the full catalog for an empty query', () => {
    const all = searchHelp('   ');
    expect(all.panels).toHaveLength(HELP_PANELS.length);
    expect(all.terms).toHaveLength(HELP_TERMS.length);
  });
});
