import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const current = fs.readFileSync(path, 'utf8');
  const count = current.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: beklenen parça ${count} kez bulundu`);
  fs.writeFileSync(path, current.replace(before, after));
}

replaceOnce('tests/report.test.ts', "expect(html).toContain('Taşınabilir deney şeması v8');", "expect(html).toContain('Taşınabilir deney şeması v9');");
replaceOnce('tests/stellar-skyline-portable.test.ts', "describe('stellar skyline portable v8'", "describe('stellar skyline portable v9'");
replaceOnce('tests/stellar-skyline-portable.test.ts', "expect(portable.schemaVersion).toBe(8);\n    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(8);", "expect(portable.schemaVersion).toBe(9);\n    expect(PORTABLE_EXPERIMENT_SCHEMA_VERSION).toBe(9);");
replaceOnce(
  'tests/stellar-motion-source.test.ts',
  "    const line = source.entries[0]!.sourceRecord.split('');\n    line[148] = line[148] === '0' ? '1' : '0';\n    source.entries[0] = { ...source.entries[0]!, sourceRecord: line.join('') };",
  "    const line = source.entries[0]!.sourceRecord.split('');\n    const replacement = ' 0.101';\n    for (let index = 0; index < replacement.length; index += 1) line[148 + index] = replacement[index]!;\n    source.entries[0] = { ...source.entries[0]!, sourceRecord: line.join('') };"
);

replaceOnce(
  'src/main/index.ts',
  "filters: [{ name: 'BSC5P catalog / metin dosyası', extensions: ['txt', 'dat', 'catalog', '*'] }]",
  "filters: [{ name: 'BSC5P catalog / tüm dosyalar', extensions: ['*'] }]"
);

replaceOnce(
  'src/renderer/src/StellarObservationPanel.tsx',
  "        {motionImportMessage && <p className=\"stellar-motion-message\" role=\"status\">{motionImportMessage}</p>}\n        <div className=\"stellar-motion-apply-row\">",
  "        {stellarMotionSource && result.properMotion && !motionSourceDirty && (\n          <div className=\"stellar-motion-result\">\n            <span>Uygulanan toplam PM kayması <strong>{angleFormatter.format(result.properMotion.angularShiftArcsec)}″</strong></span>\n            <span>J{angleFormatter.format(result.properMotion.sourceEpochJulianYear)} → gözlem epoch'u <strong>{angleFormatter.format(result.properMotion.elapsedJulianYears)} Jülyen yıl</strong></span>\n          </div>\n        )}\n        {motionImportMessage && <p className=\"stellar-motion-message\" role=\"status\">{motionImportMessage}</p>}\n        <div className=\"stellar-motion-apply-row\">"
);
fs.appendFileSync('src/renderer/src/stellar-observation-panel.css', `\n.stellar-motion-result { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 9px; padding: 8px 10px; border-radius: 6px; background: rgba(50, 112, 88, .14); color: #9bb2c1; font-size: 11px; }\n.stellar-motion-result strong { margin-left: 4px; color: #b7efd8; }\n`);

console.log('stage 6.23 final fixes applied');
