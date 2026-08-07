# Aşama 4.5 — Atmosfer ve optik ışın görsel katmanı

Durum: tamamlanma adayı · `1.3.2`

## Amaç

Aşama 4.4'te fiziksel olarak hesaplanan katmanlı atmosfer sonuçlarını, hesap motoruna geri besleme yapmadan İdeal Küre Three.js sahnesinde okunabilir hale getirmek.

Bu aşamada görselleştirme yalnız bir çıktı katmanıdır. Model tahmini önce üretilir; sahne bu tahminin başlangıç açısı ve mevcut deney girdileriyle aynı Ciddor + RK4 izleyiciyi yalnız çizim örneği üretmek için yeniden çalıştırır.

## Görsel katman anahtarı

`Görsel Katmanlar > Atmosfer Profili` anahtarı:

- yalnız atmosfer modu `Katmanlı profil` olduğunda kullanılabilir,
- kapalı/standart `k` modunda devre dışıdır,
- yalnız İdeal Küre kartında fiziksel atmosfer yolu gösterir,
- Tanımlı Düzlem veya azimutal kartografik referansa tanımsız kırılma yolu uydurmaz.

## Atmosfer kabukları

Meteorolojik profil yüksekliği örnekleri İdeal Küre çevresinde yarı saydam tel-kafes kabuklar olarak gösterilir. Çok kalabalık profillerde en fazla yaklaşık altı temsilci kabuk çizilir.

Gerçek atmosfer kalınlığı dünya yarıçapına göre ekranda ayırt edilemeyecek kadar küçük olduğundan yükseklik yalnız sahnede abartılı ölçeklenir. Bu ölçek:

- fiziksel hesapta kullanılan metre değerlerini değiştirmez,
- model tahminine geri beslenmez,
- legend/tooltip üzerinde açıkça `görsel ölçek` olarak belirtilir.

## Optik ışın yolu

İdeal Küre tahminindeki mevcut metrikler görsel yolu seçer:

- Hedef Görünürlüğü / Uzun Mesafe Görüş: öncelikle `targetTopElevationDeg`, gerekirse `profileGrazingElevationDeg`,
- Ufuk Analizi: `profileGrazingElevationDeg`.

Seçilen başlangıç açısıyla `traceLayeredAtmosphereRay` aynı:

- meteorolojik profil,
- Ciddor optik ayarları,
- gözlemci yüksekliği,
- RK4 adımı

üzerinden yeniden örneklenir. Yeniden izleme profil kapsamı veya başka bir fiziksel nedenle tamamlanamazsa sahne sahte düz veya kırılmış bir ışın üretmez.

## WGS84 görsel ankrajı

Hedefli deneylerde optik ışının yüzey mesafesi örnekleri mevcut WGS84 gözlemci-hedef jeodezik rotasına oranla yerleştirilir. Böylece 3B çizgi, model kartındaki aynı coğrafi rota üzerinde ilerler.

Ufuk Analizi'nde hedef koordinatı olmadığı için yeni bir hedef konumu uydurulmaz. Işın, gözlemci noktasından başlayan azimut-bağımsız yerel büyük-daire kesiti üzerinde gösterilir; sayısal ufuk mesafesi yine fizik motorundan gelir.

## Geometrik görüş hattı

Hedefli profil deneylerinde:

- katmanlı optik ışın,
- gözlemci ile hedef tepesi arasındaki düz geometrik görüş hattı

ayrı çizgiler olarak birlikte gösterilir. Bu karşılaştırma kırılmanın yönünü görsel olarak anlatmak içindir; düz çizgi ayrı bir model tahmini üretmez.

## Performans ve kaynak temizliği

RK4 fizik hesabı çok sayıda örnek üretebilir. Görsel dönüşüm:

- ilk ve son örneği korur,
- uzun yolları en fazla 420 çizim noktasına düşürür,
- fizik hesabının örneklerini veya sonucunu değiştirmez,
- sahne kapanırken ek geometri ve materyalleri mevcut Three.js kaynak temizleme akışıyla serbest bırakır.

## Doğrulama ölçütleri

Aşama 4.5 ancak CI üzerinde aşağıdakiler birlikte geçtiğinde tamamlandı sayılır:

- yükseklik görsel ölçeğinin sınırlı ve monoton olması,
- uzun RK4 yolunun uçları korunarak örnek azaltılması,
- hedefli ışının WGS84 gözlemci ve hedef yönlerine doğru ankrajlanması,
- Ufuk Analizi için hedef koordinatı uydurmadan kesit üretilebilmesi,
- strict TypeScript,
- tüm Vitest regresyon testleri,
- production build.

Gerçek Electron/WebGL görünümündeki çizgi yoğunluğu, legend okunabilirliği ve örtüşme durumu ayrıca masaüstü ekran görüntüsüyle görsel kontrol edilir.

## Sonraki adım

Gelişmiş atmosferin çekirdek, arayüz, fiziksel bağlantı ve temel 3B görselleştirme zinciri bu aşamayla tamamlanır. Sonraki ana fiziksel ürün aşaması Aşama 5 fotoğraf/kamera kalibrasyonudur. `Gece Işıkları` görsel katmanı bağımsız, hesap sonucunu etkilemeyen bir görsel veri işi olarak ayrıca ele alınabilir.
