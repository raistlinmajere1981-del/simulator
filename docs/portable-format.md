# Taşınabilir Deney Dosyası

## Amaç

Taşınabilir deney dosyası; bir deneyin form girdilerini, koordinatlarını, jeodezik hesap anlık görüntüsünü, düşey datumunu, arazi profilini, veri kaynağını, model sürümlerini, sonuçları ve hesap izlerini tek JSON belgesinde taşır.

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
5
```

Özet yapı:

```json
{
  "schema": "geometric-observation-laboratory/portable-experiment",
  "schemaVersion": 5,
  "exportedAtIso": "2026-08-06T10:00:00.000Z",
  "application": {
    "name": "Geometrik Gözlem Laboratuvarı",
    "version": "0.8.0"
  },
  "experiment": {
    "id": "...",
    "name": "...",
    "createdAtIso": "...",
    "updatedAtIso": "...",
    "inputs": {},
    "manualTerrainPoints": [],
    "terrainProfileSource": {},
    "geodesic": {},
    "modelVersions": {},
    "predictions": []
  }
}
```

`geodesic` yalnız koordinat modunda, `terrainProfileSource` ise kayıtlı bir dış profil kaynağı bulunduğunda yer alır.

## Girdiler

`inputs` alanı gözlemci ve hedef yüksekliklerini, zemin kotlarını, düşey datum ve ofseti, mesafe kaynağını, koordinatları, gözlem değerlerini ve atmosferik kırılma seçimini içerir.

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

## Çok noktalı profil

Her iç profil noktası:

```json
{
  "id": "ridge-centre",
  "distancePercent": 50,
  "elevationM": 8.5
}
```

biçimindedir.

Kurallar:

- `id` boş veya tekrarlı olamaz.
- `distancePercent` açık aralıkta `0 < değer < 100` olmalıdır.
- Yüzde konumları tekrarsızdır.
- Sayılar sonlu olmalıdır.
- En fazla 2.000 iç nokta bulunabilir.
- Noktalar depolamada artan yüzde sırasına getirilir.

Gözlemci ve hedef uçları dizide saklanmaz; zemin kotlarından türetilir.

## CSV profil kaynağı

CSV veya TSV profili uygulandığında `terrainProfileSource` şu bilgileri korur:

```json
{
  "kind": "csv",
  "fileName": "terrain-profile.csv",
  "importedAtIso": "2026-08-06T10:00:00.000Z",
  "delimiter": "comma",
  "distanceUnit": "percent",
  "sourceDistanceM": null,
  "rowCount": 7,
  "observerEndpointElevationM": 4,
  "targetEndpointElevationM": 5,
  "appliedObserverEndpoint": true,
  "appliedTargetEndpoint": false,
  "distanceColumnHeader": "chainage",
  "elevationColumnHeader": "terrain_height",
  "modifiedAfterImport": false
}
```

### Doğrulama

- `kind` yalnız `csv` olabilir.
- Ayırıcı `comma`, `semicolon` veya `tab` olmalıdır.
- Mesafe birimi `percent`, `m` veya `km` olmalıdır.
- Satır sayısı `2…2002` aralığındadır.
- Kaynak mesafe varsa `0…20.000 km` aralığındadır.
- Dosya ve sütun adları boş olamaz.
- Uç kotları sonlu sayıdır.
- Uç uygulama ve değişiklik alanları boolean olmalıdır.

Yerel dosya yolu ve ham CSV içeriği taşınabilir kayda yazılmaz.

`modifiedAfterImport: true`, kayıtlı profil veya uç kotlarının CSV uygulandıktan sonra manuel değiştirildiğini belirtir. Kaynak metadata korunur ancak mevcut profil artık dosyayla birebir aynı kabul edilmez.

## Jeodezik anlık görüntü

Koordinat modundaki `geodesic` alanı kayıt anındaki:

- çözüm yöntemini,
- yakınsama durumunu,
- iterasyon sayısını,
- yüzey mesafesini,
- başlangıç ve varış azimutlarını,
- uyarıları,
- hesap izini

saklar.

## Model sürümleri ve sonuçlar

`modelVersions`, kayıt anında kullanılan motor sürümlerini; `predictions` ise model durumu, metrikleri, uyarıları, varsayımları ve hesap adımlarını saklar. Yeni uygulama sürümü bu tarihsel sonuç anlık görüntüsünü sessizce değiştirmez.

## Doğrulama ve güvenlik

İçe aktarma sırasında:

1. JSON sözdizimi ve şema kimliği kontrol edilir.
2. Şema sürümünün desteklendiği doğrulanır.
3. Deney kimliği, ad ve tarihler kontrol edilir.
4. Sayısal girdiler ve koordinatlar izin verilen aralıklarda olmalıdır.
5. Profil noktaları kimlik, yüzde, tekrar, kot ve kapasite kurallarıyla doğrulanır.
6. Varsa CSV kaynak metadatası bütünüyle doğrulanır.
7. Varsa jeodezik anlık görüntü doğrulanır.
8. Model sonuçları ve hesap izleri doğrulanır.
9. Hatalı dosya yerel kayıt deposunu değiştirmeden reddedilir.

Kimlik çakışmasında yeni bir deney kimliği üretilir.

## Eski dosya desteği

### Sürüm 1 → sürüm 5

Koordinat ve düşey arazi alanları güvenli varsayılanlarla tamamlanır. Mesafe kaynağı `manual`, datum `orthometric-msl`, arazi profili `off` olur. CSV kaynak bilgisi üretilmez.

### Sürüm 2 → sürüm 5

Koordinat ve jeodezik veriler korunur; düşey alanlar güvenli varsayılanlarla tamamlanır. CSV kaynak bilgisi üretilmez.

### Sürüm 3 → sürüm 5

Tek ara nokta:

```text
terrainIntermediateDistancePercent
terrainIntermediateElevationM
```

alanlarından `legacy-intermediate-1` kimlikli tek elemanlı diziye dönüştürülür. CSV kaynak bilgisi üretilmez.

### Sürüm 4 → sürüm 5

Çok noktalı profil aynen korunur. Sürüm 4'te kaynak provenansı bulunmadığı için `terrainProfileSource` boş bırakılır; uygulama var olmayan bir CSV kaynağı uydurmaz.

Şema kapsayıcısı olmayan geçerli eski deney nesneleri sürüm `0` kabul edilerek taşınabilir. Desteklenmeyen gelecekteki sürümler açık hata ile reddedilir.

## Yerel kayıt deposu

Yerel `experiments.json` deposunun güncel şeması:

```text
geometric-observation-laboratory/local-experiment-store
schemaVersion: 5
```

Sürüm 1–4 kapsayıcıları ve eski düz diziler ilk okumada sürüm 5'e taşınır. Doğrulanamayan kayıtlar yüklenmez.

## HTML raporu

HTML raporu salt okunur sunum çıktısıdır. Düşey referans ve arazi bölümünde:

- datum ve uç kotları,
- bütün profil noktaları,
- yüzde ve gerçek rota mesafeleri,
- CSV dosya adı ve içe aktarma zamanı,
- ayırıcı ve mesafe birimi,
- kaynak rota ve satır sayısı,
- eşlenen sütunlar,
- CSV uç kotları ve uygulanma seçimleri,
- içe aktarımdan sonra düzenlenme durumu

gösterilir.

Rapor verileri HTML içine güvenli biçimde kaçırılır. Yeniden içe aktarılabilir kaynak `.ggl.json` dosyasıdır.
