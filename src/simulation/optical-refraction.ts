import type {
  AtmosphereProfileSample,
  LayeredAtmosphereProfile,
  OpticalAtmosphereSettings
} from '../shared/atmosphere';
import { MEAN_EARTH_RADIUS_M } from './geometry';
import { validateAtmosphereProfile } from './atmosphere-profile';

const GAS_CONSTANT_J_MOL_K = 8.314510;
const WATER_MOLAR_MASS_KG_MOL = 0.018015;

export interface CiddorRefractiveIndexInput extends OpticalAtmosphereSettings {
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}

export interface OpticalAtmosphereSample extends AtmosphereProfileSample {
  refractiveIndex: number;
  refractivityN: number;
}

export interface OpticalAtmosphereLayer {
  lower: OpticalAtmosphereSample;
  upper: OpticalAtmosphereSample;
  thicknessM: number;
  refractiveIndexGradientPerM: number;
  refractivityGradientNPerKm: number;
  rayCurvaturePerM: number;
  effectiveK: number;
  localEffectiveEarthRadiusM: number | null;
}

export interface OpticalAtmosphereProfile {
  sourceLabel: string;
  observedAtIso?: string;
  settings: OpticalAtmosphereSettings;
  samples: OpticalAtmosphereSample[];
  layers: OpticalAtmosphereLayer[];
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} sonlu bir sayı olmalıdır.`);
}

export function validateCiddorInput(input: CiddorRefractiveIndexInput): string[] {
  const errors: string[] = [];
  if (!Number.isFinite(input.wavelengthNm) || input.wavelengthNm < 300 || input.wavelengthNm > 1690) {
    errors.push('Ciddor görünür/yakın KIZÖ aralığı için dalga boyu 300–1690 nm olmalıdır.');
  }
  if (!Number.isFinite(input.temperatureC) || input.temperatureC < -40 || input.temperatureC > 100) {
    errors.push('Ciddor sıcaklık aralığı -40 °C ile 100 °C olmalıdır.');
  }
  if (!Number.isFinite(input.pressureHpa) || input.pressureHpa < 800 || input.pressureHpa > 1200) {
    errors.push('Ciddor basınç aralığı 800–1200 hPa olmalıdır.');
  }
  if (
    !Number.isFinite(input.relativeHumidityPercent) ||
    input.relativeHumidityPercent < 0 ||
    input.relativeHumidityPercent > 100
  ) {
    errors.push('Bağıl nem %0 ile %100 arasında olmalıdır.');
  }
  if (
    !Number.isFinite(input.carbonDioxidePpm) ||
    input.carbonDioxidePpm < 0 ||
    input.carbonDioxidePpm > 2000
  ) {
    errors.push('CO₂ derişimi 0–2000 ppm arasında olmalıdır.');
  }
  return errors;
}

function compressibility(T: number, pressurePa: number, waterMoleFraction: number): number {
  const temperatureC = T - 273.15;
  const a0 = 1.58123e-6;
  const a1 = -2.9331e-8;
  const a2 = 1.1043e-10;
  const b0 = 5.707e-6;
  const b1 = -2.051e-8;
  const c0 = 1.9898e-4;
  const c1 = -2.376e-6;
  const d = 1.83e-11;
  const e = -0.765e-8;

  return 1 - (pressurePa / T) * (
    a0 +
    a1 * temperatureC +
    a2 * temperatureC ** 2 +
    (b0 + b1 * temperatureC) * waterMoleFraction +
    (c0 + c1 * temperatureC) * waterMoleFraction ** 2
  ) + (pressurePa / T) ** 2 * (d + e * waterMoleFraction ** 2);
}

export function ciddorSaturationVaporPressurePa(temperatureC: number): number {
  assertFinite(temperatureC, 'Sıcaklık');
  const T = temperatureC + 273.15;
  if (T <= 0) throw new Error('Mutlak sıcaklık sıfırdan büyük olmalıdır.');

  if (temperatureC >= 0) {
    const A = 1.2378847e-5;
    const B = -1.9121316e-2;
    const C = 33.93711047;
    const D = -6.3431645e3;
    return Math.exp(A * T ** 2 + B * T + C + D / T);
  }

  return 10 ** (-2663.5 / T + 12.537);
}

export function ciddorPhaseRefractiveIndex(input: CiddorRefractiveIndexInput): number {
  const errors = validateCiddorInput(input);
  if (errors.length > 0) throw new Error(errors.join(' '));

  const wavelengthMicrometers = input.wavelengthNm / 1000;
  const sigma = 1 / wavelengthMicrometers;
  const temperatureK = input.temperatureC + 273.15;
  const pressurePa = input.pressureHpa * 100;
  const humidityFraction = input.relativeHumidityPercent / 100;

  const saturationVaporPressurePa = ciddorSaturationVaporPressurePa(input.temperatureC);
  const enhancementFactor = 1.00062 + 3.14e-8 * pressurePa + 5.6e-7 * input.temperatureC ** 2;
  const waterMoleFraction = enhancementFactor * humidityFraction * saturationVaporPressurePa / pressurePa;

  const k0 = 238.0185;
  const k1 = 5_792_105;
  const k2 = 57.362;
  const k3 = 167_917;
  const w0 = 295.235;
  const w1 = 2.6422;
  const w2 = -0.032380;
  const w3 = 0.004028;

  const standardDryAirIndex = 1 + (
    k1 / (k0 - sigma ** 2) +
    k3 / (k2 - sigma ** 2)
  ) * 1e-8;
  const co2AdjustedDryAirIndex = 1 +
    (standardDryAirIndex - 1) * (1 + 0.534e-6 * (input.carbonDioxidePpm - 450));
  const standardWaterVaporIndex = 1 + 1.022 * (
    w0 +
    w1 * sigma ** 2 +
    w2 * sigma ** 4 +
    w3 * sigma ** 6
  ) * 1e-8;

  const dryAirMolarMassKgMol = 1e-3 * (
    28.9635 + 12.011e-6 * (input.carbonDioxidePpm - 400)
  );
  const dryAirStandardCompressibility = compressibility(288.15, 101_325, 0);
  const waterStandardCompressibility = compressibility(293.15, 1333, 1);
  const dryAirStandardDensity = 101_325 * dryAirMolarMassKgMol /
    (dryAirStandardCompressibility * GAS_CONSTANT_J_MOL_K * 288.15);
  const waterStandardDensity = 1333 * WATER_MOLAR_MASS_KG_MOL /
    (waterStandardCompressibility * GAS_CONSTANT_J_MOL_K * 293.15);

  const mixtureCompressibility = compressibility(temperatureK, pressurePa, waterMoleFraction);
  const dryAirDensity = pressurePa * dryAirMolarMassKgMol /
    (mixtureCompressibility * GAS_CONSTANT_J_MOL_K * temperatureK) * (1 - waterMoleFraction);
  const waterVaporDensity = pressurePa * WATER_MOLAR_MASS_KG_MOL /
    (mixtureCompressibility * GAS_CONSTANT_J_MOL_K * temperatureK) * waterMoleFraction;

  return 1 +
    (dryAirDensity / dryAirStandardDensity) * (co2AdjustedDryAirIndex - 1) +
    (waterVaporDensity / waterStandardDensity) * (standardWaterVaporIndex - 1);
}

export function buildOpticalAtmosphereProfile(
  profile: LayeredAtmosphereProfile,
  settings: OpticalAtmosphereSettings,
  earthRadiusM = MEAN_EARTH_RADIUS_M
): OpticalAtmosphereProfile {
  const profileErrors = validateAtmosphereProfile(profile);
  if (profileErrors.length > 0) throw new Error(profileErrors.join(' '));
  assertFinite(earthRadiusM, 'Dünya yarıçapı');
  if (earthRadiusM <= 0) throw new Error('Dünya yarıçapı sıfırdan büyük olmalıdır.');

  const samples = profile.samples.map<OpticalAtmosphereSample>((sample) => {
    const refractiveIndex = ciddorPhaseRefractiveIndex({
      wavelengthNm: settings.wavelengthNm,
      carbonDioxidePpm: settings.carbonDioxidePpm,
      temperatureC: sample.temperatureC,
      pressureHpa: sample.pressureHpa,
      relativeHumidityPercent: sample.relativeHumidityPercent
    });
    return {
      ...sample,
      refractiveIndex,
      refractivityN: (refractiveIndex - 1) * 1e6
    };
  });

  const layers: OpticalAtmosphereLayer[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const lower = samples[index]!;
    const upper = samples[index + 1]!;
    const thicknessM = upper.altitudeM - lower.altitudeM;
    const refractiveIndexGradientPerM = (upper.refractiveIndex - lower.refractiveIndex) / thicknessM;
    const meanIndex = (lower.refractiveIndex + upper.refractiveIndex) / 2;
    const rayCurvaturePerM = -refractiveIndexGradientPerM / meanIndex;
    const effectiveK = earthRadiusM * rayCurvaturePerM;
    const denominator = 1 - effectiveK;

    layers.push({
      lower,
      upper,
      thicknessM,
      refractiveIndexGradientPerM,
      refractivityGradientNPerKm: refractiveIndexGradientPerM * 1e9,
      rayCurvaturePerM,
      effectiveK,
      localEffectiveEarthRadiusM: Math.abs(denominator) < 1e-9
        ? null
        : earthRadiusM / denominator
    });
  }

  return {
    sourceLabel: profile.sourceLabel,
    ...(profile.observedAtIso === undefined ? {} : { observedAtIso: profile.observedAtIso }),
    settings: { ...settings },
    samples,
    layers
  };
}

export function opticalIndexAtAltitude(
  opticalProfile: OpticalAtmosphereProfile,
  altitudeM: number
): { refractiveIndex: number; refractiveIndexGradientPerM: number } {
  assertFinite(altitudeM, 'Yükseklik');
  const first = opticalProfile.samples[0]!;
  const last = opticalProfile.samples[opticalProfile.samples.length - 1]!;
  if (altitudeM < first.altitudeM || altitudeM > last.altitudeM) {
    throw new Error(`Optik atmosfer profili kapsamı dışında: ${first.altitudeM}–${last.altitudeM} m.`);
  }

  if (altitudeM === last.altitudeM) {
    const lastLayer = opticalProfile.layers[opticalProfile.layers.length - 1]!;
    return {
      refractiveIndex: last.refractiveIndex,
      refractiveIndexGradientPerM: lastLayer.refractiveIndexGradientPerM
    };
  }

  for (const layer of opticalProfile.layers) {
    if (altitudeM >= layer.lower.altitudeM && altitudeM < layer.upper.altitudeM) {
      const ratio = (altitudeM - layer.lower.altitudeM) / layer.thicknessM;
      return {
        refractiveIndex: layer.lower.refractiveIndex +
          (layer.upper.refractiveIndex - layer.lower.refractiveIndex) * ratio,
        refractiveIndexGradientPerM: layer.refractiveIndexGradientPerM
      };
    }
  }

  throw new Error('Optik atmosfer profili içinde uygun katman bulunamadı.');
}
