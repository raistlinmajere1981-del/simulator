import type { LunarPhaseName } from '../../simulation/lunar-position';
import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';
import { translate, type AppLocale, type TranslationKey } from './i18n';

const lunarPhaseKeys: Record<LunarPhaseName, TranslationKey> = {
  'Yeni Ay': 'lunar.phase.newMoon',
  'Büyüyen Hilal': 'lunar.phase.waxingCrescent',
  'İlk Dördün': 'lunar.phase.firstQuarter',
  'Büyüyen Şişkin Ay': 'lunar.phase.waxingGibbous',
  Dolunay: 'lunar.phase.fullMoon',
  'Küçülen Şişkin Ay': 'lunar.phase.waningGibbous',
  'Son Dördün': 'lunar.phase.lastQuarter',
  'Küçülen Hilal': 'lunar.phase.waningCrescent'
};

const eclipseGeometryKeys: Record<SolarEclipseInstantGeometryClass, TranslationKey> = {
  'no-overlap': 'eclipse.geometry.none',
  'partial-overlap': 'eclipse.geometry.partial',
  'total-type-contained': 'eclipse.geometry.totalContained',
  'annular-type-contained': 'eclipse.geometry.annularContained'
};

const eclipseGeometryFullKeys: Record<SolarEclipseInstantGeometryClass, TranslationKey> = {
  'no-overlap': 'eclipse.geometryFull.none',
  'partial-overlap': 'eclipse.geometryFull.partial',
  'total-type-contained': 'eclipse.geometryFull.totalContained',
  'annular-type-contained': 'eclipse.geometryFull.annularContained'
};

export function getLunarPhaseLabel(locale: AppLocale, phase: LunarPhaseName): string {
  return translate(locale, lunarPhaseKeys[phase]);
}

export function getEclipseGeometryLabel(
  locale: AppLocale,
  geometryClass: SolarEclipseInstantGeometryClass
): string {
  return translate(locale, eclipseGeometryKeys[geometryClass]);
}

export function getEclipseGeometryFullLabel(
  locale: AppLocale,
  geometryClass: SolarEclipseInstantGeometryClass
): string {
  return translate(locale, eclipseGeometryFullKeys[geometryClass]);
}
