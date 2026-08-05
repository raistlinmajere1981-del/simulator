# Taşınabilir Deney Dosyası

## Amaç

Taşınabilir deney dosyası, bir deneyin yalnızca form girdilerini değil; kaydedildiği andaki model sürümlerini, sonuç anlık görüntülerini, uyarıları, varsayımları ve hesap izlerini de tek JSON belgesinde taşır.

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
1
```

Üst düzey yapı:

```json
{
  "schema": "geometric-observation-laboratory/portable-experiment",
  "schemaVersion": 1,
  "exportedAtIso": "2026-08-05T15:00:00.000Z",
  "application": {
    "name": "Geometrik Gözlem Laboratuvarı",
    "version": "0.3.0"
  },
  "experiment": {
    "id": "...",
    "name": "...",
    "createdAtIso": "...",
    "updatedAtIso": "...",
    "inputs": {},
    "modelVersions": {},
    "predictions": []
  }
}
```

## İçerik ilkeleri

### Girdiler

`inputs` alanı şunları içerir:

- gözlemci yüksekliği,
- hedef yüksekliği,
- yüzey mesafesi,
- gözlenen görünürlük,
- gözlem belirsizliği,
- standart kırılma seçimi,
- kırılma katsayısı.

Sayılar uygulamanın izin verdiği aralıklarla doğrulanır.

### Model sürümleri

`modelVersions`, kayıt anında kullanılan her model kimliğini sürüm numarasıyla eşler. Bu bilgi, daha sonraki bir uygulama sürümünün farklı sonuç üretmesi durumunda eski kaydın hangi model sürümüne ait olduğunu gösterir.

### Sonuç anlık görüntüsü

`predictions`, her modelin kayıt anındaki:

- durumunu,
- metriklerini,
- uyarılarını,
- hesap izi kimliğini,
- varsayımlarını,
- formül ve sayısal yerine koyma adımlarını

saklar.

Dışa aktarılan dosya açıldığında sonuç otomatik olarak yeni model sürümüyle değiştirilmez. Kullanıcı girdileri yükleyip güncel motorla yeniden hesaplama yapabilir; dosyadaki anlık görüntü ise tarihsel kayıt olarak korunur.

## Doğrulama ve güvenlik

İçe aktarma sırasında:

1. JSON sözdizimi doğrulanır.
2. Şema kimliği kontrol edilir.
3. Şema sürümünün desteklendiği doğrulanır.
4. Deney kimliği, tarihler ve ad kontrol edilir.
5. Bütün sayısal girdiler sonlu ve izin verilen aralıkta olmalıdır.
6. Model sonuçları, metrikler ve hesap izi adımları doğrulanır.
7. Hatalı dosya yerel kayıt deposunu değiştirmeden reddedilir.

İçe aktarılan deney kimliği yerel bir kayıtla çakışırsa yeni bir kimlik üretilir ve kayıt adına `İçe aktarıldı` açıklaması eklenir.

## Eski dosya desteği

Şema kapsayıcısı bulunmayan, doğrudan tek bir geçerli `SavedExperiment` nesnesi içeren eski JSON dosyaları sürüm `0` kabul edilerek güncel yapıya taşınabilir.

Desteklenmeyen gelecekteki şema sürümleri sessizce yorumlanmaz; açık hata ile reddedilir. Yeni sürümler için ayrı taşıma fonksiyonu yazılması gerekir.

## Yerel kayıt deposu

Uygulamanın kullanıcı veri klasöründeki `experiments.json` dosyası da sürümlüdür.

Şema kimliği:

```text
geometric-observation-laboratory/local-experiment-store
```

Güncel sürüm:

```text
1
```

Önceki sürümde kullanılan düz JSON dizisi ilk okumada otomatik olarak bu kapsayıcıya taşınır ve atomik yazımla kaydedilir.

## HTML raporu

HTML raporu taşınabilir veri dosyasının yerine geçmez. Rapor:

- insan tarafından okunmak,
- çevrimdışı açılmak,
- tarayıcıdan yazdırılmak veya PDF'e dönüştürülmek

için üretilir.

Rapor verileri HTML içine güvenli biçimde kaçırılır. JSON dosyası yeniden içe aktarılabilir veri kaynağıdır; HTML raporu salt okunur sunum çıktısıdır.
