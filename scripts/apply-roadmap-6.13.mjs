import fs from 'node:fs';

const path = 'docs/roadmap.md';
let source = fs.readFileSync(path, 'utf8');
const before = `Ayrıntı: [\`roadmap-stage-6.12.md\`](roadmap-stage-6.12.md)

### Sonraki astronomi dilimleri

- astronomik atmosferik kırılmayı ayrı apparent-altitude katmanı olarak ekleme
- yerel ufuk maskesini yıldız izi ve geçiş hesaplarına bağlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;
const after = `Ayrıntı: [\`roadmap-stage-6.12.md\`](roadmap-stage-6.12.md)

### Aşama 6.13 — Standart astronomik kırılma / apparent altitude temeli

Durum: tamamlandı · \`1.13.5\`

- NOAA GML parçalı standart atmosferik refraction yaklaşımı
- geometric altitude → refraction correction → apparent altitude zinciri
- 85° üstü, yüksek irtifa, yakın ufuk ve ufuk-altı formül bölgelerini açık tutma
- point-source yıldız hesabına Güneş semidiameter düzeltmesi taşımama
- gerçek basınç/sıcaklık/nem/dalga boyu kullanılmadığını açık sınırlama olarak koruma
- mevcut Ciddor terrestrial-ray motorunu yıldız apparent-altitude problemiyle sessizce eşitlememe
- apparent yıldız yüksekliğini geometrik local skyline'a otomatik kıyaslayıp görünürlük sonucu üretmeme

Ayrıntı: [\`roadmap-stage-6.13.md\`](roadmap-stage-6.13.md)

### Sonraki astronomi dilimleri

- yerel ufuk maskesini yıldız izi ve geometrik local-horizon geçiş hesaplarına bağlama
- refraction ile local skyline'ın güvenli karşılaştırma sözleşmesini tanımlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;

const first = source.indexOf(before);
if (first < 0) throw new Error('6.12 sonrası roadmap bloğu bulunamadı.');
if (source.indexOf(before, first + before.length) >= 0) throw new Error('6.12 sonrası roadmap bloğu birden fazla bulundu.');
source = source.slice(0, first) + after + source.slice(first + before.length);
fs.writeFileSync(path, source);
console.log('Stage 6.13 roadmap summary applied.');
