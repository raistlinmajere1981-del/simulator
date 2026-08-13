# AI ile geliştirme playbook'u

Bu belge GGL'yi ChatGPT, Codex, Claude, Copilot veya benzeri kodlama ajanlarıyla geliştirirken tekrar edilebilir bir çalışma yöntemi tanımlar. Kısa bağlayıcı kurallar için önce kökteki `AGENTS.md` okunmalıdır.

## 1. AI'nin rolü

Kodlama AI'si proje üzerinde geliştirici yardımcısıdır; uygulama içindeki harici AI çalışma döngüsü ise deney önerisi ve yorum katmanıdır. Bu iki rol karıştırılmamalıdır.

- **Kodlama AI'si:** repo kodunu analiz eder, test yazar, refactor veya özellik geliştirir.
- **Uygulama içi dış AI:** `GGL-AI-ANALYSIS` paketini yorumlar ve isteğe bağlı `GGL-AI-TEST v1` önerir.
- **GGL hesap motoru:** sayısal/fiziksel sonuçların otoritesidir.

## 2. Yeni bir AI oturumuna verilecek başlangıç bağlamı

Kodlama ajanından işe başlamadan önce şunları okumasını isteyin:

1. `AGENTS.md`
2. `README.md`
3. `docs/current-status.md`
4. `docs/architecture.md`
5. değişiklik alanına göre ilgili domain dokümanı
6. değişecek modülün mevcut testleri

Örnek başlangıç talimatı:

```text
Bu repo Geometrik Gözlem Laboratuvarı. Önce AGENTS.md, docs/current-status.md ve docs/architecture.md dosyalarını oku. İlgili mevcut testleri incelemeden kod değiştirme. Deterministik hesap motoru otoritesini, fail-closed portable/AI parserlarını, birim-belirsizlik-provenans ayrımını koru. Değişikliği küçük bir PR olarak planla ve sonunda npm run verify çalıştır.
```

## 3. Görev çözme sırası

AI destekli her görev şu sırayı izlemelidir:

### A. Tanımla

- Kullanıcı problemi nedir?
- Bu hata mı, davranış değişikliği mi, refactor mı, yeni model mi?
- Hangi veri sözleşmelerine dokunuyor?

### B. Kaynak gerçeğini bul

Tahminle kod yazmak yerine mevcut implementation ve testleri bul. Özellikle aynı kavramın renderer, persistence, portable, report ve AI package yüzeylerini kontrol et.

### C. İnvariantları yaz

Değişmeyecek davranışları kısa kabul kriterlerine dönüştür. Örnek:

- eski JSON açılmaya devam eder,
- AI test bloğu doğrudan state'e uygulanmaz,
- birim metre olarak kalır,
- `unsupported` model için sayı üretilmez.

### D. En küçük değişikliği yap

Önce saf helper/domain değişikliği; sonra UI bağlantısı. Büyük taşıma gerekiyorsa davranış değişikliğinden ayrı PR tercih edilir.

### E. Test et

```bash
npm run verify
```

UI veya Electron I/O değişikliklerinde bunun yanında manuel smoke test yapılır.

### F. PR'ı açıklanabilir bırak

PR açıklamasında:

- amaç,
- bilimsel/veri sınırı,
- değişen sözleşmeler,
- testler,
- manuel kabul,
- migration/geriye uyumluluk

bulunmalıdır.

## 4. Kaynak-of-truth matrisi

| Konu | Ana kaynak |
|---|---|
| Model sözleşmesi | `src/shared/domain.ts`, `src/simulation/model-contract.ts`, `docs/model-contract.md` |
| Senaryolar | `src/shared/scenario.ts` |
| Deney kaydı | `src/shared/simulator.ts` |
| Portable format | `src/shared/portable*.ts`, `docs/portable-format.md` |
| Model hesapları | `src/models/`, `src/simulation/` |
| UI orchestration | `src/renderer/src/AppNext.tsx`, `src/renderer/src/app/` |
| Electron I/O | `src/main/`, `src/preload/` |
| HTML rapor | `src/report/` |
| AI test sözleşmesi | `src/shared/ai-test-spec.ts`, `docs/ai-test-spec-v1.md` |
| AI analiz paketi | `src/shared/ai-analysis-package.ts` |
| AI kontrollü aktarım | `src/shared/ai-workflow.ts`, `src/renderer/src/AiWorkflowDialog.tsx` |
| AI lineage | `src/shared/ai-lineage*.ts`, `docs/ai-lineage-v1.md` |

