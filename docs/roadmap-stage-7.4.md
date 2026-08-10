# Aşama 7.4 — Ayrı tutulma senaryosu ve kayıt sözleşmesi

Durum: geliştirme adayı · `1.23.0`

## Amaç

Aşama 7.1–7.3 ile doğrulanan anlık Güneş–Ay disk geometrisini ve kullanıcı kontrollü yerel zaman penceresi aramasını artık ayrı `Tutulma Simülasyonları` iş akışına taşımak. Bu dilimde geçici arama sonucu kaydedilebilir `ModelPrediction` sözleşmesine dönüştürülür ve deney yeniden açıldığında son doğrulanmış tarama özeti geri yüklenir.

## Arayüz

- Soldaki `Tutulma Simülasyonları` satırı `YAKINDA` durumundan çıkar ve aktif senaryo olur.
- Senaryo yalnız gözlemci WGS84 enlem/boylamı ve astronomik zaman kartını kullanır.
- Anlık Güneş–Ay apparent disk geometrisi üst kartta gösterilir.
- `Yerel disk örtüşme olayı ara` kartı kullanıcı isteğiyle `±6 / ±12 / ±24 / ±48 saat` tarar.
- Güncel tarama `KAYDA HAZIR`, girişler sonradan değişirse `ESKİ SONUÇ` olarak işaretlenir.
- Eski sonuç yeni deney kaydına güncel event sonucu olarak eklenmez; yeniden tarama gerekir.

## Kayıt / geri açma

Ayrı tutulma senaryosu kaydedildiğinde:

- `scenarioId = eclipse-simulation`
- anlık disk geometrisi ayrı `ModelPrediction`
- güncel event-search snapshot'ı ayrı `ModelPrediction`
- arama merkezi, konum, pencere, kaba örnek sayısı
- en yakın yaklaşım
- yaklaşık örtüşme başlangıç / maksimum / bitiş
- süre ve maksimum örtüşme oranları
- varsa iç kapsama aralığı
- pencere kırpma bayrakları
- bilimsel uyarılar ve hesap izi

saklanır.

Yeniden açılışta event-search `ModelPrediction` metriklerinden snapshot tekrar oluşturulur. Böylece büyük zaman serisi veya yüzlerce kaba örnek kayda gömülmez; yalnız yeniden üretilebilir özet ve provenans korunur.

## Bilimsel sınır

Bu özellik resmi tutulma efemerisi değildir. Bessel elemanları, resmi C1–C4 temasları, merkez hattı/gölge yolu, JPL DE yüksek hassasiyet efemerisi, Ay limb topografyası, atmosferik kırılma ve gözlemci rakımının Ay paralaksına etkisi uygulanmaz.

## Kabul testleri

- `Tutulma Simülasyonları` menü satırı aktif ve ayrı senaryo olarak açılır.
- Dallas 2024-04-08 örneğinde anlık disk kartı ve `±12 saat` olay taraması çalışır.
- Tarama sonrası deney kaydedilip yeniden açıldığında olay özeti geri gelir.
- Tarih veya koordinat değiştirilirse geri yüklenen tarama `ESKİ SONUÇ` olur.
- Eski sonuçla kaydetme yeni event-search prediction üretmez.
- Olay olmayan pencere yalnız en yakın yaklaşımı kaydeder; sahte başlangıç/bitiş üretmez.
- TypeScript, test ve production Electron build başarılıdır.
