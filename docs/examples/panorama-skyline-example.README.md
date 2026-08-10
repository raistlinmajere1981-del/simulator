# Sentetik panorama skyline örneği

Dosya: `panorama-skyline-example.png`

Bu görüntü **gerçek bir yerin panoraması değildir**. Aşama 6.27'deki panorama → geometrik skyline kullanıcı akışını çevrimdışı ve tekrar üretilebilir biçimde test etmek için oluşturulmuş sentetik bir 1600×800 PNG'dir.

## Özellikler

- boyut: `1600 × 800 px`
- oran: `2:1`
- projeksiyon testi için equirectangular tam-küre oranına uygundur
- gökyüzü + sentetik dalgalı sırt + iki belirgin yapay tepe içerir
- GPano XMP metadata içermez
- gerçek azimut, gerçek topoğrafya veya optik görünürlük iddiası taşımaz

## Aşama 6.27 manuel Electron kontrolü

1. Uygulamayı `agent/panorama-skyline-ui` branch'inde aç.
2. `Yıldız Gözlemleri` → `Yerel ufuk` bölümünde `Panoramadan 360° geometrik skyline` kartını bul.
3. `Panorama seç` ile bu PNG'yi seç.
4. Beklenen kaynak durumu:
   - bitmap `1600×800 px`
   - GPano geometrisi yok
   - `Manuel geometri` modu
   - full pano varsayılanı `1600×800`
   - crop sol/üst `0`
   - heading/pitch/roll `0°`
   - yatay kapsam `360°`
5. Görüntüde koyu arazi ile gökyüzü arasındaki sentetik skyline çizgisine soldan sağa **en az 8**, tercihen 10–12 yaklaşık eşit aralıklı nokta tıkla.
6. Tanıda:
   - nokta sayısı `8+`
   - yatay kapsam `360°`
   - en büyük azimut boşluğu `≤90°`
   görülmeli.
7. `Panorama skyline hazırla` düğmesine bas.
8. Yerel skyline kaynak kartında:
   - `PANORAMA · türetilmiş geometrik`
   - `Manuel geometri`
   - `yatay 360°`
   - işaret sayısı
   görünmeli.
9. Bu aşamada yıldız hesabı kendiliğinden değişmemeli. Mevcut `Uygula ve hesapla` düğmesine basınca panorama skyline yıldız hesabına bağlanmalı.
10. Deneyi kaydet → başka kayda geç → tekrar aç. Kalıcı kaynak/provenans korunmalı; ham panorama görüntüsünün deney JSON'una gömülmesi beklenmez.
11. HTML rapor alınırsa `Panorama skyline kaynak provenansı` bölümü geometri kaynağı, pose/crop bilgileri ve manuel işaret sayısını göstermeli; ham görüntü baytlarını içermemelidir.

## Fail-closed kontrolü

Manuel geometride full panorama genişliğini örneğin `2000 px` yapıp bitmap genişliğini `1600 px` bırakırsan yatay kapsam `288°` olur. Bu durumda `Panorama skyline hazırla` etkinleşmemeli; eksik azimutlar otomatik olarak 360° skyline kabul edilmemelidir.

Benzer şekilde işaretler arasında `90°` üzeri azimut boşluğu bırakılırsa kaynak hazırlanması engellenmelidir.
