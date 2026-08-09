# Aşama 6.6 — Yıldız konumu ve iz geometrisi çekirdeği

Durum: tamamlandı · `1.12.1`

## Amaç

Yıldız gözlemleri için katalog/arayüz katmanından bağımsız, açık koordinat sistemi sözleşmesine sahip geometrik yerel konum ve zaman boyunca yıldız izi çekirdeğini kurmak.

## Kapsam

- açık UTC ofsetli gözlem anı
- WGS84 gözlem enlem/boylamı
- gözlem tarihinin ortalama ekvator/equinox sistemine ait sağ açıklık ve deklinasyon girdisi
- yaklaşık Greenwich ve yerel ortalama yıldız zamanı (GMST / LMST)
- yıldız saat açısı
- geometrik yerel yükseklik ve kuzey referanslı azimut
- tam zenit/nadir doğrultusunda azimutu sayı uydurmak yerine `null` bırakma
- üst/alt geçiş yüksekliğinden günlük geometrik ufuk sınıfı:
  - sürekli ufuk üstü (circumpolar)
  - doğup batan
  - hiç doğmayan
  - ufka teğet/sınır durum
- seçilebilir başlangıç, süre ve örnek aralığıyla en fazla 48 saatlik yıldız izi
- iz örnekleri arasında geometrik `0°` ufuk geçişlerini ikili kök aramayla inceltme
- pencere içindeki geometrik ufuk-üstü süre
- tipli `ModelPrediction` adaptörü ve `stellar-position` yetenek sözleşmesi
- hesap izi ve koruyucu girdi doğrulaması

## Bilimsel sınır

Bu dilim katalog koordinatını sessizce J2000/ICRS kabul etmez. Girdi sağ açıklık/deklinasyonunun **gözlem tarihine ait ortalama ekvatoryal koordinat** olması gerekir. J2000/ICRS katalog verisini gözlem tarihine taşıyan precession/nutation, proper motion, parallax ve aberration dönüşümleri sonraki dilimde ayrı, izlenebilir bir sözleşmeyle eklenecektir.

Yerel yıldız zamanı ortalama (mean) kanaldır. UTC, pratik yaklaşık çözüm için UT1 vekili olarak kullanılır; equation-of-equinoxes/nutation uygulanmadığından sonuç GAST değil GMST/LMST tabanlıdır.

Görünürlük yalnız geometrik `h ≥ 0°` anlamındadır. Atmosferik kırılma, sönümleme, yıldız parlaklığı, Güneş/Ay kaynaklı gökyüzü parlaklığı, bulut ve topoğrafik ufuk bu aşamada görünürlük kararına katılmaz.

Yıldız izi, gök koordinatının yerel yatay sistemde zamanla değişen geometrik yoludur; kamera lensi, poz süresi, sensör veya fotoğraf piksel izi modeli değildir.

Bu astronomik referans İdeal Küre, Tanımlı Düzlem veya başka bir Dünya şekli modeline otomatik yıldız/gökyüzü fiziği atamaz.

## Referans yaklaşımı

Yerel ortalama yıldız zamanı hesabı, US Naval Observatory'nin yaklaşık sidereal-time denklem ailesiyle aynı fiziksel büyüklükleri kullanır. Projedeki Ay konumu çekirdeğiyle de aynı Julian zaman / GMST yönelimi korunur.

## Sonraki adım

- J2000/ICRS katalog koordinatı → gözlem tarihi dönüşümü
- sınırlı ve provenanslı parlak yıldız kataloğu
- Yıldız Gözlemleri arayüzü
- yıldız konumu/iz snapshot'larının kayıt, `.ggl.json` ve HTML rapora bağlanması
- geometrik ufuktan ayrı optik görünürlük (gökyüzü parlaklığı / sönümleme) sözleşmesi
