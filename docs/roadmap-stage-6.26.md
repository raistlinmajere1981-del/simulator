# Aşama 6.26 — Equirectangular panorama skyline geometrisi çekirdeği

Durum: tamamlandı · `1.19.1`

## Amaç

Aşama 6.25'te DEM'den üretilen 360° geometrik skyline mevcut `derived` yerel-ufuk zincirine bağlandı. Bu aşama aynı zincire ileride panorama/fotoğraf tabanlı bir kaynak ekleyebilmek için önce görüntü pikselinin **hangi gerçek azimut ve geometrik yüksekliğe karşılık geldiğini** açık, test edilebilir ve kaynaklandırılmış bir sözleşmeyle tanımlar.

Bu checkpoint UI, otomatik görüntü segmentasyonu veya XMP dosya parserı içermez. Önce geometri sabitlenir; metadata okuma ve kullanıcı işaretleme daha sonra bu çekirdeğe bağlanır.

## Bilimsel / teknik referans

Birincil sözleşme Google Photo Sphere XMP metadata dokümantasyonudur:

- https://developers.google.com/streetview/spherical-metadata

Bu sözleşmeden kullanılan temel noktalar:

- projeksiyon: equirectangular
- yerel sabit çerçeve: `X = gerçek Doğu`, `Y = gerçek Kuzey`, `Z = Yukarı`
- `PoseHeadingDegrees`: panorama merkez yönünün gerçek kuzeye göre pusula başlığı
- `PosePitchDegrees`: merkez yönünün yataya göre pitch açısı
- `PoseRollDegrees`: fotoğraf küresinin roll açısı
- tam panorama boyutları ve kırpılmış alanın sol/üst ofsetleri ayrı tutulabilir
- döndürülmüş photo-sphere çerçevesinden sabit yerel çerçeveye dönüşüm:

```text
R = Rz(-heading) · Rx(pitch) · Ry(roll)
```

Kod bu işaret ve sıra sözleşmesini kendi varsayımıyla değiştirmez.

## Veri sözleşmesi

`EquirectangularPanoramaGeometry` şunları zorunlu tutar:

- saklanan görüntü genişliği / yüksekliği
- kavramsal tam panorama genişliği / yüksekliği
- kırpılmış alan sol / üst piksel ofseti
- pose heading / pitch / roll

Doğrulama sınırları:

- tüm boyutlar pozitif tam sayı ve en fazla 200.000 px
- crop tam panorama sınırlarının içinde olmalı
- heading: `[0°, 360°)`
- pitch: `[-90°, +90°]`
- roll: `(-180°, +180°]`

Tam küre kapsamı yalnız şu durumda `true` olur:

- crop sol = 0
- crop üst = 0
- saklanan genişlik = full pano genişliği
- saklanan yükseklik = full pano yüksekliği

Eksik panorama hiçbir zaman sessizce tam 360° gözlem sayılmaz.

## Piksel → photo-sphere açıları

Piksel koordinatları **piksel merkezleri** olarak yorumlanır. Kullanıcı işaretinin tam piksel merkezinde olması zorunlu değildir; kesirli koordinatlar desteklenir.

Tam panorama içindeki koordinatlar:

```text
fullX = cropLeft + x
fullY = cropTop + y
```

Photo-sphere göreli heading ve elevation:

```text
sphereHeading = ((fullX + 0.5) / fullPanoWidth) · 360° - 180°
sphereElevation = 90° - ((fullY + 0.5) / fullPanoHeight) · 180°
```

Sıfır pose için merkez piksel gerçek kuzey / 0° yüksekliği gösterir; görüntünün sağ çeyreği doğuyu gösterir.

## Photo-sphere yönü → yerel ENU yönü

Sıfır-pose photo-sphere yön vektörü:

```text
x = cos(elevation) · sin(heading)
y = cos(elevation) · cos(heading)
z = sin(elevation)
```

