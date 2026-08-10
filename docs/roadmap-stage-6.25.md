# Aşama 6.25 — DEM skyline kaynak üretimi ve Yıldız Gözlemleri entegrasyonu

Durum: tamamlanma adayı · `1.19.0`

## Amaç

Aşama 6.24'te tamamlanan WGS84/toposentrik DEM → 360° geometrik skyline çekirdeğini masaüstü uygulamanın gerçek dosya, taslak, yıldız hesabı, kayıt ve rapor akışına bağlamak.

## Üç aşamalı performans akışı

DEM skyline üretimi, önceki yerel-ufuk editöründe kullanılan ağır-hesap korumasını sürdürür:

1. **ESRI ASCII DEM seç**: dosya parse edilir, SHA-256 ve grid provenansı hazırlanır. 360° tarama ve yıldız hesabı çalışmaz.
2. **DEM skyline üret**: main-process'te saklanan parse edilmiş grid üzerinde Aşama 6.24 motoru çalışır. Sonuç tam kapsamalıysa en fazla 1440 noktalı geometrik skyline taslağı üretilir. Yıldız hesabı henüz çalışmaz.
3. **Uygula ve hesapla**: mevcut Yıldız Gözlemleri editör kapısı, hazırlanmış DEM skyline kaynağını yıldız/iz hesabına tek seferde uygular.

Böylece dosya seçimi ve sayısal ayar düzenleme, yüksek maliyetli 360° taramayı veya yıldız izi hesabını her UI olayında yeniden tetiklemez.

## Main-process DEM taslağı

Parse edilmiş ESRI ASCII Grid renderer'a gönderilmez. Main process:

- grid'i geçici `requestId` altında tutar,
- renderer'a yalnız dosya adı, boyut, SHA-256, grid boyutu, cellsize, NODATA ve WGS84 derece kapsamı gönderir,
- taslakları 10 dakika sonra temizler,
- kaynak dosyayı en fazla 64 MB kabul eder.

Bu yaklaşım milyonlarca DEM hücresinin React state veya IPC sonucuna kopyalanmasını önler.

## Fail-closed 360° kapsama

Aşama 6.24 sonucu `completeCoverage=false` ise:

- diagnostics kullanıcıya döner,
- bilinen/kapsama-sınırlı/NODATA/kapsamasız yön sayıları gösterilir,
- **yıldız yerel-ufuk kaynağı üretilmez**,
- daha önce uygulanmış skyline sessizce değiştirilmez.

Tam kaynak yalnız bütün azimut ışınları istenen maksimum mesafeye kadar geçerli DEM verisiyle çözüldüğünde oluşturulur.

## DEM skyline kaynak provenansı

Tam sonuç mevcut `stellarLocalHorizonSource` zincirine `format: 'dem'` ile girer. Kaynak şunları taşır:

- DEM dosya adı,
- dosya boyutu,
- içe aktarma zamanı,
- tam kaynak SHA-256,
- normalize edilmiş azimut → geometrik skyline noktaları,
- `dem-skyline-wgs84-topocentric` algoritma kimliği ve sürümü,
- gözlemci WGS84 enlem/boylamı,
- göz yüksekliği,
- DEM → WGS84 elipsoid sabit yükseklik ofseti,
- azimut adımı,
- mesafe örnekleme adımı,
- maksimum tarama mesafesi,
- nearest/bilinear örnekleme yöntemi,
- tam-kapsama ve jeodezik-yedek sayaçları.

Hesap motorunda bu kaynak `derived` olarak etiketlenir; CSV/JSON ile aynı dış-dosya kökenine sahipmiş gibi gösterilmez.

## Portable ve local store

Şema sürümü `v10`dur.

