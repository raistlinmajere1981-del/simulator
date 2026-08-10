# Aşama 6.28 — Kullanıcı-denetimli panorama skyline yardımcı taslağı

Durum: tamamlanma adayı · `1.21.0`

## Amaç

Aşama 6.27'deki doğrulanmış manuel panorama → geometrik skyline akışını bozmadan, gerçek panoramalarda ilk skyline işaretlerini daha hızlı hazırlamak için **yerel, deterministik ve kullanıcı onaylı** bir görüntü yardımcısı eklemek.

Bu aşama otomatik bilimsel segmentasyon iddiası taşımaz. Görüntü yardımcısının çıktısı yalnız editör içi bir taslaktır; kullanıcı açıkça `Taslağı işaretlere aktar` demeden yerel ufuk kaynağına veya yıldız hesabına girmez.

## Güvenlik / bilimsel sözleşme

- Ham panorama görüntüsü yine yalnız editör oturumunda tutulur.
- Yardımcı analiz renderer içinde yerel Canvas pikselleri üzerinde çalışır; ağ veya dış AI servisi kullanmaz.
- Sonuç **öneri** olarak ayrı renkte gösterilir.
- Öneri kendiliğinden `marks` state'ini değiştirmez.
- Kullanıcı öneriyi kabul ettikten sonra noktaları tek tek silebilir veya elle yeni nokta ekleyebilir.
- Kaynağın provenansında işaretleme yöntemi ayrılır:
  - `manual`
  - `assisted-gradient-v1`
  - `assisted-gradient-v1-edited`
- Eski v11 panorama kayıtlarında `markingMethod` alanı yoksa güvenli biçimde `manual` kabul edilir.
- Bilinen Aşama 6.27 kayıt/reopen UI rehydrate sorunu bu aşamanın kapsamı değildir; #77 altında son yerel bakım turuna ertelenmiştir.

## Yardımcı algoritma

Algoritma kimliği:

- `gradient-dp-skyline-draft@1.0.0`

İşlem zinciri:

1. Panorama editör bitmap'i analiz için en fazla 720 px genişliğe oransal küçültülür.
2. 72 yatay sütun örneği alınır.
3. Her sütunda üst/alt küçük RGB pencere farkından düşey renk/luminance gradyanı hesaplanır.
4. Dinamik programlama, yüksek gradyan ile komşu sütunlar arasında yumuşak düşey geçişi birlikte optimize eder.
5. Döngüsel hafif yumuşatma 0°/360° birleşim davranışını stabilize eder.
6. Analiz piksel koordinatları gerçek panorama bitmap koordinatlarına geri ölçeklenir.

Çıktı ayrıca editör amaçlı bir `confidence` göstergesi üretir. Bu değer **bilimsel doğruluk olasılığı değildir**; yalnız seçilen kenarın görüntü gradyan gücü ve kolon içi göreli skoru hakkında kullanıcıya tanı verir.

## UI akışı

Panorama seçildikten sonra kullanıcı iki yoldan biriyle ilerleyebilir:

### Tam manuel

- Görüntü üzerinde skyline noktalarını tıklar.
- Mevcut Aşama 6.27 akışı aynen korunur.

### Yardımcı taslak

1. `Skyline taslağı öner` düğmesine basar.
2. Önerilen çizgi sarı/kesikli olarak görünür; mevcut aktif işaretler değişmez.
3. Kullanıcı özellikle ağaç, bina, bulut ve panorama seam çevresini kontrol eder.
4. `Taslağı işaretlere aktar` ile öneri aktif işaretlere dönüşür.
5. Aktarılan 72 nokta görüntü kalabalığını azaltmak için küçük marker olarak gösterilir.
6. Kullanıcı marker silebilir veya elle yeni nokta ekleyebilir; bu durumda `assisted-gradient-v1-edited` provenansı kaydedilir.
7. Mevcut 360° kapsam / en az 8 işaret / en fazla 90° azimut boşluğu kontrolleri yine zorunludur.
8. `Panorama skyline hazırla` yalnız kaynak taslağı üretir; yıldız hesabı yine `Uygula ve hesapla` ile başlar.

## Persist edilen yeni bilgi

`SavedStellarPanoramaSkylineDerivation` içine geriye uyumlu opsiyonel:

```ts
markingMethod?: 'manual' | 'assisted-gradient-v1' | 'assisted-gradient-v1-edited'
```

alanı eklenir.

Şema sürümü bu alan için yükseltilmez; mevcut v11 kayıt sözleşmesi opsiyonel genişlemeyi taşıyabilir. Parser:

- bilinen değerleri korur,
- alan yoksa `manual` üretir,
- bilinmeyen değerleri fail-closed reddeder.

Yardımcı taslağın güven yüzdesi persist edilmez; bu yalnız geçici editör tanısıdır.

## Test sözleşmesi

Otomatik testler:

- sentetik gökyüzü/arazi renk sınırında önerilen yolun gerçek sınıra ortalama birkaç piksel içinde yaklaşması
- yatay işaretlerin soldan sağa sıralı olması
- bozuk RGBA tamponunun reddi
- güvenlik dışı örnek sayısının reddi
- `assisted-gradient-v1` provenansının source + parser round-trip'i
- eski markingMethod'suz panorama kaydının `manual` olarak açılması
- bilinmeyen marking method'un fail-closed reddi

## Manuel Electron kabul kontrolü

`docs/examples/panorama-skyline-example.png` ile:

1. panorama seçilir;
2. `Skyline taslağı öner` çalıştırılır;
3. sarı/kesikli önerinin sentetik koyu arazi / mavi gökyüzü sınırını yaklaşık izlemesi beklenir;
4. öneri henüz kabul edilmeden `Nokta 0/8+` veya mevcut manuel işaretlerin değişmemesi gerekir;
5. `Taslağı işaretlere aktar` sonrası yaklaşık 72 küçük aktif marker ve yeşil aktif çizgi görünmelidir;
6. işaret kaynağı `Yardımcı gradyan taslağı · kullanıcı kabul etti` olmalıdır;
7. bir marker silinince kaynak `Yardımcı gradyan taslağı · elle düzenlendi` olmalıdır;
8. 360° kapsam ve maksimum boşluk koşulları sağlanıyorsa `Panorama skyline hazırla` etkinleşmelidir;
9. `Uygula ve hesapla` öncesinde yıldız hesabı değişmemelidir.

Gerçek saha panoramalarında önerinin yanlış tepe/ağaç/bulut kenarını seçebileceği özellikle beklenir; bu nedenle manuel onay kapısı ürün sözleşmesinin kalıcı parçasıdır.
