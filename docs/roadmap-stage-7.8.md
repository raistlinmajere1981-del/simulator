# Aşama 7.8 — Astronomi kayıt, taşınabilirlik ve rapor entegrasyonu

Durum: geliştirme / yerel doğrulama bekleniyor · `1.27.0`

## Amaç

Aşama 7 boyunca eklenen Güneş, Ay, tutulma, mevsim, Güneş zamanı ve aynı-an rota karşılaştırması sonuçlarını yalnız ekranda görünen geçici hesaplar olmaktan çıkarıp deney kaydının yeniden üretilebilir parçası haline getirmek.

## Kayıt sözleşmesi

- Güneş konumu, günlük Güneş olayları ve Ay konumu zaten `ModelPrediction` anlık görüntüsü olarak kaydediliyordu.
- Aşama 7.8 ile `solar-time-offset`, `solar-season-events` ve `solar-route-comparison` prediction'ları da aynı kayıt dizisine eklenir.
- Model sürümleri `modelVersions` içinde bu prediction'larla birlikte saklanır.
- Rota karşılaştırması B noktası artık geçici React state'i değildir. Astronomi senaryosunda zaten taşınabilir şemada bulunan `targetLatitudeDeg` / `targetLongitudeDeg` alanları B karşılaştırma noktası olarak kullanılır.
- Rota prediction'ı ayrıca A/B koordinatlarını metrik olarak taşır; rapor ve dış sistemler prediction anlık görüntüsünü tek başına da yorumlayabilir.
- Mevcut portable schema genel `ModelPrediction` sözleşmesini desteklediği için yeni şema alanı veya kırıcı migration gerekmez.

## Yeniden açma

Kaydedilmiş `sun-moon-observation` deneyi açıldığında:

1. gözlem anı ve açık UTC ofseti kayıttan geri gelir,
2. gözlemci A koordinatı `observer*` alanlarından geri gelir,
3. rota B koordinatı `target*` alanlarından geri gelir,
4. günlük, zaman, mevsim ve rota hesapları aynı girdilerle tekrar türetilir,
5. kayıt anındaki prediction anlık görüntüleri `.ggl.json` ve HTML raporda korunur.

Bu yaklaşım büyük rota örnek dizilerini veya yıllık geçici UI state'ini ayrı özel şema alanlarına gömmez; mevcut model-prediction altyapısını kullanır.

## HTML raporu

- Astronomi prediction'ları ayrı `Astronomi sonuçları` grubunda gösterilir.
- Güneş zamanı, ekinoks/gündönümü, rota ve tutulma modellerinin insan okunabilir adları eklenir.
- `unix-ms` metrikler ham milisaniye olarak değil tarih/saat olarak gösterilir.
- Boolean metrikler `Evet / Hayır` olarak gösterilir.
- Güneş/Ay senaryosu rapor başlığında rota karşılaştırması B koordinatını ayrıca gösterir.
- Tutulma senaryosu astronomik rapor girdisi olarak tanınır.

## Bilimsel sınır

Bu aşama hesap hassasiyetini değiştirmez. Kaydedilen prediction'lar ilgili modelin Aşama 7'de tanımlanmış düşük hassasiyetli ve geometrik sınırlarını aynen taşır. Rota karşılaştırması hâlâ aynı fiziksel UTC anındaki beş WGS84 örneğidir; seyahat süresi, IANA saat dilimi/DST değişimi, atmosferik kırılma veya topoğrafik ufuk eklenmez.

## Otomatik doğrulama

`tests/astronomy-report-persistence.test.ts`:

- B rota koordinatının portable export/import boyunca korunmasını,
- zaman/mevsim/rota prediction kimliklerinin taşınmasını,
- rota prediction'ında A/B endpoint metriklerinin bulunmasını,
- HTML raporda ayrı astronomi grubu ve okunabilir model adlarının çıkmasını,
- olay zamanlarının ham Unix milisaniyesi olarak sunulmamasını

doğrular.

## Manuel Electron kabulü

1. `Güneş ve Ay Gözlemleri` içinde B noktasını `B'yi 30° doğuya al` ile değiştir.
2. Deneyi kaydet; başka deneye geçip yeniden aç.
3. B koordinatı ve rota sonucu aynı kalmalı.
4. `Veri Yöneticisi` üzerinden `.ggl.json` dışa aktar / içe aktar yapıldığında B koordinatı ve Aşama 7 prediction'ları korunmalı.
5. HTML raporu dışa aktar. Raporda `Astronomi sonuçları` başlığı altında Güneş zamanı, yıllık mevsim ve rota karşılaştırması bölümleri görünmeli; olay zamanları okunabilir tarih/saat olmalı.
6. Tutulma kaydının raporunda anlık disk geometrisi ve varsa kontrollü olay araması insan okunabilir model adlarıyla görünmeli.

## Sonraki aday

Aşama 7.8 tamamlandığında Aşama 7 hesap, UI, kayıt ve rapor zinciri bir bütün olarak kapanmış sayılabilir. Sonraki çalışma yol haritasındaki yeni ana faza veya genel uygulama kalite/persistence borçlarına geçebilir.
