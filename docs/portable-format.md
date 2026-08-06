# Taşınabilir Deney Dosyası

## Amaç

Taşınabilir deney dosyası; bir deneyin form girdilerini, koordinatlarını, jeodezik hesap anlık görüntüsünü, düşey datumunu, zemin ve arazi kotlarını, model sürümlerini, sonuçları, uyarıları, varsayımları ve hesap izlerini tek JSON belgesinde taşır.

Bu sayede bir deney:

- başka bir bilgisayara aktarılabilir,
- uygulama güncellendikten sonra eski sonucu korunarak incelenebilir,
- rapor üretiminde aynı anlık görüntü kullanılabilir,
- hesap adımları yeniden denetlenebilir.

## Dosya adı

Önerilen uzantı:

```text
<deney-adı>.ggl.json
```

Dosya UTF-8 kodlu JSON'dur.

## Güncel şema

Şema kimliği:

```text
geometric-observation-laboratory/portable-experiment
```

Güncel şema sürümü:

```text
4
```

Üst düzey yapı:

```json
{
  "schema": "geometric-observation-laboratory/portable-experiment",
  "schemaVersion": 4,
  "exportedAtIso": "2026-08-05T20:00:00.000Z",
  "application": {
    "name": "Geometrik Gözlem Laboratuvarı",
    "version": "0.6.0"
  },
  "experiment": {
    "id": "...",
    "name": "...",
    "createdAtIso": "...",
    "updatedAtIso": "...",
    "inputs": {},
    "manualTerrainPoints": [],
    "geodesic": {},
    "modelVersions": {},
    "predictions": []
  }
}
```

`geodesic` yalnız koordinat modunda bir hesap anlık görüntüsü üretildiğinde bulunur.

## Girdiler

`inputs` alanı şunları içerir:

- gözlemci göz yüksekliği,
- hedef yüksekliği,
- gözlemci zemin kotu,
- hedef taban kotu,
- düşey datum türü,
- datum, gelgit veya yerel benchmark ofseti,
- arazi profili modu,
- `manual` veya `coordinates` mesafe kaynağı,
- manuel yüzey mesafesi,
- gözlemci enlem ve boylamı,
- hedef enlem ve boylamı,
- gözlenen görünürlük,
- gözlem belirsizliği,
- standart kırılma seçimi,
- kırılma katsayısı.

Sürüm 3 ile uyumluluk için tek noktalı eski alanlar `inputs` içinde korunur. Yeni çok noktalı profil için esas veri `experiment.manualTerrainPoints` dizisidir.

Düşey datum türleri:

```text
orthometric-msl
ellipsoidal-wgs84
local
```

Arazi profili modları:

```text
off
manual-three-point
manual-points
```

## Çok noktalı profil dizisi

Her iç profil noktası:

```json
{
  "id": "ridge-centre",
  "distancePercent": 50,
  "elevationM": 8.5
}
```

biçimindedir.

Doğrulama kuralları:

- `id` boş olamaz ve bütün dizide benzersiz olmalıdır.
- `distancePercent`, açık aralıkta `0 < değer < 100` olmalıdır.
- Yüzde konumları tekrarsız olmalıdır.
- `distancePercent` ve `elevationM` sonlu sayı olmalıdır.
- Dizi en fazla 2.000 iç nokta taşıyabilir.
- Geçerli noktalar depolama sırasında yüzde konumuna göre artan sıraya getirilir.

Gözlemci ve hedef uçları bu dizide saklanmaz. Uç örnekleri `inputs.observerGroundElevationM` ve `inputs.targetGroundElevationM` alanlarından otomatik türetilir.

Enlemler `-90…90°`, boylamlar `-180…180°` aralığında doğrulanır. Bütün sayısal alanlar sonlu olmalıdır.

## Jeodezik anlık görüntü

Koordinat modundaki `geodesic` alanı kayıt anındaki:

- çözüm yöntemini (`vincenty` veya `spherical-fallback`),
- yakınsama durumunu,
- iterasyon sayısını,
- yüzey mesafesini,
- başlangıç azimutunu,
- varış azimutunu,
- uyarıları,
- hesap izi kimliğini,
- varsayım ve hesap adımlarını

saklar.

Bu alanın amacı, gelecekte jeodezik motor değişse bile kayıt anındaki sonucun denetlenebilmesidir.

## Model sürümleri ve sonuçlar

`modelVersions`, kayıt anında kullanılan fiziksel model ve yardımcı hesap motoru kimliklerini sürüm numarasıyla eşler.

`predictions`, her fiziksel modelin kayıt anındaki:

- durumunu,
- görünür ve gizlenen hedef değerlerini,
- arazi minimum açıklığını,
- kritik arazi mesafesini,
- araziyi temizleyen minimum hedef kotunu,
- diğer metriklerini,
- uyarılarını,
- hesap izi kimliğini,
- varsayımlarını,
- formül ve sayısal yerine koyma adımlarını

