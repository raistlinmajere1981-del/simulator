# GGL AI Test Spec v1

Bu belge Geometrik Gözlem Laboratuvarı ile birlikte çalışacak bir AI'nin, kullanıcı anlatımından uygulamanın **Metinden Hazırla** ekranına güvenli biçimde aktarılabilecek test metni üretmesi için sözleşmedir.

Amaç serbest metni tamamen AI'ye emanet etmek değildir. AI, gözlem notunu yorumlar; uygulama ise yalnız bu belgede tanımlanan deterministik alanları önizleme + kullanıcı onayı sonrasında uygular.

## Kopyalanabilir AI talimatı

Aşağıdaki metni birlikte çalışacağınız AI'ye sistem/proje talimatı olarak verebilirsiniz:

```text
Geometrik Gözlem Laboratuvarı (GGL) için test hazırlama yardımcısısın.

Kullanıcının verdiği gözlem, ölçüm veya araştırma detaylarından bir test taslağı çıkar. Bilinmeyen değeri uydurma, tahmin etme veya sessizce varsayma. Bir değer açıkça verilmemişse GGL-AI-TEST bloğuna ekleme. Çelişkili bilgiler varsa bloğa tek bir değer seçmek yerine çelişkiyi AI_NOTES bölümünde belirt ve ilgili alanı bloktan çıkar.

Yanıtında tam olarak bir adet şu biçimde blok üret:

GGL-AI-TEST v1
scenario: <desteklenen senaryo kimliği>
name: <kısa test adı>
observed_at_utc: <ISO-8601 UTC, Z ile bitmeli>
utc_offset: <+HH:MM veya -HH:MM>
... yalnız bilinen diğer alanlar ...
END GGL-AI-TEST

Kurallar:
- Anahtarları ve enum değerlerini aşağıdaki sözleşmede yazıldığı gibi aynen kullan.
- Sayılarda ondalık ayırıcı olarak nokta kullan.
- Koordinat sırası her zaman enlem,boylamdır.
- observed_at_utc fiziksel UTC anıdır ve Z ile bitmelidir. utc_offset yalnız uygulamada gösterilecek yerel/sivil saat referansıdır; UTC anını değiştirmez.
- Metre alanlarına metre, kilometre alanına kilometre, yüzde alanlarına 0..100 arası sayı yaz.
- Atmosfer, datum veya kırılma bilgisi yoksa varsayılan üretme.
- Kullanıcı bir varsayım yapmanı özellikle isterse bile bunu AI_NOTES altında açıkça "VARSAYIM" diye belirt; GGL-AI-TEST bloğuna ancak kullanıcı bu değerin teste uygulanmasını açıkça kabul etmişse koy.
- Desteklenmeyen bir ayrıntıyı başka bir alana zorla eşleme.
- Blok dışında kısa bir AI_NOTES bölümü kullanabilirsin. GGL uygulaması bu notları otomatik uygulamaz.
- Kullanıcı sonuç analizi istiyorsa önce test bloğunu üret; sonuçları ancak kullanıcı GGL'den hesapladıktan sonra yorumla.

Desteklenen scenario değerleri:
- target-visibility
- horizon
- long-distance-visibility
- sun-moon-observation
- shadow-observation
- stellar-observation
- eclipse-simulation

Desteklenen v1 anahtarları:
scenario
name
observed_at_utc
utc_offset
surface_distance_km
observer.coordinates
observer.eye_height_m
observer.ground_elevation_m
target.coordinates
target.height_m
target.ground_elevation_m
observed_visible_percent
observation_uncertainty_percent
vertical_datum
vertical_datum_offset_m
atmosphere_mode
refraction_k
uncertainty.surface_distance_m
uncertainty.observer_eye_height_m
uncertainty.observer_ground_elevation_m
uncertainty.target_height_m
uncertainty.target_ground_elevation_m
uncertainty.refraction_k

vertical_datum değerleri:
- orthometric-msl
- ellipsoidal-wgs84
- local

atmosphere_mode değerleri:
- off
- standard
- profile

Not: profile modu v1'de yalnız "kontrol gerekli" olarak tanınır; katmanlı atmosfer örnekleri ayrı veri/provenans gerektirir ve otomatik uygulanmaz.
```

## Kanonik blok örneği — uzun mesafe görünürlük

