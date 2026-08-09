import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const current = fs.readFileSync(path, 'utf8');
  const count = current.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: beklenen parça ${count} kez bulundu`);
  fs.writeFileSync(path, current.replace(before, after));
}

// bright-star-catalog.ts
replaceOnce(
  'src/simulation/bright-star-catalog.ts',
  "import {\n  precessStellarDirectionToMeanOfDate,\n  type StellarPrecessionResult\n} from './stellar-precession';\n",
  "import {\n  precessStellarDirectionToMeanOfDate,\n  type StellarPrecessionResult\n} from './stellar-precession';\nimport {\n  propagateStellarProperMotion,\n  type StellarProperMotionResult\n} from './stellar-proper-motion';\n"
);
replaceOnce(
  'src/simulation/bright-star-catalog.ts',
  "export interface ResolvedBrightStar {\n  star: BrightStarCatalogEntry;\n  precession: StellarPrecessionResult;\n}\n",
  "export interface BrightStarMotionReference {\n  sourceEpochJulianYear: number;\n  properMotionRaStarArcsecPerYear: number;\n  properMotionDecArcsecPerYear: number;\n  sourceLabel?: string;\n}\n\nexport interface ResolvedBrightStar {\n  star: BrightStarCatalogEntry;\n  properMotion: StellarProperMotionResult | null;\n  precession: StellarPrecessionResult;\n}\n"
);
replaceOnce(
  'src/simulation/bright-star-catalog.ts',
  " * Small offline navigation/reference subset. Coordinates are stored as J2000\n * equatorial catalog directions. Proper motion is intentionally not applied in\n * this stage; the precession result keeps that limitation explicit.\n",
  " * Small offline navigation/reference subset. Coordinates are stored as J2000\n * equatorial catalog directions. Proper motion is applied only when a separately\n * verified motion reference is explicitly supplied by the caller.\n"
);
replaceOnce(
  'src/simulation/bright-star-catalog.ts',
  "export function resolveBrightStarForObservation(\n  starId: string,\n  observedAtIso: string\n): ResolvedBrightStar {\n  const star = getBrightStarById(starId);\n  if (!star) throw new Error(`Parlak yıldız kataloğunda bilinmeyen kimlik: ${starId}`);\n  return {\n    star,\n    precession: precessStellarDirectionToMeanOfDate({\n      observedAtIso,\n      rightAscensionDeg: star.rightAscensionJ2000Deg,\n      declinationDeg: star.declinationJ2000Deg,\n      sourceFrame: star.sourceFrame,\n      label: star.commonName\n    })\n  };\n}\n",
  "export function resolveBrightStarForObservation(\n  starId: string,\n  observedAtIso: string,\n  motionReference?: BrightStarMotionReference\n): ResolvedBrightStar {\n  const star = getBrightStarById(starId);\n  if (!star) throw new Error(`Parlak yıldız kataloğunda bilinmeyen kimlik: ${starId}`);\n  const properMotion = motionReference\n    ? propagateStellarProperMotion({\n        observedAtIso,\n        sourceEpochJulianYear: motionReference.sourceEpochJulianYear,\n        rightAscensionDeg: star.rightAscensionJ2000Deg,\n        declinationDeg: star.declinationJ2000Deg,\n        properMotionRaStarArcsecPerYear: motionReference.properMotionRaStarArcsecPerYear,\n        properMotionDecArcsecPerYear: motionReference.properMotionDecArcsecPerYear,\n        label: motionReference.sourceLabel ?? star.commonName\n      })\n    : null;\n  const rightAscensionDeg = properMotion?.propagatedRightAscensionDeg ?? star.rightAscensionJ2000Deg;\n  const declinationDeg = properMotion?.propagatedDeclinationDeg ?? star.declinationJ2000Deg;\n  return {\n    star,\n    properMotion,\n    precession: precessStellarDirectionToMeanOfDate({\n      observedAtIso,\n      rightAscensionDeg,\n      declinationDeg,\n      sourceFrame: star.sourceFrame,\n      label: star.commonName\n    })\n  };\n}\n"
);

// bsc5p-motion-subset.ts
replaceOnce(
  'src/simulation/bsc5p-motion-subset.ts',
  "import { BRIGHT_STAR_CATALOG, type BrightStarCatalogEntry } from './bright-star-catalog';\n",
  "import {\n  BRIGHT_STAR_CATALOG,\n  type BrightStarCatalogEntry,\n  type BrightStarMotionReference\n} from './bright-star-catalog';\n"
);
replaceOnce(
  'src/simulation/bsc5p-motion-subset.ts',
  "export function serializeVerifiedBrightStarMotionSubset(\n  subset: VerifiedBrightStarMotionSubset\n): string {\n",
  "export function resolveVerifiedBrightStarMotionReference(\n  subset: VerifiedBrightStarMotionSubset,\n  starId: string\n): BrightStarMotionReference {\n  if (subset.id !== BSC5P_MOTION_SUBSET_ID || subset.version !== BSC5P_MOTION_SUBSET_VERSION ||\n    subset.sourceFrame !== 'fk5-j2000' || !Number.isFinite(subset.sourceEpochJulianYear)) {\n    throw new Bsc5pMotionSubsetError('Proper-motion subset üstverisi desteklenen BSC5P sözleşmesiyle uyuşmuyor.');\n  }\n  if (subset.entries.length !== BRIGHT_STAR_CATALOG.length) {\n    throw new Bsc5pMotionSubsetError(\n      `Proper-motion subset ${BRIGHT_STAR_CATALOG.length} yıldızın tamamını içermelidir; alınan=${subset.entries.length}.`\n    );\n  }\n  const star = BRIGHT_STAR_CATALOG.find((candidate) => candidate.id === starId);\n  if (!star) throw new Bsc5pMotionSubsetError(`Bilinmeyen parlak yıldız kimliği: ${starId}.`);\n  const entry = subset.entries.find((candidate) => candidate.starId === starId);\n  if (!entry || entry.hrNumber !== star.hrNumber ||\n    !Number.isFinite(entry.properMotionRaStarArcsecPerYear) ||\n    !Number.isFinite(entry.properMotionDecArcsecPerYear)) {\n    throw new Bsc5pMotionSubsetError(`HR ${star.hrNumber} (${star.commonName}) için doğrulanmış proper-motion kaydı eksik veya geçersiz.`);\n  }\n  return {\n    sourceEpochJulianYear: subset.sourceEpochJulianYear,\n    properMotionRaStarArcsecPerYear: entry.properMotionRaStarArcsecPerYear,\n    properMotionDecArcsecPerYear: entry.properMotionDecArcsecPerYear,\n    sourceLabel: `${subset.id}@${subset.version} · ${star.commonName}`\n  };\n}\n\nexport function serializeVerifiedBrightStarMotionSubset(\n  subset: VerifiedBrightStarMotionSubset\n): string {\n"
);

// stellar-sky-snapshot.ts imports and result contract
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "import { calculateStellarPosition } from './stellar-position';\n",
  "import { calculateStellarPosition } from './stellar-position';\nimport {\n  resolveVerifiedBrightStarMotionReference,\n  type VerifiedBrightStarMotionSubset\n} from './bsc5p-motion-subset';\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "  aboveGeometricHorizon: boolean;\n  localHorizonAltitudeDeg: number | null;\n",
  "  aboveGeometricHorizon: boolean;\n  properMotionApplied: boolean;\n  properMotionAngularShiftArcsec: number | null;\n  localHorizonAltitudeDeg: number | null;\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "  belowGeometricHorizonCount: number;\n  localHorizonApplied: boolean;\n",
  "  belowGeometricHorizonCount: number;\n  properMotionApplied: boolean;\n  properMotionSourceId: string | null;\n  properMotionSourceVersion: string | null;\n  properMotionSourceEpochJulianYear: number | null;\n  localHorizonApplied: boolean;\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "  longitudeDeg: number;\n  horizonMask?: StellarLocalHorizonMask;\n}): StellarSkySnapshotResult {\n",
  "  longitudeDeg: number;\n  horizonMask?: StellarLocalHorizonMask;\n  motionSubset?: VerifiedBrightStarMotionSubset;\n}): StellarSkySnapshotResult {\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "  const stars: StellarSkySnapshotStar[] = BRIGHT_STAR_CATALOG.map((star) => {\n    const resolved = resolveBrightStarForObservation(star.id, input.observedAtIso);\n    const position = calculateStellarPosition({\n",
  "  const stars: StellarSkySnapshotStar[] = BRIGHT_STAR_CATALOG.map((star) => {\n    const motionReference = input.motionSubset\n      ? resolveVerifiedBrightStarMotionReference(input.motionSubset, star.id)\n      : undefined;\n    const resolved = resolveBrightStarForObservation(star.id, input.observedAtIso, motionReference);\n    const position = calculateStellarPosition({\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "    if (!input.horizonMask) {\n",
  "    const motionFields = {\n      properMotionApplied: resolved.properMotion !== null,\n      properMotionAngularShiftArcsec: resolved.properMotion?.angularShiftArcsec ?? null\n    };\n\n    if (!input.horizonMask) {\n"
);
for (let index = 0; index < 3; index += 1) {
  replaceOnce(
    'src/simulation/stellar-sky-snapshot.ts',
    "        aboveGeometricHorizon: position.aboveGeometricHorizon,\n        localHorizonAltitudeDeg:",
    "        aboveGeometricHorizon: position.aboveGeometricHorizon,\n        ...motionFields,\n        localHorizonAltitudeDeg:"
  );
}
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "  const warnings = [\n    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,\n    'Her yıldızın ortalama J2000 katalog yönü gözlem tarihine mevcut IAU 2006 precession zinciriyle dönüştürülür.',\n    'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.',\n",
  "  const motionWarning = input.motionSubset\n    ? `Doğrulanmış proper motion uygulanır: ${input.motionSubset.id}@${input.motionSubset.version}; kaynak epok=J${format(input.motionSubset.sourceEpochJulianYear, 4)}. Paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.`\n    : 'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.';\n  const warnings = [\n    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,\n    input.motionSubset\n      ? 'Her yıldızın ortalama J2000 yönü önce doğrulanmış iki-bileşenli proper motion ile gözlem epoch’una taşınır, ardından IAU 2006 precession uygulanır.'\n      : 'Her yıldızın ortalama J2000 katalog yönü gözlem tarihine mevcut IAU 2006 precession zinciriyle dönüştürülür.',\n    motionWarning,\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "        formula: 'her yıldız: J2000 (α₀,δ₀) → precession → (α_t,δ_t)',\n        substitution: `${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}; ${stars.length} yıldız`,\n",
  "        formula: input.motionSubset\n          ? 'her yıldız: J2000 (α₀,δ₀) → proper motion → precession → (α_t,δ_t)'\n          : 'her yıldız: J2000 (α₀,δ₀) → precession → (α_t,δ_t)',\n        substitution: `${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}; ${stars.length} yıldız${input.motionSubset ? `; motion=${input.motionSubset.id}@${input.motionSubset.version}` : ''}`,\n"
);
replaceOnce(
  'src/simulation/stellar-sky-snapshot.ts',
  "    belowGeometricHorizonCount: stars.length - aboveGeometricHorizonCount,\n    localHorizonApplied: normalizedMask !== null,\n",
  "    belowGeometricHorizonCount: stars.length - aboveGeometricHorizonCount,\n    properMotionApplied: input.motionSubset !== undefined,\n    properMotionSourceId: input.motionSubset?.id ?? null,\n    properMotionSourceVersion: input.motionSubset?.version ?? null,\n    properMotionSourceEpochJulianYear: input.motionSubset?.sourceEpochJulianYear ?? null,\n    localHorizonApplied: normalizedMask !== null,\n"
);

// stellar-observation.ts
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "import { calculateStellarTrail, type StellarTrailResult } from './stellar-trail';\n",
  "import { calculateStellarTrail, type StellarTrailResult } from './stellar-trail';\nimport {\n  resolveVerifiedBrightStarMotionReference,\n  type VerifiedBrightStarMotionSubset\n} from './bsc5p-motion-subset';\nimport type { StellarProperMotionResult } from './stellar-proper-motion';\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "export const STELLAR_OBSERVATION_MODEL_VERSION = '0.5.0';\n",
  "export const STELLAR_OBSERVATION_MODEL_VERSION = '0.6.0';\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "  precessionAngularShiftArcsec: number;\n  position: StellarPositionResult;\n",
  "  precessionAngularShiftArcsec: number;\n  properMotion: StellarProperMotionResult | null;\n  properMotionSourceId: string | null;\n  properMotionSourceVersion: string | null;\n  position: StellarPositionResult;\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "  settings: StellarObservationSettings;\n  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;\n}): StellarObservationResult {\n",
  "  settings: StellarObservationSettings;\n  externalLocalHorizonSource?: SavedStellarLocalHorizonSource;\n  motionSubset?: VerifiedBrightStarMotionSubset;\n}): StellarObservationResult {\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "  validateSettings(settings);\n  const resolved = resolveBrightStarForObservation(settings.starId, input.observedAtIso);\n",
  "  validateSettings(settings);\n  const motionReference = input.motionSubset\n    ? resolveVerifiedBrightStarMotionReference(input.motionSubset, settings.starId)\n    : undefined;\n  const resolved = resolveBrightStarForObservation(settings.starId, input.observedAtIso, motionReference);\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "    longitudeDeg: input.longitudeDeg,\n    horizonMask: localHorizon.mask ?? undefined\n  });\n",
  "    longitudeDeg: input.longitudeDeg,\n    horizonMask: localHorizon.mask ?? undefined,\n    motionSubset: input.motionSubset\n  });\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "  const warnings = [\n    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,\n    'Katalog koordinatı ortalama J2000 sisteminden IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.',\n    'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.',\n",
  "  const motionWarning = resolved.properMotion\n    ? `Doğrulanmış proper motion uygulanır: μ_α*=${format(resolved.properMotion.properMotionRaStarArcsecPerYear, 6)}″/yıl; μ_δ=${format(resolved.properMotion.properMotionDecArcsecPerYear, 6)}″/yıl; kaynak epok=J${format(resolved.properMotion.sourceEpochJulianYear, 4)}. Paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.`\n    : 'Proper motion, yıllık paralaks, radyal hız, nutation, aberration ve ışık sapması uygulanmaz.';\n  const warnings = [\n    `Katalog kaynağı: ${BRIGHT_STAR_CATALOG_SOURCE}; çevrimdışı altküme=${BRIGHT_STAR_CATALOG_ID}@${BRIGHT_STAR_CATALOG_VERSION}.`,\n    resolved.properMotion\n      ? 'Katalog yönü önce doğrulanmış iki-bileşenli proper motion ile gözlem epoch’una taşınır, sonra IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.'\n      : 'Katalog koordinatı ortalama J2000 sisteminden IAU 2006 precession ile gözlem tarihinin ortalama ekvator/equinox sistemine dönüştürülür.',\n    motionWarning,\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "      ...resolved.precession.trace.steps.map((step) => ({ ...step, id: `precession-${step.id}` })),\n",
  "      ...(resolved.properMotion\n        ? resolved.properMotion.trace.steps.map((step) => ({ ...step, id: `motion-${step.id}` }))\n        : []),\n      ...resolved.precession.trace.steps.map((step) => ({ ...step, id: `precession-${step.id}` })),\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "    precessionAngularShiftArcsec: resolved.precession.angularShiftArcsec,\n    position,\n",
  "    precessionAngularShiftArcsec: resolved.precession.angularShiftArcsec,\n    properMotion: resolved.properMotion,\n    properMotionSourceId: input.motionSubset?.id ?? null,\n    properMotionSourceVersion: input.motionSubset?.version ?? null,\n    position,\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.',\n",
  "  description: 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü, isteğe bağlı doğrulanmış proper motion ve IAU 2006 precession ile gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.',\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "    'Proper motion ve diğer yüksek hassasiyetli astrometrik düzeltmeler uygulanmaz.',\n",
  "    'Proper motion yalnız ayrı doğrulanmış BSC5P motion kaynağı verildiğinde uygulanır; paralaks, radyal hız ve perspektif ivmelenmesi uygulanmaz.',\n"
);
replaceOnce(
  'src/simulation/stellar-observation.ts',
  "      { key: 'stellarPrecessionShiftArcsec', label: 'Precession açısal kayması', value: result.precessionAngularShiftArcsec, unit: 'arcsec' },\n",
  "      { key: 'stellarPrecessionShiftArcsec', label: 'Precession açısal kayması', value: result.precessionAngularShiftArcsec, unit: 'arcsec' },\n      { key: 'stellarProperMotionApplied', label: 'Doğrulanmış proper motion uygulandı', value: result.properMotion ? 1 : 0, unit: 'boolean' },\n      { key: 'stellarProperMotionShiftArcsec', label: 'Proper motion açısal kayması', value: result.properMotion?.angularShiftArcsec ?? null, unit: 'arcsec' },\n      { key: 'stellarProperMotionRaStarArcsecPerYear', label: 'Proper motion μ_α*', value: result.properMotion?.properMotionRaStarArcsecPerYear ?? null, unit: 'arcsec/yr' },\n      { key: 'stellarProperMotionDecArcsecPerYear', label: 'Proper motion μ_δ', value: result.properMotion?.properMotionDecArcsecPerYear ?? null, unit: 'arcsec/yr' },\n      { key: 'stellarProperMotionSourceEpochJulianYear', label: 'Proper motion kaynak epoku', value: result.properMotion?.sourceEpochJulianYear ?? null, unit: 'Julian year' },\n"
);

// package version
replaceOnce(
  'package.json',
  '"version": "1.17.0"',
  '"version": "1.17.1"'
);

console.log('stage 6.22 guarded product patch applied');
