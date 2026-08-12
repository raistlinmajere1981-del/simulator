# Geometrik Gözlem Laboratuvarı

**Geometrik Gözlem Laboratuvarı (GGL)**, farklı Dünya geometrisi ve fiziksel model iddialarını aynı ölçülebilir gözlem girdileri üzerinden sayısal olarak karşılaştırmak için geliştirilmiş Electron masaüstü laboratuvarıdır.

GGL bir görüşü kanıtlamak için sonuç seçmez. Kullanıcı gözlemi tanımlar; desteklenen modeller aynı girdilerle kendi tahminlerini üretir; sonuçlar belirsizlik, varsayım, veri kaynağı ve yeniden üretilebilir hesap izleriyle birlikte gösterilir.

> Güncel geliştirme sürümü: **1.34.1**  
> Durum özeti: [`docs/current-status.md`](docs/current-status.md)

## Temel ilkeler

- Aynı deney girdileri karşılaştırılan modellere tutarlı biçimde uygulanır.
- Girdi, saha gözlemi, model tahmini ve görselleştirme birbirinden ayrıdır.
- Harita projeksiyonları fiziksel model olarak puanlanmaz.
- Sonuçlar birim, varsayım, belirsizlik ve provenansla birlikte tutulur.
- Tanımlı olmayan model davranışında uydurma sayı yerine `unsupported` / uygun belirsizlik durumu kullanılır.
- Tek bir deneydeki uyum bir modelin genel doğruluğu olarak sunulmaz.
- Harici AI fiziksel hesap motoru değildir; deterministik GGL hesapları sonuç otoritesidir.

## Çalışan senaryolar

- **Hedef Görünürlüğü** — hedefin görünür/gizli kısmı, gözlem ve belirsizlik karşılaştırması.
- **Ufuk Analizi** — modelin ufuk tanımı ve atmosfer bağlamı.
- **Uzun Mesafe Görüş** — rota, terrain, uzak hedef ve fotoğraf gözlemiyle genişletilmiş görünürlük akışı.
- **Güneş ve Ay Gözlemleri** — konum, günlük olaylar, Güneş zamanı, mevsimler ve rota karşılaştırması.
- **Gölge Deneyi** — dikey gnomon ve isteğe bağlı çift istasyon karşılaştırması.
- **Yıldız Gözlemleri** — katalog yıldızı, precession/proper-motion, yerel skyline ve trail hesapları.
- **Tutulma Simülasyonu** — anlık Güneş–Ay disk geometrisi ve kontrollü olay araması.

## Başlıca yetenekler

### Geometri ve jeodezi

- İdeal Küre ve Tanımlı Düzlem model sözleşmeleri.
- Azimutal gösterim fiziksel model değil kartografik referanstır.
- WGS84 Vincenty ters jeodezik çözümü, mesafe ve uç azimutları.
- Yakın-antipodal durumda açıkça işaretlenen fallback davranışı.
- Model ve jeodezik hesaplar için hesap izi.

### Terrain ve düşey referans

- Manuel çok noktalı terrain profili.
- CSV/TSV, 3B WGS84 GeoJSON `LineString` ve ESRI ASCII Grid DEM içe aktarma.
- DEM nearest/bilinear örnekleme, çözünürlük/kapsam tanıları ve LOS önizlemesi.
- Ortalama deniz seviyesi, WGS84 elipsoidal ve yerel düşey datum.
- Jeoit ondülasyonu ile kontrollü elipsoidal ↔ ortometrik dönüşüm.
- Kaynak dosya metadata'sı ve SHA-256 bütünlük kaydı.

### Atmosfer

- Kapalı atmosfer.
- Düzenlenebilir standart kırılma katsayısı `k`.
- Ölçülmüş katmanlı meteorolojik profil.
- Ciddor görünür ışık kırılma indisi yardımcıları.
- İdeal Küre için küresel/radyal RK4 optik ışın izi.
- Profil kapsamı yetersizken uydurma ekstrapolasyon yerine açık belirsizlik durumu.

Tanımlı Düzlem modeline sözleşmede bulunmayan atmosfer kuralı otomatik eklenmez.

### Su yüzeyi, gelgit ve dalga

