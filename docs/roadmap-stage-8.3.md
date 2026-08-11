# Aşama 8.3 — GGL AI Analiz Paketi v1

## Amaç

Kaydedilmiş bir GGL deneyini başka bir AI'ye vermek için HTML rapordan daha kompakt, `.ggl.json` dosyasından daha okunabilir ve sürümlü bir metin sözleşmesi üretmek.

## Çıktı sözleşmesi

Yeni metin bloğu `GGL-AI-ANALYSIS v1` başlığı taşır ve şu katmanları ayırır:

1. Deney kimliği, senaryo, fiziksel UTC gözlem anı ve gösterim UTC ofseti.
2. Gözlemci / hedef-B koordinatları ve temel deney girdileri.
3. Datum, arazi, atmosfer, kırılma ve mevcut model-girdi belirsizlikleri.
4. Varsa dosya kaynaklarının kompakt provenans özeti ve SHA-256 kimliği.
5. Her kayıtlı `ModelPrediction` için model kimliği, sürümü, durum, metrikler, uyarılar, trace özeti ve varsayımlar.
6. AI'nin sonuçları yorumlarken uyması gereken standart görev/sınır talimatı.

Tam hesap izi adımları pakete eklenmez; paket boyutunu kontrol etmek için yalnız trace kimliği, özet ve varsayımlar taşınır.

## Arayüz

**Veri Yöneticisi** içindeki her kayıtta yeni `AI Paketi` düğmesi bulunur.

- Paket önce salt-okunur bir önizlemede gösterilir.
- `Panoya Kopyala` ile başka bir AI'ye aktarılabilir.
- Modern Clipboard API kullanılamıyorsa seçim tabanlı Electron/Chromium fallback denenir.
- Kullanıcı önizlemeyi görmeden arka planda herhangi bir dış servise veri gönderilmez.

## Bilimsel güvenlik

Paket içindeki AI görevi:

- gözlem ile model tahminini ayrı tutar,
- `indeterminate` / `unsupported` sonuçları kesin kanıt olarak kullanmamayı söyler,
- sayısal ortak metriklerle karşılaştırma ister,
- uyarı, varsayım, belirsizlik ve provenansı sonuç değerlendirmesine dahil eder,
- eksik veriyi uydurmayı yasaklar,
- tek deneyden kapsam dışı Dünya şekli/fiziksel genelleme yapılmasını engeller.

## AI kılavuzu

`docs/ai-analysis-guide-v1.md` başka bir AI'ye doğrudan verilebilecek sistem/proje talimatını ve önerilen analiz yanıt biçimini içerir.

## Kabul testleri

1. Kayıtlı deneyde `AI Paketi` düğmesi önizlemeyi açar.
2. Paket `GGL-AI-ANALYSIS v1` ile başlar ve `END GGL-AI-ANALYSIS` ile biter.
3. Deney zamanı, koordinatlar, model kimliği/sürümü, metrik, uyarı ve varsayım örnekleri metinde bulunur.
4. `Panoya Kopyala` metni panoya aktarır veya başarısızlıkta kullanıcıya manuel kopyalama mesajı verir.
5. Paket tam trace step gövdelerini eklemez.
6. TypeScript, test ve production build başarılıdır.

## Sonraki dilim

Aşama 8.4: aktif deneyi kaydetmeden AI paketine dönüştürme ve birden fazla deney kaydını tek karşılaştırma/matris paketinde birleştirme.
