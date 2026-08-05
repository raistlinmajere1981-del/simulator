# Düşey Datum ve Arazi Profili

## Amaç

Arazi yüksekliği, deniz seviyesi ve gözlemci/hedef kotlarını yüzey geometrisinden ayrı bir veri katmanı olarak tanımlamak.

Bu ayrım sayesinde aynı arazi profili:

- ideal küre üzerinde,
- tanımlı düzlem üzerinde,
- ileride eklenecek diğer fiziksel modellerde

aynı giriş verisi olarak kullanılabilir. Model, profil örneklerini kendi yüzey geometrisi ve yerel düşey tanımıyla çözer.

## Düşey datum

Her deney hangi düşey referansa göre yükseklik verdiğini açıkça belirtir:

- `orthometric-msl`: ortalama deniz seviyesi veya jeoit tabanlı ortometrik yükseklik,
- `ellipsoidal-wgs84`: WGS84 elipsoidine göre elipsoidal yükseklik,
- `local`: yerel ve kullanıcı tarafından tanımlanmış sıfır düzlemi.

`offsetM`, gelgit, yerel benchmark veya bilinen bir datum düzeltmesini bütün uç ve profil kotlarına aynı yönde uygulamak için kullanılır.

```text
uygulanan kot = girilen kot + datum ofseti
```

Uygulama bu aşamada ortometrik ve elipsoidal yükseklik arasında otomatik jeoit dönüşümü yapmaz. Farklı datumlardan gelen veriler kullanıcı tarafından eşitlenmeden aynı deney içinde karıştırılmamalıdır.

## Uç kotları

Gözlemci ve hedef yüksekliği artık zemin kotundan ayrıdır:

```text
gözlemci göz kotu = gözlemci zemin kotu + datum ofseti + göz yüksekliği
hedef taban kotu = hedef zemin kotu + datum ofseti
hedef tepe kotu = hedef taban kotu + hedef yüksekliği
```

Bu ayrım kıyı, dağ, bina ve farklı seviyelerde bulunan iki nokta arasındaki deneyler için gereklidir.

## Profil sözleşmesi

Bir arazi profili şunları taşır:

```text
kimlik
ad
kaynak: manuel | içe aktarılan | DEM
düşey datum ve ofset
toplam yüzey mesafesi
artan sırada mesafe-yükseklik örnekleri
```

İlk örnek `0 m`, son örnek deneyin toplam yüzey mesafesinde olmalıdır. Örnek mesafeleri tekrarsız ve kesin artan sırada tutulur.

## İlk manuel profil arayüzü

`0.5.0` sürümündeki manuel profil üç örnekten oluşur:

1. gözlemci zemin kotu,
2. kullanıcı tarafından yüzde konumuyla belirlenen tek arazi noktası,
3. hedef taban kotu.

Ara noktanın mesafesi:

```text
ara mesafe = toplam yüzey mesafesi × ara konum yüzdesi / 100
```

Bu düzenleyici, arazi motorunu ve veri akışını doğrulamak için bilinçli olarak sınırlıdır. Gerçek topografyayı tek ara noktayla temsil ettiği iddia edilmez.

## Görüş hattı açıklığı

Her profil örneğinde:

```text
clearance = görüş hattı kotu - arazi kotu
```

hesaplanır.

- `clearance > 0`: ışın arazi örneğinin üstünden geçer,
- `clearance = 0`: ışın araziye teğettir,
- `clearance < 0`: arazi görüş hattını keser.

Sonuç; kritik örneği, minimum açıklığı, engellenme durumunu ve tüm örneklerin hesaplanan değerlerini taşır.

## Görünen hedef yüksekliği

Motor yalnız hedef tepesinin engellenip engellenmediğini bildirmekle kalmaz. Araziyi temizleyen en düşük hedef kotunu sayısal olarak çözer:

```text
h_gerekli = min { h | profil boyunca minimum açıklık(h) > 0 }
```

Çözüm önce güvenli bir üst sınır bulur, ardından ikili aramayla minimum kotu yakınsar. Görünür hedef yüksekliği:

```text
gizlenen yükseklik = clamp(h_gerekli - hedef taban kotu, 0, hedef yüksekliği)
görünür yükseklik = hedef yüksekliği - gizlenen yükseklik
```

olarak hesaplanır.

## Düzlem çözümü

Düzlem modelinde görüş hattı, gözlemci göz kotu ile seçilen hedef kotu arasında doğrusal enterpolasyondur. Geometrik ufuk sonsuz kalır; fakat yerel arazi hedefin bir kısmını veya tamamını gizleyebilir.

## Küresel çözüm

Küresel modelde gözlemci ve hedef, küre merkezinden çıkan kendi yerel düşey doğrultularında konumlandırılır. İki uç arasındaki üç boyutlu doğru, her profil örneğinin yerel düşey ışınıyla kesiştirilir. Kesişim yarıçapından model yarıçapı çıkarılarak görüş hattı kotu bulunur.

Küresel görünürlük için eğrilikten gelen minimum hedef kotu ile araziden gelen minimum hedef kotunun büyüğü kullanılır.

Standart kırılma etkinse arazi çözümüne de etkin yarıçap verilir. Bu, katmanlı atmosfer ışın izlemesi değil; mevcut standart kırılma yaklaşımının tutarlı biçimde arazi hesabına uygulanmasıdır.

## İzlenebilirlik

Model sonuçları ve hesap izleri şunları içerir:

- kullanılan düşey datum ve ofset,
- gözlemci göz kotu,
- hedef taban ve tepe kotu,
- profil örnek sayısı,
- kritik arazi mesafesi,
- mevcut hedef tepesi için minimum açıklık,
- araziyi temizleyen minimum hedef kotu,
- arazi ve eğrilik sonrasında görünür hedef oranı.

Aynı bilgiler kayıt, `.ggl.json` dışa aktarma ve HTML raporunda korunur.

## Mevcut sınırlar

Mevcut sürüm şunları içermez:

- birden fazla ara noktayı elle ekleme,
- CSV veya GeoJSON profil içe aktarma,
- çevrimiçi DEM indirme,
- jeoit modeliyle datum dönüşümü,
- su yüzeyi, dalga ve gelgit zaman modeli,
- Fresnel bölgesi veya radyo yayılımı,
- katmanlı atmosfer ışın izleme.
