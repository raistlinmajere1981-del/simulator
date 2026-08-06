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

Örnek sayısı varsayılan olarak grid hücre boyutuna göre otomatik belirlenir ve
3…2.002 aralığında sınırlandırılır. Kullanıcı gerektiğinde bu aralıkta kesin bir
örnek sayısı seçebilir. Örnekleme yöntemi iki doğrusal veya en yakın hücre olarak
belirlenebilir; yöntem ve örnek sayısının otomatik/manüel oluşu kaynak kaydında
korunur. Rota kapsam dışına çıkarsa veya bir örnek NODATA hücresine denk gelirse
profil bütünüyle reddedilir; eksik kısımlar sıfır yükseklikle doldurulmaz.

Dosya içeriği renderer sürecine gönderilmez. Ana süreç yalnız oluşturulan arazi
noktalarını, grid çözünürlüğünü, kapsamı, örnekleme yöntemini ve kaynak dosya
adını aktarır. Kaynak bilgileri deney kaydında ve HTML raporunda korunur.

## Veri kaynağı ve çözünürlük izi

İçe aktarma incelemesinde mevcut provenans alanları tek bir kaynak izi olarak
özetlenir:

- dosya boyutu ve SHA-256 bütünlük özeti,
- doğal grid hücre boyutu,
- rota orta enleminde metre cinsinden etkili hücre açıklığı,
- rota örnek aralığının hücre açıklığına oranı,
- coğrafi kapsam ve toplam grid hücre sayısı,
- yatay ve düşey referans bilgisinin dayanağı.

ESRI ASCII başlığı tek başına CRS veya düşey datum kanıtı taşımaz. Uygulama bu
sürümde yatay koordinatları WGS 84 coğrafi derece içe aktarma sözleşmesine göre
yorumlar; bu bilgi bir `.prj` yan dosyasından doğrulanmış sayılmaz. Düşey datum
kaynak dosyadan bilinmiyor olarak açıkça gösterilir ve deneyde seçilen düşey
referansla kullanıcı tarafından eşleştirilir.

Kaynak izi `tam`, `kısmi` veya `eski` olarak sınıflandırılır. Tam sınıfı dosya
bütünlüğü ile doğal/etkili çözünürlük bilgilerinin birlikte kayıtlı olduğunu
belirtir; DEM'in bilimsel doğruluğunu veya gerçek düşey datumunu kanıtlamaz.

## Görüş hattı önizlemesi

DEM dosyası arazi profiline uygulanmadan önce bütün iç rota örnekleri mevcut
küresel görüş hattına karşı sınanır. Önizleme şu deney girdilerini canlı kullanır:

- gözlemci ve hedef yüksekliği,
- mevcut veya dosyadan seçilmiş başlangıç ve bitiş zemin kotları,
- düşey datum / gelgit ofseti,
- standart kırılma seçimi ve kırılma katsayısı.

Kart; minimum açıklığı, kritik rota konumunu, kritik arazi ve görüş hattı kotlarını,
görüş hattını kesen örnek sayısını ve 5 m içinde kalan yakın açıklık örneklerini
gösterir. Standart kırılma seçiliyse aynı etkin yarıçap yaklaşımı kullanılır.

Bu sonuç içe aktarma kararına yardımcı olan canlı bir önizlemedir; deney kaydına
sabit bir sonuç olarak yazılmaz. Profil uygulandıktan sonra model sonuçları güncel
girdilerle görüş hattı açıklığını yeniden hesaplar. Önizleme DEM'in düşey datumunu
veya mutlak doğruluğunu doğrulamaz.

## Örnekleme tanısı

Her DEM profili için aşağıdaki ölçümler üretilir:

- rota örnek aralığının etkili grid hücre genişliğine oranı,
- rotanın grid sınırına en yakın mesafesi ve bunun hücre cinsinden karşılığı,
- rota üzerindeki en düşük, en yüksek ve toplam yükseklik aralığı,
- `iyi`, `dikkat` veya `sınırlı` örnekleme tanısı.

Tanı, DEM kaynağının mutlak doğruluğunu veya düşey datumunun doğruluğunu kanıtlamaz.
Yalnız örnek yoğunluğu, grid kenar payı ve kullanılan enterpolasyon yöntemine dayalı
koruyucu bir kalite göstergesidir. Ölçümler kayıt ve HTML raporunda korunur.

Örnek dosya: `examples/dem-route-wgs84.asc`.
