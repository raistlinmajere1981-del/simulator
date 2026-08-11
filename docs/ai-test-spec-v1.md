# GGL AI Test Spec v1

Bu belge Geometrik Gözlem Laboratuvarı ile birlikte çalışacak bir AI'nin, kullanıcı anlatımından uygulamanın **Metinden Hazırla** ekranına güvenli biçimde aktarılabilecek test metni üretmesi için sözleşmedir.

Amaç serbest metni tamamen AI'ye emanet etmek değildir. AI gözlem notunu yorumlar; uygulama ise yalnız bu belgede tanımlanan deterministik alanları **önizleme + kullanıcı onayı** sonrasında uygular.

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
- Anahtarları ve enum değerlerini bu sözleşmede yazıldığı gibi aynen kullan.
- Sayılarda ondalık ayırıcı olarak nokta kullan.
- Koordinat sırası her zaman enlem,boylamdır.
- observed_at_utc fiziksel UTC anıdır ve Z ile bitmelidir. utc_offset yalnız yerel/sivil saat referansıdır; fiziksel UTC anını değiştirmez.
- Metre alanlarına metre, kilometre alanına kilometre, yüzde alanlarına 0..100 arası sayı yaz.
- Atmosfer, datum, kırılma, ölçüm belirsizliği veya senaryo-özel bir değer verilmemişse varsayılan üretme.
- Kullanıcı bir varsayım yapmanı özellikle isterse bunu AI_NOTES altında açıkça "VARSAYIM" diye belirt; GGL-AI-TEST bloğuna ancak kullanıcı bu değerin teste uygulanmasını açıkça kabul etmişse koy.
- Desteklenmeyen bir ayrıntıyı başka bir alana zorla eşleme.
- Dosya/provenans gerektiren kaynakları (DEM/CSV/GeoJSON, panorama skyline, proper-motion dosyası, fotoğraf kalibrasyonu vb.) metin bloğunda uydurma.
- Gölge ölçümü verilmiş ama ölçüm belirsizliği bilinmiyorsa belirsizliği üretme; yalnız ölçüm değerini yaz.
- stellar.star_id için yalnız aşağıdaki doğrulanmış katalog kimliklerinden birini kullan. Yıldız adı biliniyor ama eşleme konusunda şüphen varsa alanı çıkar ve AI_NOTES'a yaz.
- stellar.local_horizon.* yalnız kullanıcının verdiği MANUEL skyline açıları içindir; dış dosya/panorama/DEM skyline'ı metinden temsil etme.
- eclipse.search_half_window_hours yalnız arama penceresini seçer. Tutulma taramasını yapmış gibi sonuç üretme; kullanıcı GGL içinde ayrıca "Pencereyi tara" düğmesine basacaktır.
- Blok dışında kısa bir AI_NOTES bölümü kullanabilirsin. GGL bu notları otomatik uygulamaz.
- Kullanıcı sonuç analizi istiyorsa önce test bloğunu üret; sonuçları ancak kullanıcı GGL'den hesapladıktan sonra yorumla.

Desteklenen scenario değerleri:
- target-visibility
- horizon
- long-distance-visibility
- sun-moon-observation
- shadow-observation
- stellar-observation
- eclipse-simulation

Ortak v1 anahtarları:
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

Gölge senaryosu anahtarları:
shadow.gnomon_height_m
shadow.observed_length_m
shadow.observed_length_uncertainty_m
shadow.observed_azimuth_deg
shadow.observed_azimuth_uncertainty_deg
shadow.station_b.coordinates
shadow.station_b.gnomon_height_m
shadow.station_b.observed_length_m
shadow.station_b.observed_length_uncertainty_m
shadow.station_b.observed_azimuth_deg
shadow.station_b.observed_azimuth_uncertainty_deg

Yıldız senaryosu anahtarları:
stellar.star_id
stellar.trail_duration_minutes
stellar.sample_interval_minutes
stellar.local_horizon.enabled
stellar.local_horizon.n_deg
stellar.local_horizon.ne_deg
stellar.local_horizon.e_deg
stellar.local_horizon.se_deg
stellar.local_horizon.s_deg
stellar.local_horizon.sw_deg
stellar.local_horizon.w_deg
stellar.local_horizon.nw_deg

Tutulma senaryosu anahtarı:
eclipse.search_half_window_hours

vertical_datum değerleri:
- orthometric-msl
- ellipsoidal-wgs84
- local

atmosphere_mode değerleri:
- off
- standard
- profile

