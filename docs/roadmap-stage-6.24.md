# Aşama 6.24 — DEM → 360° geometrik skyline çekirdeği

Durum: tamamlandı · `1.18.1`

## Amaç

Mevcut ESRI ASCII Grid DEM altyapısını, gözlemci çevresinde azimutlara göre geometrik yerel ufuk profili üreten bağımsız bir hesap çekirdeğine dönüştürmek. Bu aşama UI/persistence entegrasyonu değildir; sonraki görünür aşamaya güvenilir bir hesap sözleşmesi sağlar.

## Geometri

Skyline açısı düzlemde `atan(Δh/d)` ile hesaplanmaz.

1. Her skyline azimutu için gözlemciden belirli mesafelerde WGS84 doğrudan jeodezik noktalar üretilir.
2. DEM yüksekliği seçilen `nearest` veya `bilinear` yöntemle örneklenir.
3. Gözlemci ve DEM noktası WGS84 geosentrik XYZ koordinatlarına dönüştürülür.
4. XYZ farkı EPSG 9836 ile uyumlu East/North/Up toposentrik eksenlere çevrilir.
5. Geometrik yükselme açısı `atan2(up, hypot(east,north))` ile bulunur.
6. Bir azimuttaki geçerli DEM örneklerinin en büyük yükselme açısı o yönün skyline değeridir.

WGS84 tanımlayıcı parametreleri repodaki mevcut geodesy çekirdeğinden gelir: `a=6378137 m`, `1/f=298.257223563`.

Kaynaklar:

- EPSG Method 9836 — Geocentric/topocentric conversions: https://epsg.org/coord-operation-method_9836/Geocentric-topocentric-conversions.html
- NGA Office of Geomatics — WGS 84 defining parameters: https://earth-info.nga.mil/?action=wgs84&dir=wgs84

## Yükseklik referansı

ESRI ASCII Grid yalnız sayısal yükseklik taşır; dosyanın ortometrik/elipsoidal datumunu kendi başına kanıtlamaz. Bu nedenle çekirdek `heightDatumToEllipsoidOffsetM` değerini açık girdi olarak alır.

- gözlemci zemin yüksekliği DEM'den örneklenir,
- gözlemci göz yüksekliği bu zemine eklenir,
- DEM ve gözlemci zemini aynı sabit datum → WGS84 elipsoid ofsetini paylaşır,
- mekânsal geoit değişimi bu aşamada modellenmez.

Bu sınır trace ve warning çıktısında açıkça tutulur.

## Kapsama sözleşmesi

Bir DEM'in bazı azimutlarda yalnız kısa mesafeye uzanması veya NODATA boşluğu içermesi, bilinmeyen araziyi `0°` saymak için gerekçe değildir.

Her ışın şu durumlardan birini taşır:

- `complete`: istenen maksimum mesafeye kadar eksiksiz örneklendi,
- `coverage-limited`: en az bir geçerli örnek var ancak grid sınırı maksimum mesafeden önce bitti,
- `partial-nodata`: geçerli örneklerle birlikte en az bir NODATA boşluğu var,
- `no-data`: grid kapsamında örnekleme yapıldı ancak geçerli yükseklik bulunamadı,
- `no-coverage`: ilk örnek mesafesine ulaşmadan grid kapsamı bitti.

`completeCoverage=true` yalnız bütün azimutlar `complete` olduğunda üretilir. Sonraki UI/persistence aşamasında otomatik yerel-ufuk kaynağına dönüştürme bu bayrak için fail-closed olacaktır.

## Performans korumaları

- azimut nokta sayısı: en fazla 1440,
- maksimum ışın mesafesi: 500 km,
- toplam ışın örnek bütçesi: en fazla 2.000.000,
- azimut adımı 360°'yi tam bölmelidir,
- mevcut Vincenty direct çözümü kullanılır; yakınsama olmazsa mevcut açık `spherical-fallback` davranışı korunur ve sayaç/uyarıya yazılır.

## Sayısal sınır

Aynı enlem/boylamda yalnız yükseklik farkı bulunan iki ECEF noktasının çıkarılması nanometre ölçeğinde East/North kayan nokta artığı bırakabilir. Zenith/nadir yönünde bu artıkların keyfi bir azimut üretmemesi için toposentrik yön çözümü mutlak `1e-8 m` ve bağıl `1e-12 × slantDistance` eşiğinin büyüğünü yatay sıfır toleransı olarak kullanır. Bu eşik DEM ve gözlem ölçeğinin çok altındadır; yalnız sayısal tekilliği tanımlar.

## Bilimsel sınır

Bu çıktı **geometrik DEM skyline**'dır. Şunlar uygulanmaz:

- atmosferik kırılma veya ışın bükülmesi,
- bitki ve bina yüksekliği,
- DEM çözünürlüğünden küçük engeller,
- grid kapsamı dışındaki arazi,
- mekânsal geoit değişimi.

Bu nedenle 6.19'daki apparent yıldız yüksekliğiyle otomatik optik görünürlük kararı üretilmez.

## Test kapıları

- EPSG 9836 resmi ENU/toposentrik örneğini yeniden üretme,
- WGS84 ekvator ve kutup geosentrik eksen testleri,
- zenit/nadir azimut tekilliğinde floating-point artıklarını yön uydurmadan `null` tutma,
- direct Vincenty bearing-distance regresyonu,
- tam kapsamalı düz DEM,
- belirli azimuttaki yüksek DEM hücresini skyline kritik noktası olarak seçme,
- NODATA yönünü ufuk uydurmadan eksik işaretleme,
- grid kenarına ulaşan ışını `coverage-limited` işaretleme,
- geçersiz azimut bölümü / kapsam / örnek bütçesi korumaları.

Final doğrulama: 87 test dosyası / 455 test, strict Node+Web TypeScript, production Electron/Vite build ve `npm audit` 0 açık.

## Sonraki aşama

6.25'te bu çekirdek mevcut DEM dosya seçimi/provenans altyapısına ve Yıldız Gözlemleri yerel skyline paneline bağlanacaktır. Dosya seçimi yine taslakta kalacak; ağır 360° tarama yalnız açık `Uygula ve hesapla` eylemiyle çalışacaktır.
