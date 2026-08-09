import fs from 'node:fs';

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${label}: beklenen blok bulunamadı.`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: beklenen blok birden fazla bulundu.`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

{
  const path = 'docs/roadmap.md';
  let source = fs.readFileSync(path, 'utf8');
  const before = `Ayrıntı: [\`roadmap-stage-6.14.md\`](roadmap-stage-6.14.md)

### Sonraki astronomi dilimleri

- yerel ufuk maskesini Yıldız Gözlemleri arayüzü, kayıt, portable ve HTML rapora bağlama
- refraction ile local skyline'ın güvenli karşılaştırma sözleşmesini tanımlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;
  const after = `Ayrıntı: [\`roadmap-stage-6.14.md\`](roadmap-stage-6.14.md)

### Aşama 6.15 — Yıldız yerel ufuk arayüzü, kayıt ve rapor entegrasyonu

Durum: tamamlandı · \`1.14.0\`

- yerel ufku varsayılan kapalı, sekiz yönlü manuel skyline editörüyle kullanıcıya açma
- K/KD/D/GD/G/GB/B/KB yön değerlerini 6.12 döngüsel interpolasyon sözleşmesine bağlama
- astronomik \`0°\` ufuk ile yerel skyline'ı grafikte ayrı çizgiler ve ayrı durum/geçiş sonuçları olarak tutma
- anlık yerel ufuk yüksekliği, geometrik açıklık ve yerel-ufuk üstü süreyi prediction metriklerine ekleme
- sekiz yönü mevcut prediction snapshot içinde saklayıp yeni top-level portable şema alanı açmama
- kayıt/reopen, \`.ggl.json\` round-trip ve HTML rapor korunumu
- 6.15 öncesi yıldız kayıtlarını yerel ufuk kapalı ve 0° yön değerleriyle güvenli açma
- atmosferik apparent altitude ile geometrik skyline'ı otomatik görünürlük sonucuna dönüştürmeme

Ayrıntı: [\`roadmap-stage-6.15.md\`](roadmap-stage-6.15.md)

### Sonraki astronomi dilimleri

- yüksek çözünürlüklü skyline CSV/JSON importu ve kaynak bütünlüğü
- refraction ile local skyline'ın güvenli karşılaştırma sözleşmesini tanımlama
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış 19-yıldız motion veri dosyasını üretip gözlem zincirine bağlama
- çoklu yıldız / gökyüzü görselleştirmesi`;
  source = replaceExactlyOnce(source, before, after, 'roadmap');
  fs.writeFileSync(path, source);
}

{
  const path = 'src/renderer/src/StellarObservationPanel.tsx';
  let source = fs.readFileSync(path, 'utf8');
  source = replaceExactlyOnce(source, 'YEREL UFKUK AZİMUTU TANIMSIZ', 'YEREL UFUK AZİMUTU TANIMSIZ', 'panel typo 1');
  source = replaceExactlyOnce(source, 'YEREL UFKUK SINIRINDA', 'YEREL UFUK SINIRINDA', 'panel typo 2');
  fs.writeFileSync(path, source);
}

{
  const path = 'src/renderer/src/AppNext.tsx';
  let source = fs.readFileSync(path, 'utf8');
  source = replaceExactlyOnce(
    source,
    'Katalog yıldızı, J2000→gözlem tarihi dönüşümü ve geometrik yıldız izi ana deney alanında gösterilir.',
    'Katalog yıldızı, J2000→gözlem tarihi dönüşümü, geometrik yıldız izi ve isteğe bağlı yerel skyline ana deney alanında gösterilir.',
    'stellar sidebar text'
  );
  fs.writeFileSync(path, source);
}

console.log('Stage 6.15 roadmap and UI text polish applied.');
