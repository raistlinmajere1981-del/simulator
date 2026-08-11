# Aşama 8.5 — Aktif deney AI çalışma döngüsü

## Amaç

Aşama 8.3 ve 8.4'teki kayıtlı deney AI paketlerini günlük kullanım için kısaltmak: aktif deneyi önce kaydetmeden `GGL-AI-ANALYSIS v1` paketine dönüştürmek ve AI'nin önerdiği tek `GGL-AI-TEST v1` bloğunu kontrollü biçimde mevcut **Metinden Hazırla** önizlemesine taşımak.

## Akış

1. Aktif deney mevcut UI state'i ve o anda hesaplanmış prediction'larla geçici bir `SavedExperiment` anlık görüntüsüne dönüştürülür.
2. Bu anlık görüntü diske yazılmaz; yalnız `GGL-AI-ANALYSIS v1` üreticisinden geçirilir.
3. Kullanıcı paketi panoya kopyalayıp harici AI'ye gönderir.
4. AI yanıtının tamamı GGL'ye geri yapıştırılabilir.
5. GGL yanıt içinden tam olarak bir adet kanonik `GGL-AI-TEST v1 ... END GGL-AI-TEST` bloğu ayıklar.
6. Blok eksik veya birden fazlaysa aktarım fail-closed durur.
7. Tek blok bulunduğunda mevcut **Metinden Hazırla** ekranı bu metinle önceden doldurulur ve ayrıştırma taslağı açılır.
8. Hiçbir alan önizleme ve kullanıcı onayı olmadan uygulanmaz.

## Tasarım kararları

- Yeni bir AI API bağlantısı kurulmaz; veri otomatik olarak dış servise gönderilmez.
- Aktif paket normal kayıt listesine eklenmez.
- Kaydetme ile AI anlık görüntüsü aynı deney snapshot üreticisini paylaşır; böylece model sürümü ve prediction kapsamı birbirinden sapmaz.
- AI cevabından yalnız tek kanonik test bloğu kabul edilir. Birden fazla blokta uygulama seçim yapmaz.
- Serbest açıklama metni test bloğunun önünde/arkasında kalabilir; yalnız kanonik blok Metinden Hazırla'ya aktarılır.
- Metinden Hazırla'nın `BULUNDU / KONTROL GEREKLİ / KULLANILAMADI` güvenlik sözleşmesi değiştirilmez.

## Kabul testleri

1. Üst menüde **AI ile Analiz** aktif deneyi kaydetmeden açılır.
2. Paket `GGL-AI-ANALYSIS v1` ile başlar ve mevcut deney sonuçlarını içerir.
3. AI paketini kopyalama çalışır.
4. Normal açıklama metni + tek `GGL-AI-TEST v1` bloğu içeren yanıt kabul edilir.
5. Eksik kapanış işaretli blok reddedilir.
6. İki kanonik test bloğu bulunan yanıt reddedilir.
7. Tek test bloğu **Metinden Hazırla** ekranına önceden doldurulmuş ve taslağı hazırlanmış halde aktarılır.
8. Geçersiz alanlar yine seçilemez.
9. Aktif AI paketini açmak kayıt sayısını değiştirmez.
10. TypeScript, test ve production build başarılıdır.

## Sürüm

v1.32.0
