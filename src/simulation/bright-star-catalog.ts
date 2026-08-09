import {
  precessStellarDirectionToMeanOfDate,
  type StellarPrecessionResult
} from './stellar-precession';

export const BRIGHT_STAR_CATALOG_ID = 'bsc5p-curated-reference';
export const BRIGHT_STAR_CATALOG_VERSION = '0.1.0';
export const BRIGHT_STAR_CATALOG_SOURCE = 'NASA HEASARC BSC5P · Bright Star Catalog, 5th Edition (preliminary)';

export interface BrightStarCatalogEntry {
  id: string;
  commonName: string;
  bayerDesignation: string;
  constellation: string;
  hrNumber: number;
  rightAscensionJ2000Deg: number;
  declinationJ2000Deg: number;
  visualMagnitude: number;
  sourceFrame: 'mean-j2000';
}

export interface ResolvedBrightStar {
  star: BrightStarCatalogEntry;
  precession: StellarPrecessionResult;
}

/**
 * Small offline navigation/reference subset. Coordinates are stored as J2000
 * equatorial catalog directions. Proper motion is intentionally not applied in
 * this stage; the precession result keeps that limitation explicit.
 */
export const BRIGHT_STAR_CATALOG: readonly BrightStarCatalogEntry[] = [
  { id: 'hr-2491', commonName: 'Sirius', bayerDesignation: 'α CMa', constellation: 'Canis Major', hrNumber: 2491, rightAscensionJ2000Deg: 101.28715533, declinationJ2000Deg: -16.71611586, visualMagnitude: -1.46, sourceFrame: 'mean-j2000' },
  { id: 'hr-2326', commonName: 'Canopus', bayerDesignation: 'α Car', constellation: 'Carina', hrNumber: 2326, rightAscensionJ2000Deg: 95.98787778, declinationJ2000Deg: -52.69566167, visualMagnitude: -0.72, sourceFrame: 'mean-j2000' },
  { id: 'hr-5340', commonName: 'Arcturus', bayerDesignation: 'α Boo', constellation: 'Boötes', hrNumber: 5340, rightAscensionJ2000Deg: 213.91530000, declinationJ2000Deg: 19.18240900, visualMagnitude: -0.04, sourceFrame: 'mean-j2000' },
  { id: 'hr-7001', commonName: 'Vega', bayerDesignation: 'α Lyr', constellation: 'Lyra', hrNumber: 7001, rightAscensionJ2000Deg: 279.23473479, declinationJ2000Deg: 38.78368896, visualMagnitude: 0.03, sourceFrame: 'mean-j2000' },
  { id: 'hr-1708', commonName: 'Capella', bayerDesignation: 'α Aur', constellation: 'Auriga', hrNumber: 1708, rightAscensionJ2000Deg: 79.17232794, declinationJ2000Deg: 45.99799147, visualMagnitude: 0.08, sourceFrame: 'mean-j2000' },
  { id: 'hr-1713', commonName: 'Rigel', bayerDesignation: 'β Ori', constellation: 'Orion', hrNumber: 1713, rightAscensionJ2000Deg: 78.63446707, declinationJ2000Deg: -8.20163837, visualMagnitude: 0.12, sourceFrame: 'mean-j2000' },
  { id: 'hr-2943', commonName: 'Procyon', bayerDesignation: 'α CMi', constellation: 'Canis Minor', hrNumber: 2943, rightAscensionJ2000Deg: 114.82549350, declinationJ2000Deg: 5.22499310, visualMagnitude: 0.38, sourceFrame: 'mean-j2000' },
  { id: 'hr-0472', commonName: 'Achernar', bayerDesignation: 'α Eri', constellation: 'Eridanus', hrNumber: 472, rightAscensionJ2000Deg: 24.42852280, declinationJ2000Deg: -57.23675230, visualMagnitude: 0.46, sourceFrame: 'mean-j2000' },
  { id: 'hr-2061', commonName: 'Betelgeuse', bayerDesignation: 'α Ori', constellation: 'Orion', hrNumber: 2061, rightAscensionJ2000Deg: 88.79293900, declinationJ2000Deg: 7.40706400, visualMagnitude: 0.50, sourceFrame: 'mean-j2000' },
  { id: 'hr-5267', commonName: 'Hadar', bayerDesignation: 'β Cen', constellation: 'Centaurus', hrNumber: 5267, rightAscensionJ2000Deg: 210.95585500, declinationJ2000Deg: -60.37303900, visualMagnitude: 0.61, sourceFrame: 'mean-j2000' },
  { id: 'hr-7557', commonName: 'Altair', bayerDesignation: 'α Aql', constellation: 'Aquila', hrNumber: 7557, rightAscensionJ2000Deg: 297.69582730, declinationJ2000Deg: 8.86832120, visualMagnitude: 0.77, sourceFrame: 'mean-j2000' },
  { id: 'hr-1457', commonName: 'Aldebaran', bayerDesignation: 'α Tau', constellation: 'Taurus', hrNumber: 1457, rightAscensionJ2000Deg: 68.98016279, declinationJ2000Deg: 16.50930235, visualMagnitude: 0.85, sourceFrame: 'mean-j2000' },
  { id: 'hr-6134', commonName: 'Antares', bayerDesignation: 'α Sco', constellation: 'Scorpius', hrNumber: 6134, rightAscensionJ2000Deg: 247.35191500, declinationJ2000Deg: -26.43200200, visualMagnitude: 0.96, sourceFrame: 'mean-j2000' },
  { id: 'hr-5056', commonName: 'Spica', bayerDesignation: 'α Vir', constellation: 'Virgo', hrNumber: 5056, rightAscensionJ2000Deg: 201.29824700, declinationJ2000Deg: -11.16131900, visualMagnitude: 0.98, sourceFrame: 'mean-j2000' },
  { id: 'hr-2990', commonName: 'Pollux', bayerDesignation: 'β Gem', constellation: 'Gemini', hrNumber: 2990, rightAscensionJ2000Deg: 116.32895800, declinationJ2000Deg: 28.02618300, visualMagnitude: 1.14, sourceFrame: 'mean-j2000' },
  { id: 'hr-8728', commonName: 'Fomalhaut', bayerDesignation: 'α PsA', constellation: 'Piscis Austrinus', hrNumber: 8728, rightAscensionJ2000Deg: 344.41269300, declinationJ2000Deg: -29.62223600, visualMagnitude: 1.16, sourceFrame: 'mean-j2000' },
  { id: 'hr-7924', commonName: 'Deneb', bayerDesignation: 'α Cyg', constellation: 'Cygnus', hrNumber: 7924, rightAscensionJ2000Deg: 310.35797900, declinationJ2000Deg: 45.28033800, visualMagnitude: 1.25, sourceFrame: 'mean-j2000' },
  { id: 'hr-3982', commonName: 'Regulus', bayerDesignation: 'α Leo', constellation: 'Leo', hrNumber: 3982, rightAscensionJ2000Deg: 152.09296200, declinationJ2000Deg: 11.96720900, visualMagnitude: 1.35, sourceFrame: 'mean-j2000' },
  { id: 'hr-0424', commonName: 'Polaris', bayerDesignation: 'α UMi', constellation: 'Ursa Minor', hrNumber: 424, rightAscensionJ2000Deg: 37.95456070, declinationJ2000Deg: 89.26410890, visualMagnitude: 1.97, sourceFrame: 'mean-j2000' }
] as const;

