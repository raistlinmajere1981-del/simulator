# Aşama 6.27 — Panorama skyline importu, işaretleme ve provenans

Durum: tamamlanma adayı · `1.20.0`

## Amaç

Aşama 6.26'da tanımlanan equirectangular panorama pikseli ↔ gerçek azimut / geometrik yükseklik çekirdeğini gerçek Electron dosya akışına, kullanıcı kontrollü skyline işaretlemeye, mevcut Yıldız Gözlemleri yerel-ufuk zincirine ve taşınabilir provenans kayıtlarına bağlamak.

Bu aşama **otomatik görüntü segmentasyonu yapmaz**. Kullanıcı, panorama üzerinde gökyüzü/arazi sınırını elle işaretler; uygulama işaretlerin yön geometrisini hesaplar ve yeterli 360° kapsama varsa mevcut geometrik skyline motoruna aktarır.

## Kaynak sözleşmesi

Desteklenen görüntüler:

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- dosya boyutu en fazla 25 MB
- çözümlenebilir bitmap boyutları en fazla 100.000 px / eksen

Dosya seçiminde kaydedilen taslak bilgiler:

- dosya adı
- boyut
- SHA-256
- import zamanı
- MIME türü
- gerçek bitmap genişlik / yükseklik
- oturumluk `dataUrl`
- GPano metadata özeti

`dataUrl` yalnız editör oturumunda kullanılır; `SavedExperiment`, portable JSON veya HTML rapora gömülmez.

## GPano XMP

Birincil geometri sözleşmesi Google Photo Sphere metadata dokümantasyonudur:

- https://developers.google.com/streetview/spherical-metadata

JPEG APP1 içindeki standart Adobe XMP paketi taranır. GPano namespace'i belirli bir prefix adına bağlanmaz; namespace URI üzerinden çözülür.

Okunan alanlar:

- `ProjectionType`
- `PoseHeadingDegrees`
- `PosePitchDegrees`
- `PoseRollDegrees`
- `CroppedAreaImageWidthPixels`
- `CroppedAreaImageHeightPixels`
- `FullPanoWidthPixels`
- `FullPanoHeightPixels`
- `CroppedAreaLeftPixels`
- `CroppedAreaTopPixels`

Kurallar:

- yalnız `equirectangular` otomatik geometri olarak kabul edilir
- gerçek-kuzey yönü için `PoseHeadingDegrees` zorunludur
- pitch / roll yoksa GPano'nun 0° varsayımı kullanılır ve warning kaydedilir
- metadata crop boyutu gerçek bitmap ile birebir uyuşuyorsa doğrudan uygulanır
- görüntü sonradan **uniform** ölçeklenmişse full-pano/crop piksel değerleri aynı katsayıyla ölçeklenir ve bu provenansta kaydedilir
- en-boy oranı bozulmuşsa `incompatible-scale` ve otomatik geometri fail-closed
- Extended XMP yalnız tespit edilir; bu sürüm eksik GPano alanlarını Extended XMP'den sessizce birleştirmez

PNG için JPEG XMP otomatik okuması yapılmaz; geometri manuel olarak doğrulanır.

## Geometri kaynağı ayrımı

İki açık mod vardır:

### `gpano-xmp`

- yalnız `metadata.status = complete` ise kullanılabilir
- doğrulanmış XMP geometrisi editörde kaynak olarak kilitlidir
- heading/crop/pose değerlerinden biri değiştirilirse kaynak artık GPano provenansı sayılamaz
- değiştirilmiş geometri `manual` moduna geçirilmeden kalıcı skyline üretilemez

### `manual`

- bitmap boyutları kaynak görüntüden sabittir
- kullanıcı full-pano boyutları, crop ofsetleri ve heading/pitch/roll değerlerini açıkça girer
- provenansta `geometrySource = manual` olarak saklanır
- GPano doğrulaması yapılmış gibi gösterilmez

## Kullanıcı kontrollü skyline

Panorama editöründe görüntüye tıklanan her nokta:

```text
(xPx, yPx)
  ↓
Aşama 6.26 equirectangular geometri
  ↓
(azimut, geometrik yükseklik)
```

olarak dönüştürülür.

Kullanıcı:

- nokta ekleyebilir
- son noktayı geri alabilir
- tek bir marker'a tıklayarak silebilir
- tüm işaretleri temizleyebilir
- son işaretlerin piksel → azimut/yükseklik karşılıklarını görebilir

Görüntü işaretleme koordinatları ile marker yüzdelerinin aynı çizim alanında kalması için panorama bitmap'i editör genişliğine birebir ölçeklenir; ayrı `max-height/object-fit` kırpması kullanılmaz.

## Kaynak hazırlama fail-closed sınırları

Kalıcı panorama skyline kaynağı yalnız şu koşullarda üretilebilir:

