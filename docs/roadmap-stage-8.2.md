# Aşama 8.2 — AI senaryo alan adaptörleri

## Amaç

`GGL-AI-TEST v1` ortak deney sözleşmesini, mevcut gelişmiş senaryoların kullanıcı tarafından düzenlenebilen sayısal ayarlarına genişletmek.

Bu aşama AI'ye hesap yetkisi vermez. AI yalnız deterministik test girdisi üretir; **Metinden Hazırla** önizlemesi ve kullanıcı seçimi uygulama kapısı olmaya devam eder.

## Kapsam

### Gölge deneyi

- A istasyonu gnomon yüksekliği.
- Gözlenen gölge uzunluğu ve belirsizliği.
- Gözlenen gölge azimutu ve belirsizliği.
- B istasyonu koordinatı ve aynı ölçüm alanları.
- En az bir `shadow.station_b.*` alanı uygulanırsa iki istasyon karşılaştırması etkinleştirilir.

### Yıldız gözlemleri

- 19 kayıtlı parlak yıldızdan katalog kimliği seçimi.
- İz süresi ve örnekleme aralığı.
- 8 yönlü manuel yerel skyline etkinliği ve yükseklikleri.
- Manuel skyline metinden uygulanırsa kaynak modu `manual` olur; dış dosya skyline provenansı metinle taklit edilmez.
- Proper-motion dosyası, DEM/panorama skyline ve diğer dış kaynaklar metin sözleşmesinin dışında kalır.

### Tutulma simülasyonu

- `±6 / ±12 / ±24 / ±48 saat` kontrollü olay arama yarı penceresi.
- Metin uygulaması yalnız pencere seçimini değiştirir.
- Olay araması **otomatik başlamaz**; `Pencereyi tara` kullanıcı eylemi olarak kalır.

## Fail-closed ilkeleri

- Enum dışı yıldız kimliği, iz süresi, örnekleme aralığı ve tutulma penceresi `KONTROL GEREKLİ` olur.
- Sayısal sınır dışı gölge/skyline değerleri uygulanmaz.
- Çelişkili aynı anahtarlar mevcut conflict-collapse mekanizmasıyla otomatik uygulanmaz.
- Dış dosya/provenans gerektiren özellikler kanonik anahtar olarak sunulmaz.
- Senaryo özel alanları da mevcut değer → önerilen değer önizlemesinden geçer.

## Kabul testleri

1. İki istasyonlu gölge bloğu A ölçümlerini doldurur ve B istasyonu karşılaştırmasını etkinleştirir.
2. Polaris bloğu `hr-0424`, 12 saat / 10 dakika ve 8 yönlü manuel skyline'ı uygular.
3. Tutulma bloğu `eclipse.search_half_window_hours: 12` ile `±12 saat` seçer ancak taramayı başlatmaz.
4. Geçersiz `stellar.star_id`, `stellar.trail_duration_minutes` veya tutulma penceresi otomatik uygulanmaz.
5. TypeScript, odaklı testler ve production build başarılıdır.

## Sonraki dilim

Aşama 8.3, kaydedilmiş veya aktif deney sonuçlarını başka bir AI'ye vermek için kompakt ve sürümlü **GGL AI Analiz Paketi** çıktı sözleşmesini ekler.
