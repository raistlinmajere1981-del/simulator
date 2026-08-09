import fs from 'node:fs';

const path = 'docs/roadmap.md';
const text = fs.readFileSync(path, 'utf8');
const startMarker = '### Aşama 6.17 — Yüksek çözünürlüklü skyline UI, kayıt ve rapor entegrasyonu';
const endMarker = '\n## Aşama 7 — Büyük ölçekli olaylar';
const start = text.indexOf(startMarker);
const end = text.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Roadmap 6.17–Aşama 7 sınırları bulunamadı.');

const replacement = `### Aşama 6.17 — Yüksek çözünürlüklü skyline UI, kayıt ve rapor entegrasyonu

Durum: tamamlandı · \`1.15.0\`

- manuel 8 yön ve doğrulanmış dış dosya kaynak modlarını açıkça ayırma
- dosya importunu taslak state'te tutup ağır yıldız hesabını yalnız \`Uygula ve hesapla\` ile başlatma
- kaynak kartında dosya adı, biçim, nokta sayısı, maksimum boşluk, SHA-256 ve import zamanı
- yüksek çözünürlüklü noktaları Aşama 6.14 local-horizon trail motoruna bağlama
- prediction'a yalnız hafif kaynak özeti; tam profili tek \`SavedExperiment.stellarLocalHorizonSource\` alanında tutma
- portable/local store şemasını v8'e yükseltip v1–v7 migration'ı koruma
- pointCount, max-gap, SHA ve profil geometrisini import sırasında yeniden doğrulama
- HTML raporda skyline dosya provenansı; ham kaynak baytlarını rapora gömmeme
- gerçek Electron manuel doğrulaması

Ayrıntı: [\`roadmap-stage-6.17.md\`](roadmap-stage-6.17.md)

### Aşama 6.18 — Apparent yıldız / geometrik skyline güvenli tanı sözleşmesi

Durum: tamamlandı · \`1.15.1\`

- standart atmosferik kırılmayla apparent yıldız yüksekliğini ayrı tanı katmanı olarak tutma
- geometrik skyline ile apparent yıldız arasındaki karma-referans farkını açık tanı olarak üretme
- karma farktan yerel optik görünürlük sınıfı üretmeme
- yıldızın geometrik olarak skyline altında olup apparent farkın pozitif olabildiği sınır durumunu regresyonla koruma

Ayrıntı: [\`roadmap-stage-6.18.md\`](roadmap-stage-6.18.md)

### Aşama 6.19 — Standart atmosferik kırılma tanısı UI entegrasyonu

Durum: tamamlandı · \`1.16.0\`

- geometrik ve standart apparent yıldız yüksekliğini ayrı kart ve grafik çizgileriyle gösterme
- refraction tanı anahtarını yalnız renderer state'i olarak tutup ağır hesabı yeniden çalıştırmama
- karma apparent-yıldız / geometrik-skyline farkını yalnız tanı etiketiyle gösterme
- prediction/HTML raporda apparent metrikleri ve \`yerel apparent görünürlük sınıflandırıldı = false\` koruması
- gerçek Electron görünümü ve toggle tepkiselliği manuel doğrulaması

Ayrıntı: [\`roadmap-stage-6.19.md\`](roadmap-stage-6.19.md)

### Aşama 6.20 — Çoklu yıldız gökyüzü snapshot çekirdeği

Durum: tamamlandı · \`1.16.1\`

- çevrimdışı 19-yıldız katalog altkümesini aynı gözlem anında deterministik çözme
- her yıldızda mevcut J2000 → IAU 2006 precession → geometrik yatay konum zincirini yeniden kullanma
- geometrik 0° üstü/altı toplamları
- isteğe bağlı geometrik local skyline sınıfı ve aggregate sayımlar
- katalog/skyline provenansı ve kompakt hesap izi
- optik görünür yıldız listesi üretmeme

Ayrıntı: [\`roadmap-stage-6.20.md\`](roadmap-stage-6.20.md)

### Aşama 6.21 — Çoklu yıldız polar gökyüzü görünümü

Durum: tamamlanma adayı · \`1.17.0\`

- zenit merkezli ve geometrik 0° ufuk çemberli polar üst-yarımküre görünümü
- K/D/G/B yönleri ve 30°/60° yükseklik halkaları
- seçili yıldızı ve en parlak katalog referanslarını etiketleme
- yerel skyline altında kalan geometrik-ufuk-üstü yıldızları ayrı görsel durumda tutma
- görünüm anahtarını hesap state'inden ayırma
- prediction'a yalnız çoklu-yıldız aggregate metrikleri ekleme; tam yıldız dizisini portable kayda kopyalamama
- optik görünürlük ve apparent-altitude haritası üretmeme

Ayrıntı: [\`roadmap-stage-6.21.md\`](roadmap-stage-6.21.md)

### Sonraki astronomi dilimleri

- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- DEM veya panorama gibi kaynaklardan açık provenanslı 360° skyline üretimi
- daha geniş yıldız kataloğu gerekirse performans ve veri-provenans tasarımı
`;

fs.writeFileSync(path, text.slice(0, start) + replacement + text.slice(end));
console.log('roadmap 6.17–6.21 updated');
