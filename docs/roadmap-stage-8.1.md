# Aşama 8.1 — AI Test Spec v1 ve deterministik metin doldurma

Durum: geliştirme · hedef sürüm `1.28.0`

## Amaç

Mevcut `Metinden Hazırla` özelliğini, serbest Türkçe notları tanıyan yardımcı parser olmaktan çıkarıp AI ile güvenli işbirliği yapabilecek iki katmanlı bir giriş sistemine dönüştürmek:

1. mevcut doğal dil eşleştirmeleri geriye dönük çalışmaya devam eder,
2. herhangi bir AI'nin üretebileceği, sürümlü ve deterministik `GGL-AI-TEST v1` bloğu öncelikli olarak tanınır.

Bu aşama AI servisi veya API entegrasyonu eklemez. AI yalnız metin üretir; uygulama yerelde, deterministik parser ile alanları çıkarır ve kullanıcı onayı olmadan değişiklik yapmaz.

## Aşama 8.1 kapsamı

- Bütün 7 senaryo kimliği metinden seçilebilir.
- Deney adı metinden hazırlanabilir.
- Fiziksel gözlem anı `observed_at_utc` ile UTC ISO-8601 olarak hazırlanabilir.
- Sabit sivil gösterim ofseti `utc_offset` ile ayrı tutulur.
- Mevcut mesafe, koordinat, yükseklik, datum, atmosfer, kırılma ve belirsizlik alanlarının kanonik AI anahtarları eklenir.
- Çelişkili / tekrar eden kanonik alanlar otomatik uygulanmaz.
- Tanınmayan AI anahtarları sessizce yok edilmez; önizleme notunda görünür.
- `profile` atmosfer modu metinden otomatik uygulanmaz; profil veri/provenansı gerektiği için `kontrol gerekli` kalır.
- Parser provenance sürümü `0.2.0` olur.
- `Metinden Hazırla` önizlemesi yeni gözlem zamanı, UTC ofseti ve deney adı alanlarını mevcut değerlerle karşılaştırır.
- Uygulama handler'ı bu alanları senaryo değişimiyle birlikte güvenli biçimde uygular.

## Bilimsel sınır

`GGL-AI-TEST` bloğu bir AI sonucu veya bilimsel kaynak değildir; yalnız kullanıcı tarafından gözden geçirilen deney girdi taslağıdır. Dosya tabanlı kaynaklar (DEM, CSV, GeoJSON, fotoğraf kalibrasyonu, su yüzeyi, panorama skyline, proper-motion vb.) kendi doğrulanmış import akışları dışında metinden üretilmez.

## AI kılavuzu

`docs/ai-test-spec-v1.md` doğrudan başka bir AI'ye verilebilecek kopyalanabilir talimatı, desteklenen anahtarları ve örnek blokları içerir.

## Otomatik doğrulama

`tests/text-experiment-setup.test.ts` genişletilerek en az şu durumlar doğrulanır:

- kanonik bloktan astronomi senaryosu + zaman + UTC ofseti + koordinatların çıkarılması,
- bütün senaryo enumlarının kabul edilmesi,
- `Z` ile bitmeyen gözlem zamanının güvenli biçimde `kontrol gerekli` olması,
- geçersiz UTC ofsetinin uygulanmaması,
- bilinmeyen anahtarın not oluşturması,
- aynı kanonik anahtarın çelişkili iki değerle verilmesinin `kontrol gerekli` olması,
- uygulama nesnesinin deney adı / gözlem anı / UTC ofsetini taşıması,
- eski doğal dil parser testlerinin değişmeden geçmesi.

## Manuel Electron kabulü

1. `Metinden Hazırla` açılır.
2. `docs/ai-test-spec-v1.md` içindeki Dallas Güneş/Ay örneği yapıştırılır.
3. Önizlemede senaryo, deney adı, UTC gözlem anı, UTC ofseti, A ve B koordinatları `BULUNDU` görünmelidir.
4. Seçili alanlar uygulanınca `Güneş ve Ay Gözlemleri` açılmalı; tarih/saat 8 Nisan 2024 18:42 UTC olmalı; A Dallas ve B 30° doğu karşılaştırma noktası olmalıdır.
5. Deney kaydı sonrasında `textSetupHistory` provenance'ı korunmalıdır.
6. Serbest Türkçe eski örnek hâlâ aynı alanları bulmalıdır.

## Aşama 8 devamı

- **8.2:** gölge, yıldız ve tutulma senaryolarına özel AI alan adaptörleri.
- **8.3:** GGL sonuçlarını AI'ye geri vermek için kompakt, kaynak/provenans ve uyarıları içeren `AI Analiz Paketi` dışa aktarımı.
- **8.4:** çoklu test planı / test matrisi: tek AI yanıtından birden fazla kontrollü deney taslağı üretme.
