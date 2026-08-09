import fs from 'node:fs';

const path = 'src/simulation/stellar-observation.ts';
let source = fs.readFileSync(path, 'utf8');
const before = `}): StellarObservationResult {\n  validateSettings(input.settings);\n  const resolved = resolveBrightStarForObservation(input.settings.starId, input.observedAtIso);`;
const after = `}): StellarObservationResult {\n  const settings: StellarObservationSettings = {\n    ...DEFAULT_STELLAR_OBSERVATION_SETTINGS,\n    ...input.settings\n  };\n  validateSettings(settings);\n  const resolved = resolveBrightStarForObservation(settings.starId, input.observedAtIso);`;
if (!source.includes(before)) throw new Error('calculateStellarObservation başlangıç bloğu bulunamadı.');
source = source.replace(before, after);
source = source.replaceAll('input.settings.trailDurationMinutes', 'settings.trailDurationMinutes');
source = source.replaceAll('input.settings.trailSampleIntervalMinutes', 'settings.trailSampleIntervalMinutes');
source = source.replaceAll('input.settings.localHorizonEnabled', 'settings.localHorizonEnabled');
source = source.replace('horizonMask: localHorizonMaskFromSettings(input.settings)', 'horizonMask: localHorizonMaskFromSettings(settings)');
source = source.replace('settings: { ...input.settings },', 'settings: { ...settings },');
fs.writeFileSync(path, source);
console.log('Stage 6.15 stellar settings normalization applied.');
// Trigger commit after workflow registration.