- v1–v9 kayıtlar migrate edilir,
- CSV/JSON skyline kaynakları önceki davranışı korur,
- `format:'dem'` kaynakta `demDerivation` zorunludur,
- `completeCoverage` yalnız `true` olabilir,
- tam yön sayısı skyline nokta sayısıyla eşleşmelidir,
- kapsama-sınırlı/NODATA/kapsamasız sayaçları sıfır olmalıdır,
- `360 / azimuthStepDeg` nokta sayısıyla eşleşmelidir,
- maksimum azimut boşluğu azimut adımıyla eşleşmelidir,
- örnek bütçesi ve mesafe sınırları yeniden doğrulanır,
- DEM formatı için dosya boyutu üst sınırı 64 MB'dir.

Bu alanlar bozulmuşsa portable kayıt kısmen kabul edilmez.

## HTML rapor

DEM skyline provenansı ayrı başlık altında raporlanır:

- `DEM skyline kaynak provenansı`,
- kaynak dosyası ve SHA-256,
- türetim algoritması,
- gözlemci ve göz yüksekliği,
- datum → elipsoid ofseti,
- ΔA / Δs / maksimum menzil,
- DEM örnekleme yöntemi,
- 360° kapsama sayaçları,
- jeodezik fallback sayısı.

Ham DEM dosyası rapora gömülmez.

## UI

Yıldız Gözlemleri yerel-ufuk panelinde yeni `DEM’den 360° geometrik skyline` bölümü bulunur. Kaynak kartı DEM için açıkça:

- `DEM · türetilmiş geometrik`,
- nokta sayısı,
- en büyük azimut boşluğu,
- ΔA,
- Δs,
- maksimum menzil,
- örnekleme yöntemi,
- SHA-256

bilgilerini gösterir.

Sayısal alanlarda mevcut `DraftNumberInput` davranışı kullanılır; geçici boş değer düzenleme sırasında ağır hesap tetiklenmez.

## Sentetik entegrasyon örneği

`docs/examples/stellar-dem-skyline-example.asc` gerçek topoğrafya olmayan sentetik bir 41×41 ESRI ASCII Grid'dir. Varsayılan İstanbul gözlemcisini grid merkezine yerleştirir, varsayılan 20 km taramayı 360° kapsar ve görsel kontrol için yapay yükseltiler içerir.

Gerçek coğrafi veri olarak kullanılmamalıdır.

## Bilimsel sınır

DEM skyline **geometriktir**. Şunlar dahil değildir:

- atmosferik kırılma,
- geoit ofsetinin mekânsal değişimi,
- binalar ve bitki örtüsü,
- DEM çözünürlüğünden küçük engeller,
- grid dışındaki arazi.

Bu nedenle standart apparent yıldız yüksekliği ile DEM skyline farkı otomatik yerel optik görünürlük kararı değildir.

## Test ve kapanış kapıları

Kod kapıları:

- 6.24 WGS84/toposentrik regresyonları korunmalı,
- DEM kaynak adaptörü tam kapsama dışında kaynak üretmemeli,
- portable v10 DEM türetim kaydı round-trip yapmalı,
- bozuk completeCoverage veya eksik derivation reddedilmeli,
- HTML rapor DEM türetim provenansını göstermeli,
- eski v1–v9 migration ve CSV/JSON skyline regresyonları korunmalı,
- strict Node + Web TypeScript, tüm Vitest paketi ve production Electron/Vite build başarılı olmalı.

Manuel Electron kapanış kontrolü:

- dosya seçiminde ağır hesap olmaması,
- `DEM skyline üret` ile 180/180 tam taramanın üretilmesi,
- yıldız grafiğinin yalnız `Uygula ve hesapla` sonrasında değişmesi,
- DEM kaynak kartı/provenans görünümü,
- kaydet/aç ile kaynağın korunması,
- mümkünse HTML rapor provenansı,
- aynı sentetik grid ile 100 km menzilde eksik kapsamanın fail-closed kalması.

## Sonraki aşama

Panorama/fotoğraf üzerinden 360° skyline çıkarmak, DEM'den farklı olarak kamera yönelimi, lens modeli ve piksel→azimut/yükseklik kalibrasyonu gerektirir. Bu nedenle ayrı bir aşama olarak ele alınmalıdır.