## 5. AI çalışma döngüsünde korunacak güvenlik modeli

Mevcut uygulama içi AI akışı bilinçli olarak copy/paste tabanlı ve ağdan bağımsızdır:

```text
Deterministik deney snapshot'ı
  → GGL-AI-ANALYSIS v1
  → kullanıcı dış AI'ye kopyalar
  → dış AI tek GGL-AI-TEST v1 önerir
  → fail-closed extractor
  → Metinden Hazırla preview
  → kullanıcı checkbox/onayı
  → yeni deney
  → SHA-256 lineage + deterministik GGL-AI-ANALYSIS snapshot kanıtı
  → yerel lineage doğrulama
```

Yeni özellik bu sınırı gevşetiyorsa bunun açık bir mimari karar ve ayrı güvenlik incelemesi olması gerekir. Varsayılan olarak otomatik ağ çağrısı, otomatik AI uygulaması veya AI'den gelen sayının model tahmini olarak kaydedilmesi kabul edilmez.

## 6. Sözleşme değişikliği kontrol listesi

### Model metriği değişirse

- unit ve semantic aynı mı?
- model version artmalı mı?
- rapor ve AI paketi etkileniyor mu?
- persistence snapshot testi var mı?

### Portable veri değişirse

- schema version gerekiyor mu?
- legacy parse davranışı nedir?
- geçersiz veri fail-closed mu?
- JSON round-trip testi var mı?

### AI protokolü değişirse

- v1 parser geriye uyumlu mu?
- ambiguous/multiple block reddi korunuyor mu?
- canonical metin/hash semantiği değişiyor mu?
- lineage ve HTML raporu etkileniyor mu?

## 7. Refactor yöntemi

Bu projede büyük dosya refactorları daha önce move-only/extraction dilimleriyle yapılmıştır. Aynı yöntem sürdürülmelidir:

1. sorumluluk sınırını belirle,
2. yeni modülü mevcut koddan davranış değiştirmeden çıkar,
3. public API'yi mümkünse koru,
4. typecheck/test/build,
5. ilgili UI smoke,
6. ancak sonraki PR'da davranış değiştir.

## 8. AI'nin özellikle kaçınması gereken hatalar

- Dünya/geometri tartışmasında sonucu önceden seçip formülü ona göre kurmak.
- Bir projeksiyonu fiziksel model gibi puanlamak.
- Ölçülmeyen atmosfer, kamera veya arazi belirsizliğine sessiz varsayılan eklemek.
- Tarihsel veri/provenansı güncel değerle sessizce değiştirmek.
- Kaynak dosya hash'i veya zaman bağlamını atmak.
- Parser kabul etmediği alanı tahmin ederek uygulamak.
- Büyük regex/exact-match scriptleri test etmeden source dosyaya uygulamak.
- Geçici refactor helper'ını merge etmek.
- Test geçmediği halde sürümü/roadmap'i tamamlandı göstermek.

## 9. Katkıcı için hızlı AI promptları

### Hata analizi

```text
Önce ilgili kod ve testleri bul. Kök nedeni veri akışı boyunca izle; UI semptomunu doğrudan patchleme. Mevcut davranışı kanıtlayan veya hatayı yeniden üreten test yaz. Sonra en küçük düzeltmeyi yap ve npm run verify çalıştır.
```

### Yeni model/hesap

```text
Yeni fiziksel hesabı önce saf simulation modülü ve unit test olarak tasarla. Açık varsayım, birim, desteklenmeyen kapsam ve hesap izi üret. Renderer bağlantısını ikinci adımda yap. AI veya görselleştirmeyi hesap kaynağı yapma.
```

### Refactor

```text
Davranış değiştirme. Dosyadaki bağımsız sorumlulukları belirle, public exportları koruyarak move-only extraction yap. npm run verify ve ilgili smoke test geçmeden ek mimari değişikliğe geçme.
```

## 10. Tamamlanmış işin tanımı

Kod derleniyor olması tek başına yeterli değildir. Tamamlanmış değişiklik; deterministik sınırı, testleri, persistence/rapor etkilerini, geriye uyumluluğu ve kullanıcı görünür dokümantasyonu birlikte ele alır.
