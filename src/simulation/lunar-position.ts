import type { CalculationTrace } from '../shared/domain';
import type { SolarPositionResult } from './solar-position';

export const LUNAR_POSITION_ALGORITHM_ID = 'lunar-position-low-precision';
export const LUNAR_POSITION_ALGORITHM_VERSION = '0.1.0';

export type LunarPhaseName =
  | 'Yeni Ay'
  | 'Büyüyen Hilal'
  | 'İlk Dördün'
  | 'Büyüyen Şişkin Ay'
  | 'Dolunay'
  | 'Küçülen Şişkin Ay'
  | 'Son Dördün'
  | 'Küçülen Hilal';

export interface LunarPositionInput {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  solarPosition: SolarPositionResult;
}

export interface LunarPositionResult {
  observedAtIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  julianDay: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  elevationDeg: number;
  azimuthDeg: number;
  distanceKm: number;
  horizontalParallaxDeg: number;
  elongationDeg: number;
  phaseAngleDeg: number;
  illuminatedFraction: number;
  phaseCycleDeg: number;
  phaseAgeDays: number;
  phaseName: LunarPhaseName;
  traceId: string;
  trace: CalculationTrace;
}

export class LunarPositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LunarPositionError';
  }
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;
const EARTH_FLATTENING_FACTOR = 0.99664719;
const SYNODIC_MONTH_DAYS = 29.530588853;

const rad = (value: number): number => value * D2R;
const deg = (value: number): number => value * R2D;
const norm = (value: number): number => ((value % 360) + 360) % 360;
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const sin = (value: number): number => Math.sin(rad(value));
const cos = (value: number): number => Math.cos(rad(value));

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function format(value: number, digits = 6): string {
  return value.toLocaleString('tr-TR', { maximumFractionDigits: digits });
}

function lunarPhaseName(cycleDeg: number): LunarPhaseName {
  const phase = norm(cycleDeg);
  if (phase < 22.5 || phase >= 337.5) return 'Yeni Ay';
  if (phase < 67.5) return 'Büyüyen Hilal';
  if (phase < 112.5) return 'İlk Dördün';
  if (phase < 157.5) return 'Büyüyen Şişkin Ay';
  if (phase < 202.5) return 'Dolunay';
  if (phase < 247.5) return 'Küçülen Şişkin Ay';
  if (phase < 292.5) return 'Son Dördün';
  return 'Küçülen Hilal';
}

/**
 * Truncated analytical lunar reference with principal periodic corrections and
 * topocentric horizontal-parallax correction. This is deliberately labelled
 * low precision; it is not a replacement for a JPL DE/Horizons ephemeris.
 */
