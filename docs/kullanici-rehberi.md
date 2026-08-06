# Geometrik Gözlem Laboratuvarı — Kısa Kullanıcı Rehberi

Bu belge, uygulamadaki teknik görünen alanların ne işe yaradığını günlük dille açıklar.

## Deneyin temel alanları

### Göz yüksekliği

Gözlemcinin gözünün bulunduğu zemin seviyesinden yüksekliğidir.

Örnek: Gözlemci sahilde duruyor ve göz seviyesi yerden `1,7 m` yüksekteyse bu alana `1,7` girilir.

### Hedef yüksekliği

Görülmeye çalışılan nesnenin tabanından tepesine kadar olan yüksekliğidir.

Örnek: Deniz feneri `30 m` yüksekliğindeyse hedef yüksekliği `30 m` olur.

### Gözlenen görünürlük

Gerçek gözlemde hedefin yüzde kaçının görüldüğüdür.

Örnek: Hedefin yaklaşık yarısı görünüyorsa `%50` girilir.

### Gözlem belirsizliği

Görünürlük tahmininizdeki olası hata payıdır.

Örnek: Görünürlüğün `%50` olduğunu düşünüyor fakat `%5` yanılma olabileceğini kabul ediyorsanız belirsizlik `±%5` olur.

## Mesafe

### Manuel mesafe

Gözlemci ile hedef arasındaki yüzey mesafesini doğrudan kilometre olarak girersiniz.

### Koordinat mesafesi

Gözlemci ve hedefin enlem-boylam bilgileri girilir. Uygulama WGS84 Dünya elipsoidi üzerinde yüzey mesafesini hesaplar.

### Azimut

Bir noktadan diğerine bakış yönüdür. Pusuladaki derece değerine benzer.

- `0°`: kuzey
- `90°`: doğu
- `180°`: güney
- `270°`: batı

## Atmosferik kırılma

Hava tabakaları ışığın yolunu çok az bükebilir. Standart atmosferik kırılma seçeneği bu etkiyi yaklaşık olarak hesaba katar.

Bu seçenek gerçek hava koşullarını ayrıntılı olarak ölçmez. Şimdilik standart bir yaklaşım kullanır.

## Düşey referans ve arazi

### Düşey datum

Bütün yüksekliklerin hangi sıfır seviyesine göre ölçüldüğünü belirtir.

- **Ortalama deniz seviyesi:** Günlük kullanımda en anlaşılır yükseklik referansı.
- **WGS84 elipsoidal yükseklik:** GPS sistemlerinde kullanılan geometrik referans.
- **Yerel referans:** Kullanıcının kendi belirlediği sıfır seviyesi.

Farklı referanslardan alınan yükseklikler doğrudan karıştırılmamalıdır.

### Gözlemci zemin yüksekliği

Gözlemcinin durduğu zeminin seçilen referansa göre yüksekliğidir.

### Hedef taban yüksekliği

Hedef nesnenin başladığı zeminin seçilen referansa göre yüksekliğidir.

### Datum veya gelgit ofseti

Bütün yüksekliklere aynı miktarda eklenen ya da çıkarılan düzeltmedir. Özel bir düzeltme gerekmiyorsa `0 m` bırakılır.

## Arazi profili

Arazi profili, gözlemci ile hedef arasındaki zeminin yandan görünümüdür.

Her ara nokta iki bilgi taşır:

1. **Rotadaki yeri:** Başlangıç ile bitiş arasındaki yüzde konumu.
2. **Arazi yüksekliği:** O noktadaki zemin yüksekliği.

Örnek:

```text
%25 → 12 m
```

Bu, toplam yolun dörtte birindeki zeminin `12 m` yüksekliğinde olduğu anlamına gelir.

### Kırmızı kesikli çizgi

Grafikteki kırmızı kesikli çizgi, görüş hattını en fazla zorlayan kritik arazi noktasının konumunu gösterir.

### Arazi açıklığı

Görüş hattı ile arazi arasındaki dikey farktır.

- Pozitif değer: Görüş hattı arazinin üstünden geçiyor.
- `0 m`: Görüş hattı araziye değiyor.
- Negatif değer: Arazi görüş hattını kesiyor.