stellar.star_id değerleri:
- hr-2491  # Sirius
- hr-2326  # Canopus
- hr-5340  # Arcturus
- hr-7001  # Vega
- hr-1708  # Capella
- hr-1713  # Rigel
- hr-2943  # Procyon
- hr-0472  # Achernar
- hr-2061  # Betelgeuse
- hr-5267  # Hadar
- hr-7557  # Altair
- hr-1457  # Aldebaran
- hr-6134  # Antares
- hr-5056  # Spica
- hr-2990  # Pollux
- hr-8728  # Fomalhaut
- hr-7924  # Deneb
- hr-3982  # Regulus
- hr-0424  # Polaris

stellar.trail_duration_minutes değerleri: 180, 360, 720, 1440, 2880
stellar.sample_interval_minutes değerleri: 5, 10, 15, 30, 60
eclipse.search_half_window_hours değerleri: 6, 12, 24, 48
stellar.local_horizon.enabled değerleri: true, false

Not: atmosphere_mode=profile v1'de yalnız "kontrol gerekli" olarak tanınır; katmanlı atmosfer örnekleri ayrı veri/provenans gerektirir ve otomatik uygulanmaz.
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

Koordinatlar verildiğinde uygulama mesafe kaynağını WGS84 koordinat moduna geçirir. `surface_distance_km` ayrıca verilirse kullanıcı önizlemede hangi alanları uyguladığını kontrol etmelidir.

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

`target.coordinates` Güneş/Ay senaryosunda rota karşılaştırmasının B noktasıdır.

## Kanonik blok örneği — iki istasyonlu gölge

```text
GGL-AI-TEST v1
scenario: shadow-observation
name: İki istasyonlu gölge testi
observed_at_utc: 2024-06-21T12:00:00Z
utc_offset: +00:00
observer.coordinates: 41.0082,28.9784
shadow.gnomon_height_m: 1.50
shadow.observed_length_m: 0.65
shadow.observed_length_uncertainty_m: 0.02
shadow.observed_azimuth_deg: 190
shadow.observed_azimuth_uncertainty_deg: 2
shadow.station_b.coordinates: 39.9334,32.8597
shadow.station_b.gnomon_height_m: 1.00
END GGL-AI-TEST
```

`shadow.station_b.*` alanlarından biri uygulanırsa iki istasyon karşılaştırması etkinleştirilir. A ve B ölçümleri aynı fiziksel `observed_at_utc` anında çözülür.

## Kanonik blok örneği — yıldız + manuel skyline

```text
GGL-AI-TEST v1
scenario: stellar-observation
name: Polaris yerel ufuk testi
observed_at_utc: 2026-08-11T21:00:00Z
utc_offset: +03:00
observer.coordinates: 41.0082,28.9784
stellar.star_id: hr-0424
stellar.trail_duration_minutes: 720
stellar.sample_interval_minutes: 10
stellar.local_horizon.enabled: true
stellar.local_horizon.n_deg: 5
stellar.local_horizon.ne_deg: 4
stellar.local_horizon.e_deg: 3
stellar.local_horizon.se_deg: 2
stellar.local_horizon.s_deg: 1
stellar.local_horizon.sw_deg: 2
stellar.local_horizon.w_deg: 3
stellar.local_horizon.nw_deg: 4
END GGL-AI-TEST
```

Manuel skyline alanları kullanıcı tarafından seçilip uygulanırsa kaynak modu `manual` olur. Daha önce uygulanmış dış skyline kaynağı bu değişiklikle birlikte hesapta kullanılmaz; dosya skyline'ı kendi doğrulama akışından geçmelidir.

## Kanonik blok örneği — tutulma arama penceresi

```text
GGL-AI-TEST v1
scenario: eclipse-simulation
name: Dallas 8 Nisan 2024 tutulma araması
observed_at_utc: 2024-04-08T18:42:00Z
utc_offset: +00:00
observer.coordinates: 32.7767,-96.7970
eclipse.search_half_window_hours: 12
END GGL-AI-TEST
```

Bu blok yalnız arama penceresini `±12 saat` seçer. Olay araması otomatik başlamaz; kullanıcı uygulamada **Pencereyi tara** düğmesine basar.

## v1 alan sözleşmesi

