# Aşama 6.23 — BSC5P proper-motion kaynak importu ve provenans

Durum: geliştirme / manuel doğrulama öncesi · `1.18.0`

## Amaç

Aşama 6.22'de hazır hale gelen doğrulanmış proper-motion hesap girişini masaüstü uygulamanın gerçek veri akışına bağlamak. Kullanıcı resmi BSC5P `V/50/catalog` dosyasını seçer; uygulama 19 parlak yıldızın kaydını sabit-genişlik parser ile bulur ve her satırı mevcut çevrimdışı yıldız referansına karşı HR + J2000 yönü + V kadri üzerinden doğrular.

## Kaynak kabulü

- kaynak: CDS V/50 · Bright Star Catalogue, 5th Revised Edition,
- biçim: 197-karakter sabit genişlikli `catalog` kayıtları,
- maksimum dosya: 4 MB,
- gerekli altküme: ürün kataloğundaki 19 yıldızın tamamı,
- her yıldız için `pmRA` ve `pmDE` dolu olmalı,
- `pmRA`, kaynak sözleşmesindeki `μ_α*=cos(δ)·dα/dt` bileşenidir,
- bir yıldız eksik/uyuşmazsa kaynak bütünüyle reddedilir; 18/19 gibi kısmi uygulama yoktur.

## UI akışı

Proper-motion kaynak seçimi yıldız hesabını doğrudan değiştirmez. Kaynak önce taslak olarak doğrulanır ve özet kartında gösterilir. Kullanıcı `Uygula ve hesapla` dediğinde kaynak tek seferde seçili yıldız ve 19-yıldız snapshot hesabına bağlanır. `Kaynağı kaldır` da aynı taslak/uygula akışıyla çalışır.

Bu davranış, yerel skyline editöründe kullanılan performans ilkesini korur: dosya seçimi ve kaynak düzenleme ağır hesap zincirini her UI olayında yeniden tetiklemez.

## Persistence ve bütünlük

Portable / local-store şeması v9'dur.

Kayda:

- dosya adı,
- içe aktarma zamanı,
- tam kaynak dosya boyutu,
- tam kaynak dosyanın SHA-256 özeti,
- subset/format sürümü,
- FK5/J2000 kaynak epoku,
- 19 doğrulanmış kaydın canonical alanları,
- aynı 19 kaydın exact 197-karakter kaynak satırları

yazılır.

Tüm ~1,8 MB katalog deney JSON'una gömülmez. Yeniden açılışta 19 raw satır tekrar BSC5P parser + referans doğrulamasından geçirilir ve persisted PM değerleri canonical sonuçla karşılaştırılır. Sayı/satır eşleşmesi bozulmuşsa portable kayıt reddedilir.

## Rapor

HTML raporda proper-motion kaynak provenansı ayrı bölümde gösterilir. Seçili yıldızın gerçekten uygulanan `μ_α*`, `μ_δ`, kaynak epok ve toplam açısal motion kayması ise Yıldız Gözlemi prediction metrikleri ve hesap izinde yer alır.

## Polar gökyüzü sayaç düzeltmesi

6.21'de tüm 19 yıldız için verilen local-skyline toplamları haritada yalnız üst geometrik yarımküre çizildiği için ilk bakışta karışabiliyordu. 6.23'te özet üç ayrı kavramı açıkça ayırır:

1. haritada çizilen yıldız sayısı,
2. geometrik 0° üstü / altında ve çizilmeyen yıldız sayısı,
3. yalnız haritada çizilen yıldızların local-skyline üstü / sınır / altı dağılımı.

## Bilimsel sınır

Proper motion uygulaması yalnız iki açısal BSC5P bileşenidir. Paralaks, radyal hız ve perspektif ivmelenmesi bu yayılımda kullanılmaz. Nutation, aberration ve apparent-place düzeltmeleri de ayrı fizik/astrometri katmanları olarak kalır.

## Manuel kontrol

Final CI temizlendikten sonra gerçek Electron'da resmi BSC5P `catalog` dosyası ile şu akış doğrulanacaktır:

- dosya seçimi → 19/19 doğrulama kartı,
- seçim anında ağır hesap olmaması,
- `Uygula ve hesapla` sonrası PM metriklerinin görünmesi,
- polar gökyüzü sayaçlarının yeni ayrımı,
- deney kaydet/aç ile kaynak kartının korunması,
- mümkünse portable export/import ve HTML rapor provenansı.
