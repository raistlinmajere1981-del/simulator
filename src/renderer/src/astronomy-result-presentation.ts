import type { LunarPhaseName } from '../../simulation/lunar-position';
import type { SolarEclipseInstantGeometryClass } from '../../simulation/solar-eclipse-overlap';
import type { SolarThresholdState } from '../../simulation/solar-day-events';
import type { SolarSeasonEventKind } from '../../simulation/solar-season-events';
import type { StellarPanoramaMarkingMethod, StellarPanoramaMetadataStatus } from '../../shared/stellar-local-horizon-import';
import type { StellarLocalHorizonSettingKey, StellarObservationResult } from '../../simulation/stellar-observation';
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

const solarThresholdStateKeys: Record<SolarThresholdState, TranslationKey> = {
  normal: 'solar.day.state.normal',
  'continuous-above': 'solar.day.state.continuousAbove',
  'continuous-below': 'solar.day.state.continuousBelow',
  grazing: 'solar.day.state.grazing'
};

const solarSeasonEventKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.event.marchEquinox',
  'june-solstice': 'solar.season.event.juneSolstice',
  'september-equinox': 'solar.season.event.septemberEquinox',
  'december-solstice': 'solar.season.event.decemberSolstice'
};

const northernSeasonKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.springStart',
  'june-solstice': 'solar.season.summerStart',
  'september-equinox': 'solar.season.autumnStart',
  'december-solstice': 'solar.season.winterStart'
};

const southernSeasonKeys: Record<SolarSeasonEventKind, TranslationKey> = {
  'march-equinox': 'solar.season.autumnStart',
  'june-solstice': 'solar.season.winterStart',
  'september-equinox': 'solar.season.springStart',
  'december-solstice': 'solar.season.summerStart'
};

const stellarHorizonClassKeys: Record<StellarObservationResult['position']['horizonClass'], TranslationKey> = {
  'circumpolar-above': 'stellar.horizon.circumpolarAbove',
  'rises-and-sets': 'stellar.horizon.risesSets',
  'never-rises': 'stellar.horizon.neverRises',
  'grazes-horizon': 'stellar.horizon.grazes'
};

const stellarLocalHorizonDirectionKeys: Record<StellarLocalHorizonSettingKey, TranslationKey> = {
  localHorizonNorthDeg: 'stellar.direction.north',
  localHorizonNorthEastDeg: 'stellar.direction.northEast',
  localHorizonEastDeg: 'stellar.direction.east',
  localHorizonSouthEastDeg: 'stellar.direction.southEast',
  localHorizonSouthDeg: 'stellar.direction.south',
  localHorizonSouthWestDeg: 'stellar.direction.southWest',
  localHorizonWestDeg: 'stellar.direction.west',
  localHorizonNorthWestDeg: 'stellar.direction.northWest'
};

export function getStellarHorizonClassLabel(
  locale: AppLocale,
  horizonClass: StellarObservationResult['position']['horizonClass']
): string {
  return translate(locale, stellarHorizonClassKeys[horizonClass]);
}

export function getStellarLocalHorizonDirectionLabel(
  locale: AppLocale,
  key: StellarLocalHorizonSettingKey
): string {
  return translate(locale, stellarLocalHorizonDirectionKeys[key]);
}

export function getStellarPanoramaMetadataStatusLabel(
  locale: AppLocale,
  status: StellarPanoramaMetadataStatus,
  metadataScaledToImage: boolean,
  projectionType?: string
): string {
  if (status === 'complete') {
    return translate(locale, metadataScaledToImage
      ? 'stellar.panorama.metadata.completeScaled'
      : 'stellar.panorama.metadata.complete');
  }
  if (status === 'incomplete') return translate(locale, 'stellar.panorama.metadata.incomplete');
  if (status === 'unsupported-projection') {
    return translate(locale, 'stellar.panorama.metadata.unsupportedProjection', {
      projection: projectionType ? ` (${projectionType})` : ''
    });
  }
  if (status === 'incompatible-scale') return translate(locale, 'stellar.panorama.metadata.incompatibleScale');
  return translate(locale, 'stellar.panorama.metadata.absent');
}

const stellarPanoramaMarkingMethodKeys: Record<StellarPanoramaMarkingMethod, TranslationKey> = {
  manual: 'stellar.panorama.marking.manual',
  'assisted-gradient-v1': 'stellar.panorama.marking.assisted',
  'assisted-gradient-v1-edited': 'stellar.panorama.marking.assistedEdited'
};

export function getStellarPanoramaMarkingMethodLabel(
  locale: AppLocale,
  method: StellarPanoramaMarkingMethod
): string {
  return translate(locale, stellarPanoramaMarkingMethodKeys[method]);
}

export function getSolarThresholdStateLabel(locale: AppLocale, state: SolarThresholdState): string {
  return translate(locale, solarThresholdStateKeys[state]);
}

export function getSolarSeasonEventLabel(locale: AppLocale, kind: SolarSeasonEventKind): string {
  return translate(locale, solarSeasonEventKeys[kind]);
}

export function getSolarSeasonObserverLabel(
  locale: AppLocale,
  kind: SolarSeasonEventKind,
  latitudeDeg: number
): string {
  const north = translate(locale, northernSeasonKeys[kind]);
  const south = translate(locale, southernSeasonKeys[kind]);
  if (Math.abs(latitudeDeg) < 1e-9) return `${north} / ${south}`;
  return latitudeDeg > 0 ? north : south;
}
