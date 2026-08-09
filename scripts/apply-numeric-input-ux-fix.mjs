import fs from 'node:fs';
import path from 'node:path';

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceIfNeeded(source, before, after, label) {
  if (source.includes(after)) return source;
  return replaceExactlyOnce(source, before, after, label);
}

{
  const file = 'src/renderer/src/AppNext.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = replaceIfNeeded(
    source,
    "import { StellarObservationPanel } from './StellarObservationPanel';",
    "import { StellarObservationPanel } from './StellarObservationPanel';\nimport { DraftNumberInput } from './DraftNumberInput';",
    'AppNext import'
  );
  source = replaceIfNeeded(
    source,
    `        <input\n          disabled={disabled}\n          min={inputRanges[inputKey].min}\n          max={inputRanges[inputKey].max}\n          step={step}\n          type="number"\n          value={inputs[inputKey]}\n          onChange={(event) => onNumberChange(inputKey, event.currentTarget.valueAsNumber)}\n        />`,
    `        <DraftNumberInput\n          disabled={disabled}\n          min={inputRanges[inputKey].min}\n          max={inputRanges[inputKey].max}\n          step={step}\n          value={inputs[inputKey]}\n          onCommit={(value) => onNumberChange(inputKey, value)}\n        />`,
    'AppNext NumericField'
  );
  fs.writeFileSync(file, source);
}

{
  const file = 'src/renderer/src/stellar-observation-panel.css';
  let source = fs.readFileSync(file, 'utf8');
  const marker = '@media (max-width: 1200px) {';
  const block = `.stellar-local-horizon-apply-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 12px;\n  padding-top: 2px;\n}\n\n.stellar-local-horizon-apply-row > div {\n  display: flex;\n  gap: 7px;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n}\n\n.stellar-local-horizon-draft {\n  color: var(--text-muted, #8f9aae);\n  font-size: 10px;\n  line-height: 1.4;\n}\n\n.stellar-local-horizon-draft.dirty {\n  color: #e4bd77;\n}\n\n.stellar-local-horizon-apply,\n.stellar-local-horizon-revert {\n  min-height: 30px;\n  border: 1px solid rgba(255, 255, 255, 0.12);\n  border-radius: 6px;\n  padding: 0 10px;\n  color: #dce8f2;\n  background: rgba(255, 255, 255, 0.035);\n  font-size: 10px;\n  font-weight: 700;\n}\n\n.stellar-local-horizon-apply {\n  border-color: rgba(95, 168, 211, 0.38);\n  background: rgba(66, 132, 173, 0.14);\n}\n\n.stellar-local-horizon-apply:disabled,\n.stellar-local-horizon-revert:disabled {\n  opacity: 0.42;\n  cursor: default;\n}\n\n`;
  if (!source.includes('.stellar-local-horizon-apply-row {')) {
    source = replaceExactlyOnce(source, marker, `${block}${marker}`, 'stellar CSS insertion');
  }
  fs.writeFileSync(file, source);
}

{
  const file = 'src/renderer/src/MultiPointTerrainEditor.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = replaceIfNeeded(
    source,
    "import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';",
    "import { DemLineOfSightReviewCard } from './DemLineOfSightReviewCard';\nimport { DraftNumberInput } from './DraftNumberInput';",
    'terrain import'
  );
  source = replaceIfNeeded(
    source,
    `              <input\n                max={2_002}\n                min={3}\n                step={1}\n                type="number"\n                value={demManualSampleCount}\n                onChange={(event) => setDemManualSampleCount(Number(event.currentTarget.value))}\n              />`,
    `              <DraftNumberInput\n                max={2_002}\n                min={3}\n                step={1}\n                value={demManualSampleCount}\n                onCommit={setDemManualSampleCount}\n              />`,
    'terrain DEM sample count'
  );
  source = replaceIfNeeded(
    source,
    `                <input\n                  disabled={disabled}\n                  max={99.999}\n                  min={0.001}\n                  step={0.1}\n                  type="number"\n                  value={point.distancePercent}\n                  onChange={(event) => {\n                    const value = event.currentTarget.valueAsNumber;\n                    if (!Number.isFinite(value)) return;\n                    apply(() => updateManualTerrainPoint(sortedPoints, point.id, {\n                      distancePercent: value\n                    }));\n                  }}\n                />`,
    `                <DraftNumberInput\n                  disabled={disabled}\n                  max={99.999}\n                  min={0.001}\n                  step={0.1}\n                  value={point.distancePercent}\n                  onCommit={(value) => apply(() => updateManualTerrainPoint(sortedPoints, point.id, {\n                    distancePercent: value\n                  }))}\n                />`,
    'terrain point distance'
  );
  source = replaceIfNeeded(
    source,
    `                <input\n                  disabled={disabled}\n                  max={100_000}\n                  min={-12_000}\n                  step={0.1}\n                  type="number"\n                  value={point.elevationM}\n                  onChange={(event) => {\n                    const value = event.currentTarget.valueAsNumber;\n                    if (!Number.isFinite(value)) return;\n                    apply(() => updateManualTerrainPoint(sortedPoints, point.id, {\n                      elevationM: value\n                    }));\n                  }}\n                />`,
    `                <DraftNumberInput\n                  disabled={disabled}\n                  max={100_000}\n                  min={-12_000}\n                  step={0.1}\n                  value={point.elevationM}\n                  onCommit={(value) => apply(() => updateManualTerrainPoint(sortedPoints, point.id, {\n                    elevationM: value\n                  }))}\n                />`,
    'terrain point elevation'
  );
  fs.writeFileSync(file, source);
}

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.tsx')) output.push(full);
  }
  return output;
}

console.log('Remaining renderer type="number" fields:');
let remaining = 0;
let directValueAsNumber = 0;
for (const file of walk('src/renderer/src')) {
  const source = fs.readFileSync(file, 'utf8');
  const count = (source.match(/type="number"/g) ?? []).length;
  const directCount = (source.match(/valueAsNumber/g) ?? []).length;
  if (count > 0 || directCount > 0) {
    remaining += count;
    directValueAsNumber += directCount;
    console.log(`${file}: type=number ${count}, valueAsNumber ${directCount}`);
  }
}
console.log(`TOTAL type=number=${remaining}; valueAsNumber=${directValueAsNumber}`);
