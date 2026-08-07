import type {
  AtmosphereProfileSample,
  InterpolatedAtmosphereState,
  LayeredAtmosphereProfile
} from '../shared/atmosphere';

const DRY_AIR_GAS_CONSTANT_J_KG_K = 287.05;
const WATER_VAPOR_GAS_CONSTANT_J_KG_K = 461.495;

export interface AtmosphereLayerSummary {
  lower: AtmosphereProfileSample;
  upper: AtmosphereProfileSample;
  thicknessM: number;
  temperatureGradientKPerKm: number;
  pressureGradientHpaPerKm: number;
  humidityGradientPercentPerKm: number;
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function hasExplicitTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
}

export function saturationVaporPressureHpa(temperatureC: number): number {
  if (!isFiniteNumber(temperatureC)) {
    throw new Error('Sıcaklık sonlu bir sayı olmalıdır.');
  }

  if (temperatureC >= 0) {
    return 6.1121 * Math.exp(
      (18.678 - temperatureC / 234.5) *
      (temperatureC / (257.14 + temperatureC))
    );
  }

  return 6.1115 * Math.exp(
    (23.036 - temperatureC / 333.7) *
    (temperatureC / (279.82 + temperatureC))
  );
}

export function waterVaporPartialPressureHpa(
  temperatureC: number,
  relativeHumidityPercent: number
): number {
  if (!isFiniteNumber(relativeHumidityPercent) || relativeHumidityPercent < 0 || relativeHumidityPercent > 100) {
    throw new Error('Bağıl nem %0 ile %100 arasında olmalıdır.');
  }
  return saturationVaporPressureHpa(temperatureC) * relativeHumidityPercent / 100;
}

export function moistAirDensityKgM3(state: {
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}): number {
  const temperatureK = state.temperatureC + 273.15;
  if (!isFiniteNumber(temperatureK) || temperatureK <= 0) {
    throw new Error('Mutlak sıcaklık sıfırdan büyük olmalıdır.');
  }
  if (!isFiniteNumber(state.pressureHpa) || state.pressureHpa <= 0) {
    throw new Error('Basınç sıfırdan büyük olmalıdır.');
  }

  const vaporPressureHpa = waterVaporPartialPressureHpa(
    state.temperatureC,
    state.relativeHumidityPercent
  );
  if (vaporPressureHpa >= state.pressureHpa) {
    throw new Error('Su buharı kısmi basıncı toplam basınçtan küçük olmalıdır.');
  }

  const dryPressurePa = (state.pressureHpa - vaporPressureHpa) * 100;
  const vaporPressurePa = vaporPressureHpa * 100;
  return dryPressurePa / (DRY_AIR_GAS_CONSTANT_J_KG_K * temperatureK) +
    vaporPressurePa / (WATER_VAPOR_GAS_CONSTANT_J_KG_K * temperatureK);
}

export function validateAtmosphereProfile(profile: LayeredAtmosphereProfile): string[] {
  const errors: string[] = [];

  if (profile.kind !== 'layered-meteorological') {
    errors.push('Atmosfer profili türü layered-meteorological olmalıdır.');
  }
  if (!profile.sourceLabel.trim()) {
    errors.push('Atmosfer profili kaynak etiketi boş olamaz.');
  }
  if (profile.observedAtIso !== undefined) {
    const timestamp = Date.parse(profile.observedAtIso);
    if (!Number.isFinite(timestamp) || !hasExplicitTimezone(profile.observedAtIso)) {
      errors.push('Atmosfer gözlem zamanı açık saat dilimi içeren geçerli ISO-8601 olmalıdır.');
    }
  }
  if (profile.samples.length < 2) {
    errors.push('Katmanlı atmosfer profili en az iki örnek içermelidir.');
  }
  if (profile.samples.length > 1000) {
    errors.push('Atmosfer profili en fazla 1000 örnek içerebilir.');
  }

  const ids = new Set<string>();
  let previousAltitudeM = Number.NEGATIVE_INFINITY;

  profile.samples.forEach((sample, index) => {
    const prefix = `Atmosfer örneği ${index + 1}`;
    if (!sample.id.trim()) errors.push(`${prefix}: kimlik boş olamaz.`);
    if (ids.has(sample.id)) errors.push(`${prefix}: örnek kimliği benzersiz olmalıdır.`);
    ids.add(sample.id);

    if (!isFiniteNumber(sample.altitudeM) || sample.altitudeM < -500 || sample.altitudeM > 20_000) {
      errors.push(`${prefix}: yükseklik -500 m ile 20.000 m arasında olmalıdır.`);
    }
    if (sample.altitudeM <= previousAltitudeM) {
      errors.push(`${prefix}: örnek yükseklikleri kesin artan sırada olmalıdır.`);
    }
    previousAltitudeM = sample.altitudeM;

    if (!isFiniteNumber(sample.temperatureC) || sample.temperatureC < -100 || sample.temperatureC > 60) {
      errors.push(`${prefix}: sıcaklık -100 °C ile 60 °C arasında olmalıdır.`);
    }
    if (!isFiniteNumber(sample.pressureHpa) || sample.pressureHpa < 1 || sample.pressureHpa > 1100) {
      errors.push(`${prefix}: basınç 1 hPa ile 1100 hPa arasında olmalıdır.`);
    }
    if (!isFiniteNumber(sample.relativeHumidityPercent) || sample.relativeHumidityPercent < 0 || sample.relativeHumidityPercent > 100) {
      errors.push(`${prefix}: bağıl nem %0 ile %100 arasında olmalıdır.`);
    }

    if (
      isFiniteNumber(sample.temperatureC) &&
      isFiniteNumber(sample.pressureHpa) &&
      isFiniteNumber(sample.relativeHumidityPercent) &&
      sample.relativeHumidityPercent >= 0 &&
      sample.relativeHumidityPercent <= 100
    ) {
      try {
        const vaporPressureHpa = waterVaporPartialPressureHpa(
          sample.temperatureC,
          sample.relativeHumidityPercent
        );
        if (vaporPressureHpa >= sample.pressureHpa) {
          errors.push(`${prefix}: su buharı kısmi basıncı toplam basınçtan küçük olmalıdır.`);
        }
      } catch {
        // Aralık hataları yukarıdaki alan kontrollerinde raporlanır.
      }
    }
  });

  return errors;
}

