# Güncel proje durumu

Bu belge yeni katkıcılar ve kodlama ajanları için uzun tarihsel roadmap yerine mevcut çalışma noktasının kısa kaynak-of-truth özetidir.

## Sürüm

- Uygulama sürümü: `1.34.1`
- Masaüstü: Electron + React + TypeScript
- Node.js: 22+
- Ana çalışma biçimi: çevrimdışı/deterministik hesap + kullanıcı kontrollü dosya ve AI copy/paste akışları

## Çalışan ana senaryolar

- Hedef Görünürlüğü
- Ufuk Analizi
- Uzun Mesafe Görüş
- Güneş ve Ay Gözlemleri
- Gölge Deneyi ve çift istasyon karşılaştırması
- Yıldız Gözlemleri
- Tutulma Simülasyonu ve kontrollü olay araması

Bu senaryoların ayrıntılı fiziksel kapsamı ve sınırları README ile `docs/roadmap.md` içindeki tamamlanmış aşamalarda belgelenir.

## Hesap ve veri altyapısı

Çalışan sistem şunları içerir:

- İdeal küre ve tanımlı düzlem model sözleşmeleri; azimutal gösterim fiziksel model değil kartografik referanstır.
- WGS84 jeodezik mesafe/azimut çözümü.
- Manuel, CSV/TSV, GeoJSON ve ESRI ASCII Grid DEM arazi profilleri.
- Düşey datum/jeoit dönüşümü provenansı.
- Kapalı, standart-k ve katmanlı meteorolojik atmosfer; İdeal Küre için katmanlı optik ışın izi.
- Su seviyesi/gelgit/dalga bağlamı ve kontrollü uç-kot uygulaması.
- Fotoğraf kalibrasyonu, dört işaret, model açısal karşılaştırması ve belirsizlik propagasyonu.
- Fotoğraf byte'ları için SHA-256 tabanlı yerel asset deposu ve portable v12 asset round-trip.
- Yıldız kataloğu, precession/proper-motion, yerel skyline, DEM ve panorama destekleri.
- Yeniden üretilebilir hesap izleri ve çevrimdışı HTML raporu.

## Persistence

- Yerel deney deposu Electron kullanıcı veri klasöründe tutulur.
- Portable deney dosyası sürümlemelidir ve fail-closed parse edilir.
- Eski kayıtlar için migration/normalizasyon testleri bulunur.
- Kaynak dosyalarda mümkün olan yerlerde SHA-256, zaman, birim, datum ve kaynak metadata'sı korunur.
- Fotoğraf asset'i portable v12 ile deney metadata'sından ayrı taşınır ve içe aktarımda doğrulanır.

## AI çalışma sistemi

Harici AI uygulamanın hesap motoru değildir ve otomatik ağ çağrısı yoktur.

Mevcut zincir:

```text
aktif veya kayıtlı deney
  → GGL-AI-ANALYSIS v1
  → kullanıcı dış AI'ye kopyalar
  → dış AI tek GGL-AI-TEST v1 önerir
  → fail-closed canonical extractor
  → Metinden Hazırla preview
  → kullanıcı checkbox/onayı
  → yeni deney
  → SHA-256 lineage
  → Veri Yöneticisi'nde yerel lineage doğrulama
```

Ek olarak 2–12 kayıt için `GGL-AI-COMPARISON v1` paketi ve uygulama içi AI işbirliği kılavuzu vardır.

AI takip kaydı kaynak analiz hash'i, kanonik test hash'i ve kaynak deney kimliğini taşır. Dış AI'nin serbest açıklaması otoritatif deney verisi olarak saklanmaz.

İlgili belgeler:

- `docs/ai-test-spec-v1.md`
- `docs/ai-analysis-guide-v1.md`
- `docs/ai-lineage-v1.md`
- `docs/ai-development.md`
- kökte `AGENTS.md`

## Mimari refactor durumu

God-file refactor çalışmasının kritik kısmı tamamlandı:

- `AppNext.tsx` yaklaşık 130 KB'dan yaklaşık 64 KB'a indirildi; sunum bileşenleri, terrain/model sonuçları, astronomi hesapları, model-state ve persistence ayrı modüllere çıkarıldı.
- `html-report.ts` yaklaşık 48 KB'dan yaklaşık 12 KB belge assembler seviyesine indirildi.
- `portable.ts` yaklaşık 46 KB'dan yaklaşık 12 KB facade/orchestration seviyesine indirildi; core/source/photo-asset modülleri ayrıldı.

Kalan büyük dosyalar artık zorunlu ürün blokajı değildir. Public bakım kolaylığı için ayrı move-only/refactor PR'larıyla ele alınacaktır. Güncel liste `docs/refactor-god-files.md` içindedir.

## Test kapısı

Yerel ve katkı PR'ları için hedef komut:

```bash
npm run verify
```

Bu komut typecheck, tüm Vitest testleri ve üretim derlemesini kapsar. UI/Electron davranışı değiştiğinde ayrıca ilgili manuel smoke test yapılır.

## Public-release öncesi kalan işler

Bu noktadan sonra amaç yeni fonksiyon eklemek değil, repository'yi kullanmak ve geliştirmek isteyenlere güvenli bir başlangıç sağlamaktır:

1. Contributor/AI geliştirme belgeleri ve GitHub şablonları.
2. Güncel mimari/README ve bakım listesinin tamamlanması.
3. Kalan yüksek-değerli büyük dosyaların davranış değiştirmeyen parçalanması.
4. Electron IPC yüzeyinin daha okunabilir modüllere ayrılması.
5. Kullanılmayan legacy renderer girişlerinin doğrulanıp temizlenmesi.
6. Public lisansın seçilmesi.
7. Son `npm run verify` + temel platform smoke testleri.
8. İlk public-ready tag/release.

Yeni fonksiyonel özellikler bundan sonra gerçek kullanım sırasında tespit edilen ihtiyaçlara göre eklenmelidir.
