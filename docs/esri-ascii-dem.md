# ESRI ASCII Grid DEM çekirdeği

Uygulamanın ilk DEM çekirdeği, coğrafi WGS84 derece ızgarası olarak tanımlanmış
ESRI ASCII Grid (`.asc`) verilerini güvenli biçimde ayrıştırır ve koordinat bazında
yükseklik örnekler.

## Desteklenen başlıklar

- `ncols`, `nrows`
- `xllcorner` + `yllcorner` veya `xllcenter` + `yllcenter`
- `cellsize`
- isteğe bağlı `NODATA_value`

Veri satırları ESRI ASCII sözleşmesine uygun olarak kuzeyden güneye okunur.
Başlık sırası önemli değildir.

## Örnekleme

- `nearest`: en yakın hücre merkezi
- `bilinear`: çevredeki dört hücre arasında iki doğrusal enterpolasyon

Örnekleme kapsam dışındaysa veya gerekli hücrelerden biri `NODATA` ise sonuç
`null` olur. Bu davranış eksik arazi verisinin sessizce sıfır kotuna dönüşmesini
engeller.

## Güvenlik sınırları

- en fazla 10.000 sütun ve 10.000 satır
- en fazla 4.000.000 hücre
- pozitif ve en fazla 180° hücre boyutu
- bütün ızgara kapsamının WGS84 `-180…180° / -90…90°` sınırlarında kalması
- veri satırı ve sütun sayısının başlıkla tam eşleşmesi

## Rota profili oluşturma

DEM içe aktarma yalnız koordinat mesafe modunda kullanılabilir. Uygulama,
gözlemci ve hedef arasında WGS84 ters jeodezik çözümü kurar; rota üzerindeki ara
koordinatları Vincenty doğrudan çözümüyle üretir ve grid'i varsayılan olarak iki
doğrusal yöntemle örnekler.

Örnek sayısı grid hücre boyutuna göre otomatik belirlenir ve 3…2.002 aralığında
sınırlandırılır. Rota kapsam dışına çıkarsa veya bir örnek NODATA hücresine denk
gelirse profil bütünüyle reddedilir; eksik kısımlar sıfır yükseklikle doldurulmaz.

Dosya içeriği renderer sürecine gönderilmez. Ana süreç yalnız oluşturulan arazi
noktalarını, grid çözünürlüğünü, kapsamı, örnekleme yöntemini ve kaynak dosya
adını aktarır. Kaynak bilgileri deney kaydında ve HTML raporunda korunur.

Örnek dosya: `examples/dem-route-wgs84.asc`.
