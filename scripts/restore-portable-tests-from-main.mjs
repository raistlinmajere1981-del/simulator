import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function fromMain(path) {
  return execFileSync('git', ['show', `origin/main:${path}`], { encoding: 'utf8' });
}

let portable = fromMain('tests/portable.test.ts');
const oldSourceVersion = 'expect(parsed.sourceVersion).toBe(7);';
const newSourceVersion = 'expect(parsed.sourceVersion).toBe(PORTABLE_EXPERIMENT_SCHEMA_VERSION);';
if (!portable.includes(oldSourceVersion)) throw new Error('Main portable current-version expectation bulunamadı.');
portable = portable.replace(oldSourceVersion, newSourceVersion);
fs.writeFileSync('tests/portable.test.ts', portable);

let report = fromMain('tests/report.test.ts');
const oldReportVersion = "expect(html).toContain('Taşınabilir deney şeması v7');";
const newReportVersion = "expect(html).toContain('Taşınabilir deney şeması v8');";
if (!report.includes(oldReportVersion)) throw new Error('Main report schema expectation bulunamadı.');
report = report.replace(oldReportVersion, newReportVersion);
fs.writeFileSync('tests/report.test.ts', report);
