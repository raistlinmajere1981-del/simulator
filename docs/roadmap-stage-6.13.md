# Aşama 6.13 — Standart astronomik kırılma / apparent altitude temeli

Durum: tamamlandı · `1.13.5`

## Amaç

Aşama 6.12 astronomik/geometrik ufuk ile doğal/yerel skyline'ı ayırdı. Bu aşama atmosferin yıldız ışığını bükmesi nedeniyle gözlenen (apparent) yüksekliğin geometrik yüksekliğe eşit olmamasını ayrı ve izlenebilir bir hesap katmanı olarak tanımlar.

## Kaynak yaklaşım

Çekirdek, NOAA Global Monitoring Laboratory Solar Calculator dokümantasyonunda yayımlanan parçalı atmosferik kırılma yaklaşımını kullanır.

Geometrik yükseklik `h` için dört bölge korunur:

- `85° ≤ h ≤ 90°`: düzeltme `0°`,
- `5° < h < 85°`: `tan(h)` tabanlı rasyonel yaklaşım,
- `-0.575° ≤ h ≤ 5°`: dördüncü dereceden yakın-ufuk polinomu,
- `h < -0.575°`: `tan(h)` tabanlı ufuk-altı yaklaşım.

Sonuç:

`h_apparent = h_geometric + R`

olarak verilir.

NOAA dokümanı atmosferik koşulların basınç, nem ve diğer değişkenlerle değiştiğini açıkça belirtir; bu nedenle sonuç standart/approximate bir refraction düzeltmesidir.

## Point-source yıldız kullanımı

Burada NOAA'nın yalnız atmosferik kırılma düzeltmesi kullanılır. Güneş yarıçapı/semidiameter, disk kenarı veya güneş doğuşu için kullanılan ek geometrik düzeltmeler yıldız hesabına taşınmaz. Yıldız noktasal kaynak olarak değerlendirilir.

USNO da astronomik kırılmayı atmosferden geçerken ışığın yön değiştirmesi olarak tanımlar ve bunun gözlenen yüksekliği geometrik yüksekliğin üzerine taşıdığını belirtir. Yatay kırılma için hesaplarda sık kullanılan yaklaşık `34′` değeri ayrı bir konvansiyonel referanstır.

NOAA yakın-ufuk fonksiyonunda `h=-0.575°` için düzeltme yaklaşık `+0.574906°` olduğundan apparent yükseklik neredeyse `0°` olur. Bu checkpoint bu davranışı regresyonla sabitler ancak gerçek atmosferde tam ufuk anını kesin kabul etmez.

## Çıktı sözleşmesi

`stellar-refraction-noaa-standard@0.1.0` şunları üretir:

- geometrik yıldız yüksekliği,
- kırılma düzeltmesi derece ve yay-dakikası cinsinden,
- apparent yıldız yüksekliği,
- apparent astronomik `0°` ufkun üstünde/altında bilgisi,
- kullanılan parçalı formül bölgesi,
- ayrıntılı hesap izi ve sınırlama uyarıları.

## Bilimsel sınır

Bu aşama gerçek-zamanlı veya ölçülmüş atmosfer profili değildir. Şunlar kullanılmaz:

- gerçek basınç,
- gerçek sıcaklık,
- gerçek bağıl nem,
- dalga boyuna bağlı dispersiyon,
- gözlemci yüksekliğine göre özel atmosfer profili,
- katmanlı ray-tracing,
- seeing/scintillation,
- extinction ve gökyüzü parlaklığı.

Projede mevcut Ciddor optik indeks/terrestrial-ray motoru bu astronomik apparent-altitude hesabına sessizce bağlanmamıştır; iki problem geometrik olarak aynı kabul edilmemiştir.

## Yerel skyline ile ilişki

6.13 apparent yıldız yüksekliğini hesaplar fakat bunu 6.12'nin geometrik yerel skyline'ıyla otomatik olarak birleştirip “görünür” sonucu üretmez.

Bunun nedeni uzak doğal ufuk veya dağ çizgisinin kendisinin de atmosferik kırılmadan etkilenebilmesidir. Yakın bina engeli, uzak topoğrafik sırt ve deniz ufku aynı optik sözleşme değildir. Bir sonraki entegrasyon aşaması bu ayrımı açık kaynak/mesafe semantiğiyle ele almalıdır.

## Doğrulama

Regresyonlar:

- `85–90°` sıfır düzeltme bölgesi,
- `45°` ve `10°` NOAA rasyonel formülü,
- geometrik `0°` yakın-ufuk polinomu,
- `-0.575°` apparent ufuk sınırı,
- `-1°` ufuk-altı tanjant formülü,
- provenans/sınırlama uyarıları,
- sonlu olmayan ve `[-90°,90°]` dışı girişlerin reddini

kapsar.

## Sonraki dilimler

1. 6.12 local-horizon maskesini yıldız izi örneklerine uygulama,
2. geometrik local-horizon crossing zamanlarını kök aramayla inceltme,
3. refraction ile local skyline'ın hangi kaynak türlerinde güvenle karşılaştırılabileceğini açık sözleşmeyle tanımlama,
4. sonraki UI diliminde geometric / apparent / local-horizon sonuçlarını ayrı ayrı gösterme,
5. extinction ve gökyüzü parlaklığı olmadan “çıplak gözle görünür” sonucu üretmeme.
