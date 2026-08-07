# Aşama 5.1 — Fotoğraf ve kamera kalibrasyonu çekirdeği

Durum: tamamlandı · `1.3.3`

## Amaç

Fotoğraf yükleme ve etkileşimli işaretleme arayüzünden önce, görüntü piksel koordinatlarını izlenebilir kamera açılarına dönüştüren bağımsız fiziksel çekirdeği kurmak.

## Kamera kalibrasyonu

İki açık kaynak biçimi desteklenir:

- sensör genişliği/yüksekliği + gerçek odak uzaklığı,
- doğrudan yatay ve düşey görüş açısı (FOV).

Her iki yol da pinhole kamera modelinde `fx`, `fy`, asal nokta ve görüş açılarına çözülür. Asal nokta verilmezse görüntü merkezine yerleştirilir.

Bu aşama EXIF içinden kamera parametresi okumaz; UI ve dosya provenansı sonraki aşamada bağlanacaktır.

## Piksel → açı dönüşümü

Bir piksel noktası normalize kamera ışınına dönüştürülür. Düşey açı, noktanın yatay kamera koordinatını da hesaba katar:

`elev = atan2(-(y-cy)/fy, sqrt(1 + ((x-cx)/fx)^2))`

Bu nedenle görüntü kenarındaki bir nokta yalnız `y` farkıyla doğrusal derece/piksel ölçeğine indirgenmez.

## Ufuk / referans çizgisi

Ufuk tek bir y koordinatı değildir. Kullanıcı iki nokta işaretler ve sistem:

- görüntü roll açısını,
- hedefin x konumundaki yerel referans y değerini

hesaplar.

Bu çizginin fiziksel, astronomik veya deniz ufku olduğu otomatik varsayılmaz. Çekirdek onu yalnız görüntüdeki yerel sıfır-eğim açı referansı olarak yorumlar.

## Hedef işaretleri

Hedef tabanı ve hedef tepesi ayrı piksel noktalarıdır. Çıktılar:

- hedef tabanının referansa göre düşey açısı,
- hedef tepesinin referansa göre düşey açısı,
- hedefin açısal yüksekliği,
- referans çizgisinin roll açısıdır.

## Belirsizlik

Her işaret için piksel belirsizliği tanımlanabilir; aksi halde deneydeki varsayılan piksel belirsizliği kullanılır.

Dört işaretin x/y uçları toplam sekiz ikili pertürbasyon değişkeni oluşturur. Çekirdek `2^8 = 256` köşe durumunu tarar ve merkez sonuca göre en büyük sapmayı koruyucu açı belirsizliği olarak saklar.

Bu aşamada kamera iç parametrelerinin kendi kalibrasyon belirsizliği ayrıca modellenmez.

## Lens distorsiyonu

Lens distorsiyonu otomatik olarak düzeltilmez. Kullanıcı/veri kaynağı görüntünün önceden düzeltilmediğini belirtiyorsa kayıt açık bir sistematik hata uyarısı taşır. Özellikle geniş açılı lenslerde görüntü kenarındaki açıların bu nedenle güvenilmezleşebileceği saklanmaz.

## Provenans ve hesap izi

Kalibrasyon sonucu `photo-calibration` model kimliğiyle `ModelPrediction` üretir. Kayıtta:

- görüntü kaynak etiketi,
- açık saat dilimli kayıt zamanı,
- kamera kalibrasyon kaynağı,
- FOV ve piksel odak ölçekleri,
- roll / taban / tepe / açısal yükseklik,
- belirsizlikler,
- varsayımlar ve formül izi

korunur.

## Bilimsel sınırlar

- Pinhole kamera modeli kullanılır.
- Distorsiyon düzeltilmediyse sonuçta açık uyarı bulunur.
- İşaretlenen referans çizgisi otomatik olarak fiziksel ufuk sayılmaz.
- Fotoğrafın EXIF yöneliminin görüntü piksel koordinatlarına uygulanmış olduğu varsayılır.
- Kamera parametre belirsizliği ve lens distorsiyon modeli 5.1 kapsamı dışındadır.
- Fotoğraf henüz deney kaydına veya UI işaretleme aracına bağlanmamıştır.

## Sonraki adım

Aşama 5.2:

- yerel fotoğraf yükleme,
- görüntü boyutu ve kaynak provenansı,
- ufuk başlangıç/son, hedef taban/tepe için etkileşimli işaretleme,
- kamera parametre editörü,
- 5.1 kalibrasyon çıktısının deney kaydı / `.ggl.json` / rapor akışına bağlanması.