export function calculateLunarPosition(input: LunarPositionInput): LunarPositionResult {
  if (!hasExplicitTimezone(input.observedAtIso)) {
    throw new LunarPositionError('Gözlem zamanı açık saat dilimi (Z veya ±SS:dd) içermelidir.');
  }
  const instant = new Date(input.observedAtIso);
  if (Number.isNaN(instant.getTime())) throw new LunarPositionError('Gözlem zamanı geçersiz.');
  if (!Number.isFinite(input.latitudeDeg) || input.latitudeDeg < -90 || input.latitudeDeg > 90) {
    throw new LunarPositionError('Enlem -90° ile +90° arasında olmalıdır.');
  }
  if (!Number.isFinite(input.longitudeDeg) || input.longitudeDeg < -180 || input.longitudeDeg > 180) {
    throw new LunarPositionError('Boylam -180° ile +180° arasında olmalıdır.');
  }

  const observedAtIso = instant.toISOString();
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5;
  const days = julianDay - 2_451_543.5;
  const nodeDeg = norm(125.1228 - 0.0529538083 * days);
  const inclinationDeg = 5.1454;
  const periapsisDeg = norm(318.0634 + 0.1643573223 * days);
  const meanAnomalyDeg = norm(115.3654 + 13.0649929509 * days);
  const solarMeanAnomalyDeg = norm(356.0470 + 0.9856002585 * days);
  const eccentricity = 0.0549;
  const semiMajorEarthRadii = 60.2666;

  let eccentricAnomalyDeg = meanAnomalyDeg + R2D * eccentricity * sin(meanAnomalyDeg) * (1 + eccentricity * cos(meanAnomalyDeg));
  for (let index = 0; index < 8; index += 1) {
    const eRad = rad(eccentricAnomalyDeg);
    const correction = (eccentricAnomalyDeg - R2D * eccentricity * Math.sin(eRad) - meanAnomalyDeg) /
      (1 - eccentricity * Math.cos(eRad));
    eccentricAnomalyDeg -= correction;
    if (Math.abs(correction) < 1e-8) break;
  }

  const xOrbit = semiMajorEarthRadii * (cos(eccentricAnomalyDeg) - eccentricity);
  const yOrbit = semiMajorEarthRadii * Math.sqrt(1 - eccentricity * eccentricity) * sin(eccentricAnomalyDeg);
  const trueAnomalyDeg = norm(deg(Math.atan2(yOrbit, xOrbit)));
  let distanceEarthRadii = Math.hypot(xOrbit, yOrbit);
  const lunarMeanLongitudeDeg = norm(nodeDeg + periapsisDeg + meanAnomalyDeg);
  const solarLongitudeDeg = norm(input.solarPosition.apparentSolarLongitudeDeg);
  const elongationArgumentDeg = norm(lunarMeanLongitudeDeg - solarLongitudeDeg);
  const argumentLatitudeDeg = norm(lunarMeanLongitudeDeg - nodeDeg);

  let eclipticLongitudeDeg = norm(nodeDeg + deg(Math.atan2(
    Math.sin(rad(trueAnomalyDeg + periapsisDeg)) * cos(inclinationDeg),
    Math.cos(rad(trueAnomalyDeg + periapsisDeg))
  )));
  let eclipticLatitudeDeg = deg(Math.asin(Math.sin(rad(trueAnomalyDeg + periapsisDeg)) * sin(inclinationDeg)));

  eclipticLongitudeDeg = norm(eclipticLongitudeDeg
    - 1.274 * sin(meanAnomalyDeg - 2 * elongationArgumentDeg)
    + 0.658 * sin(2 * elongationArgumentDeg)
    - 0.186 * sin(solarMeanAnomalyDeg)
    - 0.059 * sin(2 * meanAnomalyDeg - 2 * elongationArgumentDeg)
    - 0.057 * sin(meanAnomalyDeg - 2 * elongationArgumentDeg + solarMeanAnomalyDeg)
    + 0.053 * sin(meanAnomalyDeg + 2 * elongationArgumentDeg)
    + 0.046 * sin(2 * elongationArgumentDeg - solarMeanAnomalyDeg)
    + 0.041 * sin(meanAnomalyDeg - solarMeanAnomalyDeg)
    - 0.035 * sin(elongationArgumentDeg)
    - 0.031 * sin(meanAnomalyDeg + solarMeanAnomalyDeg)
    - 0.015 * sin(2 * argumentLatitudeDeg - 2 * elongationArgumentDeg)
    + 0.011 * sin(meanAnomalyDeg - 4 * elongationArgumentDeg));
  eclipticLatitudeDeg +=
    -0.173 * sin(argumentLatitudeDeg - 2 * elongationArgumentDeg)
    - 0.055 * sin(meanAnomalyDeg - argumentLatitudeDeg - 2 * elongationArgumentDeg)
    - 0.046 * sin(meanAnomalyDeg + argumentLatitudeDeg - 2 * elongationArgumentDeg)
    + 0.033 * sin(argumentLatitudeDeg + 2 * elongationArgumentDeg)
    + 0.017 * sin(2 * meanAnomalyDeg + argumentLatitudeDeg);
  distanceEarthRadii += -0.58 * cos(meanAnomalyDeg - 2 * elongationArgumentDeg) - 0.46 * cos(2 * elongationArgumentDeg);

  const centuries = (julianDay - 2_451_545) / 36_525;
  const obliquityDeg = 23.439291 - 0.0130042 * centuries;
  const lonRad = rad(eclipticLongitudeDeg);
  const latRad = rad(eclipticLatitudeDeg);
  const oblRad = rad(obliquityDeg);
  const xEcl = distanceEarthRadii * Math.cos(latRad) * Math.cos(lonRad);
  const yEcl = distanceEarthRadii * Math.cos(latRad) * Math.sin(lonRad);
  const zEcl = distanceEarthRadii * Math.sin(latRad);
  const xEq = xEcl;
  const yEq = yEcl * Math.cos(oblRad) - zEcl * Math.sin(oblRad);
  const zEq = yEcl * Math.sin(oblRad) + zEcl * Math.cos(oblRad);
  const rightAscensionDeg = norm(deg(Math.atan2(yEq, xEq)));
  const declinationDeg = deg(Math.atan2(zEq, Math.hypot(xEq, yEq)));

  const gmstDeg = norm(280.46061837 + 360.98564736629 * (julianDay - 2_451_545) +
    0.000387933 * centuries * centuries - centuries * centuries * centuries / 38_710_000);
  const localSiderealDeg = norm(gmstDeg + input.longitudeDeg);
  const geocentricHourAngleDeg = norm(localSiderealDeg - rightAscensionDeg + 180) - 180;
  const horizontalParallaxDeg = deg(Math.asin(clamp(1 / distanceEarthRadii, -1, 1)));
  const latitudeRad = rad(input.latitudeDeg);
  const u = Math.atan(EARTH_FLATTENING_FACTOR * Math.tan(latitudeRad));
  const rhoCosPhi = Math.cos(u);
  const rhoSinPhi = EARTH_FLATTENING_FACTOR * Math.sin(u);
  const hourAngleRad = rad(geocentricHourAngleDeg);
  const declinationRad = rad(declinationDeg);
  const parallaxRad = rad(horizontalParallaxDeg);
  const deltaRa = Math.atan2(
    -rhoCosPhi * Math.sin(parallaxRad) * Math.sin(hourAngleRad),
    Math.cos(declinationRad) - rhoCosPhi * Math.sin(parallaxRad) * Math.cos(hourAngleRad)
  );
  const topocentricRaDeg = norm(rightAscensionDeg + deg(deltaRa));
  const topocentricDeclinationRad = Math.atan2(
    (Math.sin(declinationRad) - rhoSinPhi * Math.sin(parallaxRad)) * Math.cos(deltaRa),
    Math.cos(declinationRad) - rhoCosPhi * Math.sin(parallaxRad) * Math.cos(hourAngleRad)
  );
  const topocentricHourAngleRad = rad(norm(localSiderealDeg - topocentricRaDeg + 180) - 180);
  const elevationDeg = deg(Math.asin(clamp(
    Math.sin(latitudeRad) * Math.sin(topocentricDeclinationRad) +
    Math.cos(latitudeRad) * Math.cos(topocentricDeclinationRad) * Math.cos(topocentricHourAngleRad), -1, 1)));
  const azimuthDeg = norm(deg(Math.atan2(
    Math.sin(topocentricHourAngleRad),
    Math.cos(topocentricHourAngleRad) * Math.sin(latitudeRad) - Math.tan(topocentricDeclinationRad) * Math.cos(latitudeRad)
  )) + 180);

  const phaseCycleDeg = norm(eclipticLongitudeDeg - solarLongitudeDeg);
  const elongationDeg = Math.min(phaseCycleDeg, 360 - phaseCycleDeg);
  const phaseAngleDeg = 180 - elongationDeg;
  const illuminatedFraction = clamp((1 + Math.cos(rad(phaseAngleDeg))) / 2, 0, 1);
  const phaseAgeDays = phaseCycleDeg / 360 * SYNODIC_MONTH_DAYS;
  const distanceKm = distanceEarthRadii * EARTH_EQUATORIAL_RADIUS_KM;
  const phaseName = lunarPhaseName(phaseCycleDeg);

  const traceId = `${LUNAR_POSITION_ALGORITHM_ID}:${observedAtIso}:${input.latitudeDeg.toFixed(6)}:${input.longitudeDeg.toFixed(6)}`;
  const trace: CalculationTrace = {
    summary: 'UTC gözlem zamanı ve WGS84 konumundan Ayın yaklaşık topocentrik yerel konumu, uzaklığı ve faz geometrisi hesaplandı.',
    assumptions: [
      'Ay yörüngesi düşük hassasiyetli analitik elemanlar ve başlıca periyodik düzeltmelerle yaklaşık modellenir.',
      'Ayın büyük yatay paralaksı topocentrik yerel konuma uygulanır.',
      'Gözlemci deniz seviyesinde kabul edilir; gözlemci rakımı Ay paralaksına henüz eklenmez.',
      'Atmosferik kırılma uygulanmaz; yükseklik geometriktir.',
      'Faz ve aydınlık oranı Güneş-Ay uzanımından yaklaşık çıkarılır; tutulma geometrisi değildir.',
      'Bu sonuç JPL DE/Horizons yüksek hassasiyetli efemerisinin yerine geçmez.'
    ],
    steps: [
      { id: 'lunar-orbit', title: 'Ay yörünge yaklaşımı', formula: 'N,i,ω,e,M → E → ν,r + periyodik düzeltmeler', substitution: `JD=${format(julianDay)}; M=${format(meanAnomalyDeg)}°`, result: `λ=${format(eclipticLongitudeDeg)}°; β=${format(eclipticLatitudeDeg)}°; Δ=${format(distanceKm, 1)} km` },
      { id: 'equatorial', title: 'Ekvatoryal konum', formula: 'ecliptic(λ,β) → equatorial(α,δ)', substitution: `ε=${format(obliquityDeg)}°`, result: `α=${format(rightAscensionDeg)}°; δ=${format(declinationDeg)}°` },
      { id: 'topocentric', title: 'Topocentrik paralaks', formula: 'π=asin(R⊕/Δ); (α,δ,H,φ) → (α′,δ′,H′)', substitution: `π=${format(horizontalParallaxDeg)}°; φ=${format(input.latitudeDeg)}°`, result: `yükseklik=${format(elevationDeg)}°; azimut=${format(azimuthDeg)}°` },
      { id: 'phase', title: 'Faz geometrisi', formula: 'ψ=|λAy-λGüneş|; i≈180°-ψ; k=(1+cos i)/2', substitution: `faz çevrimi=${format(phaseCycleDeg)}°`, result: `${phaseName}; aydınlık=%${format(illuminatedFraction * 100, 2)}; yaş≈${format(phaseAgeDays, 2)} gün` }
    ]
  };

  return { observedAtIso, latitudeDeg: input.latitudeDeg, longitudeDeg: input.longitudeDeg, julianDay,
    rightAscensionDeg, declinationDeg, elevationDeg, azimuthDeg, distanceKm, horizontalParallaxDeg,
    elongationDeg, phaseAngleDeg, illuminatedFraction, phaseCycleDeg, phaseAgeDays, phaseName, traceId, trace };
}
