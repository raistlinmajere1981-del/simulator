# GGL AI sözleşme registry ve fixture politikası

GGL'nin dış AI çalışma döngüsünde kullanılan wire sözleşmelerinin kimlik ve sürümleri `src/shared/ai-contracts.ts` içinde tek merkezde tutulur.

Registry şu yüzeyleri sabitler:

- `GGL-AI-TEST v1`: dış AI'den GGL'ye yalnız öneri girdisi; fail-closed extractor + parser + kullanıcı önizlemesi olmadan uygulanmaz.
- `GGL-AI-ANALYSIS v1`: GGL'nin deterministik tek-deney snapshot paketi.
- `GGL-AI-COMPARISON v1`: GGL'nin deterministik çoklu-deney karşılaştırma paketi.
- `ai-follow-up-lineage v1`: analiz/test hashleri ve opsiyonel deterministik analiz snapshot kanıtı için persisted provenance sürümü.

## Uyumluluk kuralı

Mevcut `v1` kimliği altında header, end marker, alan anlamı, birim veya fail-closed kabul/red davranışı sessizce değiştirilmemelidir. Böyle bir değişiklik gerekirse önce mevcut fixture/test etkisi görünür hale getirilmeli, geriye uyumluluk kararı açıkça verilmelidir.

Eski modüllerdeki public constant exportları korunur; bunlar registry değerlerini yeniden export eder. Böylece contributor import yolları kırılmaz.

## Fixture corpus

`tests/fixtures/ai-contracts/` altında hem kabul edilmesi gereken hem reddedilmesi/incelemeye düşmesi gereken örnekler bulunur. `tests/ai-contract-fixtures.test.ts` şu güvenlik davranışlarını sabitler:

- tek kanonik geçerli blok kabul edilir,
- birden fazla blokta GGL seçim yapmaz,
- eksik kapanış uygulanmaz,
- geçersiz/out-of-range değerler `review` olur,
- bilinmeyen anahtar sessizce başka uygulama alanına eşlenmez.

`tests/ai-contract-registry.test.ts` ayrıca tarihsel facade exportlarının registry ile aynı kaldığını ve GGL'nin ürettiği ANALYSIS/COMPARISON paket sınırlarının registry header/end markerlarıyla eşleştiğini doğrular.

Bu testler AI'nin bilimsel yorumunun doğruluğunu test etmez. Amaç protokol ve güven sınırlarının insan veya kodlama ajanı refactorları sırasında yanlışlıkla değişmesini yakalamaktır.
