# Aşama 5.2 — Fotoğraf yükleme ve etkileşimli işaretleme

Durum: tamamlandı · `1.4.0`

## Amaç

5.1 kamera/piksel-açı çekirdeğini gerçek masaüstü fotoğraf akışına bağlamak; kaynak görüntünün provenansını korurken büyük görüntü baytlarını deney JSON’una gömmemek.

## Yerel fotoğraf yükleme

Electron dosya seçici başlangıçta yalnız:

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)

dosyalarını kabul eder.

Seçilen dosya normal bir dosya olmalı ve 25 MB sınırını aşmamalıdır. Ana süreç görüntünün çözümlenebildiğini doğrular ve:

- yalnız dosya adını,
- dosya boyutunu,
- SHA-256 özetini,
- MIME türünü,
- piksel genişliği/yüksekliğini,
- içe aktarma zamanını

renderera gönderir.

Tam dosya yolu deney kaydına yazılmaz.

## Görüntü baytlarının sınırı

Fotoğrafın `data:` önizlemesi yalnız açık uygulama oturumunda kullanılır. `SavedPhotoCalibration` sözleşmesinde görüntü baytı alanı yoktur.

Bu nedenle:

- yerel deney deposu fotoğrafı base64 olarak büyütmez,
- `.ggl.json` dosyasına fotoğraf gömülmez,
- HTML rapora fotoğraf gömülmez.

Deney tekrar açıldığında fotoğraf metadata/işaretleri ve hesap sonucu korunur; görüntüyü yeniden görmek isteyen kullanıcı kaynak dosyayı tekrar seçer. SHA-256 ve piksel boyutu eşleşirse kayıtlı işaretler aynı fotoğraf üzerinde yeniden gösterilir.

## Etkileşimli işaretleme

Dört işaret zorunludur:

1. ufuk / referans çizgisi sol noktası,
2. ufuk / referans çizgisi sağ noktası,
3. hedef tabanı,
4. hedef tepesi.

Yeni fotoğraf yüklenince yalnız görsel başlangıç noktaları çizilir. Bunlar ölçüm olarak kabul edilmez. Kullanıcının dört noktanın her birini fotoğraf üzerinde en az bir kez yerleştirmesi gerekir; aksi halde kalibrasyon kaydı oluşturulamaz.

`object-fit: contain` önizlemede oluşabilecek yatay/düşey boşluklar piksel eşlemesinde hesaba katılır. Boş alana tıklamak görüntü işareti üretmez.

## Kamera editörü

İki yöntem desteklenir:

- yatay/düşey FOV,
- sensör genişliği/yüksekliği + odak uzaklığı.

Asal nokta X/Y isteğe bağlıdır; boş bırakılırsa 5.1 çekirdeği görüntü merkezini kullanır. İşaret belirsizliği düzenlenebilir. Lens distorsiyonunun önceden düzeltilip düzeltilmediği açık bir seçimdir.

Kamera değerleri için sahte bir varsayılan lens/FOV atanmaz. Kullanıcı gerekli parametreleri vermeden fiziksel açı kalibrasyonu kaydedilemez.

## Deney kaydı

Kalibrasyon kaydı:

- `photoCalibration` state’ini,
- `photo-calibration` `ModelPrediction` sonucunu,
- model sürümünü

deneyle birlikte saklar.

Kayıt yeniden açıldığında sayı/işaret/provenans ve hesap izi geri gelir. Fotoğrafın kendisi ayrıca seçilene kadar önizleme alanı kaynak metadata kartı gösterir.

## Taşınabilir kayıt ve rapor

Taşınabilir parser:

- fotoğraf SHA-256 biçimini,
- dosya ve görüntü boyutlarını,
- kamera fizik aralıklarını,
- asal noktayı,
- dört işaretin görüntü sınırlarını,
- işaret belirsizliğini,
- kayıt zamanını

doğrular. Bozuk/tahrif edilmiş fotoğraf kalibrasyon state’i tüm kayıtla birlikte reddedilir.

HTML rapor ayrı bir fotoğraf provenans bölümü içerir ve genel `photo-calibration` hesap izini de gösterir.

## Bilimsel sınırlar

- Kaynak çizginin fiziksel ufuk olup olmadığı kullanıcı/veri bağlamıyla belirlenir; UI bunu otomatik iddia etmez.
- Lens distorsiyonu otomatik düzeltilmez.
- Kamera iç parametre belirsizliği henüz ayrı olasılıksal model değildir.
- Fotoğraf açısal ölçümü henüz sayısal `observedVisiblePercent` alanını otomatik değiştirmez; iki gözlem kanalı bağımsız kalır.
- Fotoğrafın görünürlük sınıflandırmasına doğrudan model geri beslemesi sonraki değerlendirme aşamasına bırakılmıştır.

## Sonraki adım

Aşama 5.3:

- fotoğraf açısal ölçümünü model tahminlerindeki hedef taban/tepe açılarıyla ayrı bir değerlendirme metriği olarak karşılaştırmak,
- fotoğraf ve sayısal görünürlük gözlemlerini birbirine karıştırmadan aynı sonuç tablosunda göstermek,
- kamera/distorsiyon provenansı için gelişmiş kalite uyarıları eklemek.
