# Su yüzeyi, gelgit zamanı ve dalga belirsizliği

Bu sözleşme bir gözlem anındaki su yüzeyini, gelgit bağlamını ve dalga kaynaklı
düşey belirsizliği tek, yeniden üretilebilir bir hesap kaydı olarak saklar.

## Temel ayrım

Üç farklı büyüklük birbirine karıştırılmaz:

1. **Anlık su seviyesi (`z_su`)**: Seçilen düşey datuma göre ölçülen veya tahmin
   edilen durgun su yüzeyi.
2. **Su seviyesi belirsizliği (`u_su`)**: Ölçüm, tahmin veya datum bağlantısına
   ait düşey belirsizlik.
3. **Dalga düşey belirsizliği (`u_dalga`)**: Gözlem anında dalga yüzeyinin durgun
   su seviyesine göre oluşturduğu doğrudan düşey belirsizlik girdisi.

Anlamlı dalga yüksekliği (`H_s`) ayrı bir provenans ölçüsüdür. Uygulama `H_s`
değerini otomatik olarak `u_dalga` değerine, görüş yüksekliğine veya hedef
kapanmasına dönüştürmez. Böyle bir dönüşüm deniz durumu, kamera anı, dalga fazı,
yön ve istatistiksel kabuller gerektirir.

## Zaman

Gözlem zamanı saat dilimi içeren ISO-8601 biçiminde kaydedilir:

```text
2026-08-07T01:30:00+03:00
2026-08-06T22:30:00Z
```

Saat dilimi içermeyen yerel zaman kabul edilmez. Böylece gelgit seviyesinin hangi
ana ait olduğu belirsiz kalmaz. Gelgit tahminlerinde kaynağın yayın zamanı ayrıca
saklanabilir.

## Kaynak türleri

- manuel gözlem,
- gelgit ölçer,
- gelgit tahmini,
- ölçme / nivelman.

Kaynak etiketi zorunludur. İstasyon etiketi, yayın zamanı ve not alanları isteğe
bağlıdır. Tahmin kaynağı saha ölçümü gibi sunulmaz ve açık uyarı üretir.

## Düşey datum

Su seviyesi şu referanslardan biriyle kaydedilir:

- ortometrik / ortalama deniz seviyesi,
- WGS84 elipsoidal yükseklik,
- yerel düşey referans.

Yerel referans kullanılırsa ulusal veya jeodezik datuma bağın uygulama tarafından
doğrulanmadığı belirtilir. Bu kayıt mevcut datum/gelgit ofsetini otomatik olarak
değiştirmez.

## Belirsizlik birleşimi

Varsayılan yöntem koruyucu doğrusal toplamdır:

```text
u_toplam = u_su + u_dalga
```

Kullanıcı bileşenlerin bağımsız olduğunu kabul ederse kök-toplam-kare yöntemi de
seçilebilir:

```text
u_toplam = √(u_su² + u_dalga²)
```

İkinci yöntemde bağımsızlık varsayımı hesap izine ve uyarılara yazılır. Her iki
belirsizlik de eksikse uygulama sayısal değer uydurmaz ve kayıt `indeterminate`
durumunda kalır.

Su yüzeyi aralığı yalnız birleşik belirsizlik hesaplanabiliyorsa üretilir:

```text
z_alt = z_su - u_toplam
z_üst = z_su + u_toplam
```

## Kalıcı provenans

Kayıt mevcut sürümlü `ModelPrediction` sözleşmesini kullanır ve şunları içerir:

- kaynak türü ve etiketi,
- gözlem zamanı ve kayıt zamanı,
- isteğe bağlı istasyon ve kaynak yayın zamanı,
- düşey datum,
- anlık su seviyesi,
- su seviyesi belirsizliği,
- dalga düşey belirsizliği,
- isteğe bağlı anlamlı dalga yüksekliği,
- gelgit evresi,
- belirsizlik birleşim yöntemi,
- alt ve üst su yüzeyi sınırı,
- formüller, sayısal yerine koymalar, varsayımlar, uyarılar ve iz kimliği.

Bu nedenle yerel kayıt, `.ggl.json` dışa/içe aktarma ve HTML raporu mevcut
şema-7 mekanizmasıyla kaydı korur. Yeni şema sürümü gerekmez; eski deneylerde bu
hesap kaydı bulunmaz.

## Bu aşamanın sınırı

`1.0.8` sürümünde bu sözleşme ölçüm ve provenans katmanıdır. Su seviyesi aralığı
henüz gözlemci yüksekliğine, hedef kotuna, arazi profiline veya görünürlük
motoruna otomatik uygulanmaz. Fiziksel uygulama için su yüzeyinin deneyde hangi
nesneye ve hangi işaretle etki ettiği ayrıca seçilmelidir.
