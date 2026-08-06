# Jeoit yüksekliği dönüşüm çekirdeği

Bu çekirdek WGS84 elipsoidal yükseklik (`h`) ile ortometrik yükseklik (`H`)
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

Her dönüşüm şunları içeren bir hesap izi üretir:

- kullanılan `N = h - H` işaret sözleşmesi,
- kaynak ve hedef datum,
- uygulanan düzeltme,
- sayısal yerine koyma,
- dönüştürülmüş yükseklik,
- varsa belirsizlik birleşimi,
- varsayımlar ve uyarılar.

## Bilinçli sınırlar

- Motor otomatik jeoit modeli indirmez veya sorgulamaz.
- Girilen `N` değerinin deney koordinatına uygunluğunu doğrulamaz.
- Jeoit modeli adı, sürümü ve epoku bu çekirdeğin dışında kaynak provenansı olarak
  yönetilmelidir.
- Yerel düşey datumlar, açık bir dönüşüm ofseti veya jeodezik bağ olmadan otomatik
  dönüştürülmez.
- Aynı datum seçilirse değer değiştirilmez ve bu durum uyarı olarak kaydedilir.

Bu ayrım, doğrulanmamış bir jeoit değerinin sessizce bilimsel gerçek gibi
kullanılmasını önler.
