# AGENTS.md

Bu dosya Geometrik Gözlem Laboratuvarı (GGL) üzerinde çalışan kodlama ajanları ve AI destekli geliştirme araçları için kısa, bağlayıcı proje sözleşmesidir. İnsan katkıcılar için de aynı teknik sınırlar geçerlidir.

## Projenin amacı

GGL, farklı geometrik ve fiziksel model iddialarını aynı ölçülebilir deney girdileri üzerinden sayısal olarak karşılaştıran Electron/React/TypeScript masaüstü laboratuvarıdır.

Uygulama bir görüşü doğrulamak için sonuç üretmez. Girdi, gözlem, model tahmini, belirsizlik ve provenans ayrı tutulur; tanımlanmayan davranışlarda uydurma sayı yerine `unsupported` veya uygun belirsizlik durumu üretilir.

## Değiştirilemez bilimsel sınırlar

1. Deterministik GGL hesap motorları sayısal sonuçların tek otoritesidir.
2. Harici AI hiçbir zaman fiziksel hesap motoru veya sonuç otoritesi değildir.
3. AI yalnız test girdisi önerebilir ve deterministik çıktıları yorumlayabilir.
4. AI önerileri doğrudan state'e uygulanmaz; mevcut preview/checkbox/onay akışından geçer.
5. `GGL-AI-TEST v1`, `GGL-AI-ANALYSIS v1` ve `GGL-AI-COMPARISON v1` sözleşmeleri geriye dönük uyumluluk gözetilmeden sessizce değiştirilemez.
6. Dış AI'nin serbest yanıtı deney kaydına otoritatif veri olarak yazılmaz.
7. Ölçüm, tahmin, varsayım, birim, belirsizlik, veri kaynağı ve zaman provenansı birbirine karıştırılmaz.
8. Görselleştirme hesap motoruna geri besleme yapmaz.
9. Tanımlı olmayan model davranışına fiziksel kural uydurulmaz.
10. Portable/local-store parserları geçersiz veya ambiguous veride fail-closed kalır.

## Mimari kaynak haritası

- `src/models/`: fiziksel/kartografik model eklentileri.
- `src/simulation/`: saf veya deterministik hesaplama çekirdeği ve domain uygulamaları.
- `src/shared/`: renderer/main arasında paylaşılan sözleşmeler, portable format ve AI protokolleri.
- `src/renderer/src/`: React UI ve kullanıcı kontrollü uygulama akışları.
- `src/renderer/src/app/`: AppNext'ten ayrılmış orchestration/persistence/presentation yardımcıları.
- `src/main/`: Electron dosya sistemi, IPC ve yerel asset işlemleri.
- `src/report/`: çevrimdışı HTML rapor üretimi.
- `tests/`: deterministik hesap, persistence, portable, rapor ve AI sözleşme testleri.
- `docs/architecture.md`: güncel mimari açıklama.
- `docs/ai-development.md`: AI ile geliştirme playbook'u.

## Standart geliştirme akışı

Önce ilgili sözleşmeleri ve testleri oku. Ardından küçük ve tek amaçlı bir değişiklik yap.

Zorunlu doğrulama:

```bash
npm install
npm run verify
```

`npm run verify` typecheck, tüm Vitest testleri ve üretim derlemesini çalıştırmalıdır.

UI veya Electron davranışı değiştiyse ilgili manuel smoke test de yapılmalıdır. Test/build geçmeden PR tamamlandı sayılmaz.

## Değişiklik sınıfları

### Hesap/model değişikliği

- Mevcut formül, birim, işaret sözleşmesi ve varsayımları incele.
- Deterministik unit test ekle veya güncelle.
- Sonuç semantiği değişiyorsa model sürümünü değerlendir.
- Rapor/persistence/AI paketlerinin aynı metriği nasıl taşıdığını kontrol et.

### Persistence / portable değişikliği

- Eski kayıtları bozma.
- Şema sürümü yalnız gerçek format değişikliğinde artırılır.
- Parser fail-closed kalır.
- JSON round-trip ve legacy migration testleri eklenir.

### AI çalışma döngüsü değişikliği

- AI hesap otoritesi yapılamaz.
- Yalnız tek ve tam kanonik test bloğu kontrollü önizlemeye geçebilir.
- Kullanıcı alan bazında son onayı verir.
- Lineage/hash davranışı korunur.
- Serbest AI cevabını yeni bir otoritatif veri kaynağına dönüştürme.

### Refactor

- Davranış değişikliği ile büyük taşıma aynı PR'da karıştırılmaz.
- Public export ve veri sözleşmelerini mümkün olduğunca sabit tut.
- Büyük dosyaları yalnız satır sayısı için değil, bağımsız sorumluluk sınırı varsa parçala.

## Sürüm ve sözleşme disiplini

Uygulama sürümü `package.json` ve preload yüzeyinde uyumlu tutulmalıdır. Public veri/AI sözleşmelerinde değişiklik varsa ilgili doküman ve test aynı PR'da güncellenir.

Önemli sözleşmeler:

- `docs/model-contract.md`
- `docs/portable-format.md`
- `docs/ai-test-spec-v1.md`
- `docs/ai-analysis-guide-v1.md`
- `docs/ai-lineage-v1.md`

## Tamamlanma kontrolü

Bir değişikliği tamamlamadan önce:

- ilgili mevcut testleri okudun,
- belirsizlik/birim/provenans semantiğini korudun,
- yeni davranış için regresyon testi ekledin,
- `npm run verify` geçti,
- gerekiyorsa manuel smoke test yaptın,
- kullanıcıya görünen davranış değiştiyse yardım/dokümanı güncelledin,
- geçici helper/migration scriptlerini merge öncesinde kaldırdın,
- PR'da bilimsel sınırı ve kabul kriterlerini açıkça yazdın.

Daha ayrıntılı AI geliştirme yöntemi için `docs/ai-development.md` dosyasını oku.
