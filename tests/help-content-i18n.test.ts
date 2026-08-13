import { describe, expect, it } from 'vitest';
import {
  HELP_PANELS,
  HELP_TERMS,
  getHelpPanel,
  getHelpPanels,
  getHelpTerm,
  getHelpTerms,
  searchHelp
} from '../src/shared/help-content';

describe('contextual help localization', () => {
  it('preserves Turkish as the backward-compatible default', () => {
    expect(getHelpPanel('scenario-summary').title)
      .toBe('Aktif senaryo ve temel gözlem girdileri');
    expect(getHelpTerm('uncertainty')?.label).toBe('Belirsizlik');
    expect(getHelpPanels()).toBe(HELP_PANELS);
    expect(getHelpTerms()).toBe(HELP_TERMS);
  });

  it('provides English content with stable panel and term ids', () => {
    const panelsEn = getHelpPanels('en');
    const termsEn = getHelpTerms('en');

    expect(panelsEn.map((panel) => panel.id))
      .toEqual(HELP_PANELS.map((panel) => panel.id));
    expect(termsEn.map((term) => term.id))
      .toEqual(HELP_TERMS.map((term) => term.id));

    expect(getHelpPanel('scenario-summary', 'en').title)
      .toBe('Active scenario and core observation inputs');
    expect(getHelpTerm('uncertainty', 'en')?.label).toBe('Uncertainty');
  });

  it('keeps related-term topology and symbolic physical units language-invariant', () => {
    for (const panelTr of HELP_PANELS) {
      const panelEn = getHelpPanel(panelTr.id, 'en');
      expect(panelEn.relatedTerms).toEqual(panelTr.relatedTerms);
    }

    expect(getHelpPanel('scenario-summary', 'en').fields.map((field) => field.unit))
      .toEqual(getHelpPanel('scenario-summary', 'tr').fields.map((field) => field.unit));
    expect(getHelpPanel('photo-calibration', 'en').fields[2]?.unit).toBe('°');
    expect(getHelpPanel('photo-calibration', 'en').fields[3]?.unit).toBe('px');
  });

  it('searches the active-language help corpus', () => {
    const englishCamera = searchHelp('camera', 'en');
    expect(englishCamera.panels.some((panel) => panel.id === 'photo-calibration'))
      .toBe(true);
    expect(englishCamera.terms.some((term) => term.id === 'fov')).toBe(true);

    const turkishSun = searchHelp('güneş', 'tr');
    expect(turkishSun.panels.some((panel) => panel.id === 'solar-position'))
      .toBe(true);

    const englishUncertainty = searchHelp('uncertainty', 'en');
    expect(englishUncertainty.terms.some((term) => term.id === 'uncertainty'))
      .toBe(true);
  });

  it('returns the complete selected locale catalog for an empty query', () => {
    expect(searchHelp('  ', 'en').panels).toHaveLength(HELP_PANELS.length);
    expect(searchHelp('  ', 'en').terms).toHaveLength(HELP_TERMS.length);
  });
});
