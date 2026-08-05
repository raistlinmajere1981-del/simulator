# Deney Sistemi

## Temel akış

1. Kullanıcı ölçülebilir deney girdilerini tanımlar.
2. Aynı deney seçili bütün modellere gönderilir.
3. Her model yalnızca tanımladığı kurallarla tahmin üretir.
4. Tahmin, gerçek gözlem ve belirsizlik aralığıyla karşılaştırılır.
5. Arayüz görünürlük, fark, durum ve model uyarılarını birlikte gösterir.

## İlk çalışan deney: hedef görünürlüğü

Zorunlu girdiler:

- Gözlemci yüksekliği
- Hedef yüksekliği
- Yüzey mesafesi
- Gözlenen görünür oran
- Gözlem belirsizliği

İsteğe bağlı bağlam:

- Atmosfer kapalı
- Standart kırılma
- Kırılma katsayısı

Üretilen metrikler:

- Görünür hedef yüksekliği
- Gizlenen hedef yüksekliği
- Görünür oran
- Gizlenen oran
- Yüzey üzerindeki ufuk mesafesi
- Hedef tepe görüş açısı
- Teğete göre yüzey düşümü
- Gözlem ile tahmin arasındaki yüzde puan farkı

## Durum değerlendirmesi

Gözlenen görünürlük `değer ± belirsizlik` olarak tutulur.

- Tahmin belirsizlik aralığındaysa `compatible`
- Fark bir ile iki belirsizlik arasındaysa `indeterminate`
- Fark iki belirsizlikten büyükse `incompatible`
- Model gerekli fiziksel kuralları tanımlamıyorsa `unsupported`

Bu sınıflandırma modelin genel doğruluğu veya bilimsel güven puanı değildir. Yalnızca tanımlanan tek deneydeki tahmin-gözlem ilişkisini ifade eder.

## Model davranışları

### İdeal küre

- Ortalama Dünya yarıçapını kullanır.
- Atmosfer kapalıyken saf geometrik sonuç üretir.
- Standart kırılmada etkin yarıçap yaklaşımını kullanır.
- Arazi, dalga ve katmanlı atmosfer dahil değildir.

### Tanımlı düzlem

- Sonsuz ve engelsiz düzlem varsayar.
- Işığın doğrusal ilerlediğini kabul eder.
- Sonlu geometrik ufuk üretmez.
- Atmosferik kırılma kuralı henüz tanımlı değildir.

### Azimutal gösterim

- Fiziksel yüzey modeli değildir.
- Dikey yön, ışık yolu ve ufuk kuralları tanımlı olmadığı için hedef görünürlüğü sonucu üretmez.

## Sonraki genişletmeler

- Deneyleri JSON olarak kaydetme
- Koordinatlardan model bağımsız ölçüm mesafesi alma
- WGS84 elipsoid
- Arazi profili
- Gelişmiş atmosferik ışın izleme
- Fotoğraf kalibrasyonu
