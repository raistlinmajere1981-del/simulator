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

## Kalıcı provenans

Kullanıcı dönüşümden önce kaynak/model etiketi girmek zorundadır. Model sürümü
veya çözünürlüğü, model epoku ve ondülasyon belirsizliği isteğe bağlıdır; eksik
alanlar sessizce tahmin edilmez ve kayıt uyarılarına yazılır.

Uygulama `1.0.7` ile her dönüşümü ayrı, sürümlü bir `ModelPrediction` hesap kaydı
olarak saklar. Kayıt şu bilgileri içerir:

- kaynak/model etiketi,
- isteğe bağlı model sürümü veya çözünürlüğü,
- isteğe bağlı model epoku,
- uygulama zamanı,
- kaynak ve hedef datum,
- `N` değeri ve varsa belirsizliği,
- bütün kotlara uygulanan ortak düzeltme,
- dönüştürülen uç ve arazi kotu sayısı,
- formüller, sayısal yerine koymalar, varsayımlar, uyarılar ve iz kimliği.

Bu kayıt mevcut taşınabilir deney şemasının model tahmini sözleşmesini kullandığı
için yeni şema sürümü gerekmez. Yerel kayıt, `.ggl.json` dışa/içe aktarma ve HTML
raporu aynı alanları mevcut doğrulama ve klonlama kurallarıyla korur. Eski şema-7
deneylerinde bu hesap kaydı bulunmaz; dosyalar değiştirilmeden açılmaya devam eder.

Dönüşümden sonra datum veya arazi kotları elle değiştirilirse provenans silinmez;
tarihsel işlemi korumak için durum `belirsiz` yapılır ve sonradan değişiklik uyarısı
eklenir. Yeni bir dış arazi profili uygulandığında önceki jeoit dönüşüm kaydı yeni
profil için geçerli olmayacağından çalışma durumundan kaldırılır.

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
