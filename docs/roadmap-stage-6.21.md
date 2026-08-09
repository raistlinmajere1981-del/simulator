# Aşama 6.21 — Çoklu yıldız polar gökyüzü görünümü

Durum: tamamlanma adayı · `1.17.0`

## Amaç

Aşama 6.20'nin 19-yıldız geometrik snapshot'ını mevcut Yıldız Gözlemleri paneline salt-gösterim amaçlı zenit merkezli bir polar gökyüzü görünümü olarak bağlamak.

## Görsel sözleşme

- zenit: harita merkezi,
- geometrik `0°` astronomik ufuk: dış çember,
- gerçek kuzey (`K`): üst,
- doğu (`D`): sağ,
- güney (`G`): alt,
- batı (`B`): sol,
- 30° ve 60° geometrik yükseklik yardımcı halkaları,
- yalnız geometrik `h >= 0°` üst yarımküre yıldızları çizilir.

Polar yarıçap:

`r = (90° - h) / 90° · r_ufuk`

Azimut gerçek kuzeyden saat yönünde kullanılır.

## Yıldız gösterimi

- katalogdaki geometrik ufuk üstü yıldızlar nokta olarak çizilir,
- seçili yıldız ayrı vurgu alır,
- en parlak beş geometrik-ufuk-üstü yıldız ve seçili yıldız ad etiketi alır,
- nokta boyutu katalog görsel kadrinden yalnız ayırt edici bir görsel ölçek olarak türetilir,
- yerel skyline etkinse geometrik olarak skyline altında kalan yıldızlar sönük/ayrı durumda çizilir,
- yerel skyline sınırındaki yıldız ayrı sınır görünümü alır.

## Performans

`Çoklu yıldız gökyüzü` anahtarı yalnız renderer state'idir.

Anahtarın açılıp kapanması:

- yıldız izi motorunu,
- 15 saniyelik yerel skyline geçiş taramasını,
- portable state'i

yeniden hesaplamaz.

19-yıldız snapshot normal gözlem sonucu hesaplanırken bir kez üretilir.

## Kayıt / rapor sınırı

Polar haritanın açık/kapalı durumu deney girdisi değildir ve kaydedilmez.

Prediction snapshot'ına yalnız:

- katalog yıldız sayısı,
- geometrik `0°` üstündeki yıldız sayısı,
- varsa yerel skyline üstündeki yıldız sayısı

gibi hafif aggregate metrikler eklenir. Tam 19-yıldız dizi portable kayda ikinci kez kopyalanmaz.

## Bilimsel sınır

Bu görünüm geometriktir ve optik görünürlük haritası değildir.

Özellikle:

- görsel kadir bir çıplak-göz görünürlük eşiğine dönüştürülmez,
- atmosferik sönümleme ve gökyüzü parlaklığı uygulanmaz,
- bulut / seeing uygulanmaz,
- Aşama 6.19 standart apparent tanısı polar haritanın nokta konumlarına uygulanmaz,
- proper motion veri entegrasyonu tamamlanana kadar mevcut katalog sınırlaması korunur.

## Test kapıları

- zenit merkezde,
- K/D/G/B yönleri doğru,
- 45° yükseklik zenit–ufuk yarıçapının yarısında,
- azimut wrap güvenli,
- seçili yıldız snapshot konumu tek-yıldız sonucu ile aynı,
- yerel skyline sınıfları 19 yıldızı eksiksiz kapsar,
- prediction yalnız aggregate çoklu-yıldız metrikleri taşır.

## Sonraki astronomi işleri

- resmi BSC5P kaynak dosyası erişildiğinde proper-motion verisini doğrulanmış 19-yıldız altkümesine bağlama,
- DEM veya panorama gibi kaynaklardan açık provenanslı 360° skyline üretimi,
- gerekirse daha geniş yıldız kataloğu için performans ve veri-provenans tasarımı.