- en az 8 işaret
- en fazla 1440 işaret
- yatay panorama kapsamı 360°
- normalize edilmiş skyline'da maksimum azimut boşluğu ≤90°
- bitmap boyutları kaynak taslakla eşleşir
- GPano modunda geometri doğrulanmış metadata ile birebir aynıdır

Partial panorama için görünmeyen azimutlar interpolasyonla 360° kabul edilmez.

`Panorama skyline hazırla` yalnız yerel-ufuk **taslağı** oluşturur. Yıldız hesabı mevcut `Uygula ve hesapla` eylemine kadar çalıştırılmaz. Böylece dosya seçimi, geometri düzenleme ve marker ekleme ağır astronomi hesabını tetiklemez.

## Kalıcı provenans

`format = panorama` kaynağında şunlar saklanır:

- dosya adı / SHA-256 / dosya boyutu / import zamanı
- normalize geometrik skyline noktaları
- maksimum azimut boşluğu
- equirectangular algoritma id/sürümü
- geometri kaynağı: GPano veya manuel
- bitmap / full-pano / crop geometri değerleri
- heading / pitch / roll
- yatay/düşey kapsama ve full-sphere bayrağı
- import anındaki metadata durumu
- projection type
- standart / extended XMP bulunma bayrakları
- bitmap metadata ölçekleme bayrağı
- her manuel işaretin piksel ve türetilmiş azimut/yükseklik değeri

Ham görüntü baytları saklanmaz.

## Portable / local-store v11

Şema sürümü `11` olur; v1–v10 migration girdileri korunur.

Panorama kaydı yeniden açılırken yalnız saklanan türetilmiş skyline'a güvenilmez:

1. panorama geometri sözleşmesi tekrar doğrulanır
2. her `(x,y)` işareti Aşama 6.26 algoritmasıyla yeniden azimut/yüksekliğe çevrilir
3. persisted işaret açısıyla karşılaştırılır
4. bütün işaretler yeniden normalize edilir
5. persisted skyline noktaları ve maksimum azimut boşluğuyla karşılaştırılır
6. GPano kaynağıysa import metadata provenansı ayrıca doğrulanır

Pose/crop/işaret/türetilmiş açı oynanmış kayıt fail-closed reddedilir.

## Yıldız hesabı

Panorama kaynak:

```text
sourceKind = derived
```

olarak mevcut `stellar-local-horizon-mask` zincirine girer. İkinci bir skyline interpolasyon motoru yoktur.

Hesap trace'inde kaynak dosyası, `derived` türü, SHA-256 ve panorama-specific warning/provenans korunur.

Atmosferik apparent yıldız yüksekliği ile geometrik panorama skyline otomatik optik görünürlük kararı üretmez.

## HTML rapor

Rapor `Panorama skyline kaynak provenansı` bölümünde:

- format
- dosya/SHA/boyut/import zamanı
- algoritma
- GPano / manuel geometri kaynağı
- metadata durumu
- standard/extended XMP bayrakları
- bitmap ölçekleme
- bitmap / full-pano / crop
- pose heading/pitch/roll
- yatay/düşey kapsam
- manuel işaret sayısı
- maksimum azimut boşluğu

bilgilerini gösterir.

Ham panorama görüntüsü rapora gömülmez.

## Regresyon kapsamı

- standard JPEG APP1 XMP çıkarımı
- GPano namespace URI çözümü
- RDF element ve attribute serialization
- pitch/roll 0° varsayımı
- uniform resize metadata ölçeklemesi
- aspect-ratio mismatch fail-closed
- unsupported projection / missing heading
- Extended XMP fail-closed davranışı
- panorama source 360° / 8 işaret / 90° gap sınırları
- GPano geometri değiştirme reddi
- portable/local-store v11 round-trip
- pose / piksel / mapped angle tamper reddi
- session `dataUrl` persistence reddi
- schema v10 migration
- stellar trace derived-source provenansı
- HTML panorama provenansı

## Manuel Electron kontrolü

Repo içindeki:

```text
docs/examples/panorama-skyline-example.png
```

sentetik manuel-geometri fixture'ı kullanılacaktır. Ayrıntılı adımlar aynı klasördeki `panorama-skyline-example.README.md` dosyasındadır.

Bu kontrol geçene kadar Aşama 6.27 roadmap'te `tamamlanma adayı` kalır.

## Sonraki olası dilim

Manuel ve provenanslı zincir gerçek Electron üzerinde doğrulandıktan sonra otomatik skyline segmentasyonu ayrı bir deneysel özellik olarak değerlendirilebilir. Segmentasyon çıktısı da otomatik uygulanmak yerine kullanıcıya düzenlenebilir/denetlenebilir bir taslak olarak verilmelidir.
