# Aşama 5.4 — Birleşik Fotoğraf / Model Belirsizlik Zarfı

Sürüm: `1.5.0`

Bu aşamada fotoğraf açısal gözlemi ile fiziksel model tahmininin karşılaştırması, yalnız piksel işaret belirsizliğinden çıkarılıp açıkça tanımlanmış kamera ve model girdi belirsizliklerini de kapsayan bir hassasiyet zarfına genişletildi.

## Bilimsel sınır

- Fotoğraf kalibrasyonu model tahminini üretmek için kullanılmaz; karşılaştırma hâlâ sonradan ve tek yönlüdür.
- Boş belirsizlik alanı `±0` değildir. Ölçülmemiş bir belirsizlik için yazılım varsayımsal sayı üretmez.
- Girilen `±` değerler deterministik hassasiyet sınırlarıdır; kendiliğinden `1σ`, güven aralığı veya başka bir olasılık anlamı taşımaz.
- Varsayılan birleşim `koruyucu doğrusal toplam`dır.
- `RSS` yalnız bileşenlerin bağımsız olduğu savunulabiliyorsa kullanıcı tarafından açıkça seçilir ve bu varsayım hesap izinde korunur; RSS seçmek sonuçlara otomatik bir güven düzeyi atamaz.
- Model girdi belirsizliği, nominal girdiyi değiştirmez; model her tanımlı parametrenin alt/üst uçlarında ayrıca çözülür ve nominal açıdan en büyük sapma katkı olarak alınır.
- Belirsizlik aralığı bir açı kanalını fiziksel olarak tanımsız duruma geçirirse o kanal için sonlu uyum puanı uydurulmaz.

## Fotoğraf tarafı

Kamera kalibrasyon kaydı isteğe bağlı olarak şu ± aralıkları taşıyabilir:

- yatay/düşey FOV,
- odak uzaklığı,
- sensör genişliği/yüksekliği,
- asal nokta X/Y.

Piksel işaret zarfı ile kamera iç-parametre zarfı seçilen yöntemle birleşir. Fotoğraf dosyası yine deney JSON’una gömülmez.

## Model tarafı

Deney karşılaştırması isteğe bağlı olarak şu girdi belirsizliklerini yayabilir:

- etkin yüzey mesafesi,
- göz yüksekliği,
- gözlemci zemin kotu,
- hedef yüksekliği,
- hedef taban kotu,
- Standart k modunda kırılma katsayısı `k`.

Katmanlı atmosfer sıcaklık/basınç/nem örneklerinin ve ara DEM/terrain örneklerinin doğruluk belirsizlikleri bu sürümde ayrı veri alanlarına sahip değildir; yazılım bunlara sayı uydurmaz ve eksik kapsamı açık uyarı olarak taşır.

## Kayıt ve rapor

Kamera belirsizlikleri fotoğraf kalibrasyon provenansına, model girdi belirsizlikleri deney kaydına eklenir. `.ggl.json` round-trip ve çevrimdışı HTML raporu bu bilgileri korur. Eski kayıtlar belirsizlik alanları olmadan güvenle açılmaya devam eder.
