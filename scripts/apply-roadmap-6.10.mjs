import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.9.md\`](roadmap-stage-6.9.md)

### Sonraki astronomi dilimleri

- doğrulanmış BSC5P proper-motion verisini katalog ve yıldız gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.9.md\`](roadmap-stage-6.9.md)

### Aşama 6.10 — BSC5P resmi kaynak satırı ve doğrulama temeli

Durum: tamamlandı · \`1.13.2\`

- CDS V/50 197 karakterlik sabit-genişlik ana kayıt parserı
- HR, J2000 RA/Dec, V kadri, pmRA/pmDE, paralaks ve radyal hız byte alanlarını açık sözleşmeyle okuma
- boş sayısal alanları sıfır uydurmadan \`null\` koruma
- pmRA semantiğini \`μ_α*=cos(δ)·dα/dt\` olarak koruma
- kaynak satırını HR + J2000 konum + V kadriyle çevrimdışı yıldız referansına doğrulama
- proper motion isteniyorsa pmRA ve pmDE'nin ikisini de zorunlu tutma
- doğrulanmamış 19-yıldız hareket değerini henüz ürün kataloğuna eklememe

Ayrıntı: [\`roadmap-stage-6.10.md\`](roadmap-stage-6.10.md)

### Sonraki astronomi dilimleri

- resmi BSC5P kayıtlarından 19 yıldızın doğrulanmış proper-motion altkümesini üretme ve gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.9 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.9 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.10 roadmap summary applied.');