- Manuel gözlem, gelgit ölçer/tahmini veya ölçme kaynağı.
- Zaman, datum ve belirsizlik provenansı.
- Koruyucu doğrusal veya bağımsız RSS belirsizlik birleşimi.
- Gözlemci/hedef uç kotlarına kullanıcı kontrollü uygulama.
- Tarihsel uygulama durumunun korunması.

### Fotoğraf ölçümü

- Yerel PNG/JPEG yükleme ve SHA-256 kaynak provenansı.
- U1/U2 referans işaretleri, hedef tabanı ve hedef tepesi işaretleri.
- Kamera FOV / asal nokta seçenekleri ve işaret belirsizliği.
- Piksel → açı kalibrasyonu ve model açısal karşılaştırması.
- Input + kamera belirsizlik propagasyonu.
- Fotoğraf asset'leri için SHA-256 tabanlı yerel depo.
- Portable JSON v12 ile fotoğraf + işaret round-trip.

Fotoğrafın yalnız seçilmesi kalibrasyon kaydı değildir. Kalibrasyon commit edilmeden deney kaydedilecekse uygulama kullanıcıyı açıkça uyarır.

### Astronomi

Güneş/Ay, gölge, tutulma ve yıldız hesapları deterministik simulation modüllerinde tutulur. Katalog/proper-motion/skyline kaynakları fiziksel hesap ve provenans açısından ayrı izlenir.

## Deney kayıtları ve rapor

Deneyler Electron kullanıcı veri klasöründe sürümlemeli olarak saklanır. Kayıt; girdiler, senaryo, model sürümleri, prediction snapshot'ları, hesap izleri ve mevcut provenans metadata'sını birlikte taşır.

Veri Yöneticisi:

- kayıt açma/silme,
- portable JSON dışa/içe aktarma,
- çevrimdışı HTML raporu,
- tek deney AI analiz paketi,
- 2–12 deney AI karşılaştırma paketi,
- AI lineage yerel doğrulaması

sağlar.

Portable/local parserlar güvenilmeyen dosyada fail-closed davranır; geriye uyumluluk ve migration testlerle korunur.

## Harici AI ile kontrollü çalışma

GGL'nin AI sistemi **API entegrasyonu değildir** ve otomatik ağ çağrısı yapmaz. Kullanıcı kendi tercih ettiği AI aracıyla copy/paste üzerinden çalışır.

```text
Deterministik aktif/kayıtlı deney
        ↓
GGL-AI-ANALYSIS v1
        ↓ kullanıcı kopyalar
Harici AI
        ↓
tek GGL-AI-TEST v1 önerisi
        ↓ fail-closed extractor
Metinden Hazırla önizlemesi
        ↓ checkbox + kullanıcı onayı
Yeni deney
        ↓
SHA-256 lineage
        ↓
Yerel lineage doğrulama
```

Kurallar:

- AI hiçbir input alanını doğrudan değiştirmez.
- Eksik/birden fazla/ambiguous canonical test bloğu reddedilir.
- AI takip testinde canonical kaynak blok hash bütünlüğünü korumak için salt okunurdur; uygulanacak alanları kullanıcı seçer.
- Dış AI'nin serbest açıklaması otoritatif deney verisi olarak saklanmaz.
- Sonraki AI paketine önceki serbest cevap tekrar gömülmez; hash tabanlı lineage özeti taşınır.
- Lineage doğrulaması AI yorumunun bilimsel doğruluğunu değil, kayıt zincirinin kriptografik tutarlılığını doğrular.

İlgili belgeler:

- [`docs/ai-test-spec-v1.md`](docs/ai-test-spec-v1.md)
- [`docs/ai-analysis-guide-v1.md`](docs/ai-analysis-guide-v1.md)
- [`docs/ai-lineage-v1.md`](docs/ai-lineage-v1.md)

## Kurulum

Gereksinim: **Node.js 22+**.

