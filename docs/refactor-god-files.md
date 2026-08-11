# God-file analizi ve parçalama planı

Bu çalışma yeni özellik eklemekten önce kaynak dosyaların sorumluluk sınırlarını netleştirmek için yapılır. Hedef yalnız satır sayısını azaltmak değildir; değişikliklerin daha küçük dosyalarda yapılabilmesi, test kapsamının sorumluluk bazında ayrılabilmesi ve büyük exact-match patch ihtiyacının azalmasıdır.

## Öncelik ölçütleri

Bir dosya aşağıdaki sinyallerden birden fazlasını taşıyorsa refactor adayı sayılır:

- yaklaşık 30 KB üzeri aktif kaynak kodu,
- birden fazla bağımsız UI/iş mantığı sorumluluğu,
- çok sayıda farklı domain modülüne doğrudan bağımlılık,
- aynı dosyada state orchestration + hesaplama + persistence + görünüm üretimi,
- küçük özellik değişikliklerinde dosyanın uzak bölümlerine dokunma gereksinimi,
- test veya merge çatışması riskinin dosya büyüklüğüyle artması.

Salt veri/katalog dosyaları yalnız büyük oldukları için parçalanmaz.

## Mevcut başlıca adaylar

| Öncelik | Dosya | Yaklaşık boyut | Değerlendirme |
|---|---|---:|---|
| P0 | `src/renderer/src/AppNext.tsx` | 130 KB | Ana god file. UI shell, scenario state, persistence, model çalıştırma, astronomi, arazi, sonuç kartları ve dialog orchestration aynı dosyada. |
| P1 | `src/report/html-report.ts` | 48 KB | HTML biçimleme, prediction render, astronomi/jeodezi/arazi ve tam belge assembly aynı dosyada. |
| P1 | `src/shared/portable.ts` | 46 KB | Şema, doğrulama, migration ve parse/serialize akışları tek modülde. |
| P2 | `src/renderer/src/StellarObservationPanel.tsx` | 41 KB | Tek domaine ait olsa da panel alt bölümleri ayrı bileşenlere ayrılabilir. |
| P2 | `src/renderer/src/MultiPointTerrainEditor.tsx` | 38 KB | Editör, import akışı ve görsel düzenleme sorumlulukları büyümüş durumda. |
| P2 | `src/shared/text-experiment-setup.ts` | 31 KB | Ortak parser ile senaryo-özel aday üretimi aynı dosyada. |
| P2 | `src/renderer/src/PhotoCalibrationControl.tsx` | 32 KB | Kalibrasyon state, UI ve doğrulama aynı bileşende yoğunlaşmış durumda. |
| P3 | `src/main/index.ts` | 28 KB | Electron başlangıç + IPC kayıtları zamanla ayrı IPC modüllerine çıkarılabilir. |

`src/shared/help-content.ts` büyük olsa da ağırlıklı olarak statik içeriktir; şu aşamada god-file önceliği değildir. Matematiksel simulation modülleri de sırf boyut nedeniyle parçalanmayacaktır; önce domain bütünlüğü kontrol edilir.

## AppNext parçalama stratejisi

### Dilim 1 — düşük riskli görünüm ve ortak yardımcılar

Davranış değiştirmeden aşağıdakiler dışarı alınır:

- `app/AppSidebar.tsx`
- `app/ScenarioSummary.tsx`
- `app/ObservationReferencePanels.tsx`
- `app/NumericField.tsx`
- `app/app-config.ts`
- `app/app-formatters.ts`
- `app/app-types.ts`

Bu dilim state sahipliğini değiştirmez. `AppNext` hâlâ orchestration sahibidir; yalnız gömülü sunum bileşenleri ve saf yardımcılar ayrılır.

### Dilim 2 — terrain ve sonuç görünümü

Sonraki güvenli taşıma adayları:

- gömülü `TerrainPanel` ve terrain UI yardımcıları,
- `ModelCard`, `ResultsTable` ve model sunum bileşenleri,
- geodesic prediction/metadata yardımcıları.

### Dilim 3 — state ve persistence orchestration

Move-only refactorlar stabilize olduktan sonra daha davranışsal parçalama yapılır:

- deney kayıt/yükleme/snapshot üretimi,
- observation clock state,
- scenario-özel restore/apply state,
- prediction bundle/model-run türetimi.

Bunlar custom hook veya saf builder modülleri olarak çıkarılır. Bu dilim önceki ikisinden daha yüksek risklidir ve ayrı PR olmalıdır.

## Diğer god-file planı

`html-report.ts` için hedef: biçimleyiciler + ortak prediction bölümü + domain section modülleri + ince belge assembler.

`portable.ts` için hedef: schema/types + validators + migrations + public parse/serialize facade. Geçiş sırasında mevcut `portable.ts` ince bir re-export/facade olarak korunabilir; böylece import churn azaltılır.

`text-experiment-setup.ts` için hedef: kanonik blok parser + ortak alanlar + shadow/stellar/eclipse senaryo alanları. `GGL-AI-TEST v1` sözleşmesi değişmeden kalmalıdır.

## Güvenlik kuralları

- Refactor PR'larında hesap sonucu veya UI davranışı bilinçli olarak değiştirilmez.
- Her dilimde `npm run typecheck`, `npm test`, `npm run build` çalıştırılır.
- Büyük taşımalarda mevcut test isimleri korunur; test davranışı değiştirilmez.
- Önce move-only / extraction, sonra architecture/state refactor yapılır.
- Yeni özellik çalışması, en azından AppNext düşük riskli extraction ve P1 dosyaların ilk ayrımı tamamlanana kadar bekletilir.
