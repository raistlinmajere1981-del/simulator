import fs from 'node:fs';
const file = 'tests/portable.test.ts';
let source = fs.readFileSync(file, 'utf8');
const replacements = [
  ["expect(parsed.experiments).toHaveLength(1);", "expect(parsed.store.experiments).toHaveLength(1);"],
  ["expect(parsed.sourceVersion).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION);", "expect(parsed.store.schemaVersion).toBe(LOCAL_EXPERIMENT_STORE_SCHEMA_VERSION);"],
  ["expect(parsed.experiments).toEqual([savedExperimentFixture]);", "expect(parsed.store.experiments).toEqual([savedExperimentFixture]);"]
];
for (const [before, after] of replacements) {
  if (source.includes(after)) continue;
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Beklenen test satırı tekil değil: ${before}`);
  source = source.replace(before, after);
}
fs.writeFileSync(file, source);
