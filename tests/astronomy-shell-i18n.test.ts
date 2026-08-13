import { describe, expect, it } from 'vitest';
import { appLocaleTag, translate } from '../src/renderer/src/i18n';
import { getScenarioPresentation } from '../src/renderer/src/app/app-config';

describe('astronomy shell localization', () => {
  it('localizes the astronomy time-card shell while keeping UTC terminology stable', () => {
    expect(translate('tr', 'time.title')).toBe('Zaman ve tarih');
    expect(translate('en', 'time.title')).toBe('Time and date');
    expect(translate('en', 'time.utcOffset')).toBe('UTC offset');
    expect(appLocaleTag('tr')).toBe('tr-TR');
    expect(appLocaleTag('en')).toBe('en-US');
  });

  it('interpolates the exact local-time accessibility label', () => {
    expect(translate('en', 'time.exactAria', { time: '2026-08-13 14:00:00', offset: 'UTC+03:00' }))
      .toBe('Exact 24-hour local observation time 2026-08-13 14:00:00 UTC+03:00');
  });

  it('uses localized scenario presentation for astronomy summary fallbacks', () => {
    expect(getScenarioPresentation('en', 'sun-moon-observation').label).toBe('Sun and Moon Observations');
    expect(getScenarioPresentation('en', 'shadow-observation').label).toBe('Shadow Experiment');
    expect(getScenarioPresentation('en', 'stellar-observation').label).toBe('Stellar Observations');
    expect(getScenarioPresentation('en', 'eclipse-simulation').label).toBe('Eclipse Simulations');
  });
});
