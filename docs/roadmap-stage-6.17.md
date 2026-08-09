# Aşama 6.17 — Yüksek çözünürlüklü skyline UI, kayıt ve rapor entegrasyonu

Durum: tamamlanma adayı · `1.15.0`

## Amaç

Aşama 6.16'nın doğrulanmış CSV/TSV/TXT/JSON skyline import çekirdeğini gerçek **Yıldız Gözlemleri** iş akışına bağlamak; 8 yönlü manuel profil ile yüksek çözünürlüklü dış dosya profilini aynı geometrik yerel-ufuk motorunda açık kaynak ayrımıyla kullanmak.

## Kaynak modları

Yerel ufuk etkin olduğunda iki kaynak modu vardır:

1. **8 yönlü manuel** — Aşama 6.15'teki K/KD/D/GD/G/GB/B/KB değerleri.
2. **Dosya profili** — Aşama 6.16 tarafından doğrulanmış 3–1.440 noktalı geometrik `azimut → ufuk yüksekliği` profili.

Kaynak modları birbirine sessizce dönüştürülmez. Dış dosya modu seçiliyse doğrulanmış bir kaynak bulunması zorunludur.

## Performans sözleşmesi

Aşama 6.15'teki taslak/uygula ayrımı dış dosyada da korunur:

- dosya seçimi ve parse işlemi ağır yıldız izi hesabını otomatik başlatmaz,
- başarılı import panelde yalnız kaynak state'ini hazırlar,
- kaynak modu ve etkin/kapalı seçimi panel taslağında kalır,
- yıldız izi ve yerel ufuk geçiş taraması yalnız **Uygula ve hesapla** ile bir kez çalışır.

Bu sayede 1.440 noktaya kadar skyline verisi yüklenirken renderer'ın her düzenleme olayı için tekrar tekrar astronomi hesabı yapması engellenir.

## Kaynak görünümü

Panel doğrulanmış dış kaynak için:

- dosya adı,
- CSV/JSON biçimi,
- nokta sayısı,
- maksimum azimut boşluğu,
- dosya boyutu,
- içe aktarma zamanı,
- SHA-256 özeti,
- parser/örnekleme uyarıları

gösterir.

Tam SHA kullanıcıya tooltip/rapor/hesap izinde erişilebilir tutulur; panelde kompakt özet gösterilir.

## Hesap zinciri

Dış profil seçilip uygulandığında:

1. kayıtlı noktalar tekrar `normalizeStellarLocalHorizonMask()` doğrulamasından geçirilir,
2. aynı `StellarLocalHorizonMask` geometrisi Aşama 6.14 yerel-ufuk yıldız izi motoruna verilir,
3. yıldızın her örnekteki azimutuna göre skyline döngüsel doğrusal interpolasyonla çözülür,
4. geometrik açıklık `h_yıldız - h_skyline(A)` olarak hesaplanır,
5. yerel doğuş/batış geçişleri mevcut kök arama sözleşmesiyle bulunur.

Astronomik sabit `0°` ufuk sonucu korunur ve dış skyline bunun yanında ayrı sonuçtur.

## Kayıt ve portable v8

Yüksek çözünürlüklü profil prediction metriklerine kopyalanmaz. Tek kaynak kopyası `SavedExperiment.stellarLocalHorizonSource` alanında tutulur.

Taşınabilir ve yerel store şeması v8 olur. Kaynak yüklenirken şu bütünlük koşulları yeniden doğrulanır:

- 3–1.440 nokta,
- kayıtlı `pointCount` ile gerçek dizi uzunluğu eşit,
- `0° <= azimut < 360°`,
- `-90° <= yükseklik <= +90°`,
- duplicate azimut yok,
- kayıtlı maksimum azimut boşluğu yeniden hesaplanan değerle eşit,
- SHA-256 tam 64 küçük-hex karakter,
- dosya boyutu 1 bayt–2 MB,
- geçerli import zamanı ve kaynak biçimi.

v1–v7 portable dosyalar skyline kaynağı olmadan migrate edilerek açılmaya devam eder.

Prediction snapshot yalnız hafif özet taşır:

- manuel/dış kaynak modu,
- kaynak nokta sayısı,
- maksimum azimut boşluğu,
- yerel ufuk anlık yüksekliği/açıklığı,
- yerel ufuk üstü süre,
- geçiş ve hesap izi.

Dosya adı ve SHA-256 ayrıca hesap izi/uyarılarda korunur.

## HTML rapor

HTML rapor dış skyline kaynağı varsa ayrı provenans bölümü gösterir:

- kaynak adı ve biçimi,
- nokta sayısı,
- maksimum azimut boşluğu,
- dosya boyutu,
- import zamanı,
- SHA-256,
- kaynak uyarıları.

Ham dosya baytları ve yüzlerce/binlerce noktanın tamamı HTML'e dökülmez; deney JSON'u doğrulanmış nokta dizisini taşır.

Bu aşamada ayrıca `stellar-observation` raporu genel astronomi gözlem sınıfına dahil edilir; rapor üst kartlarında hedef görünürlük girdileri yerine gözlem zamanı ve gözlemci koordinatı gösterilir.

## Örnek dosya

Manuel doğrulama için:

`docs/examples/stellar-skyline-example.csv`

24 noktalı, 15° aralıklı geçerli bir geometrik skyline örneğidir.

## Bilimsel sınır

Dış kaynak dosyası yalnız **geometrik** yerel ufuk açısıdır. Bu aşamada:

- DEM'den otomatik skyline üretimi,
- panorama/görüntüden skyline çıkarımı,
- atmosferik apparent yıldız yüksekliği ile doğal ufuk refraksiyonunun birleşik çözümü,
- extinction,
- sky brightness,
- bulut/seeing,
- çıplak-göz görünürlüğü

uygulanmaz.

## Doğrulama hedefleri

- dış skyline'ın manuel profilden bağımsız kaynak modu olarak uygulanması,
- dış kaynak yokken external modun açık hata vermesi,
- dosya adı/SHA/profil özetinin hesap izinde korunması,
- prediction snapshot'ta kaynak modu/nokta sayısı/maksimum boşluk,
- portable v8 round-trip,
- v7 geriye dönük migration,
- bozuk pointCount/SHA/max-gap metadata reddi,
- HTML rapor provenansı,
- gerçek Electron'da dosya seçimi + taslak → Uygula ve hesapla performansı,
- save/reopen ve `.ggl.json` export/import,
- strict TypeScript,
- tüm regresyonlar,
- production Electron/Vite build.

## Sonraki dilimler

- geometrik skyline ile Aşama 6.13 apparent yıldız yüksekliğinin fiziksel olarak güvenli karşılaştırma sözleşmesi,
- resmi BSC5P kaynak dosyası erişildiğinde doğrulanmış proper-motion altkümesini gözlem zincirine bağlama,
- çoklu yıldız / gökyüzü görselleştirmesi,
- DEM veya panorama gibi kaynaklardan skyline üretimi için ayrı ve açık provenanslı araçlar.
