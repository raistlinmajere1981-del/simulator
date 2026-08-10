# Aşama 7.2 — Anlık tutulma geometrisi kullanıcı arayüzü tanısı

Durum: tamamlanma adayı · `1.22.0`

## Amaç

Aşama 7.1'deki düşük hassasiyetli Güneş–Ay apparent disk örtüşme çekirdeğini kullanıcıya görsel ve sayısal bir tanı olarak açmak; ancak henüz tam bir “tutulma simülatörü” izlenimi vermemek.

Bu nedenle özel `Tutulma Simülasyonları` menüsü bu aşamada **YAKINDA** olarak kalır. Anlık disk geometrisi, zaten aynı zaman/konumda Güneş ve Ay sonuçlarını üreten `Güneş ve Ay Gözlemleri` akışının altında ayrı bir Aşama 7.2 kartı olarak gösterilir. Özel senaryo ancak zaman taraması / olay araması / kayıt sözleşmesi hazır olduğunda etkinleştirilecektir.

## Arayüz

- Ay topocentrik konum/faz kartının altında `Güneş–Ay apparent disk örtüşmesi` paneli.
- Güneş ve Ay diskleri aynı apparent yarıçap ölçeğinde SVG ile çizilir.
- Merkez ayrımı çok büyük olduğunda ekran yerleşimi okunabilirlik için sıkıştırılır ve bu açıkça belirtilir; disk çap oranları korunur.
- Anlık geometri sınıfı:
  - disk örtüşmesi yok,
  - kısmi disk örtüşmesi,
  - tam-tip anlık geometri,
  - halkalı-tip anlık geometri.
- Sayısal tanılar:
  - merkez ayrımı,
  - Güneş / Ay açısal yarıçapı,
  - Güneş disk alanı örtüşmesi,
  - çap doğrultusu örtme oranı,
  - dış limb açıklığı,
  - Güneş / Ay merkez geometrik yüksekliği,
  - Güneş uzaklığı (AU),
  - Ay uzaklığı (km),
  - iki merkezin geometrik ufuk durumu.

## Hesap bağlantısı

`LunarPositionPanel`, mevcut Ay sonucunun normalize UTC zamanı ve gözlemci koordinatından aynı `solar-position-noaa` Güneş snapshot'ını yeniden üretir ve Aşama 7.1 `calculateSolarEclipseOverlap` fonksiyonuna verir.

Bu yeniden hesaplama hesap zincirini değiştirmez; aynı deterministik Güneş algoritmasını aynı zaman/konum girdisiyle çağırır. Ağ servisi veya harici efemeris kullanılmaz.

## Bilimsel güvenlik

Panel sürekli ve görünür biçimde şu sınırlamaları taşır:

- Bessel elemanları yok,
- C1/C2/maksimum/C3/C4 temas zamanları yok,
- Dünya üzerindeki merkez hattı / umbra-penumbra yolu yok,
- JPL DE / Horizons yüksek hassasiyet efemerisi yok,
- Ay limb topografyası yok,
- atmosferik kırılma yok,
- Güneş topocentrik paralaksının yüksek hassasiyet düzeltmesi yok,
- gözlemci rakımı tutulma geometrisine uygulanmıyor.

`tam-tip` / `halkalı-tip` etiketleri yalnız seçili **anın** iki apparent disk kapsanma ilişkisini ifade eder; resmi tutulma türü veya gözlem güvenliği kararı değildir.

## Kayıt / rapor

Aşama 7.2 yeni portable şema alanı açmaz. Tanı canlı olarak mevcut Güneş/Ay snapshot'ından yeniden hesaplanır. `solar-eclipse-overlap-prediction.ts` kayıt/rapor entegrasyonunun sonraki diliminde kullanılmak üzere tipli prediction sözleşmesini hazırlar.

Bu karar, Aşama 6.27'den kalan #77 UI rehydrate bakım işini genişletmeden yeni bir persistence bağımlılığı oluşturmamak içindir.

## Sonraki dilim — Aşama 7.3

Özel `Tutulma Simülasyonları` senaryosunu etkinleştirmeden önce kontrollü olay araması:

- kullanıcının seçtiği zaman çevresinde kaba→ince Güneş–Ay minimum merkez ayrımı taraması,
- aday pencere yoksa açık `olay bulunamadı` sonucu,
- aday varsa maksimum örtüşme anı için daraltılmış çözüm,
- tarama adımı / zaman belirsizliği provenansı,
- düşük hassasiyetli efemeris sınırlarını temas zamanı iddiasından ayırma,
- ardından özel senaryo, kayıt ve HTML rapor entegrasyonu.
