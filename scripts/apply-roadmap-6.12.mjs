import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.11.md\`](roadmap-stage-6.11.md)

### Sonraki astronomi dilimleri

- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- optik yıldız görünürlüğü ve topoğrafik ufuk
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.11.md\`](roadmap-stage-6.11.md)

### Aşama 6.12 — Yıldız yerel ufuk / skyline maskesi temeli

Durum: tamamlandı · \`1.13.4\`

- astronomik/geometrik 0° ufuk ile azimuta bağlı yerel/doğal ufku ayrı sözleşmeler olarak tutma
- 3–1.440 noktalı döngüsel azimut/yükseklik skyline maskesi
- 360°/0° kuzey sınırında kesintisiz doğrusal interpolasyon
- geometrik açıklık \`Δh = h_yıldız - h_yerel_ufuk\` ve above/on-horizon/below sınıfları
- manual/external/derived kaynak provenansı ve en büyük azimut örnekleme boşluğu
- mevcut tek-doğrultulu rota DEM profilini 360° skyline gibi sessizce kullanmama
- atmosferik kırılma ve çıplak-göz görünürlüğünü bu aşamaya karıştırmama

Ayrıntı: [\`roadmap-stage-6.12.md\`](roadmap-stage-6.12.md)

### Sonraki astronomi dilimleri

- astronomik atmosferik kırılmayı ayrı apparent-altitude katmanı olarak ekleme
- yerel ufuk maskesini yıldız izi ve geçiş hesaplarına bağlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.11 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.11 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.12 roadmap summary applied.');
