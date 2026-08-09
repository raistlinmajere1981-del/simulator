import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const sourcePath = '.github/scripts/apply-stage-6.22.mjs';
let source = fs.readFileSync(sourcePath, 'utf8');

const helperAnchor = `function replaceOnce(path, before, after) {\n  const current = fs.readFileSync(path, 'utf8');\n  const count = current.split(before).length - 1;\n  if (count !== 1) throw new Error(\`\${path}: beklenen parça \${count} kez bulundu\`);\n  fs.writeFileSync(path, current.replace(before, after));\n}\n`;
const helperReplacement = `${helperAnchor}\nfunction replaceExpected(path, before, after, expectedCount) {\n  const current = fs.readFileSync(path, 'utf8');\n  const count = current.split(before).length - 1;\n  if (count !== expectedCount) {\n    throw new Error(\`\${path}: beklenen \${expectedCount} eşleşme yerine \${count} bulundu\`);\n  }\n  fs.writeFileSync(path, current.split(before).join(after));\n}\n`;
if (!source.includes(helperAnchor)) throw new Error('replaceOnce helper anchor bulunamadı');
source = source.replace(helperAnchor, helperReplacement);

const oldBlock = `for (let index = 0; index < 3; index += 1) {\n  replaceOnce(\n    'src/simulation/stellar-sky-snapshot.ts',\n    \"        aboveGeometricHorizon: position.aboveGeometricHorizon,\\n        localHorizonAltitudeDeg:\",\n    \"        aboveGeometricHorizon: position.aboveGeometricHorizon,\\n        ...motionFields,\\n        localHorizonAltitudeDeg:\"\n  );\n}\n`;
const newBlock = `replaceExpected(\n  'src/simulation/stellar-sky-snapshot.ts',\n  \"        aboveGeometricHorizon: position.aboveGeometricHorizon,\\n        localHorizonAltitudeDeg: null,\",\n  \"        aboveGeometricHorizon: position.aboveGeometricHorizon,\\n        ...motionFields,\\n        localHorizonAltitudeDeg: null,\",\n  2\n);\nreplaceExpected(\n  'src/simulation/stellar-sky-snapshot.ts',\n  \"      aboveGeometricHorizon: position.aboveGeometricHorizon,\\n      localHorizonAltitudeDeg: local.localHorizonAltitudeDeg,\",\n  \"      aboveGeometricHorizon: position.aboveGeometricHorizon,\\n      ...motionFields,\\n      localHorizonAltitudeDeg: local.localHorizonAltitudeDeg,\",\n  1\n);\n`;
if (!source.includes(oldBlock)) throw new Error('eski snapshot loop bloğu bulunamadı');
source = source.replace(oldBlock, newBlock);

const preSkyDescription = 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.';
const currentSkyDescription = 'Çevrimdışı parlak yıldız kataloğundan seçilen J2000 yönünü ve 19-yıldız çoklu gökyüzü snapshotını gözlem tarihine dönüştürüp geometrik yerel konum, yıldız izi, isteğe bağlı geometrik skyline açıklığı ve ayrı standart-refraction apparent tanısı üreten astronomik referans.';
if (!source.includes(preSkyDescription)) throw new Error('6.21 metadata description anchor bulunamadı');
source = source.replace(preSkyDescription, currentSkyDescription);

const temporaryPath = '/tmp/apply-stage-6.22-fixed.mjs';
fs.writeFileSync(temporaryPath, source);
execFileSync(process.execPath, [temporaryPath], { stdio: 'inherit' });
