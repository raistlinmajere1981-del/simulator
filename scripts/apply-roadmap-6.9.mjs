import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.8.md\`](roadmap-stage-6.8.md)

### Sonraki astronomi dilimleri

- proper motion ve katalog epoch düzeltmeleri
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.8.md\`](roadmap-stage-6.8.md)

### Aşama 6.9 — Yıldız proper motion ve katalog epok temeli

Durum: tamamlandı · \`1.13.1\`

- BSC5P \`μ_α*=cos(δ)·dα/dt\` proper-motion semantiğini açık sözleşme olarak koruma
- iki açısal proper-motion bileşenini ekvatoryal teğet bazda birleştirme
- gök kutuplarında \`1/cos(δ)\` tekilliğine düşmeden birim küre üzerinde yayılım
- ileri/geri epok dönüşümü, açısal kayma ve hesap izi
- paralaks/radyal hız/perspektif ivmelenmesini uygulanmış gibi göstermeme
- doğrulanmamış katalog hareket değerlerini altkümeye eklememe

Ayrıntı: [\`roadmap-stage-6.9.md\`](roadmap-stage-6.9.md)

### Sonraki astronomi dilimleri

- doğrulanmış BSC5P proper-motion verisini katalog ve yıldız gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.8 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.8 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.9 roadmap summary applied.');
