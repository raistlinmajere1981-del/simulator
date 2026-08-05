# Düşey Datum ve Arazi Profili

## Amaç

Arazi yüksekliği, deniz seviyesi ve gözlemci/hedef kotlarını yüzey geometrisinden ayrı bir veri katmanı olarak tanımlamak.

Bu ayrım sayesinde aynı arazi profili:

- ideal küre üzerinde,
- tanımlı düzlem üzerinde,
- ileride eklenecek diğer fiziksel modellerde

aynı giriş verisi olarak kullanılabilir.

## Düşey datum

Her profil hangi düşey referansa göre yükseklik verdiğini açıkça belirtir:

- `orthometric-msl`: ortalama deniz seviyesi veya jeoit tabanlı ortometrik yükseklik,
- `ellipsoidal-wgs84`: WGS84 elipsoidine göre elipsoidal yükseklik,
- `local`: yerel ve kullanıcı tarafından tanımlanmış sıfır düzlemi.

`offsetM`, gelgit, yerel benchmark veya bilinen bir datum düzeltmesini profili değiştirmeden uygulamak için kullanılır.

Uygulama bu aşamada ortometrik ve elipsoidal yükseklik arasında otomatik jeoit dönüşümü yapmaz. Farklı datumlardan gelen veriler kullanıcı tarafından eşitlenmeden aynı profil içinde karıştırılmamalıdır.

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

## Düzlem çözümü

Düzlem modelinde görüş hattı, gözlemci göz kotu ile hedef tepe kotu arasında doğrusal enterpolasyondur.

## Küresel çözüm

Küresel modelde gözlemci ve hedef, küre merkezinden çıkan kendi yerel düşey doğrultularında konumlandırılır. İki uç arasındaki üç boyutlu doğru, her profil örneğinin yerel düşey ışınıyla kesiştirilir. Kesişim yarıçapından model yarıçapı çıkarılarak görüş hattı kotu bulunur.

Standart kırılma kullanılacaksa modele verilen etkin yarıçap, arazi açıklığı hesabına da aynı yaklaşık yöntemle yansıtılabilir.

## Mevcut sınırlar

Bu temel paket:

- profil sözleşmesini,
- doğrulamayı,
- düzlem ve küresel açıklık analizini,
- kritik engel tespitini

sağlar.

Henüz şunları içermez:

- kullanıcı arayüzünde profil editörü,
- CSV/GeoJSON içe aktarma,
- çevrimiçi DEM indirme,
- jeoit modeliyle datum dönüşümü,
- Fresnel bölgesi veya radyo yayılımı,
- katmanlı atmosfer ışın izleme.
