# Aşama 6.14 — Yerel ufuk maskeli yıldız izi ve geçişleri

Durum: tamamlanma adayı · `1.13.6`

## Amaç

Aşama 6.12'de tanımlanan azimuta bağlı yerel/doğal skyline maskesini, Aşama 6.6'nın geometrik yıldız izi zaman serisine bağlamak. Bu katman astronomik `0°` ufuk sonucunu değiştirmez; aynı yıldız izi için ayrı bir yerel-ufuk açıklığı ve geçiş sonucu üretir.

## Hesap zinciri

Her yıldız izi örneğinde:

1. yıldızın geometrik yükseklik ve azimutu mevcut `stellar-position` çekirdeğiyle hesaplanır,
2. skyline maskesinden aynı azimuttaki `h_skyline(A)` döngüsel doğrusal interpolasyonla çözülür,
3. yerel ufuk açıklığı
   `Δh = h_yıldız - h_skyline(A)`
   olarak hesaplanır,
4. `Δh` işareti `above / on-horizon / below` sınıfını belirler,
5. ardışık örneklerde `Δh` işaret değiştirirse zaman ekseninde ikili kök aramayla `Δh(t)=0°` geçişi 250 ms'den küçük zaman aralığına kadar inceltilir.

## Sonuç sözleşmesi

- her örnek için geometrik yıldız yüksekliği/azimut
- aynı yöndeki interpolasyonlu yerel ufuk yüksekliği
- yerel ufuk açıklığı
- yerel ufuk sınıfı
- yerel ufuk doğuş/batış geçişleri
- pencere içindeki yerel ufuk üstü geometrik süre
- örneklenmiş minimum/maksimum açıklık
- maske kaynak türü, kaynak etiketi, nokta sayısı ve en büyük azimut örnekleme boşluğu
- ayrıntılı hesap izi

## Bilimsel sınır

Bu sonuç **optik görünürlük değildir**. Atmosferik kırılma, extinction, gökyüzü parlaklığı, bulut, seeing ve insan gözü algı eşiği uygulanmaz. Aşama 6.13 apparent-altitude sonucu bu aşamada skyline ile otomatik birleştirilmez; çünkü doğal ufuk çizgisinin kendi optik/refraktif davranışı ayrıca tanımlanmalıdır.

Mevcut tek-doğrultulu rota/DEM profili 360° skyline gibi kullanılmaz. Girdi mutlaka Aşama 6.12 `StellarLocalHorizonMask` sözleşmesini sağlamalıdır.

## Geriye dönük uyumluluk

`calculateStellarTrail()` ve geometrik `0°` ufuk sonuçları değiştirilmez. Yeni davranış ayrı `calculateStellarLocalHorizonTrail()` API'sinde yaşar. Böylece eski kayıtlar, raporlar ve testler aynı anlamı korur.

## Doğrulama hedefleri

- düz `0°` skyline ile eski geometrik batış zamanının yeniden üretilmesi
- düz `+10°` skyline ile daha erken yerel batış
- yüksek circumpolar yıldızın yükseltilmiş skyline üzerinde tüm pencere boyunca kalması
- azimuta bağlı maskenin her örnekte interpolasyonla uygulanması
- maske provenansı ve azimut örnekleme kalitesinin sonuçta korunması
- strict TypeScript, tüm regresyonlar ve production build

## Sonraki dilim

Aşama 6.15'te bu backend sonucu Yıldız Gözlemleri paneline bağlanabilir: skyline veri girişi/import, grafikte yerel ufuk çizgisi, geometrik `0°` ve yerel ufuk sürelerinin yan yana gösterimi, kayıt/portable/HTML rapor entegrasyonu. Atmosferik apparent-altitude görünürlüğü ise ayrı sözleşme olarak kalmalıdır.
