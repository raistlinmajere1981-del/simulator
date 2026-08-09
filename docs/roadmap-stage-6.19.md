# Aşama 6.19 · Standart atmosferik kırılma tanısı UI entegrasyonu

Durum: **geliştirme tamamlandı — Electron görsel kontrolü bekleniyor**  
Sürüm: **1.16.0**

## Amaç

Aşama 6.18'de tanımlanan geometrik / apparent referans ayrımını Yıldız Gözlemleri sonucuna ve grafiğine kullanıcı tarafından görülebilir biçimde bağlamak.

## Hesap sözleşmesi

`calculateStellarObservation()` artık her geometrik yıldız sonucu için ayrıca:

- anlık standart-refraction apparent tanısı,
- her mevcut geometrik yıldız izi örneğine karşılık gelen apparent yükseklik örneği

üretir.

Bu katman yeni bir yıldız konumu, skyline interpolasyonu veya yerel-ufuk kök araması yapmaz. Apparent trail yalnız mevcut geometrik örneklerin NOAA standart kırılma fonksiyonuna geçirilmesiyle oluşur.

### Korunan ana sonuçlar

Aşağıdaki sonuçlar aynen geometrik kalır:

- `0°` astronomik ufuk rozeti,
- geometrik doğuş/batış geçişleri,
- geometrik `0°` ufuk üstü süre,
- yerel skyline yüksekliği,
- geometrik yerel-ufuk açıklığı,
- yerel skyline geçişleri ve yerel ufuk üstü geometrik süre.

Apparent tanı bu sonuçların hiçbirini değiştirmez.

## UI

`StellarObservationPanel` içinde varsayılan olarak kapalı **Standart atmosferik kırılma tanısı** bölümü bulunur.

Anahtar yalnız renderer görünüm state'idir:

- hesap ayarı değildir,
- deney kaydına yazılmaz,
- açılıp kapatılması yıldız/skyline hesap motorunu yeniden çalıştırmaz.

Tanı açıldığında:

- geometrik yıldız yüksekliği,
- standart apparent yıldız yüksekliği,
- kırılma düzeltmesi (yay-dakika),
- standart apparent astronomik `0°` durumu,
- yerel skyline etkinse `apparent yıldız − geometrik skyline` karma tanı değeri

gösterilir.

Grafikte:

- geometrik yıldız çizgisi ana sonuç olarak kalır,
- standart apparent çizgi ayrı kesikli çizgi olarak eklenir,
- yerel skyline varsa üçüncü ve ayrı çizgi olarak kalır.

## Bilimsel güvenlik

Yerel skyline geometrik referanstadır. Yalnız yıldız ışınına standart atmosferik kırılma uygulanır. Bu nedenle:

`h_apparent,yıldız - h_geometrik,skyline`

sayısı **yerel optik görünürlük sınıfı değildir**.

Panel bu değeri yalnız `Tanı · yerel görünürlük değildir` etiketiyle gösterir; görünür/görünmez rozeti üretmez.

Yerel apparent görünürlük için skyline/terrain ışınının da aynı atmosfer koşulları altında optik olarak modellenmesi gerekir.

## Prediction / rapor

Model sürümü `stellar-observation-reference@0.4.0` olur. Prediction'a aşağıdaki tanı metrikleri eklenir:

- standart kırılma düzeltmesi,
- standart apparent yıldız yüksekliği,
- apparent astronomik `0°` durumu,
- karma apparent-yıldız / geometrik-skyline tanı farkı,
- `yerel apparent görünürlük sınıflandırıldı = false` koruma metriği.

Prediction yapısı genel olduğu için portable şema değişmez; mevcut v8 korunur. HTML rapor mevcut genel prediction/trace mekanizmasıyla bu metrik ve uyarıları taşır.

## Performans

Aşama 6.15–6.17 taslak/uygula performans sözleşmesi değişmez. Refraction UI anahtarı yalnız görünümü değiştirir ve pahalı yerel skyline crossing taramasını yeniden başlatmaz.

## Test hedefleri

- apparent trail örnek sayısı geometrik trail ile birebir eşleşir,
- geometrik örnek yüksekliği apparent örnekte ayrıca korunur,
- dış skyline ile karma tanı üretilir fakat `localVisibilityClassified` false kalır,
- prediction koruma metriğini `0` olarak yazar,
- eski yıldız ayarlarının reopen davranışı değişmez.

## Bu aşamada yapılmayanlar

- apparent 0° geçiş zamanı / apparent görünür süre kök çözümü,
- refrakte edilmiş doğal skyline ray tracing,
- gerçek basınç, sıcaklık, nem veya dalga boyu girişi,
- extinction / sky brightness / cloud / seeing / naked-eye visibility.