const catalogById = new Map(BRIGHT_STAR_CATALOG.map((star) => [star.id, star] as const));

export function getBrightStarById(id: string): BrightStarCatalogEntry | undefined {
  return catalogById.get(id);
}

export function searchBrightStars(query: string): BrightStarCatalogEntry[] {
  const normalized = query.trim().toLocaleLowerCase('tr-TR');
  if (!normalized) return [...BRIGHT_STAR_CATALOG];
  return BRIGHT_STAR_CATALOG.filter((star) =>
    star.commonName.toLocaleLowerCase('tr-TR').includes(normalized) ||
    star.bayerDesignation.toLocaleLowerCase('tr-TR').includes(normalized) ||
    star.constellation.toLocaleLowerCase('tr-TR').includes(normalized) ||
    `hr ${star.hrNumber}`.includes(normalized) ||
    star.id.includes(normalized)
  );
}

export function resolveBrightStarForObservation(
  starId: string,
  observedAtIso: string
): ResolvedBrightStar {
  const star = getBrightStarById(starId);
  if (!star) throw new Error(`Parlak yıldız kataloğunda bilinmeyen kimlik: ${starId}`);
  return {
    star,
    precession: precessStellarDirectionToMeanOfDate({
      observedAtIso,
      rightAscensionDeg: star.rightAscensionJ2000Deg,
      declinationDeg: star.declinationJ2000Deg,
      sourceFrame: star.sourceFrame,
      label: star.commonName
    })
  };
}
