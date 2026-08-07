# Aşama 5.3 — Fotoğraf açısal gözlemini model tahminleriyle karşılaştırma

Durum: tamamlandı · `1.4.1`

## Amaç

Fotoğraf/kamera kalibrasyonundan çıkan açısal ölçümleri model fiziğinin girdisi yapmak yerine, model sonuçları hesaplandıktan sonra uygulanan bağımsız bir gözlem kanalı olarak değerlendirmek.

## Referans çizgisinin anlamı

U1–U2 çizgisi iki farklı anlam taşıyabilir:

- **Görsel referans:** varsayılan ve eski kayıtlar için güvenli mod. Çizginin fiziksel yerel yatay olduğu varsayılmaz. Bu modda yalnız referans ofsetinden bağımsız **hedef açısal yüksekliği** karşılaştırılır.
- **Fiziksel yerel yatay:** kullanıcı U1–U2 çizgisinin bağımsız olarak kalibre edilmiş yerel yatayı temsil ettiğini açıkça bildirir. Bu durumda görünür hedef tabanı ve tepesi için mutlak yükselim açıları da karşılaştırılabilir.

Görüntüdeki deniz ufku, dağ silueti veya başka bir görsel çizgi otomatik olarak yerel yatay sayılmaz. Özellikle deniz ufkunun gözlemci yüksekliği, yüzey geometrisi ve kırılmaya bağlı ufuk çökmesi yerel yataydan farklı olabilir.

## Model açı kanalları

İdeal Küre ve Tanımlı Düzlem hedefli deneylerde şu ek sonuçları yayımlar:

- `targetBaseElevationDeg`
- `targetTopElevationDeg`
- `targetAngularHeightDeg`

Katmanlı atmosferli İdeal Küre aynı kanalları Ciddor + RK4 ışın çözümünden üretir. Fiziksel hedef tabanı görünmüyorsa taban açısı ve tam hedef açısal yüksekliği `null` bırakılır; görünmeyen taban için sanal bir açı uydurulmaz.

## Karşılaştırma kuralı

Bu sürümde kanal uyumu:

`|α_model - α_fotoğraf| ≤ u_fotoğraf`

şeklinde değerlendirilir.

Buradaki `u_fotoğraf`, 5.1/5.2 işaretleme belirsizliğinin piksel→açı yayılımından gelir. Model, mesafe, kot, atmosfer ve kamera iç-parametre belirsizlikleri henüz birleşik istatistiksel zarfa yayılmaz. Bu nedenle sonuç bir nihai istatistiksel güven testi değil, izlenebilir ilk açısal uyum değerlendirmesidir.

## Görünürlük sınırı

Model hedef tabanını fiziksel olarak görünmez öngörüyorsa:

- hedef taban açısı puanlanmaz,
- tam fiziksel hedef açısal yüksekliği puanlanmaz,
- yalnız fiziksel olarak tanımlı ve karşılaştırılabilir kanallar değerlendirilir.

Bu kural, fotoğraftaki işaretlerin modelin gizlediği hedef bölümüne yanlışlıkla uyum puanı üretmesini önler.

## Kayıt ve rapor

Her model için karşılaştırma ayrı `ModelPrediction` snapshot'ı olarak saklanır:

`photo-angular-comparison:<model-id>`

Kayıtta:

- kaynak model kimliği,
- karşılaştırılan kanallar,
- fotoğraf değeri ve belirsizliği,
- model değeri,
- mutlak fark,
- uyum durumu,
- hesap izi ve varsayımlar

korunur. HTML raporu bu snapshot'ları `Fotoğraf Açısal Karşılaştırması · <model>` adıyla gösterir.

## Geriye uyumluluk

`SavedPhotoCalibration.referenceKind` isteğe bağlıdır. `1.4.0` ve daha eski kayıtlarda alan yoksa parse katmanı alan uydurmaz; uygulama eksik değeri güvenli biçimde `visual-reference` olarak yorumlar.

## Model sürümleri

- İdeal Küre, standart/kapalı atmosfer yolu: `0.5.0`
- İdeal Küre, katmanlı atmosfer yolu: `0.6.0`
- Tanımlı Düzlem: `0.5.0`
- Fotoğraf açısal karşılaştırması: `0.1.0`

## Sonraki adım

Bir sonraki fotoğraf kalite aşaması model/girdi belirsizliği, kamera iç-parametre belirsizliği ve fotoğraf işaret belirsizliğini ortak bir istatistiksel zarf içinde birleştirmektir. Ana ürün yol haritasında bunun ardından Güneş, Ay ve gökyüzü deneyleri gelir.
