# Aşama 8.4 — Çoklu AI karşılaştırma paketi

## Amaç

Aşama 8.3'teki tek deney `GGL-AI-ANALYSIS v1` çıktısını, birden fazla kaydedilmiş deney için sınırları açık biçimde koruyan `GGL-AI-COMPARISON v1` paketiyle tamamlamak.

Bu aşama AI'ye hesap yetkisi vermez. Karşılaştırma paketi yalnız GGL'de zaten hesaplanmış ve kaydedilmiş deney sonuçlarını başka bir AI'ye taşır.

## Kapsam

- Veri Yöneticisi'nde 2-12 kayıt seçilebilir.
- Seçilen kayıtlar tek `GGL-AI-COMPARISON v1` metninde ayrı `EXPERIMENT n` blokları olarak taşınır.
- Her deney kendi senaryo, zaman, koordinat, model sürümü, status, metrik, uyarı, varsayım ve provenans sınırını korur.
- `same_scenario` yalnız tanı alanıdır; metrik eşdeğerliği iddiası değildir.
- Tek deney paketine `scope.uses_target / uses_route / uses_observation / uses_terrain` alanları eklenir. Böylece ortak UI state'inde saklanan ama senaryoda aktif olmayan varsayılan girdiler AI tarafından gerçek ölçüm sanılmaz.
- Karşılaştırma görevi AI'ye yalnız aynı anlam ve birimdeki metrikleri doğrudan karşılaştırmasını söyler.
- Sonraki deney önerilerinin mümkünse `GGL-AI-TEST v1` alanlarına dönüştürülebilir olması istenir.

## Sınırlar

- En az 2, en fazla 12 deney.
- Hesap izi adımlarının tam gövdesi yine eklenmez.
- AI paketi uygulama dışına otomatik gönderilmez; yalnız kullanıcı önizler ve panoya kopyalar.
- Farklı senaryolar aynı pakete alınabilir ancak AI doğrudan metrik eşdeğerliği varsayamaz.
- Paket deney sayısını oy çokluğu veya bilimsel kanıt ağırlığı olarak kullanmaz.

## Kabul testleri

1. Veri Yöneticisi'nde iki kayıt seçildiğinde `AI Karşılaştırması` etkinleşir.
2. Tek kayıt seçildiğinde düğme pasif kalır.
3. Önizleme `GGL-AI-COMPARISON v1` ile başlar ve `experiment_count: 2` gösterir.
4. Her kayıt ayrı `EXPERIMENT 1/2 BEGIN ... END` bloğunda görünür.
5. Aynı senaryodan iki kayıt için `same_scenario: true`; farklı senaryolarda `false` görünür.
6. Panoya kopyalama önizleme metnini aynen taşır.
7. 13 deney API seviyesinde reddedilir.
8. TypeScript, test ve production build başarılıdır.

## Kabul sonucu

2026-08-11 yerel kabulünde aynı senaryo için `same_scenario: true`, farklı senaryo için `same_scenario: false`, panoya kopyalama ve production build doğrulandı. Aşama 8.4 tamamlandı.

## Sonraki dilim

Aşama 8.5, aktif deneyi kaydetmeden AI paketine dönüştürme ve AI → `GGL-AI-TEST v1` → Metinden Hazırla geri-besleme akışını kısaltır.
