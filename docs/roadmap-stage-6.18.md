# Aşama 6.18 · Apparent yıldız yüksekliği ve geometrik skyline tanı sözleşmesi

Durum: **tamamlandı — backend checkpoint**  
Sürüm: **1.15.1**

## Amaç

Aşama 6.13'teki standart atmosferik kırılma sonucunu, Aşama 6.12/6.14/6.17 geometrik yerel skyline sonuçlarıyla aynı API içinde fakat **referansları karıştırmadan** sunmak.

## Bilimsel ayrım

Bu aşama üç büyüklüğü ayrı tutar:

1. `h_geometrik,yıldız` — astronomik geometrik yıldız yüksekliği.
2. `h_apparent,yıldız` — yalnız yıldız ışınına NOAA GML standart atmosferik kırılma yaklaşımı uygulanmış apparent yükseklik.
3. `h_geometrik,skyline(A)` — seçilen azimuttaki geometrik yerel skyline yüksekliği.

Geometrik yerel açıklık fiziksel olarak kendi referansı içinde hesaplanabilir:

`Δh_geometrik = h_geometrik,yıldız - h_geometrik,skyline`

Ayrıca tanısal amaçla şu sayı da üretilebilir:

`Δh_tanı = h_apparent,yıldız - h_geometrik,skyline`

Ancak ikinci ifade **karma referanslıdır**. Skyline/terrain ışını aynı atmosfer modeli ve gözlem koşullarıyla optik olarak çözülmediği için bu fark `visible / not visible` sınıfına dönüştürülmez.

## Kaynak sınırı

- Atmosferik kırılma yaklaşımı: NOAA Global Monitoring Laboratory Solar Calculator parça-parça standart düzeltmesi.
- USNO astronomik kırılma tanımıyla uyumlu olarak apparent/gözlenen yüksekliğin geometrik yükseklikten farklı olabileceği ve kırılmanın atmosfer koşullarına bağlı olduğu kabul edilir.
- NOAA yaklaşımı gerçek basınç, sıcaklık, nem, dalga boyu veya dikey atmosfer profilini çözmez.

## Kod

Yeni dosya:

- `src/simulation/stellar-apparent-diagnostic.ts`

Yeni API:

- `calculateStellarApparentDiagnostic()`

Çıktı açıkça şunları taşır:

- geometrik yükseklik,
- standart-refraction sonucu ve düzeltme,
- isteğe bağlı geometrik yerel-ufuk sonucu,
- geometrik yerel açıklık,
- `starOnlyApparentMinusGeometricSkylineDeg`,
- karşılaştırma türü,
- sabit `localVisibilityClassified: false`,
- hesap izi ve bilimsel uyarılar.

## Regresyonlar

`tests/stellar-apparent-diagnostic.test.ts`:

- geometrik `0°` için NOAA standart kırılma değerini ayrı apparent yükseklik olarak korur,
- geometrik skyline açıklığını mevcut yerel-ufuk motoruyla aynı üretir,
- karma referanslı işaret tersine dönüşünü görünürlük boolean'ına çevirmediğini sabitler,
- mevcut döngüsel skyline interpolasyonunu yeniden kullanır,
- skyline istenirken azimut `null` ise işlemi reddeder,
- hesap izinde karma referans uyarısını zorunlu tutar.

## Bu aşamada özellikle yapılmayanlar

- apparent yıldız yüksekliği ile geometrik skyline'dan optik görünürlük kararı üretmek,
- terrain/skyline ışını için atmosferik ray tracing,
- basınç/sıcaklık/nem/dalga boyu girdileri,
- extinction, sky brightness, bulut, seeing veya çıplak-göz algı modeli,
- UI entegrasyonu.

## Sonraki adım

Aşama 6.19'da bu tanı katmanı Yıldız Gözlemleri sonucuna bağlanabilir. UI'da geometrik ve apparent çizgiler ayrı gösterilmeli; karma referanslı değer yalnız **tanı** etiketiyle sunulmalı ve yerel görünürlük rozeti üretmemelidir.
