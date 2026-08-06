# Jeoit yüksekliği dönüşümü

Bu özellik WGS84 elipsoidal yükseklik (`h`) ile ortometrik yükseklik (`H`)
arasında kullanıcı veya doğrulanmış dış kaynak tarafından sağlanan jeoit ondülasyonu
(`N`) ile dönüşüm yapar.

## İşaret sözleşmesi

Uygulama tek ve açık sözleşme kullanır:

```text
N = h - H
H = h - N
h = H + N
```

Pozitif `N`, jeoit yüzeyinin referans elipsoidine göre pozitif yönde olduğunu
ifade eder. Negatif değerler aynı formüllerle işlenir; işaret ters çevrilmez veya
otomatik tahmin edilmez.

## Belirsizlik

Yükseklik ve jeoit ondülasyonu belirsizlikleri verilirse bağımsız kabul edilerek
kök-toplam-kare yöntemiyle birleştirilir:

```text
u_out = √(u_height² + u_N²)
```

Belirsizlik verilmezse motor sayısal bir belirsizlik uydurmaz. Ondülasyon
belirsizliği eksikse sonuçta açık uyarı bulunur.

## Hesap izi

Her tekil dönüşüm şunları içeren bir hesap izi üretir:

- kullanılan `N = h - H` işaret sözleşmesi,
- kaynak ve hedef datum,
- uygulanan düzeltme,
- sayısal yerine koyma,
- dönüştürülmüş yükseklik,
- varsa belirsizlik birleşimi,
- varsayımlar ve uyarılar.

## Kontrollü profil dönüşümü

Arazi panelindeki kontrol aynı `N` değerini atomik olarak şu kotların tamamına
uygular:

- gözlemci zemin kotu,
- hedef taban kotu,
- bütün manuel veya içe aktarılmış arazi ara noktaları.

Dönüşüm yalnız `WGS84 elipsoidal` ve `ortometrik / deniz seviyesi` datumları
arasında kullanılabilir. Yerel datum açık bir jeodezik bağ olmadan dönüştürülmez.
Önizleme, işlem uygulanmadan önce iki uç kotunu, ortak düzeltmeyi, dönüştürülen
nokta sayısını ve varsa ondülasyon belirsizliğini gösterir.

Nokta kimlikleri, rota yüzdeleri ve sırası korunur. İçe aktarılmış bir profil
varsa dönüşüm kaynakla eşleşme durumunu `içe aktarımdan sonra düzenlendi` olarak
işaretler. Mevcut datum / gelgit ofseti jeoit dönüşümüne katılmaz; ayrı bir deney
düzeltmesi olarak korunur.

Kullanıcı dönüşümden önce bir kaynak veya model etiketi girmek zorundadır. Bu
`1.0.6` aşamasında etiket işlem bildirimi ve bilinçli onay için kullanılır; kalıcı
model adı, sürüm, epok, `N`, belirsizlik ve uygulama zamanı provenansı bir sonraki
sürümlü kayıt şeması aşamasında eklenecektir.

## Bilinçli sınırlar

- Motor otomatik jeoit modeli indirmez veya sorgulamaz.
- Girilen `N` değerinin deney koordinatına veya bütün rota boyunca uygunluğunu
  doğrulamaz.
- Jeoit modeli adı, sürümü ve epoku otomatik tahmin edilmez.
- Yerel düşey datumlar, açık bir dönüşüm ofseti veya jeodezik bağ olmadan otomatik
  dönüştürülmez.
- Aynı datum seçilirse profil dönüşümü başlatılmaz.
- Jeoit dönüşümü mevcut datum / gelgit ofsetini değiştirmez.

Bu ayrım, doğrulanmamış bir jeoit değerinin sessizce bilimsel gerçek gibi
kullanılmasını önler.
