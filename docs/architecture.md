# Mimari

Bu belge GGL `1.34.x` mimarisinin güncel özetidir. Tarihsel geliştirme aşamaları için `docs/roadmap.md`, kısa mevcut durum için `docs/current-status.md` kullanılmalıdır.

## Temel ilke

Sayısal ve fiziksel sonuçların kaynağı deterministik GGL hesap motorudur. React görünümü, 3B görselleştirme, rapor ve harici AI bu hesapların tüketicisidir; hiçbiri hesap motoruna gizli veri veya tahmin geri beslemez.

```text
Kullanıcı / gözlem / kaynak dosyası
            │
            ▼
      doğrulanan girdiler
            │
            ▼
 ExperimentDefinition + domain state
            │
            ├─────────────► WGS84 / terrain / atmosphere / astronomy yardımcı hesapları
            │
            ▼
       SimulationContext
            │
            ▼
     runSimulationModels
            │
            ▼
      ModelPrediction[]
            │
      ┌─────┼─────────────┬──────────────┐
      ▼     ▼             ▼              ▼
     UI   SavedExperiment HTML report   AI package
```

## Katmanlar

### 1. Electron ana süreç — `src/main/`

Ana süreç yalnız masaüstüne özgü güvenilir işlemleri sahiplenir:

- pencere yaşam döngüsü,
- yerel deney deposunu okuma/yazma,
- portable JSON açma/kaydetme,
- HTML rapor dışa aktarma,
- CSV/GeoJSON/DEM ve yıldız skyline kaynak dosyası işlemleri,
- SHA-256 kaynak bütünlüğü,
- fotoğraf asset deposu,
- dosya seçici ve IPC sınırı.

Bazı domain-özel IPC akışları zaten ayrı modüllerdedir (`stellar-*`, `observation-photo-assets.ts`). `src/main/index.ts` kalan genel IPC wiring katmanıdır ve public-readiness refactorlarında daha küçük IPC modüllerine ayrılabilir.

### 2. Preload — `src/preload/`

Renderer doğrudan Node/Electron API'lerine erişmez. İzin verilen masaüstü işlemleri `contextBridge` üzerinden dar bir `window.simulatorDesktop` yüzeyi olarak açılır.

Yeni IPC eklerken main handler, preload sözleşmesi ve renderer kullanımı birlikte gözden geçirilmelidir.

### 3. React renderer — `src/renderer/src/`

`main.tsx` yalnız `AppNext` uygulama kökünü render eder.

`AppNext.tsx` uygulama koordinatörüdür. Büyük sorumlulukların önemli kısmı `src/renderer/src/app/` altına çıkarılmıştır:

- sidebar ve senaryo özeti,
- gözlem/ufuk referans panelleri,
- terrain görünümü,
- model kartları ve sonuç tablosu,
- genel input/config/formatter yardımcıları,
- `useExperimentModelState` — ortak deney/model türetimi ve runner yaşam döngüsü,
- `useAstronomyCalculations` — Güneş/Ay/gölge/yıldız/tutulma hesap zinciri,
- `experiment-persistence` — SavedExperiment oluşturma ve restore mantığı.

Domain-özel karmaşık kontroller (`PhotoCalibrationControl`, `StellarObservationPanel`, `MultiPointTerrainEditor` vb.) renderer altında bağımsız bileşenlerdir.

### 4. Paylaşılan sözleşmeler — `src/shared/`

Main ve renderer arasında kullanılan veri sözleşmeleri burada bulunur:

- deney/model/prediction tipleri,
- senaryo kimlikleri,
- saved experiment yapısı,
- atmosfer/terrain/photo/stellar metadata tipleri,
- portable/local-store parser facade'ı,
- AI test, analiz, comparison ve lineage sözleşmeleri.

`portable.ts` üst seviye schema/facade'dır; doğrulama sorumluluğu `portable-core.ts`, `portable-sources.ts` ve `portable-photo-asset.ts` modüllerine ayrılmıştır.

Portable parserlar güvenilmeyen JSON'u fail-closed doğrular. `SavedExperiment` TypeScript tipi tek başına dış dosyanın güvenilir olduğu anlamına gelmez.

### 5. Simülasyon çekirdeği — `src/simulation/`

Bu katman saf/deterministik matematik ve domain uygulamalarını taşır. Başlıca alanlar:

- geometri ve model değerlendirme,
- WGS84 jeodezi ve topocentric dönüşümler,
- manuel/CSV/GeoJSON/DEM terrain,
- jeoit/düşey datum,
- atmosfer profili, optik kırılma ve RK4 ışın izi,
- fotoğraf kalibrasyonu/açısal karşılaştırma/belirsizlik,
- su yüzeyi gözlem ve uygulama,
- Güneş/Ay/gölge/tutulma hesapları,
- yıldız katalog, precession, proper-motion, trail ve skyline hesapları.

Bu modüller mümkün olduğunca UI veya Electron bağımlılığı taşımaz. Yeni fiziksel davranış önce bu katmanda ve unit testlerde kurulmalıdır.

### 6. Model eklentileri — `src/models/`

