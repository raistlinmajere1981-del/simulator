import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.13.md\`](roadmap-stage-6.13.md)

### Sonraki astronomi dilimleri

- yerel ufuk maskesini yıldız izi ve geometrik local-horizon geçiş hesaplarına bağlama
- refraction ile local skyline'ın güvenli karşılaştırma sözleşmesini tanımlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.13.md\`](roadmap-stage-6.13.md)

### Aşama 6.14 — Yerel ufuk maskeli yıldız izi ve geçişleri

Durum: tamamlandı · \`1.13.6\`

- 6.12 skyline maskesini 6.6 geometrik yıldız izi üzerine ayrı katman olarak bağlama
- her örnekte \`Δh = h_yıldız - h_skyline(A)\` geometrik açıklığı
- çıktı örneklemesinden bağımsız en fazla 15 saniyelik local-horizon kök taraması
- işaret değişimlerini 250 ms altı zaman aralığına kadar ikili kök aramayla inceltme
- yerel ufuk doğuş/batış olayları ve pencere içi yerel-ufuk üstü geometrik süre
- maske kaynak türü, etiket, nokta sayısı ve en büyük azimut boşluğunu provenans olarak koruma
- mevcut astronomik 0° yıldız izi API'sini değiştirmeme
- atmosferik apparent altitude ile geometrik skyline'ı sessizce birleştirmeme

Ayrıntı: [\`roadmap-stage-6.14.md\`](roadmap-stage-6.14.md)

### Sonraki astronomi dilimleri

- yerel ufuk maskesini Yıldız Gözlemleri arayüzü, kayıt, portable ve HTML rapora bağlama
- refraction ile local skyline'ın güvenli karşılaştırma sözleşmesini tanımlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.13 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.13 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.14 roadmap summary applied.');
