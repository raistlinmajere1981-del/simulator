# God-file analizi ve bakım planı

Bu belge ilk büyük refactor çalışmasının güncel sonucunu ve public repository için kalan bakım adaylarını gösterir. Hedef satır sayısını mekanik olarak azaltmak değil; katkıcıların küçük, test edilebilir ve düşük çatışmalı değişiklikler yapabilmesidir.

## Tamamlanan kritik refactorlar

| Dosya | İlk durum | Güncel yaklaşık boyut | Sonuç |
|---|---:|---:|---|
| `src/renderer/src/AppNext.tsx` | 130 KB | 64 KB | Büyük sunum blokları, terrain/model sonuçları, astronomi hesapları, ortak model-state ve persistence ayrıldı. Hâlâ orchestrator; blokaj değil. |
| `src/report/html-report.ts` | 48 KB | 12 KB | `report-core`, `report-terrain`, `report-provenance` ayrıldı. Ana dosya belge assembly seviyesinde. |
| `src/shared/portable.ts` | 46 KB | 12 KB | `portable-core`, `portable-sources`, `portable-photo-asset` ayrıldı. Ana dosya schema/normalization/facade seviyesinde. |

Bu üç dosyanın başlangıçtaki P0/P1 riski giderildi. Daha fazla parçalama yalnız açık bir sorumluluk sınırı ve katkı kolaylığı sağlıyorsa yapılmalıdır.

## Güncel bakım adayları

| Öncelik | Dosya | Yaklaşık boyut | Neden | Hedef |
|---|---|---:|---|---|
| P1 | `src/shared/text-experiment-setup.ts` | 32 KB | Serbest metin parserı, ortak alan tanımları ve senaryo-özel aday üretimi aynı modülde; AI test sözleşmesine yakın kritik kod | Facade korunarak parser/types + ortak alanlar + senaryo alanları ayrımı |
| P1 | `src/renderer/src/PhotoCalibrationControl.tsx` | 33 KB | Fotoğraf session state, işaret UI, kamera parametreleri ve commit/validasyon aynı bileşende | session/view-model + marker/calibration alt kontrolleri |
| P1 | `src/renderer/src/StellarObservationPanel.tsx` | 41 KB | Yıldız seçimi, kaynak/proper-motion/skyline ve sonuç görünümü aynı panelde | kaynak kontrolleri + gözlem ayarları + sonuç/visualization bölümleri |
| P1 | `src/renderer/src/MultiPointTerrainEditor.tsx` | 38 KB | Manuel editör, CSV/GeoJSON/DEM import akışları ve review UI aynı bileşende | editor + importer aksiyonları + review alt bileşenleri |
| P2 | `src/main/index.ts` | 29 KB | Genel Electron başlangıcı ve birden fazla IPC grubu aynı dosyada | deney/portable/report/terrain IPC kayıt modülleri; index yalnız wiring |
| P2 | `src/renderer/src/AppNext.tsx` | 64 KB | Hâlâ çok state bağlar fakat kritik hesap/persistence çıkarıldı | Yalnız açık workspace/state kümeleri oluşursa ek extraction; sırf boyut için parçalama yok |
| P2 | `src/renderer/src/WorldModelViewport.tsx` | 29 KB | Three.js yaşam döngüsü ve çoklu görsel katmanlar | ancak sık değişiklik/çatışma görülürse scene helper extraction |
| P3 | `src/report/report-provenance.ts` | 19 KB | Çok sayıda bağımsız provenans bölümü | yalnız yeni provenans türleri eklenirken doğal section split gerekirse |
| P3 | `src/shared/portable-sources.ts` | 21 KB | Kaynak metadata parserları | source ailesi büyürse foto/stellar/text parser modülleri |

`src/shared/help-content.ts` büyük olsa da ağırlıklı statik içeriktir ve boyut tek başına refactor gerekçesi değildir. Matematiksel simulation modülleri de domain bütünlüğü bozulacaksa yalnız dosya boyutu için parçalanmamalıdır.

## Legacy/dead-code kontrolü

`src/renderer/src/main.tsx` yalnız `AppNext` render eder. `src/renderer/src/App.tsx` eski renderer adayıdır; ancak silmeden önce yerelde kullanım kesin olarak doğrulanmalıdır:

```bash
rg -n "from ['\"]\\./App['\"]|from ['\"].*/App['\"]|<App\\b" src tests
```

Sonuç yoksa `App.tsx` ayrı ve küçük bir dead-code cleanup PR'ında kaldırılabilir. Bu kontrol yapılmadan dosya yalnız isim benzerliğine bakılarak silinmemelidir.

## Refactor sırası

Public katkıcı deneyimi için önerilen sıra:

1. `text-experiment-setup.ts` — AI/public sözleşme kodunun okunabilirliği.
2. `PhotoCalibrationControl.tsx` — session/provenance davranışının daha anlaşılır hale gelmesi.
3. `StellarObservationPanel.tsx`.
4. `MultiPointTerrainEditor.tsx`.
5. `src/main/index.ts` IPC ayrımı.
6. Gerekirse AppNext'in kalan açık state/workspace sınırları.

Her dilim ayrı PR olmalıdır. Aynı PR'da refactor + yeni hesap/özellik karıştırılmamalıdır.

## Güvenlik kuralları

- Hesap sonucu, birim, belirsizlik, status veya provenans semantiği refactor sırasında değiştirilmez.
- Public export/facade mümkün olduğunca korunur; import churn azaltılır.
- AI canonical sözleşmeleri refactor nedeniyle değişmez.
- Portable schema version refactor nedeniyle artırılmaz.
- Move-only extraction sonrasında `npm run verify` zorunludur.
- Renderer/Electron bileşeni taşındıysa ilgili manuel smoke testi yapılır.
- Geçici exact-match/helper scripti kullanıldıysa merge öncesinde kaldırılır.

## Tamamlanma ölçütü

Bu bakım listesinin tamamı ürünün kullanılabilmesi için zorunlu değildir. Public-ready kapanış hedefi; yeni katkıcının kritik AI/veri sözleşmelerini tek bir dev dosyada çözmek zorunda kalmaması ve en riskli aktif god-file'ların bağımsız sorumluluklara ayrılmış olmasıdır.

Yeni fonksiyonlar, bu liste bittikten sonra gerçek kullanım sırasında ortaya çıkan ihtiyaçlara göre planlanmalıdır.