Ardından resmi Euler sırası uygulanır:

```text
Ry(roll)
Rx(pitch)
Rz(-heading)
```

Bu işlem vektör üzerinde uygulanınca yukarıdaki matris çarpımıyla aynıdır.

Sonuç:

```text
azimut = atan2(East, North)
yükseklik = asin(Up)
```

Azimut `[0°, 360°)` aralığına normalize edilir.

## Ters dönüşüm

`localDirectionToPanoramaPixel()` gerçek azimut + geometrik yükseklikten görüntü pikseline ters dönüşüm sağlar.

Ters rotasyon:

```text
R⁻¹ = Ry(-roll) · Rx(-pitch) · Rz(+heading)
```

Equirectangular yatay eksen periyodiktir; 0°/360° seam için canonical `x` ile `x ± fullWidth` adayları kontrol edilir.

İstenen yön saklanan crop içinde değilse fonksiyon `null` döndürür. Crop dışındaki bir yön için piksel uydurulmaz.

## Manuel panorama skyline adaptörü

`buildPanoramaSkylineProfile()`:

1. panorama geometrisini doğrular,
2. her manuel piksel işaretini gerçek azimut / geometrik yüksekliğe dönüştürür,
3. mevcut `normalizeStellarLocalHorizonMask()` API'sine verir,
4. kaynak türünü `derived` olarak korur,
5. mevcut 3–1440 nokta ve cyclic azimut boşluğu kurallarını yeniden kullanır.

Bu sayede sonraki UI diliminde panorama, DEM ile aynı yıldız yerel-ufuk hesap motoruna bağlanabilir; ikinci bir skyline interpolasyon motoru oluşturulmaz.

## Uyarı sınırları

- tam küre olmayan panorama açık kapsam uyarısı üretir
- işaretler arasındaki maksimum azimut boşluğu `>45°` ise dikkat uyarısı
- `>90°` ise daha güçlü kaba-interpolasyon uyarısı
- floating-point sınır artıklarının tam 45°/90° değerlerini yanlış sınıflamaması için `1e-9°` eşik toleransı kullanılır

## Regresyonlar

Yeni testler şunları sabitler:

- sıfır-pose merkez = kuzey / yatay
- görüntünün sağ çeyreği = doğu
- heading + pitch merkez yönünü beklenen gerçek azimut/yüksekliğe taşır
- pozitif roll işareti resmi Photo Sphere convention ile uyumludur
- kırpılmış ve dönmüş panoramada piksel → yön → piksel round-trip
- crop dışındaki gerçek yön için `null`
- 8 yönlü / 45° aralıklı manuel skyline'nın mevcut `derived` maskeye dönüşmesi
- partial panorama için eksik-kapsama uyarısı
- geçersiz crop ve pose sınırlarının reddi

## Bu aşamada özellikle yapılmayanlar

- JPEG/XMP metadata parserı
- EXIF pusula yönünü otomatik kabul etme
- normal pinhole fotoğrafı equirectangular panorama sayma
- görüntüden otomatik dağ/ufuk segmentasyonu
- lens/stitching hatalarını otomatik düzeltme
- panorama skyline'dan optik görünürlük kararı üretme
- partial panorama boşluklarını interpolasyonla 360° gözlem sayma

## Sonraki dilim

Aşama 6.27 için doğal bağlantı:

- JPEG/XMP içinden GPano metadata okuma ve provenans
- metadata yoksa açık manuel full-pano/crop/pose girişi
- panorama görüntüsünde kullanıcı kontrollü skyline işaretleme
- yalnız yeterli 360° kapsam doğrulanırsa mevcut yıldız local-horizon kaynağına uygulama
- save/reopen, portable kayıt ve HTML rapor provenansı

Otomatik skyline görüntü işleme bu manuel ve doğrulanabilir zincir sağlamlaştıktan sonra ayrı bir özellik olarak değerlendirilecektir.
