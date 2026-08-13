import { describe, expect, it } from 'vitest';
import {
  getSolarSeasonEventLabel,
  getSolarSeasonObserverLabel,
  getSolarThresholdStateLabel
} from '../src/renderer/src/astronomy-result-presentation';
import { translate } from '../src/renderer/src/i18n';

describe('solar-cycle localization', () => {
  it('localizes solar threshold state without changing the state id', () => {
    const state = 'continuous-above' as const;
    expect(getSolarThresholdStateLabel('tr', state)).toBe('24 SAAT EŞİK ÜSTÜ');
    expect(getSolarThresholdStateLabel('en', state)).toBe('24 HOURS ABOVE THRESHOLD');
    expect(state).toBe('continuous-above');
  });

  it('localizes season event and observer-season presentation from stable event kind', () => {
    const kind = 'march-equinox' as const;
    expect(getSolarSeasonEventLabel('en', kind)).toBe('March equinox');
    expect(getSolarSeasonObserverLabel('en', kind, 41)).toBe('Start of spring');
    expect(getSolarSeasonObserverLabel('en', kind, -33)).toBe('Start of autumn');
    expect(kind).toBe('march-equinox');
  });

  it('localizes daily, solar-time and route shell labels', () => {
    expect(translate('en', 'solar.day.title')).toBe('Sunrise, sunset and solar noon');
    expect(translate('en', 'solar.time.civilClock')).toBe('CIVIL CLOCK');
    expect(translate('en', 'solar.route.moveEndEast')).toBe('Move B 30° east');
  });
});