```bash
git clone <repository-url>
cd simulator
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

Tüm katkıcı doğrulaması:

```bash
npm run verify
```

`verify`; TypeScript typecheck, tüm Vitest testleri ve Electron-Vite üretim derlemesini çalıştırır.

> Repository şu anda lockfile taşımıyor; bağımlılıklar `package.json` semver aralıklarından `npm install` ile çözülür. Public release hazırlığında reproducible dependency politikası ayrıca sabitlenecektir.

## Kod yapısı

```text
src/
├── main/          Electron I/O, IPC, yerel dosya ve asset işlemleri
├── preload/       dar renderer ↔ main köprüsü
├── renderer/      React UI ve kullanıcı kontrollü workflow
├── models/        model eklentileri
├── simulation/    deterministik fizik/matematik/domain çekirdeği
├── shared/        veri, portable ve AI sözleşmeleri
└── report/        çevrimdışı HTML rapor üretimi

tests/             unit/integration/persistence/portable/report/AI testleri
docs/              yöntem, format, mimari ve roadmap belgeleri
examples/          örnek terrain/veri dosyaları
```

Güncel ayrıntılı mimari: [`docs/architecture.md`](docs/architecture.md)

## Katkıda bulunma

Katkı yapmadan önce:

1. [`AGENTS.md`](AGENTS.md) — proje için bağlayıcı teknik/bilimsel sınırlar.
2. [`CONTRIBUTING.md`](CONTRIBUTING.md) — kurulum, test ve PR yöntemi.
3. [`docs/current-status.md`](docs/current-status.md) — güncel sistem durumu.
4. [`docs/architecture.md`](docs/architecture.md) — kaynak-of-truth mimari harita.

AI destekli kodlama kullanıyorsanız ayrıca [`docs/ai-development.md`](docs/ai-development.md) dosyasını okuyun. Bu playbook yeni AI oturumuna verilecek başlangıç promptunu, kaynak-of-truth matrisini ve sözleşme değişikliklerinde izlenecek kontrol listesini içerir.

PR açmadan önce:

```bash
npm run verify
```

çalıştırılması beklenir. UI/Electron değişikliğinde ilgili manuel smoke test de yapılmalıdır.

## Bakım / refactor durumu

İlk god-file çalışmasında:

- `AppNext.tsx` yaklaşık 130 KB → 64 KB,
- `html-report.ts` yaklaşık 48 KB → 12 KB,
- `portable.ts` yaklaşık 46 KB → 12 KB

seviyesine indirildi ve kritik sorumluluklar ayrı modüllere taşındı.

Public katkıcı deneyimi için kalan davranış-korumalı bakım adayları [`docs/refactor-god-files.md`](docs/refactor-god-files.md) içinde güncel tutulur. Yeni fonksiyonel geliştirme bundan sonra gerçek kullanım sırasında ortaya çıkan ihtiyaçlara göre yapılacaktır.

## Belgeler

Başlangıç için önerilen sıra:

- [`docs/current-status.md`](docs/current-status.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/product-vision.md`](docs/product-vision.md)
- [`docs/model-contract.md`](docs/model-contract.md)
- [`docs/portable-format.md`](docs/portable-format.md)
- [`docs/terrain-profile.md`](docs/terrain-profile.md)
- [`docs/geodesy.md`](docs/geodesy.md)
- [`docs/geoid-height-conversion.md`](docs/geoid-height-conversion.md)
- [`docs/water-surface-observation.md`](docs/water-surface-observation.md)
- [`docs/water-surface-application.md`](docs/water-surface-application.md)
- [`docs/ai-test-spec-v1.md`](docs/ai-test-spec-v1.md)
- [`docs/ai-analysis-guide-v1.md`](docs/ai-analysis-guide-v1.md)
- [`docs/ai-lineage-v1.md`](docs/ai-lineage-v1.md)
- [`docs/roadmap.md`](docs/roadmap.md) — tarihsel ayrıntılı gelişim kaydı

## Güvenlik

Hassas güvenlik konuları için [`SECURITY.md`](SECURITY.md) dosyasını kullanın. Public issue'lara özel fotoğraf, kişisel koordinat veya hassas deney JSON'u yüklemeyin.

## Lisans

Repository public release öncesinde açık bir lisansla yayınlanacaktır. Lisans seçilmeden kaynak kodun public görünür olması tek başına yeniden kullanım izni vermez; nihai koşullar kökteki `LICENSE` dosyasında belirtilecektir.
