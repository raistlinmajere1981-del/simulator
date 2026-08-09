# Aşama 6.8 — Yıldız Gözlemleri arayüzü ve kayıt entegrasyonu

Durum: tamamlandı · `1.13.0`

## Amaç

Aşama 6.6 yıldız konumu/iz geometrisi ile Aşama 6.7 katalog-precession katmanını masaüstü uygulamasında ayrı bir Yıldız Gözlemleri iş akışına bağlamak ve sonuçların mevcut deney kayıt/portable/rapor mekanizmasında korunmasını sağlamak.

## Kapsam

- sol senaryo menüsünde `Yıldız Gözlemleri` iş akışını etkinleştirme
- ortak astronomi zaman kartını Güneş/Ay/Gölge/Yıldız senaryoları için genelleştirme
- WGS84 gözlemci enlem/boylamı ve açık UTC ofsetli fiziksel gözlem anı
- çevrimdışı 19 yıldızlık parlak-yıldız referans kataloğundan seçim
- seçilen yıldız için katalog adı, Bayer gösterimi, takımyıldız, HR numarası ve görsel kadir
- J2000 katalog RA/Dec ile gözlem tarihinin ortalama RA/Dec değerlerini yan yana gösterme
- IAU 2006 precession açısal kaymasını açık gösterme
- anlık geometrik yükseklik, azimut, saat açısı, LMST ve günlük ufuk sınıfı
- 3/6/12/24/48 saat yıldız izi penceresi
- 5/10/15/30/60 dakika örnekleme aralığı
- geometrik 0° ufuk çizgili yıldız yüksekliği zaman grafiği
- pencere içindeki geometrik ufuk-üstü süre ve doğuş/batış olayları
- yıldız seçimi ve iz ayarlarını ayrı top-level JSON alanı yerine model prediction snapshot metriklerinde saklama
- kayıt yeniden açıldığında yıldız/iz ayarlarını snapshot'tan geri kurma
- genel `.ggl.json` prediction mekanizmasıyla taşınabilir kayıt korunumu
- genel HTML raporunda yıldız gözlem model adı, metrikler, varsayımlar, uyarılar ve hesap izi
- model hesap izi diyaloğuna yıldız referansını bağlama

## Bilimsel sınırlar

Bu panelde `görünür` sözcüğü optik çıplak-göz görünürlüğü anlamına gelmez. Geometrik görünürlük yalnız yıldız merkezinin ideal yerel `0°` ufkun üstünde olup olmadığını belirtir.

Atmosferik kırılma, atmosferik sönümleme, bulut, aerosol, gökyüzü parlaklığı, Ay/Güneş parlaması, ışık kirliliği, topoğrafik ufuk ve kamera pozlama koşulları uygulanmaz.

Katalog yönüne IAU 2006 precession uygulanır; proper motion, yıllık paralaks, radyal hız, nutation, aberration ve relativistik ışık sapması henüz uygulanmaz. Özellikle yüksek proper-motion yıldızlar için uzun zaman aralıklarında bu sınırlama önemlidir.

Yıldız astronomisi bu aşamada Dünya şekli modellerine otomatik fiziksel davranış atamaz. Yıldız izi astronomik referans olarak ayrı tutulur.

## Kayıt sözleşmesi

Yıldız iş akışı `scenarioId = stellar-observation` olarak saklanır. Seçilen yıldız HR numarası ve iz süresi/örnekleme ayarları `stellar-observation-reference` prediction metriklerinde bulunur. Bu nedenle mevcut portable schema sürümünü değiştirmeden kayıt, export/import ve reopen yapılabilir.

## Manuel doğrulama

UI entegrasyonu CI'dan sonra gerçek Electron görünümünde ayrıca kontrol edilmelidir:

1. `Yıldız Gözlemleri` menü öğesi `HAZIR` görünmeli ve açılabilmeli.
2. Varsayılan yıldız Vega olmalı; yıldız seçimi panel değerlerini anında değiştirmeli.
3. Tarih/saat ve gözlemci koordinatı değişince yükseklik/azimut ve iz grafiği güncellenmeli.
4. 3–48 saat iz süresi ile örnekleme seçenekleri çalışmalı.
5. Deney kaydedilip yeniden açıldığında seçilen yıldız ve iz ayarları korunmalı.
6. `Hesap izini aç` yıldız katalog/precession/yerel konum adımlarını göstermeli.
7. `.ggl.json` export/import sonrasında yıldız senaryosu ve ayarlar korunmalı.
8. HTML raporda `Yıldız Gözlemi · Astronomik Referans` bölümü görünmeli.

## Sonraki adım

- proper motion ve daha yüksek hassasiyetli katalog epoch düzeltmeleri
- optik yıldız görünürlüğü: kırılma, sönümleme ve gökyüzü parlaklığı
- topoğrafik ufuk maskesi
- çoklu yıldız izi / gerçek gökyüzü görselleştirme katmanı
