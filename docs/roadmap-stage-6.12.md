# Aşama 6.12 — Yıldız yerel ufuk / skyline maskesi temeli

Durum: tamamlandı · `1.13.4`

## Amaç

Önceki yıldız aşamalarında `h ≥ 0°` koşulu yalnız astronomik/geometrik ufku temsil ediyordu. Gerçek gözlem noktasında dağ, tepe, bina veya başka engeller gökyüzü–yer sınırını belirli azimutlarda 0°'ın üstüne taşıyabilir; yüksek bir gözlem noktasında doğal ufuk bazı yönlerde 0°'ın altında da olabilir.

Bu aşama geometrik yıldız yüksekliği ile azimuta bağlı yerel ufuk yüksekliğini ayrı değişkenler olarak tanımlar.

## Kavramsal ayrım

- `geometricAltitudeDeg`: yıldızın astronomik/geometrik ufka göre yüksekliği,
- `localHorizonAltitudeDeg`: seçilen azimutta skyline/yerel ufuk maskesinin yüksekliği,
- `geometricClearanceDeg = geometricAltitudeDeg - localHorizonAltitudeDeg`,
- durum: `above`, `below` veya sayısal teğetlik için `on-horizon`.

Bu sonuç çıplak-göz görünürlüğü değildir.

## Yerel ufuk maskesi sözleşmesi

`stellar-local-horizon-mask@0.1.0` maskesi:

- en az 3, en fazla 1.440 azimut/yükseklik noktası alır,
- maskede azimutu `[0°, 360°)` aralığında ve tekil tutar,
- ufuk yüksekliğini `[-90°, +90°]` aralığında tutar,
- noktaları azimuta göre normalize/sıralar,
- ardışık noktalar arasında doğrusal azimut interpolasyonu yapar,
- `360° → 0°` sınırını döngüsel olarak bağlar,
- maskenin en büyük azimut örnekleme boşluğunu hesaplayıp sonuç/provenans içinde tutar.

Hesap yapılacak hedef azimutu herhangi bir sonlu derece değeri olabilir; değerlendirme sırasında `[0°,360°)` aralığına normalize edilir. Maskenin kendi noktaları ise veri hatalarını gizlememek için katı aralık doğrulamasından geçer.

## Provenans

Maske kaynak türü:

- `manual`: kullanıcı/elle tanımlanmış skyline,
- `external`: dış veri/kaynaktan alınmış skyline,
- `derived`: başka bir algoritma veya veri kümesinden türetilmiş skyline.

`sourceKind` yalnız provenans sınıfıdır. Örneğin `derived` etiketi tek başına maskenin DEM'den, hangi DEM'den veya hangi görüş algoritmasıyla üretildiğini kanıtlamaz; ayrıntılı kaynak etiketi ayrıca korunmalıdır.

## Bilimsel sınır

Bu aşama yalnız geometrik yerel ufuk açıklığını hesaplar. Şunlar uygulanmaz:

- atmosferik astronomik kırılma,
- yıldız sönümlemesi/extinction,
- gökyüzü parlaklığı,
- bulut/hava durumu,
- çıplak-göz algı eşiği,
- DEM'den otomatik 360° skyline üretimi.

USNO terminolojisindeki astronomik ufuk ile doğal/gözlenen ufuk ayrımı korunur. Atmosferik kırılma ayrı bir fizik katmanı olarak ele alınacaktır.

## Mevcut arazi sistemiyle ilişki

Projede mevcut rota/DEM profilleri gözlemci ile belirli bir hedef arasındaki çizgi boyunca örneklenir. Bu tek doğrultulu profil, yıldızın herhangi bir azimutundaki 360° yerel skyline yerine sessizce kullanılamaz.

Bu nedenle 6.12 çekirdeği genel azimut-indexli bir maske kabul eder. İleride uygun 2B DEM kapsaması ve açık kaynak provenansı sağlandığında aynı sözleşmeye otomatik skyline üreticisi bağlanabilir.

## Doğrulama

Regresyonlar şunları kapsar:

- noktaların sıralanması ve en büyük döngüsel azimut boşluğu,
- 350° → 10° aralığında 0° kuzey üzerinden kesintisiz interpolasyon,
- tam örnek noktasında drift olmaması,
- `above` / `on-horizon` / `below` sınıfları,
- negatif veya 360° üzeri hedef azimutlarının normalize edilmesi,
- maskenin 360° değerini, yinelenen azimutları, yetersiz nokta sayısını, sonlu olmayan ve aralık dışı değerleri reddetmesi.

## Sonraki dilimler

1. astronomik atmosferik kırılmayı geometrik yüksekliğin dışında ayrı `apparent altitude` katmanı olarak tanımlama,
2. yerel ufuk maskesini yıldız izi örneklerine uygulama ve local-horizon geçişlerini hesaplama,
3. ileride 2B DEM'den 360° skyline üretimi,
4. local horizon / refraction sonuçlarını Yıldız Gözlemleri UI, prediction ve HTML rapora taşıma,
5. yıldız kadri ile optik görünürlüğü ancak extinction/gökyüzü parlaklığı modeli tanımlandıktan sonra ele alma.
