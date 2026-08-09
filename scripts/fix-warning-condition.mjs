import fs from 'node:fs';
const path = 'src/renderer/src/StellarObservationPanel.tsx';
const oldText = 'externalLocalHorizonSource && draftExternalLocalHorizonSource.warnings.length > 0';
const newText = 'draftExternalLocalHorizonSource && draftExternalLocalHorizonSource.warnings.length > 0';
let text = fs.readFileSync(path, 'utf8');
if (!text.includes(newText)) {
  if (!text.includes(oldText)) throw new Error('Beklenen koşul bulunamadı');
  text = text.replace(oldText, newText);
  fs.writeFileSync(path, text);
}