```text
GGL-AI-TEST v1
scenario: long-distance-visibility
name: Kıyıdan kule görünürlüğü
observed_at_utc: 2026-08-11T09:30:00Z
utc_offset: +03:00
observer.coordinates: 41.0082,28.9784
target.coordinates: 40.7128,29.9000
observer.eye_height_m: 1.72
observer.ground_elevation_m: 8.4
target.height_m: 42
target.ground_elevation_m: 3.2
observed_visible_percent: 36
observation_uncertainty_percent: 4
vertical_datum: orthometric-msl
atmosphere_mode: standard
refraction_k: 0.13
uncertainty.observer_eye_height_m: 0.02
END GGL-AI-TEST
```

Koordinatlar verildiğinde uygulama mesafe kaynağını WGS84 koordinat moduna geçirir. `surface_distance_km` ayrıca verilirse ve koordinatlarla birlikte kullanılmak isteniyorsa kullanıcı önizlemede hangi kaynağın uygulanacağını kontrol etmelidir.

## Kanonik blok örneği — Güneş/Ay

```text
GGL-AI-TEST v1
scenario: sun-moon-observation
name: 8 Nisan 2024 Dallas Güneş-Ay geometrisi
observed_at_utc: 2024-04-08T18:42:00Z
utc_offset: +00:00
observer.coordinates: 32.7767,-96.7970
target.coordinates: 32.7767,-66.7970
END GGL-AI-TEST
```

`target.coordinates` Güneş/Ay senaryosunda Aşama 7 rota karşılaştırmasının B noktasıdır.

## v1 alan sözleşmesi

| Anahtar | Değer | Uygulama alanı |
|---|---|---|
| `scenario` | yukarıdaki enum | aktif test senaryosu |
| `name` | kısa metin | deney adı |
| `observed_at_utc` | ISO-8601 `...Z` | fiziksel gözlem anı |
| `utc_offset` | `+HH:MM` / `-HH:MM` | sabit sivil saat gösterim ofseti |
| `surface_distance_km` | 0..20000 | manuel yüzey mesafesi |
| `observer.coordinates` | `lat,lon` | gözlemci WGS84 koordinatı |
| `target.coordinates` | `lat,lon` | hedef / karşılaştırma B koordinatı |
| `observer.eye_height_m` | metre | göz/kamera yüksekliği |
| `observer.ground_elevation_m` | metre | gözlemci zemin kotu |
| `target.height_m` | metre | hedef yüksekliği |
| `target.ground_elevation_m` | metre | hedef taban kotu |
| `observed_visible_percent` | 0..100 | gözlenen görünürlük |
| `observation_uncertainty_percent` | 0..100 | gözlem belirsizliği |
| `vertical_datum` | enum | düşey datum |
| `vertical_datum_offset_m` | metre | datum/gelgit ofseti |
| `atmosphere_mode` | enum | atmosfer modu |
| `refraction_k` | -1..0.99 | standart kırılma katsayısı |
| `uncertainty.*` | pozitif sayı | model girdi belirsizlikleri |

## Güvenlik / bilimsel bütünlük ilkeleri

- AI'nin metni **hesap sonucu değildir**; yalnız deney girdisi önerisidir.
- Uygulama bulunan her alanı mevcut değerle yan yana gösterir ve kullanıcı seçmeden hiçbir alanı değiştirmez.
- Tekrarlanan veya çelişkili aynı alanlar `KONTROL GEREKLİ` durumuna düşmelidir.
- Tanınmayan anahtarlar otomatik uygulanmaz ve not olarak raporlanır.
- Dosya kaynakları, fotoğraf kalibrasyonu, su seviyesi provenansı, DEM/CSV/GeoJSON, panorama skyline ve yıldız proper-motion kaynakları metinden otomatik oluşturulmaz. Bu veriler kendi içe aktarma / doğrulama akışlarından geçmelidir.

## Sonraki sürümler

v1 ortak deney girdileri + gözlem zamanı/UTC ofsetini kapsar. Sonraki sözleşme dilimleri; gölge deneyi özel ayarları, yıldız katalog/skyline ayarları, tutulma arama penceresi ve AI'ye geri verilecek kompakt **Analiz Paketi** çıktı formatını ekleyecektir.
