import fs from 'node:fs';
import path from 'node:path';

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

{
  const file = 'src/renderer/src/AppNext.tsx';
  let source = fs.readFileSync(file, 'utf8');
  source = replaceExactlyOnce(
    source,
    "import { StellarObservationPanel } from './StellarObservationPanel';",
    "import { StellarObservationPanel } from './StellarObservationPanel';\nimport { DraftNumberInput } from './DraftNumberInput';",
    'AppNext import'
  );
  source = replaceExactlyOnce(
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

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.tsx')) output.push(full);
  }
  return output;
}

console.log('Remaining renderer type="number" fields after shared NumericField migration:');
let remaining = 0;
for (const file of walk('src/renderer/src')) {
  const source = fs.readFileSync(file, 'utf8');
  const count = (source.match(/type="number"/g) ?? []).length;
  if (count > 0) {
    remaining += count;
    console.log(`${file}: ${count}`);
  }
}
console.log(`TOTAL=${remaining}`);
