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

Gözlemci ve hedef yüksekliği zemin kotundan ayrıdır:

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

## Çok noktalı manuel profil

`0.6.0` sürümünde manuel profil şu bileşenlerden oluşur:

1. gözlemci zemin kotundan otomatik türetilen başlangıç ucu,
2. kullanıcı tarafından eklenen sıralı ara noktalar,
3. hedef taban kotundan otomatik türetilen bitiş ucu.

Her ara nokta şunları saklar:

```text
id
rota üzerindeki yüzde konumu
düşey datuma göre kot
```

Ara noktanın gerçek mesafesi:

```text
ara mesafe = toplam yüzey mesafesi × ara konum yüzdesi / 100
```

olarak hesaplanır. Bu nedenle manuel ve koordinat mesafesi arasında geçiş yapıldığında profil noktaları rota üzerindeki göreli konumlarını korur.

### Nokta kuralları

- Konum açık aralıkta `0 < yüzde < 100` olmalıdır.
- Nokta kimlikleri boş veya tekrarlı olamaz.
- Yüzde konumları tekrarsız olmalıdır.
- Kot ve yüzde değerleri sonlu sayılar olmalıdır.
- Noktalar hesaplama öncesinde artan yüzde sırasına dizilir.
- Manuel profil en fazla 2.000 ara nokta kabul eder.

## Düzenleyici davranışı

Arayüz:

- en büyük boşluğun ortasına yeni bir nokta ekler,
- yeni noktanın başlangıç kotunu komşu noktalar arasında doğrusal enterpolasyonla üretir,
- yüzde konumu ve kotu düzenlemeye izin verir,
- noktayı silmeye izin verir,
- düzenlemeden sonra noktaları yeniden sıralar,
- geçersiz veya tekrarlı konumları açık hata olarak gösterir,
- profilin SVG önizlemesini çizer,
- ideal küre sonucundaki kritik arazi mesafesini kesikli işaretle gösterir.

Nokta ekleme, düzenleme veya silme işlemi deney durumunu değiştirir ve küre ile düzlem hesaplarını canlı olarak yeniden çalıştırır.

## Grafik üzerinde düzenleme

Manuel ara noktalar profil grafiğindeki işaretlerinden sürüklenebilir. Yatay hareket
rota yüzdesini, düşey hareket zemin yüksekliğini değiştirir. Noktalar komşularını
geçemez; başlangıç ve bitiş uçları sürüklenemez. Her hareket aynı manuel profil
doğrulamasından geçer ve içe aktarılmış bir kaynağı değiştirilmiş olarak işaretler.

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

## Kayıt ve geriye dönük taşıma

Çok noktalı profil `SavedExperiment.manualTerrainPoints` alanında saklanır. Nokta dizisi kayıt, `.ggl.json` ve HTML raporu boyunca korunur.

Şema v3 kayıtlarında yalnız tek ara nokta bulunur. Şema v4'e taşınırken bu değer:

```text
id = legacy-intermediate-1
distancePercent = eski ara nokta yüzdesi
elevationM = eski ara nokta kotu
```

şeklinde tek elemanlı diziye dönüştürülür. Böylece önceki deney davranışı korunur.

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

HTML raporu bütün ara noktaları sıra numarası, yüzde konumu, gerçek rota mesafesi ve ham kotuyla gösterir.

## Mevcut sınırlar

Mevcut sürüm şunları içermez:

- çevrimiçi DEM indirme,
- jeoit modeliyle datum dönüşümü,
- su yüzeyi, dalga ve gelgit zaman modeli,
- Fresnel bölgesi veya radyo yayılımı,
- katmanlı atmosfer ışın izleme.
