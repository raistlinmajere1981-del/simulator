export interface AtmosphereProfileSample {
  id: string;
  altitudeM: number;
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}

export interface LayeredAtmosphereProfile {
  kind: 'layered-meteorological';
  sourceLabel: string;
  observedAtIso?: string;
  samples: AtmosphereProfileSample[];
}

export interface InterpolatedAtmosphereState {
  altitudeM: number;
  temperatureC: number;
  pressureHpa: number;
  relativeHumidityPercent: number;
}

export const DEFAULT_ATMOSPHERE_PROFILE: LayeredAtmosphereProfile = {
  kind: 'layered-meteorological',
  sourceLabel: 'Manuel atmosfer profili',
  samples: [
    {
      id: 'surface',
      altitudeM: 0,
      temperatureC: 15,
      pressureHpa: 1013.25,
      relativeHumidityPercent: 50
    },
    {
      id: 'layer-100',
      altitudeM: 100,
      temperatureC: 14.35,
      pressureHpa: 1001.29,
      relativeHumidityPercent: 50
    }
  ]
};
