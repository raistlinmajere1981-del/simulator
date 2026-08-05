# Taşınabilir Deney Dosyası

## Amaç

Taşınabilir deney dosyası, bir deneyin form girdilerini, koordinatlarını, jeodezik hesap anlık görüntüsünü, model sürümlerini, sonuçları, uyarıları, varsayımları ve hesap izlerini tek JSON belgesinde taşır.

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
2
```

Üst düzey yapı:

```json
{
  "schema": "geometric-observation-laboratory/portable-experiment",
  "schemaVersion": 2,
  "exportedAtIso": "2026-08-05T15:00:00.000Z",
  "application": {
    "name": "Geometrik Gözlem Laboratuvarı",
    "version": "0.4.0"
  },
  "experiment": {
    "id": "...",
    "name": "...",
    "createdAtIso": "...",
    "updatedAtIso": "...",
    "inputs": {},
    "geodesic": {},
    "modelVersions": {},
    "predictions": []
  }
}
```

`geodesic` yalnız koordinat modunda bir hesap anlık görüntüsü üretildiğinde bulunur.

## Girdiler

`inputs` alanı şunları içerir:

- gözlemci yüksekliği,
- hedef yüksekliği,
- `manual` veya `coordinates` mesafe kaynağı,
- manuel yüzey mesafesi,
- gözlemci enlem ve boylamı,
- hedef enlem ve boylamı,
- gözlenen görünürlük,
- gözlem belirsizliği,
- standart kırılma seçimi,
- kırılma katsayısı.

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
- metriklerini,
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
5. Sayısal girdiler ve koordinatlar izin verilen aralıklarda olmalıdır.
6. Varsa jeodezik anlık görüntü bütün alanlarıyla doğrulanır.
7. Model sonuçları, metrikler ve hesap izi adımları doğrulanır.
8. Hatalı dosya yerel kayıt deposunu değiştirmeden reddedilir.

İçe aktarılan deney kimliği yerel bir kayıtla çakışırsa yeni bir kimlik üretilir ve kayıt adına `İçe aktarıldı` açıklaması eklenir.

## Eski dosya desteği

### Sürüm 1 → sürüm 2

Sürüm 1 dosyalarında koordinat ve mesafe kaynağı alanları yoktur. Taşıma sırasında:

- `distanceSource` değeri `manual` olur,
- önceki `surfaceDistanceKm` değeri korunur,
- koordinat alanları güvenli örnek varsayılanlarla tamamlanır,
- jeodezik anlık görüntü oluşturulmaz.

Böylece eski deney sonucu değişmeden açılır; kullanıcı daha sonra koordinat modunu bilinçli olarak seçebilir.

Şema kapsayıcısı bulunmayan tek bir geçerli eski deney nesnesi sürüm `0` kabul edilerek aynı kurallarla taşınabilir.

Desteklenmeyen gelecekteki şema sürümleri sessizce yorumlanmaz; açık hata ile reddedilir.

## Yerel kayıt deposu

Uygulamanın kullanıcı veri klasöründeki `experiments.json` dosyası da sürümlüdür.

Şema kimliği:

```text
geometric-observation-laboratory/local-experiment-store
```

Güncel sürüm:

```text
2
```

Sürüm 1 kapsayıcıları ve daha eski düz JSON dizileri ilk okumada sürüm 2 yapısına taşınır ve atomik yazımla kaydedilir. Doğrulanamayan kayıtlar yüklenmez ve sayıları taşıma sonucunda raporlanır.

## HTML raporu

HTML raporu taşınabilir veri dosyasının yerine geçmez. Rapor:

- insan tarafından okunmak,
- çevrimdışı açılmak,
- tarayıcıdan yazdırılmak veya PDF'e dönüştürülmek

için üretilir.

Koordinat modunda rapor; iki koordinatı, WGS84 mesafesini, azimutları, çözüm yöntemini ve jeodezik hesap izini ayrı bölümde gösterir.

Rapor verileri HTML içine güvenli biçimde kaçırılır. JSON dosyası yeniden içe aktarılabilir veri kaynağıdır; HTML raporu salt okunur sunum çıktısıdır.