saklar.

Dosyadaki sonuç anlık görüntüsü yeni uygulama sürümü tarafından sessizce değiştirilmez. Kullanıcı girdileri yükleyip güncel motorla yeniden hesaplama yapabilir; kaydedilmiş anlık görüntü tarihsel kayıt olarak korunur.

## Doğrulama ve güvenlik

İçe aktarma sırasında:

1. JSON sözdizimi doğrulanır.
2. Şema kimliği kontrol edilir.
3. Şema sürümünün desteklendiği doğrulanır.
4. Deney kimliği, tarihler ve ad kontrol edilir.
5. Sayısal girdiler, koordinatlar, düşey datum ve profil alanları izin verilen aralıklarda olmalıdır.
6. Çok noktalı profil kimlik, yüzde, tekrar, kot ve kapasite kurallarıyla doğrulanır.
7. Varsa jeodezik anlık görüntü bütün alanlarıyla doğrulanır.
8. Model sonuçları, metrikler ve hesap izi adımları doğrulanır.
9. Hatalı dosya yerel kayıt deposunu değiştirmeden reddedilir.

İçe aktarılan deney kimliği yerel bir kayıtla çakışırsa yeni bir kimlik üretilir ve kayıt adına `İçe aktarıldı` açıklaması eklenir.

## Eski dosya desteği

### Sürüm 1 → sürüm 4

Sürüm 1 dosyalarında koordinat, mesafe kaynağı ve düşey arazi alanları yoktur. Taşıma sırasında:

- `distanceSource` değeri `manual` olur,
- önceki `surfaceDistanceKm` değeri korunur,
- koordinat alanları güvenli örnek varsayılanlarla tamamlanır,
- jeodezik anlık görüntü oluşturulmaz,
- zemin kotları ve datum ofseti `0 m` olur,
- datum `orthometric-msl` olur,
- arazi profili `off` olur,
- güvenli varsayılan tek ara nokta diziye eklenir.

### Sürüm 2 → sürüm 4

Sürüm 2 koordinat ve jeodezik verileri korur. Yeni düşey ve arazi alanları:

- zemin kotları `0 m`,
- datum `orthometric-msl`,
- datum ofseti `0 m`,
- arazi profili `off`,
- ara nokta varsayılan olarak `%50` ve `0 m`

ile tamamlanır ve tek elemanlı diziye dönüştürülür.

### Sürüm 3 → sürüm 4

Sürüm 3 düşey datum ve tek ara noktalı profil içerir. Eski:

```text
terrainIntermediateDistancePercent
terrainIntermediateElevationM
```

alanları şu noktaya dönüştürülür:

```json
{
  "id": "legacy-intermediate-1",
  "distancePercent": "eski yüzde",
  "elevationM": "eski kot"
}
```

Böylece kayıt anındaki profil ve görünürlük davranışı korunur.

Şema kapsayıcısı bulunmayan tek bir geçerli eski deney nesnesi sürüm `0` kabul edilerek aynı kurallarla taşınabilir. Desteklenmeyen gelecekteki şema sürümleri sessizce yorumlanmaz; açık hata ile reddedilir.

## Yerel kayıt deposu

Uygulamanın kullanıcı veri klasöründeki `experiments.json` dosyası da sürümlüdür.

Şema kimliği:

```text
geometric-observation-laboratory/local-experiment-store
```

Güncel sürüm:

```text
4
```

Sürüm 1, 2 ve 3 kapsayıcıları ile daha eski düz JSON dizileri ilk okumada sürüm 4 yapısına taşınır ve atomik yazımla kaydedilir. Doğrulanamayan kayıtlar yüklenmez ve sayıları taşıma sonucunda raporlanır.

## HTML raporu

HTML raporu taşınabilir veri dosyasının yerine geçmez. Rapor:

- insan tarafından okunmak,
- çevrimdışı açılmak,
- tarayıcıdan yazdırılmak veya PDF'e dönüştürülmek

için üretilir.

Koordinat modunda rapor; iki koordinatı, WGS84 mesafesini, azimutları, çözüm yöntemini ve jeodezik hesap izini ayrı bölümde gösterir.

Düşey referans ve arazi bölümünde:

- datum ve ofset,
- gözlemci zemin ve mutlak göz kotu,
- hedef taban ve tepe kotu,
- profil modu ve ara nokta sayısı,
- gözlemci ve hedef uçları,
- bütün ara noktaların sıra numarası,
- yüzde konumu,
- kayıt mesafesine göre hesaplanan gerçek rota mesafesi,
- ham kot

gösterilir. Model bölümleri arazi metriklerini ve hesap adımlarını kendi sonuç anlık görüntülerinden sunar.

Rapor verileri HTML içine güvenli biçimde kaçırılır. JSON dosyası yeniden içe aktarılabilir veri kaynağıdır; HTML raporu salt okunur sunum çıktısıdır.