| Anahtar | Değer | Uygulama alanı |
|---|---|---|
| `scenario` | senaryo enum | aktif test senaryosu |
| `name` | 1..120 karakter | deney adı |
| `observed_at_utc` | ISO-8601 `...Z` | fiziksel gözlem anı |
| `utc_offset` | `+HH:MM` / `-HH:MM` | sabit sivil saat gösterim ofseti |
| `surface_distance_km` | 0..20000 | manuel yüzey mesafesi |
| `observer.coordinates` | `lat,lon` | gözlemci WGS84 koordinatı |
| `target.coordinates` | `lat,lon` | hedef / Güneş rota B koordinatı |
| `observer.eye_height_m` | 0..100000 | göz/kamera yüksekliği |
| `observer.ground_elevation_m` | -12000..100000 | gözlemci zemin kotu |
| `target.height_m` | >0..100000 | hedef yüksekliği |
| `target.ground_elevation_m` | -12000..100000 | hedef taban kotu |
| `observed_visible_percent` | 0..100 | gözlenen görünürlük |
| `observation_uncertainty_percent` | 0..100 | gözlem belirsizliği |
| `vertical_datum` | enum | düşey datum |
| `vertical_datum_offset_m` | -1000..1000 | datum/gelgit ofseti |
| `atmosphere_mode` | enum | atmosfer modu |
| `refraction_k` | -1..0.99 | standart kırılma katsayısı |
| `uncertainty.*` | pozitif sayı | model girdi belirsizlikleri |
| `shadow.gnomon_height_m` | >0..10000 | A istasyonu gnomon yüksekliği |
| `shadow.observed_length_m` | 0..10000000 | A gözlenen gölge uzunluğu |
| `shadow.observed_length_uncertainty_m` | 0..1000000 | A uzunluk belirsizliği |
| `shadow.observed_azimuth_deg` | 0..360 | A gölge azimutu |
| `shadow.observed_azimuth_uncertainty_deg` | 0..180 | A azimut belirsizliği |
| `shadow.station_b.coordinates` | `lat,lon` | B istasyonu WGS84 koordinatı |
| `shadow.station_b.gnomon_height_m` | >0..10000 | B gnomon yüksekliği |
| `shadow.station_b.observed_length_m` | 0..10000000 | B gölge uzunluğu |
| `shadow.station_b.observed_length_uncertainty_m` | 0..1000000 | B uzunluk belirsizliği |
| `shadow.station_b.observed_azimuth_deg` | 0..360 | B gölge azimutu |
| `shadow.station_b.observed_azimuth_uncertainty_deg` | 0..180 | B azimut belirsizliği |
| `stellar.star_id` | 19 kimlikten biri | seçili parlak yıldız |
| `stellar.trail_duration_minutes` | 180/360/720/1440/2880 | yıldız izi süresi |
| `stellar.sample_interval_minutes` | 5/10/15/30/60 | yıldız izi örnekleme aralığı |
| `stellar.local_horizon.enabled` | true/false | manuel yerel skyline etkinliği |
| `stellar.local_horizon.*_deg` | -90..90 | 8 yönlü manuel skyline yüksekliği |
| `eclipse.search_half_window_hours` | 6/12/24/48 | kullanıcı-tetiklemeli tutulma tarama yarı penceresi |

## Güvenlik / bilimsel bütünlük ilkeleri

- AI'nin metni **hesap sonucu değildir**; yalnız deney girdisi önerisidir.
- Uygulama bulunan her alanı mevcut değerle yan yana gösterir ve kullanıcı seçmeden hiçbir alanı değiştirmez.
- Tekrarlanan veya çelişkili aynı alanlar `KONTROL GEREKLİ` durumuna düşmelidir.
- Tanınmayan anahtarlar otomatik uygulanmaz ve not olarak raporlanır.
- Dosya kaynakları, fotoğraf kalibrasyonu, su seviyesi provenansı, DEM/CSV/GeoJSON, panorama skyline ve yıldız proper-motion kaynakları metinden otomatik oluşturulmaz.
- Manuel yıldız skyline değerleri yalnız 8 yönlü sayısal profil içindir; dış kaynak provenansının yerine geçmez.
- Tutulma penceresi seçimi arama sonucu değildir. Tarama ayrı kullanıcı eylemi olarak kalır.
- Gölge ölçüm belirsizliği yoksa uygulama uyum/uyumsuzluk sonucunu zorlamaz.

## Sonraki sürümler

Aşama 8.1 ortak deney girdileri ve kimlik/zaman sözleşmesini kurdu. Aşama 8.2 aynı v1 bloğunu gölge, yıldız ve tutulma senaryo ayarlarıyla genişletir. Sonraki dilim, GGL sonuçlarını başka bir AI'ye güvenli ve kompakt biçimde geri vermek için **AI Analiz Paketi** çıktı formatını ekleyecektir.
