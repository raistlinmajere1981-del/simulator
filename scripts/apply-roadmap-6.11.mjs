import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.10.md\`](roadmap-stage-6.10.md)

### Sonraki astronomi dilimleri

- resmi BSC5P kayıtlarından 19 yıldızın doğrulanmış proper-motion altkümesini üretme ve gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.10.md\`](roadmap-stage-6.10.md)

### Aşama 6.11 — Doğrulanmış BSC5P motion altküme üretimi

Durum: tamamlandı · \`1.13.3\`

- ürünün 19 HR kaydını resmi kaynak kayıtlarından deterministik seçme
- her satırı 6.10 HR + J2000 konum + V-kadir doğrulamasından geçirme
- pmRA ve pmDE'nin ikisini de zorunlu tutma; \`0\` ile eksik \`null\` değerini ayırma
- tek bir yıldız eksik/bozuksa kısmi motion altkümesi üretmeme
- kaynak J2000 astrometrisini, paralaks/radyal hız alanlarını ve özgün 197 karakterlik satırı provenans için koruma
- sabit katalog sırası ve deterministik JSON serileştirme
- resmi kaynak dosyasına erişmeden gerçek 19-yıldız PM sayılarını ürün verisi olarak eklememe

Ayrıntı: [\`roadmap-stage-6.11.md\`](roadmap-stage-6.11.md)

### Sonraki astronomi dilimleri

- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.10 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.10 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.11 roadmap summary applied.');