export function buildAtmosphereLayers(
  profile: LayeredAtmosphereProfile
): AtmosphereLayerSummary[] {
  const errors = validateAtmosphereProfile(profile);
  if (errors.length > 0) throw new Error(errors.join(' '));

  const layers: AtmosphereLayerSummary[] = [];
  for (let index = 0; index < profile.samples.length - 1; index += 1) {
    const lower = profile.samples[index]!;
    const upper = profile.samples[index + 1]!;
    const thicknessM = upper.altitudeM - lower.altitudeM;
    const scaleToKm = 1000 / thicknessM;
    layers.push({
      lower,
      upper,
      thicknessM,
      temperatureGradientKPerKm: (upper.temperatureC - lower.temperatureC) * scaleToKm,
      pressureGradientHpaPerKm: (upper.pressureHpa - lower.pressureHpa) * scaleToKm,
      humidityGradientPercentPerKm: (upper.relativeHumidityPercent - lower.relativeHumidityPercent) * scaleToKm
    });
  }
  return layers;
}

export function interpolateAtmosphereAt(
  profile: LayeredAtmosphereProfile,
  altitudeM: number
): InterpolatedAtmosphereState {
  const errors = validateAtmosphereProfile(profile);
  if (errors.length > 0) throw new Error(errors.join(' '));
  if (!isFiniteNumber(altitudeM)) throw new Error('İstenen yükseklik sonlu bir sayı olmalıdır.');

  const first = profile.samples[0]!;
  const last = profile.samples[profile.samples.length - 1]!;
  if (altitudeM < first.altitudeM || altitudeM > last.altitudeM) {
    throw new Error(
      `İstenen yükseklik profil kapsamı dışında: ${first.altitudeM}–${last.altitudeM} m.`
    );
  }

  const exact = profile.samples.find((sample) => sample.altitudeM === altitudeM);
  if (exact) {
    return {
      altitudeM,
      temperatureC: exact.temperatureC,
      pressureHpa: exact.pressureHpa,
      relativeHumidityPercent: exact.relativeHumidityPercent
    };
  }

  for (let index = 0; index < profile.samples.length - 1; index += 1) {
    const lower = profile.samples[index]!;
    const upper = profile.samples[index + 1]!;
    if (altitudeM > lower.altitudeM && altitudeM < upper.altitudeM) {
      const ratio = (altitudeM - lower.altitudeM) / (upper.altitudeM - lower.altitudeM);
      const interpolate = (a: number, b: number): number => a + (b - a) * ratio;
      return {
        altitudeM,
        temperatureC: interpolate(lower.temperatureC, upper.temperatureC),
        pressureHpa: interpolate(lower.pressureHpa, upper.pressureHpa),
        relativeHumidityPercent: interpolate(
          lower.relativeHumidityPercent,
          upper.relativeHumidityPercent
        )
      };
    }
  }

  throw new Error('Atmosfer profili içinde uygun katman bulunamadı.');
}