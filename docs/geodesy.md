# WGS84 Jeodezik Hesaplama

## Amaç

Koordinat modu, gözlemci ve hedef noktası arasındaki yüzey mesafesini elle girilen bir sayı yerine tanımlı bir referans elipsoidi üzerinde hesaplar. Aynı sonuç bütün fiziksel modellere ortak deney mesafesi olarak gönderilir.

Bu katman Dünya şekli modellerinden ayrı tutulur. WGS84 jeodezik çözüm, deney konumlarının ve aralarındaki mesafenin tanımlanması için kullanılan ölçüm katmanıdır; hedef görünürlüğü sonucunu tek başına üretmez.

## Referans elipsoidi

Kullanılan WGS84 parametreleri:

```text
a = 6 378 137 m
f = 1 / 298.257223563
b = a · (1 − f)
```

Burada:

- `a`: büyük yarı eksen,
- `f`: basıklık,
- `b`: küçük yarı eksendir.

Koordinatlar jeodezik enlem ve boylam olarak derece cinsinden alınır.

## Ters jeodezik problem

Girdi:

- başlangıç enlemi ve boylamı,
- hedef enlemi ve boylamı.

Çıktı:

- elipsoid üzerindeki en kısa yüzey mesafesi,
- başlangıç noktasından hedefe ilk azimut,
- hedef noktasına varış azimutu,
- kullanılan yöntem,
- yakınsama durumu ve iterasyon sayısı.

İlk sürüm ters problemi Vincenty iterasyonuyla çözer. İndirgenmiş enlemler hesaplanır ve yardımcı boylam farkı `λ`, belirlenen tolerans sağlanıncaya kadar yinelenir.

Varsayılan sınırlar:

```text
maksimum iterasyon = 200
tolerans = 1e-12 radyan
```

## Azimutların anlamı

Azimutlar gerçek kuzeyden saat yönünde `0…360°` aralığında gösterilir.

- Başlangıç azimutu: gözlemci noktasından hareket edilirken ilk yön.
- Varış azimutu: jeodezik hedef noktasına ulaşırken hareket yönü.

Bunlar düz bir haritadaki sabit rota açısı değildir. Elipsoid üzerindeki jeodezik boyunca yön değişebilir.

Noktalar çakışıyorsa mesafe sıfırdır; azimut fiziksel olarak tanımsızdır. Uygulama sayısal alan uyumluluğu için `0°` gösterir ve bunu uyarıyla açıklar.

## Yakın-antipodal durum ve yedek çözüm

Klasik Vincenty ters çözümü birbirine yaklaşık karşıt bazı noktalarda yakınsamayabilir. Uygulama bu durumda:

1. sonucu elipsoidal Vincenty sonucu gibi sunmaz,
2. yöntemi `spherical-fallback` olarak işaretler,
3. ortalama Dünya yarıçapıyla küresel büyük çember sonucu üretir,
4. uyarıyı arayüz, kayıt, JSON ve HTML raporunda korur.

Yedek çözümde kullanılan ortalama yarıçap:

```text
R̄ = 6 371 008.8 m
```

Bu sonuç süreklilik sağlar fakat WGS84 elipsoidal çözümle aynı hassasiyet iddiasını taşımaz. Daha sonraki sürümde yakın-antipodal durumlar için her noktada yakınsayan gelişmiş bir jeodezik algoritma eklenebilir.

## Yükseklik ve arazi

Bu aşamadaki jeodezik mesafe referans elipsoidi yüzeyindedir. Şunlar hesaba katılmaz:

- arazi üzerindeki gerçek yürüyüş mesafesi,
- gözlemci ve hedef zemin kotu,
- dağ, bina veya arazi engelleri,
- jeoit ile elipsoid arasındaki yükseklik farkı,
- deniz seviyesi ve gelgit.

Gözlemci göz yüksekliği ile hedef yüksekliği, görünürlük motorunda ayrıca kullanılır; jeodezik yüzey mesafesine eklenmez.

## İzlenebilirlik

Her koordinat çözümü şu bilgileri içeren hesap izi üretir:

- WGS84 parametreleri,
- indirgenmiş enlemler,
- iterasyon toleransı ve adım sayısı,
- elipsoidal mesafe formülü ve yerine koyma,
- iki azimut,
- yedek çözüm kullanıldıysa bunun nedeni.

Deney kaydedildiğinde bu hesap izi anlık görüntü olarak korunur. Böylece gelecekte algoritma değişse bile eski raporun hangi yöntem ve sayılarla üretildiği denetlenebilir.