Model eklentileri ortak model sözleşmesine uyar:

- `IdealSphereModel`
- `DefinedPlaneModel`
- `AzimuthalProjectionReference`

Azimutal gösterim fiziksel model değildir; kartografik referans olarak `unsupported` fiziksel sonuç üretir. Model davranışı tanımlı değilse diğer modelin formülü kopyalanmaz veya uydurma sayı üretilmez.

### 7. Rapor — `src/report/`

Çevrimdışı HTML raporu kaydedilmiş deney snapshot'ından üretilir:

- `html-report.ts` — belge assembly ve stil,
- `report-core.ts` — ortak prediction/formatter yardımcıları,
- `report-terrain.ts` — jeodezik, datum ve terrain bölümleri,
- `report-provenance.ts` — fotoğraf, stellar, belirsizlik, metin/AI lineage provenansı.

Rapor yeni hesap yapmamalı; kaydedilen veriyi ve hesap izlerini açıklamalıdır.

## Persistence ve portable veri

### Yerel deney deposu

Electron kullanıcı veri klasöründe sürümlemeli local store bulunur. Kayıtlar `SavedExperiment` snapshot'larıdır. Uygulama eski formatları normalize eder ve geçersiz kayıtları güvenli biçimde reddeder/atlar.

### Portable JSON

Portable format deneyin başka kuruluma taşınabilen sürümlemeli halidir. Güncel format fotoğraf asset'ini metadata'dan ayrı `assets` bölümünde taşıyabilir.

Fotoğraf byte'ları normal local `SavedExperiment` JSON'una gömülmez. Seçilen fotoğraf SHA-256 anahtarlı yerel asset deposuna yazılır; kaydedilmiş kalibrasyon metadata'sı asset ile eşleştirilir. Portable içe aktarımda byte boyutu, MIME/piksel metadata'sı ve SHA-256 bütünlüğü doğrulanır.

## Provenans yaklaşımı

GGL mümkün olduğunda yalnız son sayıyı değil sayının bağlamını da saklar:

- kaynak adı/dosya,
- SHA-256,
- zaman/UTC ofseti,
- birim ve datum,
- model/algoritma sürümü,
- kullanıcı tarafından uygulanan alanlar,
- belirsizlik yöntemi,
- hesap izi.

Tarihsel provenans, kullanıcı daha sonra güncel input değiştirince sessizce yeniden yazılmaz.

## AI çalışma mimarisi

Harici AI ile otomatik API/network entegrasyonu yoktur. Güven sınırı bilinçli olarak copy/paste tabanlıdır.

```text
Saved/active deterministic snapshot
        │
        ▼
GGL-AI-ANALYSIS v1
        │ kullanıcı kopyalar
        ▼
      dış AI
        │ tam olarak bir canonical öneri
        ▼
GGL-AI-TEST v1
        │ fail-closed extractor
        ▼
Metinden Hazırla preview
        │ checkbox + kullanıcı onayı
        ▼
uygulanan input alanları
        │
        ▼
SavedExperiment + AiFollowUpLineage
        │
        ▼
SHA-256 yerel doğrulama
```

AI sonuçları fiziksel model prediction'ı değildir. Serbest AI açıklaması otoritatif deney verisine dönüştürülmez. Lineage yalnız kaynak analiz/test hash'lerini ve kullanıcı-onaylı uygulama provenansını bağlar.

2–12 kayıt için `GGL-AI-COMPARISON v1` bağımsız deney blokları üretir; farklı anlam/birimde metrikler otomatik eşdeğer sayılmaz.

## Görselleştirme sınırı

Three.js dünya/model sahneleri, terrain şeritleri, atmosfer kabukları ve diğer görseller açıklama amaçlıdır. Görsel ölçeklendirme veya kamera durumu fiziksel input ya da prediction üretmez.

## Hata yalıtımı

Model runner her modeli ayrı çalıştırır. Tek modeldeki hata diğer modelleri engellemez. Tanımsız/başarısız davranış sonlu sahte değer yerine açık durum ve uyarı üretir.

Importer ve portable parserlarda da aynı yaklaşım uygulanır: ambiguous veya doğrulanamayan veri otomatik tahminle uygulanmaz.

## Test ve CI

Testler `tests/` altında domain bazında tutulur ve hesap, persistence, portable, rapor ve AI sözleşmelerini kapsar.

Katkıcı için tek yerel kapı:

```bash
npm run verify
```

GitHub Actions pull request ve `main` pushlarında typecheck, Vitest ve üretim derlemesi çalıştırır. UI/Electron davranışı değişirse otomatik testlere ek manuel smoke testi gerekir.

## Geliştirme sınırı

Güncel mimari artık temel özellikleri taşımaktadır. Public-readiness döneminde öncelik yeni fonksiyon eklemek değil:

- kalan büyük UI/IPC dosyalarını sorumluluk bazında parçalamak,
- contributor ve AI-kodlama sözleşmelerini açık tutmak,
- mevcut format/protokolleri geriye uyumlu korumak,
- kullanım sırasında görülen gerçek eksiklere göre yeni fonksiyon eklemektir.