## CSV dosyasından arazi alma

CSV dosyası, satır ve sütunlardan oluşan basit bir veri dosyasıdır.

Uygulamanın iki bilgiye ihtiyacı vardır:

- Rota üzerinde ne kadar ilerlenildiğini gösteren sütun
- O konumdaki arazi yüksekliğini gösteren sütun

### CSV sütunlarını seç

Program sütun adlarını kendisi anlayamazsa seçim ekranı açılır.

Örnek dosya:

```text
chainage,terrain_height,station
0,4,OBS
1000,8,A
2500,22,B
```

Bu örnekte:

- `chainage`: rotadaki yeri gösterir
- `terrain_height`: arazi yüksekliğini gösterir
- `station`: açıklama sütunudur ve hesapta kullanılmaz

### Konum birimi

Seçilen rota sütunundaki sayıların neyi ifade ettiğini belirtir:

- metre
- kilometre
- rotanın yüzdesi

### Başlangıç ve bitiş yüksekliği seçenekleri

Bu kutular işaretlenmezse CSV yalnız ara noktaları değiştirir.

- **Başlangıç zemin yüksekliğini dosyadan al:** Gözlemci zemin yüksekliğini CSV'nin ilk satırından değiştirir.
- **Bitiş zemin yüksekliğini dosyadan al:** Hedef taban yüksekliğini CSV'nin son satırından değiştirir.

## Veri kaynağı durumu

### Kaynakla eşleşiyor

CSV'den alınan noktalar ve uygulanan uç yükseklikleri daha sonra elle değiştirilmemiştir.

### İçe aktarımdan sonra düzenlendi

CSV bilgisi korunur fakat noktalardan veya uç yüksekliklerinden en az biri sonradan elle değiştirilmiştir.

Bu bir hata değildir. Yalnızca mevcut profilin artık CSV dosyasının ilk hâliyle tamamen aynı olmadığını bildirir.

## Model sonuçları

### Beklenen görünürlük

Modelin, girilen geometri ve araziye göre hedefin yüzde kaçının görünmesi gerektiğine dair hesabıdır.

### Gizlenen kısım

Modelin görünmemesi gerektiğini hesapladığı hedef bölümüdür.

### Ufuk mesafesi

Gözlemcinin yüksekliğine göre geometrik ufkun yüzey üzerindeki uzaklığıdır.

Düzlem modelinde yüzey eğriliği olmadığı için geometrik ufuk sonsuz kabul edilir. Yerel arazi yine de görüşü engelleyebilir.

### Gözlem farkı

Modelin tahmini ile kullanıcının girdiği gerçek gözlem arasındaki yüzde puan farkıdır.

Küçük fark yalnız o deneyde daha yakın sonuç demektir. Tek bir deney, herhangi bir modelin genel olarak doğru olduğunu kanıtlamaz.

## Modeller

### İdeal Küre

Dünya yüzeyini ortalama yarıçaplı kusursuz bir küre kabul eder.

### Tanımlı Düzlem

Yüzeyi sonsuz ve düz kabul eder; ışığın doğrusal ilerlediğini varsayar.

### Azimutal Gösterim

Bir harita projeksiyonudur. Konumları düz haritada gösterebilir fakat tek başına fiziksel görüş, ufuk veya ışık yolu hesabı yapamaz.

## Hesap izi

Hesap izinde kullanılan formül, sayılar ve ara sonuçlar gösterilir. Bu bölüm, sonucun nasıl üretildiğini denetlemek içindir. Günlük kullanımda yalnız sonuç kartlarına bakmak yeterlidir.

## Rapor ve JSON dosyası

### HTML raporu

İnsan tarafından okunmak ve yazdırılmak için hazırlanır. Deney girdilerini, sonuçları, varsayımları ve veri kaynağını gösterir.

### `.ggl.json` dosyası

Deneyi başka bir bilgisayara taşımak veya daha sonra yeniden açmak için kullanılır. Teknik veri dosyasıdır; elle düzenlenmesi önerilmez.
