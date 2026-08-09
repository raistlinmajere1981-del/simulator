import fs from 'node:fs';

const path = 'src/renderer/src/TextExperimentSetupDialog.tsx';
let source = fs.readFileSync(path, 'utf8');
const before = "  'sun-moon-observation': 'Güneş ve Ay Gözlemleri',\n  'shadow-observation': 'Gölge Deneyi'";
const after = "  'sun-moon-observation': 'Güneş ve Ay Gözlemleri',\n  'shadow-observation': 'Gölge Deneyi',\n  'stellar-observation': 'Yıldız Gözlemleri'";
const first = source.indexOf(before);
if (first < 0 || source.indexOf(before, first + before.length) >= 0) {
  throw new Error('Beklenen scenarioLabels bloğu tekil olarak bulunamadı.');
}
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stellar scenario label added.');
